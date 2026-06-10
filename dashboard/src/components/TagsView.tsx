import { useState, useMemo } from 'react'
import { Tag as TagIcon, ChevronRight, BookOpen } from 'lucide-react'
import type { AnnotatedNote, Tag } from '../types'
import { formatBibleRef } from '../lib/bibleBooks'

const SOURCE_DOT: Record<string, string> = {
  a: 'bg-blue-400',
  b: 'bg-amber-400',
  common: 'bg-emerald-400',
}

interface Props {
  notes: AnnotatedNote[]
  tagsA: Tag[]
  tagsB: Tag[]
}

export function TagsView({ notes, tagsA, tagsB }: Props) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const tagNames = useMemo(() => {
    const setA = new Set(tagsA.map(t => t.Name))
    const setB = new Set(tagsB.map(t => t.Name))
    const all = new Map<string, { nameA: boolean; nameB: boolean; count: number }>()
    for (const n of notes) {
      for (const t of n.tags) {
        if (!all.has(t.Name)) all.set(t.Name, { nameA: setA.has(t.Name), nameB: setB.has(t.Name), count: 0 })
        all.get(t.Name)!.count++
      }
    }
    return Array.from(all.entries()).sort((a, b) => b[1].count - a[1].count)
  }, [notes, tagsA, tagsB])

  const filteredNotes = useMemo(() => {
    if (!selectedTag) return []
    return notes.filter(n => n.tags.some(t => t.Name === selectedTag))
  }, [notes, selectedTag])

  const tagNotesCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const n of notes)
      for (const t of n.tags) map.set(t.Name, (map.get(t.Name) ?? 0) + 1)
    return map
  }, [notes])

  return (
    <div className="flex gap-4 h-[calc(100vh-240px)] min-h-[400px]">
      {/* Sidebar tags */}
      <div className="w-60 shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {tagNames.length} étiquettes
          </p>
        </div>
        <div className="p-2">
          {tagNames.map(([name, info]) => (
            <button
              key={name}
              onClick={() => setSelectedTag(selectedTag === name ? null : name)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group ${
                selectedTag === name
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <TagIcon size={13} className={selectedTag === name ? 'text-indigo-500' : 'text-slate-400'} />
              <span className="flex-1 text-sm font-medium truncate">{name}</span>
              <div className="flex items-center gap-1">
                {info.nameA && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                {info.nameB && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                <span className="text-xs text-slate-400 tabular-nums ml-1">
                  {tagNotesCount.get(name) ?? 0}
                </span>
              </div>
              {selectedTag === name && <ChevronRight size={12} className="text-indigo-400 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Notes panel */}
      <div className="flex-1 overflow-y-auto">
        {!selectedTag ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <TagIcon size={32} className="opacity-30" />
            <p className="text-sm">Sélectionne une étiquette pour voir ses notes</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-xl">
                {selectedTag}
              </span>
              <span className="text-xs text-slate-400">{filteredNotes.length} notes</span>
            </div>
            {filteredNotes.map(note => {
              const bibleRef = formatBibleRef(note.bookNumber, note.chapterNumber)
              const location = bibleRef ?? note.locationTitle
              const content = note.Content?.trim() ?? ''
              return (
                <div
                  key={`${note.source}-${note.Guid}`}
                  className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SOURCE_DOT[note.source]}`} />
                    <div className="flex-1 min-w-0">
                      {note.Title && (
                        <p className="text-sm font-semibold text-slate-800 mb-1 leading-snug">{note.Title}</p>
                      )}
                      {content && (
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 whitespace-pre-wrap">{content}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {location && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <BookOpen size={11} />{location}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-300 ml-auto">
                          {new Date(note.LastModified).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
