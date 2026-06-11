import { useState } from 'react'
import { GitMerge, Download, X, CheckCircle, Loader2, FileText, Highlighter, Tag, PenLine, Layers } from 'lucide-react'
import type { Comparison, HighlightChoices } from '../types'
import { mergeBackups } from '../lib/merge'
import { ConflictResolver } from './ConflictResolver'

interface Props {
  comparison: Comparison
  fileA: File
  fileB: File
  onClose: () => void
}

type Phase = 'conflicts' | 'confirm' | 'merging' | 'done'

export function MergeModal({ comparison, fileA, fileB, onClose }: Props) {
  const hasConflicts = comparison.publicationGroups.length > 0

  const [phase, setPhase] = useState<Phase>(hasConflicts ? 'conflicts' : 'confirm')
  const [choices, setChoices] = useState<HighlightChoices>(() => ({
    perPublication: Object.fromEntries(comparison.publicationGroups.map(g => [g.keySymbol, 'both' as const])),
    excludedGuids:  new Set<string>(),
  }))
  const [progress, setProgress] = useState('')
  const [blob, setBlob] = useState<Blob | null>(null)

  const nameA = fileA.name.replace('.jwlibrary', '')
  const nameB = fileB.name.replace('.jwlibrary', '')

  const totalNotes = comparison.notes.length
  const newNotes   = comparison.onlyA.notes + comparison.onlyB.notes
  const totalMarks = comparison.marks.length
  const newMarks   = comparison.onlyA.marks + comparison.onlyB.marks

  const handleMerge = async () => {
    setPhase('merging')
    try {
      const result = await mergeBackups(fileA, fileB, p => setProgress(p.step), choices)
      setBlob(result)
      setPhase('done')
    } catch (e) {
      setProgress(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const handleDownload = () => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Merged_${new Date().toISOString().slice(0, 10)}.jwlibrary`
    a.click()
    URL.revokeObjectURL(url)
  }

  const title = {
    conflicts: `Conflits de surlignage (${comparison.publicationGroups.length})`,
    confirm:   'Fusion des sauvegardes',
    merging:   'Fusion en cours…',
    done:      'Fusion terminée !',
  }[phase]

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden transition-all duration-300 ${phase === 'conflicts' ? 'max-w-3xl' : 'max-w-lg'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {phase === 'conflicts'
              ? <Layers size={18} className="text-amber-500" />
              : <GitMerge size={18} className="text-indigo-600" />
            }
            <h2 className="font-semibold text-slate-800">{title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">

          {/* Conflicts */}
          {phase === 'conflicts' && (
            <ConflictResolver
              groups={comparison.publicationGroups}
              nameA={nameA}
              nameB={nameB}
              choices={choices}
              onChange={setChoices}
              onContinue={() => setPhase('confirm')}
            />
          )}

          {/* Confirm */}
          {phase === 'confirm' && (
            <>
              <p className="text-sm text-slate-500 mb-5">
                Voici ce qui sera produit dans le fichier fusionné :
              </p>
              <div className="space-y-3 mb-6">
                <StatRow icon={<FileText size={15} />} label="Notes" total={totalNotes} newCount={newNotes} color="text-blue-600" />
                <StatRow icon={<Highlighter size={15} />} label="Surlignages" total={totalMarks} newCount={newMarks} color="text-purple-600" />
                <StatRow icon={<Tag size={15} />} label="Étiquettes" total={0} newCount={0} info="Déduplication automatique" color="text-amber-600" />
                <StatRow icon={<PenLine size={15} />} label="Champs d'étude" total={0} newCount={0} info="Union + concat si différents" color="text-emerald-600" />
              </div>
              {hasConflicts && (
                <div className="bg-amber-50 rounded-xl px-4 py-3 text-xs text-amber-700 mb-5 flex items-center gap-2">
                  <Layers size={13} className="shrink-0" />
                  <span>
                    Choix personnalisés pour {comparison.publicationGroups.length} publication(s)
                    {choices.excludedGuids.size > 0 && ` · ${choices.excludedGuids.size} surlignage(s) exclus`}.
                    <button onClick={() => setPhase('conflicts')} className="underline ml-1 hover:text-amber-900">Modifier</button>
                  </span>
                </div>
              )}
              {!hasConflicts && (
                <div className="bg-indigo-50 rounded-xl px-4 py-3 text-xs text-indigo-700 mb-5">
                  Les conflits sont résolus automatiquement : notes identiques dédupliquées, différentes concaténées.
                </div>
              )}
            </>
          )}

          {/* Merging */}
          {phase === 'merging' && (
            <div className="flex flex-col items-center py-4 gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <Loader2 size={28} className="text-indigo-600 animate-spin" />
              </div>
              <p className="text-sm text-slate-600 text-center">{progress || 'Initialisation…'}</p>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full animate-pulse w-2/3" />
              </div>
            </div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 pt-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle size={24} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Fusion terminée !</p>
                  <p className="text-xs text-slate-400">Le fichier est prêt à être restauré</p>
                </div>
              </div>

              {/* Résumé détaillé */}
              <div className="w-full grid grid-cols-2 gap-2">
                <SummaryTile color="blue"    label={`Notes de ${nameA}`}        value={`+${comparison.onlyA.notes}`}  />
                <SummaryTile color="amber"   label={`Notes de ${nameB}`}        value={`+${comparison.onlyB.notes}`}  />
                <SummaryTile color="blue"    label={`Surlignages de ${nameA}`}  value={`+${comparison.onlyA.marks}`}  />
                <SummaryTile color="amber"   label={`Surlignages de ${nameB}`}  value={`+${comparison.onlyB.marks}`}  />
                <SummaryTile color="emerald" label="Notes communes"             value={String(comparison.common?.notes ?? totalNotes - comparison.onlyA.notes - comparison.onlyB.notes)} />
                <SummaryTile color="violet"  label="Conflits résolus"           value={String(comparison.publicationGroups.length)} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2">
          {phase === 'confirm' && (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors">
                Annuler
              </button>
              <button
                onClick={handleMerge}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
              >
                Fusionner maintenant
              </button>
            </>
          )}
          {phase === 'done' && (
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
            >
              <Download size={15} />
              Télécharger .jwlibrary
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryTile({ color, label, value }: { color: string; label: string; value: string }) {
  const styles: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-700 border-blue-100',
    amber:   'bg-amber-50 text-amber-700 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    violet:  'bg-violet-50 text-violet-700 border-violet-100',
  }
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${styles[color]}`}>
      <p className="text-lg font-black tabular-nums">{value}</p>
      <p className="text-[11px] opacity-70 leading-tight mt-0.5 truncate">{label}</p>
    </div>
  )
}

function StatRow({
  icon, label, total, newCount, info, color,
}: {
  icon: React.ReactNode
  label: string
  total: number
  newCount: number
  info?: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`${color} opacity-70`}>{icon}</span>
      <span className="flex-1 text-sm text-slate-700">{label}</span>
      {info ? (
        <span className="text-xs text-slate-400">{info}</span>
      ) : (
        <div className="text-right">
          <span className="text-sm font-semibold text-slate-800 tabular-nums">{total}</span>
          {newCount > 0 && (
            <span className="text-xs text-emerald-600 ml-1.5">+{newCount} nouvelles</span>
          )}
        </div>
      )}
    </div>
  )
}
