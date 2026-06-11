import { GitMerge, ShieldCheck, Zap, BookOpen, Smartphone, ArrowRight, Upload, BarChart2, Download, Check } from 'lucide-react'

interface Props {
  onStart: () => void
}

const FEATURES = [
  {
    icon: GitMerge,
    title: 'Fusion intelligente',
    desc: 'Notes, surlignages, signets, étiquettes — tout est fusionné sans écraser les données de l\'autre appareil.',
    color: 'indigo',
  },
  {
    icon: ShieldCheck,
    title: '100 % local',
    desc: 'Rien n\'est envoyé sur internet. Tout se passe dans ton navigateur, tes données restent chez toi.',
    color: 'emerald',
  },
  {
    icon: BookOpen,
    title: 'Zéro perte',
    desc: 'Si une note existe sur un appareil mais pas sur l\'autre, elle est conservée. Aucune donnée n\'est sacrifiée.',
    color: 'violet',
  },
  {
    icon: Smartphone,
    title: 'Multi-appareils',
    desc: 'Téléphone, tablette, PC — peu importe la source, le merger gère les conflits entre toutes les versions.',
    color: 'amber',
  },
]

const STEPS = [
  {
    num: '01',
    icon: Upload,
    label: 'Dépose tes sauvegardes',
    desc: 'Exporte tes fichiers .jwlibrary depuis JW Library sur chacun de tes appareils et dépose-les ici.',
  },
  {
    num: '02',
    icon: BarChart2,
    label: 'Compare les données',
    desc: 'Visualise les différences : notes exclusives, surlignages en conflit, étiquettes manquantes.',
  },
  {
    num: '03',
    icon: Download,
    label: 'Télécharge le fichier fusionné',
    desc: 'Un seul fichier .jwlibrary prêt à être restauré sur tous tes appareils, sans rien perdre.',
  },
]

const INCLUDED = [
  'Notes & annotations',
  'Surlignages & couleurs',
  'Signets',
  'Étiquettes & favoris',
  'Listes de lecture',
  'Réponses d\'étude',
]

export function Hero({ onStart }: Props) {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-5xl mx-auto border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <GitMerge size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 text-sm">JW Library Merger</span>
        </div>
        <button
          onClick={onStart}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          Lancer l'outil <ArrowRight size={12} />
        </button>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-20 max-w-3xl mx-auto">

        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium tracking-wide mb-8">
          <ShieldCheck size={11} className="text-emerald-500" />
          Gratuit · Open source · 100 % dans ton navigateur
        </div>

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 40px rgba(99,102,241,0.3)' }}>
          <GitMerge size={36} className="text-white" />
        </div>

        <h1 className="text-5xl font-black tracking-tight leading-none mb-5 text-slate-900">
          Fusionne tes sauvegardes<br />
          <span style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            JW Library
          </span>
          {' '}sans perdre<br />une seule donnée
        </h1>

        <p className="text-slate-500 text-lg leading-relaxed max-w-xl mb-10">
          JW Library ne synchronise pas tes données entre appareils. Résultat : restaurer une sauvegarde
          écrase tout ce que tu as fait sur l'autre. Ce merger règle ce problème une bonne fois pour toutes.
        </p>

        <button
          onClick={onStart}
          className="flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold tracking-wide text-white transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 4px 24px rgba(99,102,241,0.35)' }}
        >
          <Zap size={16} />
          Commencer la fusion
          <ArrowRight size={16} />
        </button>

        <p className="mt-4 text-xs text-slate-400">Aucune installation · fonctionne sur Mac, Windows, iOS, Android</p>
      </section>

      {/* Problème / Solution */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-6 border border-red-100 bg-red-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-500 text-xs font-bold">✕</span>
              </div>
              <span className="text-xs font-semibold text-red-500 uppercase tracking-widest">Le problème</span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Tu notes un verset sur ton téléphone, puis tu surlignes des passages sur ta tablette.
              Quand tu restaures une sauvegarde, <strong className="text-slate-800">tout ce que tu as fait sur l'autre appareil disparaît.</strong> JW Library n'a pas de sync.
            </p>
          </div>
          <div className="rounded-2xl p-6 border border-emerald-100 bg-emerald-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check size={12} className="text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">La solution</span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              JW Library Merger analyse les deux sauvegardes, identifie les différences,
              et <strong className="text-slate-800">génère un fichier unique qui contient absolument tout</strong> — les données des deux appareils fusionnées intelligemment.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-slate-900 mb-2">Conçu pour ne rien perdre</h2>
          <p className="text-slate-400 text-sm">Chaque type de donnée est fusionné avec sa propre logique.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => {
            const colorMap: Record<string, { icon: string; bg: string; border: string }> = {
              indigo:  { icon: 'text-indigo-500',  bg: 'bg-indigo-50',  border: 'border-indigo-100'  },
              emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              violet:  { icon: 'text-violet-500',  bg: 'bg-violet-50',  border: 'border-violet-100'  },
              amber:   { icon: 'text-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-100'   },
            }
            const c = colorMap[f.color]
            return (
              <div key={f.title} className={`rounded-2xl p-6 border ${c.border} ${c.bg}`}>
                <f.icon size={20} className={`${c.icon} mb-3`} />
                <h3 className="text-sm font-bold text-slate-800 mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Ce qui est fusionné */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl p-8 border border-slate-100 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Ce qui est fusionné</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INCLUDED.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Check size={10} className="text-emerald-600" />
                </div>
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-slate-900 mb-2">Comment ça marche</h2>
          <p className="text-slate-400 text-sm">Trois étapes, moins de deux minutes.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-4">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex flex-col sm:flex-row items-start gap-4 flex-1">
              <div className="rounded-2xl p-6 border border-slate-100 bg-white flex-1 w-full shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[11px] font-bold text-slate-300 tabular-nums">{s.num}</span>
                  <s.icon size={16} className="text-indigo-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1.5">{s.label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:flex items-center self-center shrink-0">
                  <ArrowRight size={14} className="text-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-xl mx-auto px-6 pb-24 text-center">
        <div className="rounded-2xl p-10 border border-slate-100 bg-slate-50 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900 mb-3">Prêt à fusionner ?</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Aucune donnée ne quitte ton appareil. Aucun compte requis.
            Juste tes deux fichiers .jwlibrary et le tour est joué.
          </p>
          <button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-bold tracking-wide text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 4px 24px rgba(99,102,241,0.3)' }}
          >
            <Zap size={16} />
            Lancer le merger
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-10 text-slate-400 text-xs border-t border-slate-100 pt-8">
        JW Library Merger · Projet open source · Aucune affiliation avec JW.org
      </footer>

    </div>
  )
}
