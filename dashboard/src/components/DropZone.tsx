import { useRef, useState } from 'react'
import { Upload, CheckCircle } from 'lucide-react'

interface Props {
  label: string
  color: 'blue' | 'amber'
  variant?: 'light' | 'dark'
  onFile: (file: File) => void
  loaded?: boolean
  fileName?: string
  subtitle?: string
}

export function DropZone({ label, color, variant = 'light', onFile, loaded, fileName, subtitle }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.jwlibrary')) onFile(file)
  }

  if (loaded && fileName) {
    if (variant === 'dark') {
      const accent = color === 'blue' ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'
      const border = color === 'blue' ? 'rgba(99,102,241,0.4)' : 'rgba(245,158,11,0.4)'
      const iconColor = color === 'blue' ? 'text-indigo-400' : 'text-amber-400'
      const labelColor = color === 'blue' ? 'text-indigo-300' : 'text-amber-300'
      return (
        <div
          className="glass-loaded flex flex-col gap-1.5 px-4 py-4 rounded-2xl cursor-pointer"
          onClick={() => ref.current?.click()}
          style={{ boxShadow: `0 0 25px ${accent}`, borderColor: border }}
        >
          <input ref={ref} type="file" accept=".jwlibrary" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
          <div className="flex items-center gap-2">
            <CheckCircle size={13} className={iconColor} />
            <p className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>{label}</p>
          </div>
          <p className="text-sm font-bold text-white/90 leading-tight">{fileName}</p>
          {subtitle && <p className="text-xs text-white/35">{subtitle}</p>}
        </div>
      )
    }

    // Light variant loaded
    const s = color === 'blue'
      ? { bg: 'bg-blue-50', ring: 'ring-2 ring-blue-400', icon: 'text-blue-500', label: 'text-blue-600' }
      : { bg: 'bg-amber-50', ring: 'ring-2 ring-amber-400', icon: 'text-amber-500', label: 'text-amber-600' }

    return (
      <div
        className={`flex flex-col gap-1.5 px-4 py-4 rounded-2xl ${s.bg} ${s.ring} cursor-pointer`}
        onClick={() => ref.current?.click()}
      >
        <input ref={ref} type="file" accept=".jwlibrary" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        <div className="flex items-center gap-2">
          <CheckCircle size={13} className={s.icon} />
          <p className={`text-[10px] font-bold uppercase tracking-widest ${s.label}`}>{label}</p>
        </div>
        <p className="text-sm font-bold text-slate-800 leading-tight">{fileName}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    )
  }

  // Empty state
  if (variant === 'dark') {
    const iconActive = color === 'blue' ? 'text-indigo-400' : 'text-amber-400'
    const textActive = color === 'blue' ? 'text-indigo-300' : 'text-amber-300'
    return (
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => ref.current?.click()}
        className={`glass flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-2xl border-dashed cursor-pointer transition-all select-none ${
          dragging ? 'bg-white/10' : 'hover:bg-white/[0.06]'
        }`}
        style={dragging ? { borderColor: color === 'blue' ? 'rgba(99,102,241,0.5)' : 'rgba(245,158,11,0.5)' } : {}}
      >
        <input ref={ref} type="file" accept=".jwlibrary" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        <Upload size={22} className={dragging ? iconActive : 'text-white/20'} />
        <div className="text-center">
          <p className={`text-xs font-semibold ${dragging ? textActive : 'text-white/40'}`}>{label}</p>
          <p className="text-[11px] text-white/20 mt-1">.jwlibrary</p>
        </div>
      </div>
    )
  }

  // Light empty
  const a = color === 'blue'
    ? { drag: 'border-blue-400 bg-blue-50/80', icon: 'text-blue-400', text: 'text-blue-600' }
    : { drag: 'border-amber-400 bg-amber-50/80', icon: 'text-amber-400', text: 'text-amber-600' }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => ref.current?.click()}
      className={`flex flex-col items-center justify-center gap-2.5 px-6 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all select-none ${
        dragging ? a.drag : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <input ref={ref} type="file" accept=".jwlibrary" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      <Upload size={22} className={dragging ? a.icon : 'text-slate-300'} />
      <div className="text-center">
        <p className={`text-xs font-semibold ${dragging ? a.text : 'text-slate-500'}`}>{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">.jwlibrary</p>
      </div>
    </div>
  )
}
