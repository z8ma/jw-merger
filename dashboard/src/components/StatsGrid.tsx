import { FileText, Highlighter, Bookmark, PenLine, ListVideo, Tag } from 'lucide-react'
import type { BackupStats } from '../types'

const ITEMS = [
  { icon: FileText,   label: 'Notes',        key: 'notes'        as const },
  { icon: Highlighter,label: 'Surlignages',  key: 'userMarks'    as const },
  { icon: Bookmark,   label: 'Signets',      key: 'bookmarks'    as const },
  { icon: PenLine,    label: 'Champs étude', key: 'inputFields'  as const },
  { icon: ListVideo,  label: 'Playlists',    key: 'playlistItems'as const },
  { icon: Tag,        label: 'Étiquettes',   key: 'tags'         as const },
]

interface Props { statsA: BackupStats; statsB: BackupStats }

export function StatsGrid({ statsA, statsB }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {ITEMS.map(({ icon: Icon, label, key }) => {
        const a = statsA[key]
        const b = statsB[key]
        const pct = a + b > 0 ? Math.round((a / (a + b)) * 100) : 50
        return (
          <div key={label}
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
                <Icon size={13} className="text-slate-400" />
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{label}</span>
            </div>

            <div className="flex items-end justify-between gap-1">
              <div>
                <p className="stat-num-a text-xl font-black tabular-nums leading-none">{a.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">A</p>
              </div>
              <div className="text-right">
                <p className="stat-num-b text-xl font-black tabular-nums leading-none">{b.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">B</p>
              </div>
            </div>

            {/* Mini barre A/B */}
            <div className="h-1 rounded-full bg-amber-200 overflow-hidden">
              <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
