import { Loader2, Upload, GitMerge, BarChart2, Download, ShieldCheck, Zap } from 'lucide-react'
import { DropZone } from './DropZone'
import type { BackupData } from '../types'

interface Props {
  backupA: BackupData | null
  backupB: BackupData | null
  loadingSlot: 'a' | 'b' | null
  error: string | null
  onFileA: (f: File) => void
  onFileB: (f: File) => void
  onCompare: () => void
}

const STEPS = [
  { icon: Upload,   num: '01', label: 'Dépose', desc: 'Tes deux sauvegardes .jwlibrary' },
  { icon: BarChart2,num: '02', label: 'Compare', desc: 'Notes, surlignages, étiquettes' },
  { icon: Download, num: '03', label: 'Fusionne', desc: 'Un seul fichier, zéro perte' },
]

export function Landing({ backupA, backupB, loadingSlot, error, onFileA, onFileB, onCompare }: Props) {
  const bothLoaded = backupA && backupB
  const isLoading  = loadingSlot !== null

  return (
    <div className="landing-bg min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Glow orbs décoratifs */}
      <div className="pointer-events-none absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute bottom-[-80px] right-1/4 w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />

      <div className="w-full max-w-xl relative z-10">

        {/* Badge "100% local" */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium tracking-wide">
            <ShieldCheck size={12} className="text-emerald-400" />
            Tout se passe dans ton navigateur · aucune donnée envoyée
          </div>
        </div>

        {/* Titre */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 relative"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 40px rgba(99,102,241,0.5)' }}>
            <GitMerge size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none mb-3">
            JW Library<br />
            <span style={{ background: 'linear-gradient(90deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Merger
            </span>
          </h1>
          <p className="text-white/40 text-base leading-relaxed max-w-sm mx-auto">
            Fusionne intelligemment tes sauvegardes entre appareils sans perdre une seule note ni un seul surlignage.
          </p>
        </div>

        {/* Étapes */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 glass rounded-xl px-3.5 py-2.5">
                <span className="text-[10px] font-bold text-white/20 tabular-nums">{s.num}</span>
                <s.icon size={14} className="text-indigo-300" />
                <div>
                  <p className="text-xs font-semibold text-white/80 leading-none">{s.label}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 leading-tight max-w-[90px]">{s.desc}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-5 h-px bg-white/10 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Drop zones */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {loadingSlot === 'a' ? (
            <LoadingSlot color="blue" />
          ) : (
            <DropZone
              label="Sauvegarde A"
              color="blue"
              variant="dark"
              onFile={onFileA}
              loaded={!!backupA}
              fileName={backupA?.manifest.userDataBackup.deviceName}
              subtitle={backupA ? `${backupA.stats.notes} notes · ${backupA.stats.userMarks.toLocaleString()} surlignages` : undefined}
            />
          )}
          {loadingSlot === 'b' ? (
            <LoadingSlot color="amber" />
          ) : (
            <DropZone
              label="Sauvegarde B"
              color="amber"
              variant="dark"
              onFile={onFileB}
              loaded={!!backupB}
              fileName={backupB?.manifest.userDataBackup.deviceName}
              subtitle={backupB ? `${backupB.stats.notes} notes · ${backupB.stats.userMarks.toLocaleString()} surlignages` : undefined}
            />
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={onCompare}
          disabled={!bothLoaded || isLoading}
          className={`btn-glow w-full py-4 rounded-xl text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 ${
            bothLoaded && !isLoading
              ? 'text-white cursor-pointer'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
          style={bothLoaded && !isLoading ? {
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          } : {}}
        >
          {isLoading ? (
            <><Loader2 size={16} className="animate-spin" />Analyse en cours…</>
          ) : (
            <><Zap size={16} />Analyser les deux sauvegardes</>
          )}
        </button>
      </div>
    </div>
  )
}

function LoadingSlot({ color }: { color: 'blue' | 'amber' }) {
  const glow = color === 'blue' ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.2)'
  return (
    <div className="glass flex flex-col items-center justify-center gap-2.5 py-10 rounded-2xl"
      style={{ boxShadow: `0 0 30px ${glow}` }}>
      <Loader2 size={20} className={color === 'blue' ? 'text-indigo-400 animate-spin' : 'text-amber-400 animate-spin'} />
      <p className="text-xs text-white/40">Analyse…</p>
    </div>
  )
}
