import { useState } from 'react'
import { BookOpen, FileText, ChevronRight, Check, Minus } from 'lucide-react'
import type { PublicationHighlightGroup, HighlightItem, HighlightChoices, HighlightSource } from '../types'

// ------------------------------------------------------------------ //
// Données de présentation                                              //
// ------------------------------------------------------------------ //

const PUB_NAMES: Record<string, string> = {
  nwt: 'Bible (NWT)', nwtsty: 'Bible (NWT)', bi12: 'Bible',
  w: 'Tour de Garde', wp: 'Tour de Garde (pub.)', g: 'Réveillez-vous !',
  jy: 'La vie de Jésus', lff: 'Apprendre de Dieu', lffi: 'Apprendre de Dieu (i)',
  th: 'Améliorez votre ministère', mwb: 'Vie & Ministère', bt: 'Soyez mes témoins',
  rsg: 'Questions sur la vie', bhs: 'Famille heureuse', ia: 'Intégrité totale',
  cl: 'Rapprochez-vous de Dieu', kr: 'Le Royaume de Dieu', snnw: 'Chants',
}

function pubLabel(ks: string, isBible: boolean) {
  if (isBible) return PUB_NAMES[ks] ?? `Bible (${ks})`
  return PUB_NAMES[ks] ?? ks
}

// ColorIndex → Tailwind bg
const COLOR_BG: Record<number, string> = {
  1: 'bg-yellow-300',
  2: 'bg-orange-400',
  3: 'bg-pink-400',
  4: 'bg-purple-400',
  5: 'bg-green-400',
  6: 'bg-teal-400',
}

// ------------------------------------------------------------------ //
// Props                                                                //
// ------------------------------------------------------------------ //

interface Props {
  groups: PublicationHighlightGroup[]
  nameA: string
  nameB: string
  choices: HighlightChoices
  onChange: (choices: HighlightChoices) => void
  onContinue: () => void
}

// ------------------------------------------------------------------ //
// Composant principal                                                  //
// ------------------------------------------------------------------ //

export function ConflictResolver({ groups, nameA, nameB, choices, onChange, onContinue }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(groups[0]?.keySymbol ?? null)

  const selectedGroup = groups.find(g => g.keySymbol === selectedKey) ?? null

  const pubSource = (ks: string): HighlightSource =>
    choices.perPublication[ks] ?? 'both'

  const setPubSource = (ks: string, src: HighlightSource) => {
    const group = groups.find(g => g.keySymbol === ks)
    const next = { ...choices.perPublication, [ks]: src }
    const excluded = new Set(choices.excludedGuids)

    if (group) {
      // Quand on bascule vers une source unique, exclure automatiquement l'autre
      if (src === 'a') {
        for (const item of group.onlyB) excluded.add(item.guid)
        for (const item of group.onlyA) excluded.delete(item.guid)
      } else if (src === 'b') {
        for (const item of group.onlyA) excluded.add(item.guid)
        for (const item of group.onlyB) excluded.delete(item.guid)
      } else {
        for (const item of [...group.onlyA, ...group.onlyB]) excluded.delete(item.guid)
      }
    }

    onChange({ perPublication: next, excludedGuids: excluded })
  }

  const toggleGuid = (guid: string) => {
    const excluded = new Set(choices.excludedGuids)
    if (excluded.has(guid)) excluded.delete(guid)
    else excluded.add(guid)
    onChange({ ...choices, excludedGuids: excluded })
  }

  const isIncluded = (guid: string) => !choices.excludedGuids.has(guid)

  // Compter les éléments exclus dans un groupe
  const excludedCount = (g: PublicationHighlightGroup) =>
    [...g.onlyA, ...g.onlyB].filter(i => choices.excludedGuids.has(i.guid)).length

  return (
    <div className="flex gap-0 -mx-6 -mb-5" style={{ height: '520px' }}>

      {/* ── Colonne gauche : liste des publications ── */}
      <div className="w-52 shrink-0 border-r border-slate-100 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {groups.length} publications
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5">
          {groups.map(g => {
            const excl = excludedCount(g)
            const src  = pubSource(g.keySymbol)
            const active = selectedKey === g.keySymbol
            return (
              <button
                key={g.keySymbol}
                onClick={() => setSelectedKey(g.keySymbol)}
                className={[
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-xs',
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                <span className="text-slate-300 shrink-0">
                  {g.isBible ? <BookOpen size={12} /> : <FileText size={12} />}
                </span>
                <span className="flex-1 font-medium truncate">{pubLabel(g.keySymbol, g.isBible)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {excl > 0 && (
                    <span className="text-[10px] text-amber-500 font-semibold">−{excl}</span>
                  )}
                  <SourceDot src={src} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Bouton continuer */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Continuer <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ── Panneau droit : détail de la publication ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedGroup ? (
          <>
            {/* Header de la publication */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {pubLabel(selectedGroup.keySymbol, selectedGroup.isBible)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedGroup.commonCount.toLocaleString()} communs ·{' '}
                  {selectedGroup.onlyA.length} uniq. {nameA} ·{' '}
                  {selectedGroup.onlyB.length} uniq. {nameB}
                </p>
              </div>
              <SourceToggle
                value={pubSource(selectedGroup.keySymbol)}
                nameA={nameA}
                nameB={nameB}
                onChange={src => setPubSource(selectedGroup.keySymbol, src)}
              />
            </div>

            {/* Split A | B */}
            <div className="flex flex-1 overflow-hidden">
              {/* Colonne A */}
              <SideColumn
                items={selectedGroup.onlyA}
                name={nameA}
                color="blue"
                isIncluded={isIncluded}
                onToggle={toggleGuid}
                disabled={pubSource(selectedGroup.keySymbol) === 'b'}
              />

              {/* Séparateur */}
              <div className="w-px bg-slate-100 shrink-0" />

              {/* Colonne B */}
              <SideColumn
                items={selectedGroup.onlyB}
                name={nameB}
                color="amber"
                isIncluded={isIncluded}
                onToggle={toggleGuid}
                disabled={pubSource(selectedGroup.keySymbol) === 'a'}
              />
            </div>

            {/* Footer : communs */}
            {selectedGroup.commonCount > 0 && (
              <div className="px-5 py-2.5 border-t border-slate-100 bg-emerald-50/50 shrink-0">
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-emerald-500 shrink-0" />
                  <span className="text-xs text-emerald-700 font-medium">
                    {selectedGroup.commonCount.toLocaleString()} surlignages présents dans les deux — inclus automatiquement
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300 text-sm">
            Sélectionne une publication
          </div>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// SideColumn                                                           //
// ------------------------------------------------------------------ //

function SideColumn({
  items, name, color, isIncluded, onToggle, disabled,
}: {
  items: HighlightItem[]
  name: string
  color: 'blue' | 'amber'
  isIncluded: (guid: string) => boolean
  onToggle: (guid: string) => void
  disabled: boolean
}) {
  const headerColor = color === 'blue'
    ? 'bg-blue-50 text-blue-700 border-blue-100'
    : 'bg-amber-50 text-amber-700 border-amber-100'

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* En-tête colonne */}
      <div className={`px-3 py-2 border-b ${headerColor} shrink-0`}>
        <span className="text-xs font-semibold">{name}</span>
        <span className="text-xs opacity-60 ml-1.5">{items.length} uniques</span>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {items.length === 0 ? (
          <p className="text-xs text-slate-300 text-center mt-6">Aucun surlignage unique</p>
        ) : (
          items.map(item => (
            <HighlightChip
              key={item.guid}
              item={item}
              included={isIncluded(item.guid)}
              onToggle={() => onToggle(item.guid)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// HighlightChip                                                        //
// ------------------------------------------------------------------ //

function HighlightChip({ item, included, onToggle }: {
  item: HighlightItem
  included: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={[
        'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all w-full group',
        included ? 'bg-white border border-slate-100 shadow-sm hover:border-slate-200' : 'bg-slate-50 border border-slate-100 opacity-50',
      ].join(' ')}
    >
      {/* Checkbox visuelle */}
      <span className={[
        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
        included ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white',
      ].join(' ')}>
        {included ? <Check size={10} className="text-white" /> : <Minus size={10} className="text-slate-300" />}
      </span>

      {/* Couleur du surlignage */}
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_BG[item.colorIndex] ?? 'bg-slate-300'}`} />

      {/* Référence */}
      <span className={`flex-1 text-xs truncate ${included ? 'text-slate-700' : 'text-slate-400'}`}>
        {item.ref}
      </span>

      {/* Indicateur note */}
      {item.hasNote && (
        <span className="text-[10px] text-slate-400 shrink-0">📝</span>
      )}
    </button>
  )
}

// ------------------------------------------------------------------ //
// Helpers visuels                                                      //
// ------------------------------------------------------------------ //

function SourceDot({ src }: { src: HighlightSource }) {
  if (src === 'both') return <span className="w-2 h-2 rounded-full bg-emerald-400" />
  if (src === 'a')    return <span className="w-2 h-2 rounded-full bg-blue-400" />
  return <span className="w-2 h-2 rounded-full bg-amber-400" />
}

function SourceToggle({ value, nameA, nameB, onChange }: {
  value: HighlightSource
  nameA: string
  nameB: string
  onChange: (v: HighlightSource) => void
}) {
  const opts: { v: HighlightSource; label: string }[] = [
    { v: 'a',    label: nameA },
    { v: 'both', label: 'Les deux' },
    { v: 'b',    label: nameB },
  ]
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0">
      {opts.map(({ v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={[
            'px-2.5 py-1 text-xs font-medium transition-colors',
            value === v
              ? v === 'both' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
