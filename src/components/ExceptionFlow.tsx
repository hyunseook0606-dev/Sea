import { useNavigate } from 'react-router-dom'
import { FIELD_FLOW, SEA_FLOW } from '../ax'
import { cn } from './ui'

export function ExceptionFlow({
  variant = 'erp',
  className,
}: {
  variant?: 'erp' | 'landing' | 'hero'
  className?: string
}) {
  const nav = useNavigate()

  if (variant === 'hero') {
    return (
      <ol className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-white/90', className)}>
        {FIELD_FLOW.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            {i > 0 ? <span className="text-white/40">→</span> : null}
            <span className={s.sea ? 'font-semibold text-white' : 'text-white/80'}>{s.label}</span>
          </li>
        ))}
      </ol>
    )
  }

  if (variant === 'landing') {
    return (
      <ol className={cn('grid gap-10 sm:grid-cols-2 lg:grid-cols-6 lg:gap-x-8 lg:gap-y-0', className)}>
        {SEA_FLOW.map((s, i) => (
          <li key={s.id}>
            <div className="text-[13px] font-semibold text-[#1130c6]">{String(i + 1).padStart(2, '0')}</div>
            <div className="mt-3 text-[18px] font-semibold">{s.label}</div>
            <p className="mt-3 text-[14px] leading-relaxed text-[#555]">{s.hint}</p>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {SEA_FLOW.map((s, i) => (
        <button
          key={s.id}
          type="button"
          className="flex min-w-[112px] flex-1 items-center gap-2 rounded-sm border border-line bg-white px-2.5 py-2 text-left hover:bg-[#f7f9fc]"
          onClick={() => nav(s.to)}
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line text-[11px] text-mute">{i + 1}</span>
          <span>
            <span className="block text-[13px] font-semibold text-ink">{s.label}</span>
            <span className="block text-[11px] text-mute">{s.hint}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
