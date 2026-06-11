import { useState, useMemo } from 'react'
import { Search, BookOpen, Calendar, SlidersHorizontal, X, Tag as TagIcon } from 'lucide-react'
import type { AnnotatedNote, NoteSource, Tag } from '../types'
import { formatBibleRef } from '../lib/bibleBooks'

const SOURCE_BORDER: Record<NoteSource, string> = {
  a:      'border-l-blue-400',
  b:      'border-l-amber-400',
  common: 'border-l-emerald-400',
}
const SOURCE_LABEL: Record<NoteSource, string> = { a: 'Tél', b: 'PC', common: '=' }
const SOURCE_BADGE: Record<NoteSource, string> = {
  a:      'bg-blue-50 text-blue-600 ring-1 ring-blue-200/80',
  b:      'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80',
  common: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80',
}

type DateFilter = 'all' | 'week' | 'month' | 'year'
type SortKey    = 'recent' | 'oldest' | 'az'

function isWithinDate(date: string, filter: DateFilter): boolean {
  if (filter === 'all') return true
  const d = new Date(date)
  const now = new Date()
  if (filter === 'week')  { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w }
  if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  if (filter === 'year')  return d.getFullYear() === now.getFullYear()
  return true
}

function NoteModal({ note, onClose }: { note: AnnotatedNote; onClose: () => void }) {
  const content   = note.Content?.trim() ?? ''
  const bibleRef  = formatBibleRef(note.bookNumber, note.chapterNumber)
  const location  = bibleRef ?? note.locationTitle
  const created   = new Date(note.Created)
  const modified  = new Date(note.LastModified)
  const wasEdited = Math.abs(modified.getTime() - created.getTime()) > 60_000

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${SOURCE_BADGE[note.source]}`}>
              {SOURCE_LABEL[note.source]}
            </span>
            {location && (
              <span className="flex items-center gap-1 text-xs text-slate-500 font-medium truncate">
                <BookOpen size={11} className="shrink-0" />{location}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {note.Title && (
            <h2 className="text-base font-bold text-slate-900 mb-3 leading-snug">{note.Title}</h2>
          )}
          {content ? (
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <p className="text-sm text-slate-300 italic">Aucun contenu</p>
          )}
        </div>

        {/* Footer */}
        {(note.tags.length > 0 || wasEdited) && (
          <div className="px-6 py-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            {note.tags.map(tag => (
              <span key={tag.TagId} className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium border border-indigo-100/80">
                <TagIcon size={9} />{tag.Name}
              </span>
            ))}
            <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
              <Calendar size={10} />
              <span>{created.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              {wasEdited && <span>· éditée {modified.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function NoteCard({ note, onClick }: { note: AnnotatedNote; onClick: () => void }) {
  const content   = note.Content?.trim() ?? ''
  const preview   = content.length > 180 ? content.slice(0, 180) + '…' : content
  const bibleRef  = formatBibleRef(note.bookNumber, note.chapterNumber)
  const location  = bibleRef ?? note.locationTitle
  const created   = new Date(note.Created)

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-100 border-l-4 ${SOURCE_BORDER[note.source]} p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-px cursor-pointer`}
    >
      <div className="flex items-start gap-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${SOURCE_BADGE[note.source]}`}>
          {SOURCE_LABEL[note.source]}
        </span>
        <div className="flex-1 min-w-0">
          {note.Title && (
            <p className="text-sm font-bold text-slate-800 leading-snug mb-1.5 line-clamp-2">{note.Title}</p>
          )}
          {content && (
            <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{preview}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {location && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-slate-50 rounded-full text-slate-500 border border-slate-100 font-medium">
                <BookOpen size={10} />{location}
              </span>
            )}
            {note.tags.slice(0, 2).map(tag => (
              <span key={tag.TagId} className="text-[11px] px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium border border-indigo-100/80">
                {tag.Name}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-[11px] text-slate-400">+{note.tags.length - 2}</span>
            )}
            <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-300">
              <Calendar size={10} />
              <span>{created.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props { notes: AnnotatedNote[]; allTags: Tag[]; deviceA: string; deviceB: string }

export function NotesView({ notes, allTags, deviceA, deviceB }: Props) {
  const [query,       setQuery]       = useState('')
  const [source,      setSource]      = useState<NoteSource | 'all'>('all')
  const [dateFilter,  setDateFilter]  = useState<DateFilter>('all')
  const [selectedTag, setSelectedTag] = useState('all')
  const [sort,        setSort]        = useState<SortKey>('recent')
  const [openNote,    setOpenNote]    = useState<AnnotatedNote | null>(null)
  void allTags

  const counts = {
    a:      notes.filter(n => n.source === 'a').length,
    b:      notes.filter(n => n.source === 'b').length,
    common: notes.filter(n => n.source === 'common').length,
  }

  const uniqueTags = useMemo(() => {
    const set = new Set<string>()
    for (const n of notes) for (const t of n.tags) set.add(t.Name)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [notes])

  const filtered = useMemo(() => {
    let list = notes.filter(n => {
      if (source !== 'all' && n.source !== source) return false
      if (!isWithinDate(n.LastModified, dateFilter)) return false
      if (selectedTag !== 'all' && !n.tags.some(t => t.Name === selectedTag)) return false
      if (query) {
        const q = query.toLowerCase()
        return n.Title?.toLowerCase().includes(q) || n.Content?.toLowerCase().includes(q) || n.tags.some(t => t.Name.toLowerCase().includes(q))
      }
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'recent') return new Date(b.LastModified).getTime() - new Date(a.LastModified).getTime()
      if (sort === 'oldest') return new Date(a.LastModified).getTime() - new Date(b.LastModified).getTime()
      return (a.Title ?? '').localeCompare(b.Title ?? '', 'fr')
    })
    return list
  }, [notes, source, dateFilter, selectedTag, sort, query])

  return (
    <div className="flex flex-col gap-4">

      {openNote && <NoteModal note={openNote} onClose={() => setOpenNote(null)} />}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher dans les notes, titres, étiquettes…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm placeholder:text-slate-400"
        />
        {query && (
          <button onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors text-xs px-1">
            ✕
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-0.5 bg-slate-100/80 rounded-xl p-1">
          {(['all', 'a', 'common', 'b'] as const).map(s => {
            const label = s === 'all' ? 'Toutes' : s === 'common' ? 'Communes' : s === 'a' ? deviceA : deviceB
            const count = s === 'all' ? notes.length : counts[s as NoteSource]
            return (
              <button key={s} onClick={() => setSource(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  source === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {label}
                <span className={`ml-1 tabular-nums ${source === s ? 'text-slate-400' : 'text-slate-400/60'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-0.5 bg-slate-100/80 rounded-xl p-1">
          {([
            { label: 'Tout',  value: 'all'   as const },
            { label: '7j',    value: 'week'  as const },
            { label: 'Mois',  value: 'month' as const },
            { label: 'Année', value: 'year'  as const },
          ]).map(f => (
            <button key={f.value} onClick={() => setDateFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                dateFilter === f.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {uniqueTags.length > 0 && (
          <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-600 outline-none focus:border-indigo-400 cursor-pointer shadow-sm">
            <option value="all">Toutes les étiquettes</option>
            {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-slate-300" />
          <div className="flex gap-0.5 bg-slate-100/80 rounded-xl p-1">
            {([
              { label: 'Récent', value: 'recent' as const },
              { label: 'Ancien', value: 'oldest' as const },
              { label: 'A→Z',    value: 'az'     as const },
            ]).map(o => (
              <button key={o.value} onClick={() => setSort(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  sort === o.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-300">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune note trouvée</p>
          </div>
        ) : (
          filtered.map(note => (
            <NoteCard key={`${note.source}-${note.Guid}`} note={note} onClick={() => setOpenNote(note)} />
          ))
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-center text-slate-400 pb-4">
          {filtered.length.toLocaleString()} / {notes.length.toLocaleString()} notes · clic pour lire
        </p>
      )}
    </div>
  )
}
