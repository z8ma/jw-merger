import { Loader2, Upload, GitMerge, BarChart2, Download, ShieldCheck, Smartphone, Monitor, ArrowRight, ArrowLeft, FileArchive } from 'lucide-react'
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
  onBack: () => void
}

const TUTORIAL_STEPS = [
  {
    num: '01',
    icon: Smartphone,
    title: 'Exporte depuis chaque appareil',
    desc: 'Dans JW Library, ouvre le menu principal, va dans "Étude individuelle" puis "Créer une sauvegarde" pour générer le fichier .jwlibrary.',
    badge: 'Menu → Étude individuelle → Sauvegarder',
    color: 'blue',
  },
  {
    num: '02',
    icon: Monitor,
    title: 'Transfère les fichiers ici',
    desc: 'Envoie les deux fichiers sur cet appareil via AirDrop, email, Google Drive ou câble USB.',
    badge: 'AirDrop · Drive · Email',
    color: 'violet',
  },
  {
    num: '03',
    icon: Upload,
    title: 'Dépose-les ci-contre',
    desc: 'Glisse tes deux fichiers dans les zones de dépôt. L\'analyse démarre automatiquement.',
    badge: 'Glisser-déposer ou clic',
    color: 'indigo',
  },
  {
    num: '04',
    icon: Download,
    title: 'Télécharge le fichier fusionné',
    desc: 'Récupère ton .jwlibrary fusionné et restaure-le sur tous tes appareils. Rien de perdu.',
    badge: 'Zéro perte garantie',
    color: 'emerald',
  },
]

const BADGE_COLORS: Record<string, string> = {
  blue:    'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  violet:  'bg-violet-50 text-violet-600 ring-1 ring-violet-200',
  indigo:  'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
}

const ICON_COLORS: Record<string, string> = {
  blue:    'bg-blue-100 text-blue-500',
  violet:  'bg-violet-100 text-violet-500',
  indigo:  'bg-indigo-100 text-indigo-500',
  emerald: 'bg-emerald-100 text-emerald-500',
}

const CONNECTOR_COLORS: Record<string, string> = {
  blue:    'bg-blue-100',
  violet:  'bg-violet-100',
  indigo:  'bg-indigo-100',
  emerald: 'bg-emerald-100',
}

export function Landing({ backupA, backupB, loadingSlot, error, onFileA, onFileB, onCompare, onBack }: Props) {
  const bothLoaded = backupA && backupB
  const isLoading  = loadingSlot !== null

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <GitMerge size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-800 text-sm">JW Library Merger</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft size={13} />
              Retour
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={12} className="text-emerald-500" />
              100 % local · aucune donnée envoyée
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-start">

        {/* ─── Tutoriel ─── */}
        <div>
          <div className="mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold ring-1 ring-indigo-200 mb-3">
              Guide pas-à-pas
            </span>
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Comment fusionner tes sauvegardes
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed max-w-lg">
              JW Library ne synchronise pas tes données entre appareils. Ce guide t'explique comment
              récupérer tes deux sauvegardes et les fusionner sans perdre une seule note.
            </p>
          </div>

          {/* Étapes */}
          <div className="space-y-1">
            {TUTORIAL_STEPS.map((step, i) => (
              <div key={step.num}>
                <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                  {/* Icône */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ICON_COLORS[step.color]}`}>
                    <step.icon size={18} />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-300 tabular-nums">{step.num}</span>
                        <h3 className="text-sm font-bold text-slate-800">{step.title}</h3>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${BADGE_COLORS[step.color]}`}>
                        {step.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>

                {/* Connecteur */}
                {i < TUTORIAL_STEPS.length - 1 && (
                  <div className="flex justify-start ml-9">
                    <div className={`w-0.5 h-3 ${CONNECTOR_COLORS[TUTORIAL_STEPS[i + 1].color]} rounded-full`} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Note JW Library export */}
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <FileArchive size={15} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">Où trouver l'export dans JW Library ?</p>
                <div className="flex flex-wrap items-center gap-1 text-xs text-amber-700">
                  <span className="px-2 py-0.5 bg-amber-100 rounded font-medium">Menu</span>
                  <ArrowRight size={10} />
                  <span className="px-2 py-0.5 bg-amber-100 rounded font-medium">Étude individuelle</span>
                  <ArrowRight size={10} />
                  <span className="px-2 py-0.5 bg-amber-100 rounded font-medium">Créer une sauvegarde</span>
                </div>
                <p className="text-[11px] text-amber-600 mt-2">
                  Le fichier exporté porte l'extension <strong>.jwlibrary</strong> — répète l'opération sur chacun de tes appareils.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Upload ─── */}
        <div className="lg:sticky lg:top-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

            <div className="mb-5">
              <h2 className="text-base font-black text-slate-900 mb-1">Dépose tes deux sauvegardes</h2>
              <p className="text-xs text-slate-400">Fichiers .jwlibrary · glisser-déposer ou clic pour sélectionner</p>
            </div>

            {/* Drop zones */}
            <div className="flex flex-col gap-3 mb-4">

              {/* Slot A */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-[9px] font-black text-white">A</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">Premier appareil</span>
                </div>
                {loadingSlot === 'a' ? (
                  <LoadingSlot color="blue" />
                ) : (
                  <DropZone
                    label="Sauvegarde A"
                    color="blue"
                    variant="light"
                    onFile={onFileA}
                    loaded={!!backupA}
                    fileName={backupA?.manifest.userDataBackup.deviceName}
                    subtitle={backupA ? `${backupA.stats.notes} notes · ${backupA.stats.userMarks.toLocaleString()} surlignages` : undefined}
                  />
                )}
              </div>

              {/* Séparateur */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">et</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Slot B */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-[9px] font-black text-white">B</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">Deuxième appareil</span>
                </div>
                {loadingSlot === 'b' ? (
                  <LoadingSlot color="amber" />
                ) : (
                  <DropZone
                    label="Sauvegarde B"
                    color="amber"
                    variant="light"
                    onFile={onFileB}
                    loaded={!!backupB}
                    fileName={backupB?.manifest.userDataBackup.deviceName}
                    subtitle={backupB ? `${backupB.stats.notes} notes · ${backupB.stats.userMarks.toLocaleString()} surlignages` : undefined}
                  />
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={onCompare}
              disabled={!bothLoaded || isLoading}
              className={`w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 ${
                bothLoaded && !isLoading
                  ? 'text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              style={bothLoaded && !isLoading ? {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
              } : {}}
            >
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin" />Analyse en cours…</>
              ) : (
                <><BarChart2 size={16} />Analyser les deux sauvegardes</>
              )}
            </button>

            {/* Info footer */}
            {!bothLoaded && !isLoading && (
              <p className="text-center text-[11px] text-slate-400 mt-3">
                Dépose les deux fichiers pour continuer
              </p>
            )}
            {bothLoaded && (
              <p className="text-center text-[11px] text-emerald-600 mt-3 font-medium">
                Les deux sauvegardes sont prêtes · clique pour analyser
              </p>
            )}
          </div>

          {/* Sécurité note */}
          <div className="flex items-start gap-2.5 px-4 pt-4">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tes fichiers ne quittent jamais ton appareil. Tout le traitement se fait dans ton navigateur, hors ligne si nécessaire.
            </p>
          </div>
        </div>

      </main>
    </div>
  )
}

function LoadingSlot({ color }: { color: 'blue' | 'amber' }) {
  const s = color === 'blue'
    ? { bg: 'bg-blue-50', border: 'border-blue-200', spin: 'text-blue-400' }
    : { bg: 'bg-amber-50', border: 'border-amber-200', spin: 'text-amber-400' }
  return (
    <div className={`flex items-center justify-center gap-2.5 py-8 rounded-2xl border-2 border-dashed ${s.bg} ${s.border}`}>
      <Loader2 size={16} className={`${s.spin} animate-spin`} />
      <p className="text-xs text-slate-400">Analyse en cours…</p>
    </div>
  )
}
