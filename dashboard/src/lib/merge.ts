import JSZip from 'jszip'
import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'
import type { HighlightChoices } from '../types'

const SEPARATOR = '\n\n— — —\n\n'

type IdMap = Map<number, number>
type Row = Record<string, unknown>

let SQL: SqlJsStatic | null = null
async function getSql(): Promise<SqlJsStatic> {
  if (!SQL) SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  return SQL
}

function queryAll(db: Database, sql: string, params: (string | number | null | Uint8Array)[] = []): Row[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: Row[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as Row)
  stmt.free()
  return rows
}

function queryOne(db: Database, sql: string, params: (string | number | null | Uint8Array)[] = []): Row | null {
  const rows = queryAll(db, sql, params)
  return rows[0] ?? null
}

function lastId(db: Database): number {
  return (queryOne(db, 'SELECT last_insert_rowid() as id')?.id as number) ?? 0
}

function mergeText(a: string | null | undefined, b: string | null | undefined): string | null {
  const ta = (a ?? '').trim()
  const tb = (b ?? '').trim()
  if (!ta) return b ?? null
  if (!tb) return a ?? null
  if (ta === tb) return a ?? null
  return ta + SEPARATOR + tb
}

// ------------------------------------------------------------------ //
// Schema copy                                                          //
// ------------------------------------------------------------------ //

function createMergedDb(SqlJs: SqlJsStatic, dbA: Database): Database {
  const bytes = dbA.export()
  const merged = new SqlJs.Database(bytes)
  merged.run('PRAGMA foreign_keys = OFF')
  for (const t of [
    'PlaylistItemMarkerParagraphMap', 'PlaylistItemMarkerBibleVerseMap',
    'PlaylistItemMarker', 'PlaylistItemIndependentMediaMap',
    'PlaylistItemLocationMap', 'TagMap', 'BlockRange', 'Note',
    'UserMark', 'Bookmark', 'InputField', 'PlaylistItem',
    'IndependentMedia', 'Tag', 'Location',
  ]) merged.run(`DELETE FROM ${t}`)
  return merged
}

// ------------------------------------------------------------------ //
// Merger class                                                         //
// ------------------------------------------------------------------ //

class Merger {
  private out: Database
  private hlChoices: HighlightChoices
  private loc: [IdMap, IdMap] = [new Map(), new Map()]
  private tag: [IdMap, IdMap] = [new Map(), new Map()]
  private mark: [IdMap, IdMap] = [new Map(), new Map()]
  private note: [IdMap, IdMap] = [new Map(), new Map()]
  private media: [IdMap, IdMap] = [new Map(), new Map()]
  private playlist: [IdMap, IdMap] = [new Map(), new Map()]
  private marker: [IdMap, IdMap] = [new Map(), new Map()]
  private filepath: [Map<string, string>, Map<string, string>] = [new Map(), new Map()]

  constructor(out: Database, hlChoices: HighlightChoices = { perPublication: {}, excludedGuids: new Set() }) {
    this.out = out
    this.hlChoices = hlChoices
  }

  private markKeySymbols(db: Database): Map<number, string> {
    const map = new Map<number, string>()
    for (const row of queryAll(db, `
      SELECT um.UserMarkId, COALESCE(l.KeySymbol, '__unknown__') AS ks
      FROM UserMark um JOIN Location l ON l.LocationId = um.LocationId
    `)) map.set(row.UserMarkId as number, row.ks as string)
    return map
  }

  private hlAllowed(keySymbol: string, sourceIdx: number, guid: string): boolean {
    if (this.hlChoices.excludedGuids?.has(guid)) return false
    const choice = this.hlChoices.perPublication?.[keySymbol]
    if (!choice || choice === 'both') return true
    return choice === (sourceIdx === 0 ? 'a' : 'b')
  }

  // ---- Location ----

  private findLocation(row: Row): number | null {
    if (row.BookNumber) {
      const hit = queryOne(this.out,
        'SELECT LocationId FROM Location WHERE BookNumber=? AND ChapterNumber IS ? AND KeySymbol=? AND MepsLanguage IS ? AND Type=?',
        [row.BookNumber as number, row.ChapterNumber as number | null, row.KeySymbol as string, row.MepsLanguage as number | null, row.Type as number])
      return (hit?.LocationId as number) ?? null
    }
    if (row.DocumentId) {
      const hit = queryOne(this.out,
        "SELECT LocationId FROM Location WHERE DocumentId=? AND KeySymbol IS ? AND IssueTagNumber=? AND MepsLanguage IS ? AND Type=? AND COALESCE(Specialty,'')=COALESCE(?,'') AND COALESCE(Edition,'')=COALESCE(?,'?')",
        [row.DocumentId as number, row.KeySymbol as string | null, row.IssueTagNumber as number, row.MepsLanguage as number | null, row.Type as number, row.Specialty as string | null, row.Edition as string | null])
      return (hit?.LocationId as number) ?? null
    }
    if (row.Track !== null && row.Track !== undefined) {
      const hit = queryOne(this.out,
        'SELECT LocationId FROM Location WHERE Track=? AND KeySymbol IS ? AND IssueTagNumber=? AND MepsLanguage IS ? AND Type=?',
        [row.Track as number, row.KeySymbol as string | null, row.IssueTagNumber as number, row.MepsLanguage as number | null, row.Type as number])
      return (hit?.LocationId as number) ?? null
    }
    const hit = queryOne(this.out,
      "SELECT LocationId FROM Location WHERE (BookNumber IS NULL OR BookNumber=0) AND (ChapterNumber IS NULL OR ChapterNumber=0) AND (DocumentId IS NULL OR DocumentId=0) AND Track IS NULL AND KeySymbol IS ? AND IssueTagNumber=? AND MepsLanguage IS ? AND Type=? AND COALESCE(Specialty,'')=COALESCE(?,'') AND COALESCE(Edition,'')=COALESCE(?,'?')",
      [row.KeySymbol as string | null, row.IssueTagNumber as number, row.MepsLanguage as number | null, row.Type as number, row.Specialty as string | null, row.Edition as string | null])
    return (hit?.LocationId as number) ?? null
  }

  mergeLocations(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      for (const row of queryAll(dbs[i], 'SELECT * FROM Location')) {
        const oldId = row.LocationId as number
        const existing = this.findLocation(row)
        if (existing !== null) {
          this.loc[i].set(oldId, existing)
        } else {
          const r = { ...row }
          delete r.LocationId
          const cols = Object.keys(r).join(', ')
          const ph = Object.keys(r).map(() => '?').join(', ')
          this.out.run(`INSERT INTO Location (${cols}) VALUES (${ph})`, Object.values(r) as (string | number | null)[])
          this.loc[i].set(oldId, lastId(this.out))
        }
      }
    }
  }

  // ---- Tag ----

  mergeTags(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      for (const row of queryAll(dbs[i], 'SELECT * FROM Tag')) {
        const oldId = row.TagId as number
        const hit = queryOne(this.out, 'SELECT TagId FROM Tag WHERE Type=? AND Name=?', [row.Type as number, row.Name as string])
        if (hit) {
          this.tag[i].set(oldId, hit.TagId as number)
        } else {
          this.out.run('INSERT INTO Tag (Type, Name) VALUES (?,?)', [row.Type as number, row.Name as string])
          this.tag[i].set(oldId, lastId(this.out))
        }
      }
    }
  }

  // ---- UserMark ----

  mergeUserMarks(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      const keySymbols = this.markKeySymbols(dbs[i])
      for (const row of queryAll(dbs[i], 'SELECT * FROM UserMark')) {
        const oldId = row.UserMarkId as number
        const ks   = keySymbols.get(oldId) ?? '__unknown__'
        const guid = row.UserMarkGuid as string
        if (!this.hlAllowed(ks, i, guid)) continue
        const hit = queryOne(this.out, 'SELECT UserMarkId FROM UserMark WHERE UserMarkGuid=?', [row.UserMarkGuid as string])
        if (hit) {
          this.mark[i].set(oldId, hit.UserMarkId as number)
        } else {
          const newLoc = this.loc[i].get(row.LocationId as number) ?? null
          this.out.run(
            'INSERT INTO UserMark (ColorIndex, LocationId, StyleIndex, UserMarkGuid, Version) VALUES (?,?,?,?,?)',
            [row.ColorIndex as number, newLoc, row.StyleIndex as number, row.UserMarkGuid as string, row.Version as number])
          this.mark[i].set(oldId, lastId(this.out))
        }
      }
    }
  }

  // ---- BlockRange ----

  mergeBlockRanges(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      for (const row of queryAll(dbs[i], 'SELECT * FROM BlockRange')) {
        const newMark = this.mark[i].get(row.UserMarkId as number)
        if (newMark === undefined) continue
        const exists = queryOne(this.out,
          'SELECT 1 FROM BlockRange WHERE UserMarkId=? AND BlockType=? AND Identifier=?',
          [newMark, row.BlockType as number, row.Identifier as number])
        if (!exists) {
          this.out.run(
            'INSERT INTO BlockRange (BlockType, Identifier, StartToken, EndToken, UserMarkId) VALUES (?,?,?,?,?)',
            [row.BlockType as number, row.Identifier as number, row.StartToken as number | null, row.EndToken as number | null, newMark])
        }
      }
    }
  }

  // ---- Conflict resolution ----

  resolveUserMarkConflicts() {
    const conflicts = queryAll(this.out, `
      SELECT br1.UserMarkId AS id1, br2.UserMarkId AS id2
      FROM BlockRange br1
      JOIN BlockRange br2
        ON br1.UserMarkId < br2.UserMarkId
       AND br1.BlockType=br2.BlockType AND br1.Identifier=br2.Identifier
       AND br1.StartToken IS br2.StartToken AND br1.EndToken IS br2.EndToken
      JOIN UserMark um1 ON um1.UserMarkId=br1.UserMarkId
      JOIN UserMark um2 ON um2.UserMarkId=br2.UserMarkId
      WHERE um1.LocationId=um2.LocationId`)

    for (const c of conflicts) {
      const [id1, id2] = [c.id1 as number, c.id2 as number]
      const hasNote1 = queryOne(this.out, 'SELECT 1 FROM Note WHERE UserMarkId=?', [id1])
      const hasNote2 = queryOne(this.out, 'SELECT 1 FROM Note WHERE UserMarkId=?', [id2])
      const [winner, loser] = hasNote2 && !hasNote1 ? [id2, id1] : [id1, id2]
      this.out.run('UPDATE Note SET UserMarkId=? WHERE UserMarkId=?', [winner, loser])
      this.out.run('DELETE FROM BlockRange WHERE UserMarkId=?', [loser])
      this.out.run('DELETE FROM UserMark WHERE UserMarkId=?', [loser])
      for (const m of this.mark) for (const [k, v] of m) if (v === loser) m.set(k, winner)
    }
  }

  // ---- Note ----

  mergeNotes(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      for (const row of queryAll(dbs[i], 'SELECT * FROM Note')) {
        const oldId = row.NoteId as number
        const hit = queryOne(this.out, 'SELECT NoteId, Title, Content FROM Note WHERE Guid=?', [row.Guid as string])
        if (hit) {
          const mt = mergeText(hit.Title as string | null, row.Title as string | null)
          const mc = mergeText(hit.Content as string | null, row.Content as string | null)
          if (mt !== hit.Title || mc !== hit.Content)
            this.out.run('UPDATE Note SET Title=?, Content=? WHERE NoteId=?', [mt, mc, hit.NoteId as number])
          this.note[i].set(oldId, hit.NoteId as number)
        } else {
          const newLoc = row.LocationId ? this.loc[i].get(row.LocationId as number) ?? null : null
          const newMark = row.UserMarkId ? this.mark[i].get(row.UserMarkId as number) ?? null : null
          this.out.run(
            'INSERT INTO Note (Guid,UserMarkId,LocationId,Title,Content,LastModified,Created,BlockType,BlockIdentifier) VALUES (?,?,?,?,?,?,?,?,?)',
            [row.Guid as string, newMark, newLoc, row.Title as string | null, row.Content as string | null,
             row.LastModified as string, row.Created as string, row.BlockType as number, row.BlockIdentifier as number | null])
          this.note[i].set(oldId, lastId(this.out))
        }
      }
    }
  }

  // ---- IndependentMedia ----

  mergeMedia(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      for (const row of queryAll(dbs[i], 'SELECT * FROM IndependentMedia')) {
        const oldId = row.IndependentMediaId as number
        const hit = queryOne(this.out, 'SELECT IndependentMediaId, FilePath FROM IndependentMedia WHERE Hash=?', [row.Hash as string])
        if (hit) {
          this.media[i].set(oldId, hit.IndependentMediaId as number)
          if (hit.FilePath !== row.FilePath)
            this.filepath[i].set(row.FilePath as string, hit.FilePath as string)
        } else {
          this.out.run(
            'INSERT INTO IndependentMedia (OriginalFilename,FilePath,MimeType,Hash) VALUES (?,?,?,?)',
            [row.OriginalFilename as string, row.FilePath as string, row.MimeType as string, row.Hash as string])
          this.media[i].set(oldId, lastId(this.out))
        }
      }
    }
  }

  // ---- PlaylistItem ----

  mergePlaylists(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      for (const row of queryAll(dbs[i], 'SELECT * FROM PlaylistItem')) {
        const oldId = row.PlaylistItemId as number
        const hit = queryOne(this.out,
          'SELECT PlaylistItemId FROM PlaylistItem WHERE Label=? AND Accuracy=? AND EndAction=?',
          [row.Label as string, row.Accuracy as number, row.EndAction as number])
        if (hit) {
          this.playlist[i].set(oldId, hit.PlaylistItemId as number)
        } else {
          const thumb = row.ThumbnailFilePath
            ? this.filepath[i].get(row.ThumbnailFilePath as string) ?? row.ThumbnailFilePath as string
            : null
          this.out.run(
            'INSERT INTO PlaylistItem (Label,StartTrimOffsetTicks,EndTrimOffsetTicks,Accuracy,EndAction,ThumbnailFilePath) VALUES (?,?,?,?,?,?)',
            [row.Label as string, row.StartTrimOffsetTicks as number | null, row.EndTrimOffsetTicks as number | null,
             row.Accuracy as number, row.EndAction as number, thumb])
          this.playlist[i].set(oldId, lastId(this.out))
        }
      }
    }
    this.mergePlSubTables(dbs)
  }

  private mergePlSubTables(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      for (const row of queryAll(dbs[i], 'SELECT * FROM PlaylistItemLocationMap')) {
        const pi = this.playlist[i].get(row.PlaylistItemId as number)
        const loc = this.loc[i].get(row.LocationId as number)
        if (!pi || !loc) continue
        if (!queryOne(this.out, 'SELECT 1 FROM PlaylistItemLocationMap WHERE PlaylistItemId=? AND LocationId=?', [pi, loc]))
          this.out.run('INSERT INTO PlaylistItemLocationMap VALUES (?,?,?,?)', [pi, loc, row.MajorMultimediaType as number, row.BaseDurationTicks as number | null])
      }
      for (const row of queryAll(dbs[i], 'SELECT * FROM PlaylistItemIndependentMediaMap')) {
        const pi = this.playlist[i].get(row.PlaylistItemId as number)
        const med = this.media[i].get(row.IndependentMediaId as number)
        if (!pi || !med) continue
        if (!queryOne(this.out, 'SELECT 1 FROM PlaylistItemIndependentMediaMap WHERE PlaylistItemId=? AND IndependentMediaId=?', [pi, med]))
          this.out.run('INSERT INTO PlaylistItemIndependentMediaMap VALUES (?,?,?)', [pi, med, row.DurationTicks as number])
      }
      for (const row of queryAll(dbs[i], 'SELECT * FROM PlaylistItemMarker')) {
        const pi = this.playlist[i].get(row.PlaylistItemId as number)
        if (!pi) continue
        const hit = queryOne(this.out, 'SELECT PlaylistItemMarkerId FROM PlaylistItemMarker WHERE PlaylistItemId=? AND StartTimeTicks=?', [pi, row.StartTimeTicks as number])
        const markerId = hit
          ? (this.marker[i].set(row.PlaylistItemMarkerId as number, hit.PlaylistItemMarkerId as number), hit.PlaylistItemMarkerId as number)
          : (() => {
              this.out.run('INSERT INTO PlaylistItemMarker (PlaylistItemId,Label,StartTimeTicks,DurationTicks,EndTransitionDurationTicks) VALUES (?,?,?,?,?)',
                [pi, row.Label as string, row.StartTimeTicks as number, row.DurationTicks as number, row.EndTransitionDurationTicks as number])
              const id = lastId(this.out)
              this.marker[i].set(row.PlaylistItemMarkerId as number, id)
              return id
            })()
        void markerId
      }
      for (const row of queryAll(dbs[i], 'SELECT * FROM PlaylistItemMarkerBibleVerseMap')) {
        const m = this.marker[i].get(row.PlaylistItemMarkerId as number)
        if (!m) continue
        if (!queryOne(this.out, 'SELECT 1 FROM PlaylistItemMarkerBibleVerseMap WHERE PlaylistItemMarkerId=? AND VerseId=?', [m, row.VerseId as number]))
          this.out.run('INSERT INTO PlaylistItemMarkerBibleVerseMap VALUES (?,?)', [m, row.VerseId as number])
      }
      for (const row of queryAll(dbs[i], 'SELECT * FROM PlaylistItemMarkerParagraphMap')) {
        const m = this.marker[i].get(row.PlaylistItemMarkerId as number)
        if (!m) continue
        if (!queryOne(this.out, 'SELECT 1 FROM PlaylistItemMarkerParagraphMap WHERE PlaylistItemMarkerId=? AND MepsDocumentId=? AND ParagraphIndex=? AND MarkerIndexWithinParagraph=?',
          [m, row.MepsDocumentId as number, row.ParagraphIndex as number, row.MarkerIndexWithinParagraph as number]))
          this.out.run('INSERT INTO PlaylistItemMarkerParagraphMap VALUES (?,?,?,?)',
            [m, row.MepsDocumentId as number, row.ParagraphIndex as number, row.MarkerIndexWithinParagraph as number])
      }
    }
  }

  // ---- TagMap ----

  mergeTagMaps(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      for (const row of queryAll(dbs[i], 'SELECT * FROM TagMap')) {
        const newTag = this.tag[i].get(row.TagId as number)
        if (newTag === undefined) continue
        const newNote = row.NoteId ? this.note[i].get(row.NoteId as number) ?? null : null
        const newLoc = row.LocationId ? this.loc[i].get(row.LocationId as number) ?? null : null
        const newPl = row.PlaylistItemId ? this.playlist[i].get(row.PlaylistItemId as number) ?? null : null

        let exists = false
        if (newNote) exists = !!queryOne(this.out, 'SELECT 1 FROM TagMap WHERE TagId=? AND NoteId=?', [newTag, newNote])
        else if (newLoc) exists = !!queryOne(this.out, 'SELECT 1 FROM TagMap WHERE TagId=? AND LocationId=?', [newTag, newLoc])
        else if (newPl) exists = !!queryOne(this.out, 'SELECT 1 FROM TagMap WHERE TagId=? AND PlaylistItemId=?', [newTag, newPl])
        else continue

        if (!exists) {
          const maxPos = (queryOne(this.out, 'SELECT COALESCE(MAX(Position),-1) AS p FROM TagMap WHERE TagId=?', [newTag])?.p as number) ?? -1
          this.out.run(
            'INSERT INTO TagMap (PlaylistItemId,LocationId,NoteId,TagId,Position) VALUES (?,?,?,?,?)',
            [newPl, newLoc, newNote, newTag, maxPos + 1])
        }
      }
    }
  }

  // ---- Bookmark ----

  mergeBookmarks(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      for (const row of queryAll(dbs[i], 'SELECT * FROM Bookmark')) {
        const newLoc = this.loc[i].get(row.LocationId as number)
        const newPub = this.loc[i].get(row.PublicationLocationId as number)
        if (!newLoc || !newPub) continue
        if (!queryOne(this.out, 'SELECT 1 FROM Bookmark WHERE PublicationLocationId=? AND Slot=?', [newPub, row.Slot as number]))
          this.out.run(
            'INSERT INTO Bookmark (LocationId,PublicationLocationId,Slot,Title,Snippet,BlockType,BlockIdentifier) VALUES (?,?,?,?,?,?,?)',
            [newLoc, newPub, row.Slot as number, row.Title as string, row.Snippet as string | null, row.BlockType as number, row.BlockIdentifier as number | null])
      }
    }
  }

  // ---- InputField ----

  mergeInputFields(dbs: [Database, Database]) {
    for (let i = 0; i < 2; i++) {
      for (const row of queryAll(dbs[i], 'SELECT * FROM InputField')) {
        const newLoc = this.loc[i].get(row.LocationId as number)
        if (!newLoc) continue
        const hit = queryOne(this.out, 'SELECT Value FROM InputField WHERE LocationId=? AND TextTag=?', [newLoc, row.TextTag as string])
        if (hit) {
          const merged = mergeText(hit.Value as string | null, row.Value as string | null)
          if (merged !== hit.Value)
            this.out.run('UPDATE InputField SET Value=? WHERE LocationId=? AND TextTag=?', [merged, newLoc, row.TextTag as string])
        } else {
          this.out.run('INSERT INTO InputField (LocationId,TextTag,Value) VALUES (?,?,?)', [newLoc, row.TextTag as string, row.Value as string])
        }
      }
    }
  }
}

// ------------------------------------------------------------------ //
// Public entry point                                                   //
// ------------------------------------------------------------------ //

export interface MergeProgress {
  step: string
  done: boolean
}

export async function mergeBackups(
  fileA: File,
  fileB: File,
  onProgress: (p: MergeProgress) => void,
  highlightChoices: HighlightChoices = { perPublication: {}, excludedGuids: new Set() },
): Promise<Blob> {
  const step = (s: string) => onProgress({ step: s, done: false })

  step('Extraction des archives…')
  const [zipA, zipB] = await Promise.all([JSZip.loadAsync(fileA), JSZip.loadAsync(fileB)])

  step('Chargement des bases de données…')
  const [bytesA, bytesB] = await Promise.all([
    zipA.file('userData.db')!.async('uint8array'),
    zipB.file('userData.db')!.async('uint8array'),
  ])

  const SqlJs = await getSql()
  const dbA = new SqlJs.Database(bytesA)
  const dbB = new SqlJs.Database(bytesB)
  const dbs: [Database, Database] = [dbA, dbB]

  step('Initialisation de la base fusionnée…')
  const merged = createMergedDb(SqlJs, dbA)
  const m = new Merger(merged, highlightChoices)

  step('Fusion des emplacements…')
  m.mergeLocations(dbs)
  step('Fusion des étiquettes…')
  m.mergeTags(dbs)
  step('Fusion des surlignages…')
  m.mergeUserMarks(dbs)
  m.mergeBlockRanges(dbs)
  m.resolveUserMarkConflicts()
  step('Fusion des notes…')
  m.mergeNotes(dbs)
  step('Fusion des médias…')
  m.mergeMedia(dbs)
  m.mergePlaylists(dbs)
  step('Fusion des étiquettes liées…')
  m.mergeTagMaps(dbs)
  step('Fusion des signets et champs…')
  m.mergeBookmarks(dbs)
  m.mergeInputFields(dbs)

  step('Finalisation…')
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  merged.run('UPDATE LastModified SET LastModified=?', [now])

  const mergedBytes = merged.export()
  dbA.close(); dbB.close(); merged.close()

  step('Copie des fichiers médias…')
  const outZip = new JSZip()
  outZip.file('userData.db', mergedBytes)

  const skip = new Set(['userData.db', 'manifest.json'])
  for (const zip of [zipA, zipB]) {
    for (const [name, file] of Object.entries(zip.files)) {
      if (skip.has(name) || file.dir || outZip.file(name)) continue
      outZip.file(name, await file.async('uint8array'))
    }
  }

  const manifestA = JSON.parse(await zipA.file('manifest.json')!.async('string'))
  outZip.file('manifest.json', JSON.stringify({
    type: 0,
    name: 'Merged.jwlibrary',
    creationDate: now,
    version: 1,
    userDataBackup: {
      deviceName: 'Merged',
      lastModifiedDate: now,
      hash: '',
      databaseName: 'userData.db',
      schemaVersion: manifestA.userDataBackup?.schemaVersion ?? 16,
    },
  }))

  onProgress({ step: 'Terminé !', done: true })
  return outZip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}
