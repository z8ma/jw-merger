import type {
  BackupData, Comparison, AnnotatedNote, AnnotatedMark,
  PublicationConflict, PublicationHighlightGroup, HighlightItem, UserMark,
} from '../types'
import { BIBLE_BOOKS } from './bibleBooks'

function markRef(m: UserMark): string {
  if (m.bookNumber != null) {
    const book = BIBLE_BOOKS[m.bookNumber] ?? `Livre ${m.bookNumber}`
    return m.chapterNumber != null ? `${book} ${m.chapterNumber}` : book
  }
  return m.keySymbol ? `${m.keySymbol}` : 'Inconnu'
}

function toItem(m: UserMark): HighlightItem {
  return {
    guid:          m.UserMarkGuid,
    colorIndex:    m.ColorIndex,
    hasNote:       m.hasNote,
    ref:           markRef(m),
    bookNumber:    m.bookNumber,
    chapterNumber: m.chapterNumber,
  }
}

export function compareBackups(a: BackupData, b: BackupData): Comparison {
  const guidSetB  = new Set(b.notes.map(n => n.Guid))
  const guidSetA  = new Set(a.notes.map(n => n.Guid))
  const markGuidB = new Set(b.userMarks.map(m => m.UserMarkGuid))
  const markGuidA = new Set(a.userMarks.map(m => m.UserMarkGuid))

  const notes: AnnotatedNote[] = [
    ...a.notes.map(n => ({ ...n, source: guidSetB.has(n.Guid) ? 'common' : 'a' } as AnnotatedNote)),
    ...b.notes.filter(n => !guidSetA.has(n.Guid)).map(n => ({ ...n, source: 'b' as const })),
  ]

  const marks: AnnotatedMark[] = [
    ...a.userMarks.map(m => ({ ...m, source: markGuidB.has(m.UserMarkGuid) ? 'common' : 'a' } as AnnotatedMark)),
    ...b.userMarks.filter(m => !markGuidA.has(m.UserMarkGuid)).map(m => ({ ...m, source: 'b' as const })),
  ]

  const { publicationConflicts, publicationGroups } = computePublications(a, b, markGuidA, markGuidB)

  return {
    notes,
    marks,
    onlyA:  { notes: notes.filter(n => n.source === 'a').length,      marks: marks.filter(m => m.source === 'a').length },
    onlyB:  { notes: notes.filter(n => n.source === 'b').length,      marks: marks.filter(m => m.source === 'b').length },
    common: { notes: notes.filter(n => n.source === 'common').length, marks: marks.filter(m => m.source === 'common').length },
    publicationConflicts,
    publicationGroups,
  }
}

function computePublications(
  a: BackupData, b: BackupData,
  markGuidA: Set<string>, markGuidB: Set<string>,
) {
  // Group marks by keySymbol for each source
  const groupsA = new Map<string, UserMark[]>()
  const groupsB = new Map<string, UserMark[]>()

  for (const m of a.userMarks) {
    const key = m.keySymbol ?? '__unknown__'
    if (!groupsA.has(key)) groupsA.set(key, [])
    groupsA.get(key)!.push(m)
  }
  for (const m of b.userMarks) {
    const key = m.keySymbol ?? '__unknown__'
    if (!groupsB.has(key)) groupsB.set(key, [])
    groupsB.get(key)!.push(m)
  }

  const publicationConflicts: PublicationConflict[] = []
  const publicationGroups: PublicationHighlightGroup[] = []

  for (const [key, marksA] of groupsA) {
    const marksB = groupsB.get(key)
    if (!marksB) continue

    const isBible = marksA.some(m => m.bookNumber != null) || marksB.some(m => m.bookNumber != null)

    const onlyA  = marksA.filter(m => !markGuidB.has(m.UserMarkGuid))
    const onlyB  = marksB.filter(m => !markGuidA.has(m.UserMarkGuid))
    const common = marksA.filter(m =>  markGuidB.has(m.UserMarkGuid)).length

    publicationConflicts.push({
      keySymbol: key, isBible,
      countA: marksA.length,
      countB: marksB.length,
    })

    // Trier par livre+chapitre pour affichage cohérent
    const sortItems = (items: UserMark[]) =>
      [...items].sort((x, y) =>
        (x.bookNumber ?? 999) - (y.bookNumber ?? 999) ||
        (x.chapterNumber ?? 0) - (y.chapterNumber ?? 0)
      ).map(toItem)

    publicationGroups.push({
      keySymbol: key, isBible, commonCount: common,
      onlyA: sortItems(onlyA),
      onlyB: sortItems(onlyB),
    })
  }

  // Trier par total décroissant
  const byTotal = (arr: { countA: number; countB: number }[]) =>
    arr.sort((x, y) => (y.countA + y.countB) - (x.countA + x.countB))

  byTotal(publicationConflicts)
  publicationGroups.sort((x, y) => {
    const tx = (groupsA.get(x.keySymbol)?.length ?? 0) + (groupsB.get(y.keySymbol)?.length ?? 0)
    const ty = (groupsA.get(y.keySymbol)?.length ?? 0) + (groupsB.get(x.keySymbol)?.length ?? 0)
    return ty - tx
  })

  return { publicationConflicts, publicationGroups }
}
