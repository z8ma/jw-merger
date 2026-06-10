import JSZip from 'jszip'
import initSqlJs from 'sql.js'
import type { BackupData, Note, UserMark, Tag, Location } from '../types'

let sqlReady: Awaited<ReturnType<typeof initSqlJs>> | null = null

async function getSql() {
  if (!sqlReady) {
    sqlReady = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  }
  return sqlReady
}

function queryAll(db: import('sql.js').Database, sql: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = []
  const stmt = db.prepare(sql)
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

export async function parseBackup(file: File): Promise<BackupData> {
  const zip = await JSZip.loadAsync(file)

  const manifestRaw = await zip.file('manifest.json')?.async('string')
  if (!manifestRaw) throw new Error('manifest.json introuvable')
  const manifest = JSON.parse(manifestRaw)

  const dbBuffer = await zip.file('userData.db')?.async('arraybuffer')
  if (!dbBuffer) throw new Error('userData.db introuvable')

  const SQL = await getSql()
  const db = new SQL.Database(new Uint8Array(dbBuffer))

  const tags = queryAll(db, 'SELECT * FROM Tag') as unknown as Tag[]
  const locations = queryAll(db, 'SELECT * FROM Location') as unknown as Location[]
  const tagMaps = queryAll(db, 'SELECT * FROM TagMap WHERE NoteId IS NOT NULL')
  const rawNotes = queryAll(db, 'SELECT * FROM Note')
  const rawMarks = queryAll(db, 'SELECT * FROM UserMark')

  const tagById = new Map(tags.map(t => [t.TagId, t]))
  const locById = new Map(locations.map(l => [l.LocationId, l]))

  // Index tags par note
  const noteTagIndex = new Map<number, Tag[]>()
  for (const tm of tagMaps) {
    const nid = tm.NoteId as number
    if (!noteTagIndex.has(nid)) noteTagIndex.set(nid, [])
    const tag = tagById.get(tm.TagId as number)
    if (tag) noteTagIndex.get(nid)!.push(tag)
  }

  // Index notes ayant un surlignage
  const marksWithNote = new Set(
    rawNotes.filter(n => n.UserMarkId != null).map(n => n.UserMarkId as number)
  )

  const notes: Note[] = rawNotes.map(n => {
    const loc = n.LocationId ? locById.get(n.LocationId as number) : null
    return {
      ...(n as Record<string, unknown>),
      tags: noteTagIndex.get(n.NoteId as number) ?? [],
      locationTitle: loc?.Title ?? loc?.KeySymbol ?? null,
      bookNumber: loc?.BookNumber ?? null,
      chapterNumber: loc?.ChapterNumber ?? null,
    } as Note
  })

  const userMarks: UserMark[] = rawMarks.map(m => {
    const loc = m.LocationId ? locById.get(m.LocationId as number) : null
    return {
      ...(m as Record<string, unknown>),
      locationTitle: loc?.Title ?? loc?.KeySymbol ?? null,
      keySymbol: loc?.KeySymbol ?? null,
      bookNumber: loc?.BookNumber ?? null,
      chapterNumber: loc?.ChapterNumber ?? null,
      hasNote: marksWithNote.has(m.UserMarkId as number),
    } as UserMark
  })

  const count = (tbl: string) =>
    (queryAll(db, `SELECT COUNT(*) as n FROM ${tbl}`)[0].n as number)

  const stats = {
    notes: count('Note'),
    userMarks: count('UserMark'),
    blockRanges: count('BlockRange'),
    bookmarks: count('Bookmark'),
    inputFields: count('InputField'),
    playlistItems: count('PlaylistItem'),
    tags: count('Tag'),
  }

  db.close()
  return { manifest, notes, userMarks, tags, stats }
}
