import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, BookOpen, Calendar, SlidersHorizontal } from 'lucide-react'
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

function NoteCard({ note }: { note: AnnotatedNote }) {
  const [expanded, setExpanded] = useState(false)
  const content    = note.Content?.trim() ?? ''
  const isTrunc    = content.length > 220
  const preview    = isTrunc ? content.slice(0, 220) + '…' : content
  const bibleRef   = formatBibleRef(note.bookNumber, note.chapterNumber)
  const location   = bibleRef ?? note.locationTitle
  const created    = new Date(note.Created)
  const modified   = new Date(note.LastModified)
  const wasEdited  = Math.abs(modified.getTime() - created.getTime()) > 60_000

  return (
    <div className={`bg-white rounded-xl border border-slate-100 border-l-4 ${SOURCE_BORDER[note.source]} p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-px`}>
      <div className="flex items-start gap-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${SOURCE_BADGE[note.source]}`}>
          {SOURCE_LABEL[note.source]}
        </span>
        <div className="flex-1 min-w-0">
          {note.Title && (
            <p className="text-sm font-bold text-slate-800 leading-snug mb-1.5 line-clamp-2">{note.Title}</p>
          )}
          {content && (
            <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">
              {expanded ? content : preview}
            </p>
          )}
          {isTrunc && (
            <button onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 mt-1 text-xs text-slate-400 hover:text-indigo-500 transition-colors">
              {expanded ? <><ChevronUp size={11} />Réduire</> : <><ChevronDown size={11} />Voir plus</>}
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {location && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-slate-50 rounded-full text-slate-500 border border-slate-100 font-medium">
                <BookOpen size={10} />{location}
              </span>
            )}
            {note.tags.map(tag => (
              <span key={tag.TagId} className="text-[11px] px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium border border-indigo-100/80">
                {tag.Name}
              </span>
            ))}
            <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-300">
              <Calendar size={10} />
              <span>{created.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              {wasEdited && <span className="text-[10px]">· éditée {modified.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
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

        {/* Source */}
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

        {/* Date */}
        <div className="flex gap-0.5 bg-slate-100/80 rounded-xl p-1">
          {([
            { label: 'Tout', value: 'all' as const },
            { label: '7j',   value: 'week' as const },
            { label: 'Mois', value: 'month' as const },
            { label: 'Année',value: 'year' as const },
          ]).map(f => (
            <button key={f.value} onClick={() => setDateFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                dateFilter === f.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Tag */}
        {uniqueTags.length > 0 && (
          <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-600 outline-none focus:border-indigo-400 cursor-pointer shadow-sm">
            <option value="all">Toutes les étiquettes</option>
            {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        {/* Sort */}
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
          filtered.map(note => <NoteCard key={`${note.source}-${note.Guid}`} note={note} />)
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-center text-slate-400 pb-4">
          {filtered.length.toLocaleString()} / {notes.length.toLocaleString()} notes
        </p>
      )}
    </div>
  )
}
