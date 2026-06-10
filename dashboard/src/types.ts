export interface Manifest {
  name: string
  creationDate: string
  userDataBackup: {
    deviceName: string
    lastModifiedDate: string
    schemaVersion: number
  }
}

export interface Note {
  NoteId: number
  Guid: string
  UserMarkId: number | null
  LocationId: number | null
  Title: string | null
  Content: string | null
  LastModified: string
  Created: string
  BlockType: number
  BlockIdentifier: number | null
  // enriched
  tags: Tag[]
  locationTitle: string | null
  bookNumber: number | null
  chapterNumber: number | null
}

export interface UserMark {
  UserMarkId: number
  UserMarkGuid: string
  ColorIndex: number
  LocationId: number
  StyleIndex: number
  Version: number
  // enriched
  locationTitle: string | null
  keySymbol: string | null
  bookNumber: number | null
  chapterNumber: number | null
  hasNote: boolean
}

export interface Tag {
  TagId: number
  Type: number
  Name: string
}

export interface Location {
  LocationId: number
  BookNumber: number | null
  ChapterNumber: number | null
  DocumentId: number | null
  Track: number | null
  IssueTagNumber: number
  KeySymbol: string | null
  MepsLanguage: number | null
  Type: number
  Title: string | null
}

export interface BackupStats {
  notes: number
  userMarks: number
  blockRanges: number
  bookmarks: number
  inputFields: number
  playlistItems: number
  tags: number
}

export interface BackupData {
  manifest: Manifest
  notes: Note[]
  userMarks: UserMark[]
  tags: Tag[]
  stats: BackupStats
}

export type NoteSource = 'a' | 'b' | 'common'

export interface AnnotatedNote extends Note {
  source: NoteSource
}

export interface AnnotatedMark extends UserMark {
  source: NoteSource
}

export interface PublicationConflict {
  keySymbol: string
  isBible: boolean
  countA: number
  countB: number
}

export interface HighlightItem {
  guid: string
  colorIndex: number
  hasNote: boolean
  ref: string         // "Matthieu 5" ou "§42"
  bookNumber: number | null
  chapterNumber: number | null
}

export interface PublicationHighlightGroup {
  keySymbol: string
  isBible: boolean
  commonCount: number
  onlyA: HighlightItem[]
  onlyB: HighlightItem[]
}

export type HighlightSource = 'a' | 'b' | 'both'

export interface HighlightChoices {
  perPublication: Record<string, HighlightSource>
  excludedGuids: Set<string>
}

export interface Comparison {
  notes: AnnotatedNote[]
  marks: AnnotatedMark[]
  onlyA: { notes: number; marks: number }
  onlyB: { notes: number; marks: number }
  common: { notes: number; marks: number }
  publicationConflicts: PublicationConflict[]
  publicationGroups: PublicationHighlightGroup[]
}
