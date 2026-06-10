import { useState, useMemo } from 'react'
import { BookOpen, FileText, Highlighter } from 'lucide-react'
import type { AnnotatedMark, NoteSource } from '../types'
import { BIBLE_BOOKS } from '../lib/bibleBooks'

const HL_COLORS: Record<number, { bg: string; ring: string; label: string; dot: string }> = {
  1: { bg: '#fef9c3', ring: '#fde047', label: 'Jaune',  dot: '#eab308' },
  2: { bg: '#dcfce7', ring: '#86efac', label: 'Vert',   dot: '#22c55e' },
  3: { bg: '#dbeafe', ring: '#93c5fd', label: 'Bleu',   dot: '#3b82f6' },
  4: { bg: '#ffedd5', ring: '#fdba74', label: 'Orange', dot: '#f97316' },
  5: { bg: '#fce7f3', ring: '#f9a8d4', label: 'Rose',   dot: '#ec4899' },
  6: { bg: '#ede9fe', ring: '#c4b5fd', label: 'Violet', dot: '#a855f7' },
}

const SOURCE_STYLE: Record<NoteSource, string> = {
  a:      'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  b:      'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
  common: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
}
const SOURCE_LABEL: Record<NoteSource, string> = { a: 'Tél', b: 'PC', common: '=' }

interface Props { marks: AnnotatedMark[]; deviceA: string; deviceB: string }

export function HighlightsView({ marks, deviceA, deviceB }: Props) {
  const [colorFilter,  setColorFilter]  = useState<number | null>(null)
  const [sourceFilter, setSourceFilter] = useState<NoteSource | 'all'>('all')
  const [withNoteOnly, setWithNoteOnly] = useState(false)

  const filtered = useMemo(() => marks.filter(m => {
    if (colorFilter  !== null && m.ColorIndex !== colorFilter) return false
    if (sourceFilter !== 'all' && m.source !== sourceFilter)   return false
    if (withNoteOnly && !m.hasNote) return false
    return true
  }), [marks, colorFilter, sourceFilter, withNoteOnly])

  const colorCounts = useMemo(() => {
    const map: Record<number, number> = {}
    for (const m of marks) map[m.ColorIndex] = (map[m.ColorIndex] ?? 0) + 1
    return map
  }, [marks])

  const counts = {
    a:      marks.filter(m => m.source === 'a').length,
    b:      marks.filter(m => m.source === 'b').length,
    common: marks.filter(m => m.source === 'common').length,
  }

  const locationLabel = (m: AnnotatedMark) => {
    if (m.bookNumber) {
      const book = BIBLE_BOOKS[m.bookNumber] ?? `Livre ${m.bookNumber}`
      return m.chapterNumber ? `${book} ${m.chapterNumber}` : book
    }
    return m.locationTitle ?? m.keySymbol ?? '—'
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center bg-white rounded-2xl border border-slate-100 shadow-sm p-4">

        {/* Couleurs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">Couleur</span>
          <button
            onClick={() => setColorFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              colorFilter === null ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>
            Toutes
          </button>
          {Object.entries(HL_COLORS).map(([idx, c]) => {
            const n = colorCounts[Number(idx)] ?? 0
            if (!n) return null
            const active = colorFilter === Number(idx)
            return (
              <button key={idx} title={c.label}
                onClick={() => setColorFilter(active ? null : Number(idx))}
                className="relative w-7 h-7 rounded-full transition-all flex items-center justify-center"
                style={{
                  backgroundColor: c.dot,
                  boxShadow: active ? `0 0 0 3px white, 0 0 0 5px ${c.dot}` : 'none',
                  transform: active ? 'scale(1.2)' : 'scale(1)',
                }}>
                {active && <span className="text-white text-[10px] font-bold">✓</span>}
              </button>
            )
          })}
        </div>

        <div className="h-5 w-px bg-slate-100 hidden sm:block" />

        {/* Source */}
        <div className="flex gap-0.5 bg-slate-100/80 rounded-xl p-1">
          {(['all', 'a', 'b', 'common'] as const).map(s => {
            const label = s === 'all' ? 'Tous' : s === 'a' ? deviceA : s === 'b' ? deviceB : 'Communs'
            const count = s === 'all' ? marks.length : counts[s as NoteSource]
            return (
              <button key={s} onClick={() => setSourceFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  sourceFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {label}
                <span className={`ml-1 tabular-nums ${sourceFilter === s ? 'text-slate-400' : 'text-slate-400/60'}`}>{count.toLocaleString()}</span>
              </button>
            )
          })}
        </div>

        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={withNoteOnly} onChange={e => setWithNoteOnly(e.target.checked)}
            className="rounded accent-indigo-600" />
          Avec note uniquement
        </label>
      </div>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-300">
          <Highlighter size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun surlignage trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filtered.map(m => {
            const color = HL_COLORS[m.ColorIndex]
            return (
              <div
                key={`${m.source}-${m.UserMarkGuid}`}
                className="rounded-xl border shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:-translate-y-px"
                style={{ borderColor: color?.ring ?? '#e2e8f0' }}
              >
                {/* Bande couleur */}
                <div className="h-1.5" style={{ backgroundColor: color?.dot ?? '#94a3b8' }} />

                <div className="p-3 flex items-center gap-2.5"
                  style={{ backgroundColor: color ? color.bg : '#f8fafc' }}>
                  {/* Localisation */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-0.5">
                      <BookOpen size={11} className="shrink-0 text-slate-400" />
                      <span className="truncate">{locationLabel(m)}</span>
                    </div>
                    {m.hasNote && (
                      <div className="flex items-center gap-1 text-[11px] text-indigo-500 font-medium">
                        <FileText size={10} />note attachée
                      </div>
                    )}
                  </div>

                  {/* Badge source */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${SOURCE_STYLE[m.source]}`}>
                    {SOURCE_LABEL[m.source]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-center text-slate-400 pb-4">
          {filtered.length.toLocaleString()} / {marks.length.toLocaleString()} surlignages
        </p>
      )}
    </div>
  )
}
