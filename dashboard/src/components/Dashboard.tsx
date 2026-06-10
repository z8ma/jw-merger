import { useState } from 'react'
import { GitMerge, ArrowRight, RefreshCw, Smartphone, Monitor, Sparkles } from 'lucide-react'
import type { BackupData, Comparison } from '../types'
import { StatsGrid } from './StatsGrid'
import { NotesView } from './NotesView'
import { HighlightsView } from './HighlightsView'
import { TagsView } from './TagsView'
import { MergeModal } from './MergeModal'

const TABS = [
  { id: 'overview',   label: "Vue d'ensemble" },
  { id: 'notes',      label: 'Notes'          },
  { id: 'highlights', label: 'Surlignages'    },
  { id: 'tags',       label: 'Étiquettes'     },
]

interface Props {
  backupA: BackupData
  backupB: BackupData
  comparison: Comparison
  fileA: File
  fileB: File
  onReset: () => void
}

function DevicePill({ backup, color }: { backup: BackupData; color: 'blue' | 'amber' }) {
  const Icon = color === 'blue' ? Smartphone : Monitor
  const date = new Date(backup.manifest.userDataBackup.lastModifiedDate)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const s = color === 'blue'
    ? 'bg-blue-50 border-blue-200/80 text-blue-700'
    : 'bg-amber-50 border-amber-200/80 text-amber-700'
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${s}`}>
      <Icon size={13} />
      <span className="max-w-[100px] truncate">{backup.manifest.userDataBackup.deviceName}</span>
      <span className="opacity-40 font-normal">{date}</span>
    </div>
  )
}

function OverviewTab({ a, b, c }: { a: BackupData; b: BackupData; c: Comparison }) {
  const dA = a.manifest.userDataBackup.deviceName
  const dB = b.manifest.userDataBackup.deviceName
  return (
    <div className="flex flex-col gap-6">
      <StatsGrid statsA={a.stats} statsB={b.stats} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RepartitionCard title="Notes" onlyA={c.onlyA.notes} common={c.common.notes} onlyB={c.onlyB.notes} labelA={dA} labelB={dB} />
        <RepartitionCard title="Surlignages" onlyA={c.onlyA.marks} common={c.common.marks} onlyB={c.onlyB.marks} labelA={dA} labelB={dB} />
      </div>
    </div>
  )
}

function RepartitionCard({ title, onlyA, common, onlyB, labelA, labelB }: {
  title: string; onlyA: number; common: number; onlyB: number; labelA: string; labelB: string
}) {
  const total = onlyA + common + onlyB
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-5">{title}</h3>
      <div className="space-y-3 mb-5">
        <Bar label={`Seulement ${labelA}`} value={onlyA} total={total} color="bg-blue-400" textColor="text-blue-600" />
        <Bar label="Communes" value={common} total={total} color="bg-emerald-400" textColor="text-emerald-600" />
        <Bar label={`Seulement ${labelB}`} value={onlyB} total={total} color="bg-amber-400" textColor="text-amber-600" />
      </div>
      <p className="text-xs text-right text-slate-400">
        Total fusionné : <strong className="text-slate-700 text-sm">{total.toLocaleString()}</strong>
      </p>
    </div>
  )
}

function Bar({ label, value, total, color, textColor }: {
  label: string; value: number; total: number; color: string; textColor: string
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-500">{label}</span>
        <span className={`font-bold tabular-nums ${textColor}`}>{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Dashboard({ backupA, backupB, comparison, fileA, fileB, onReset }: Props) {
  const [tab, setTab] = useState('overview')
  const [showMerge, setShowMerge] = useState(false)

  const dA = backupA.manifest.userDataBackup.deviceName
  const dB = backupB.manifest.userDataBackup.deviceName
  const totalNew = comparison.onlyA.notes + comparison.onlyB.notes

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center gap-4">

            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <GitMerge size={15} className="text-white" />
              </div>
              <span className="font-black text-slate-800 text-sm hidden sm:block tracking-tight">JW Merger</span>
            </div>

            {/* Device pills */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <DevicePill backup={backupA} color="blue" />
              <ArrowRight size={13} className="text-slate-300 shrink-0" />
              <DevicePill backup={backupB} color="amber" />
            </div>

            <button onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors shrink-0 px-2 py-1.5 rounded-lg hover:bg-slate-50">
              <RefreshCw size={11} /> Reset
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6 flex gap-0 border-t border-slate-100">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === t.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}>
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6">
        {tab === 'overview'   && <OverviewTab a={backupA} b={backupB} c={comparison} />}
        {tab === 'notes'      && <NotesView notes={comparison.notes} allTags={[...backupA.tags, ...backupB.tags]} deviceA={dA} deviceB={dB} />}
        {tab === 'highlights' && <HighlightsView marks={comparison.marks} deviceA={dA} deviceB={dB} />}
        {tab === 'tags'       && <TagsView notes={comparison.notes} tagsA={backupA.tags} tagsB={backupB.tags} />}
      </main>

      {/* Footer CTA */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-slate-100 sticky bottom-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex gap-5 text-sm">
            <span>
              <strong className="text-slate-800 tabular-nums">{comparison.notes.length}</strong>
              <span className="text-slate-400 ml-1">notes</span>
            </span>
            <span>
              <strong className="text-slate-800 tabular-nums">{comparison.marks.length.toLocaleString()}</strong>
              <span className="text-slate-400 ml-1">surlignages</span>
            </span>
            {totalNew > 0 && (
              <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <Sparkles size={11} />+{totalNew} nouvelles notes
              </span>
            )}
          </div>
          <button
            onClick={() => setShowMerge(true)}
            className="btn-glow flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <GitMerge size={15} />
            Fusionner et télécharger
          </button>
        </div>
      </footer>

      {showMerge && (
        <MergeModal
          comparison={comparison}
          fileA={fileA}
          fileB={fileB}
          onClose={() => setShowMerge(false)}
        />
      )}
    </div>
  )
}
