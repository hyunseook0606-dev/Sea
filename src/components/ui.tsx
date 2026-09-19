import type { ReactNode } from 'react'

export function cn(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ')
}

export function RowNo({ n }: { n: number }) {
  return (
    <span className="inline-grid h-5 w-5 place-items-center rounded-full border border-line text-[11px] text-mute">
      {n}
    </span>
  )
}

export function Kpi({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  onOpen,
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'warn' | 'bad' | 'ok' | 'info'
  icon?: ReactNode
  onOpen?: () => void
}) {
  const accent =
    tone === 'ok'
      ? 'shadow-[inset_0_2px_0_#059669]'
      : tone === 'warn'
        ? 'shadow-[inset_0_2px_0_#d97706]'
        : tone === 'bad'
          ? 'shadow-[inset_0_2px_0_#dc2626]'
          : tone === 'info'
            ? 'shadow-[inset_0_2px_0_#2f62c0]'
            : ''
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] text-mute">{label}</div>
        {icon ? <div className="text-mute">{icon}</div> : null}
      </div>
      <div className="mt-1.5 font-mono text-[26px] font-semibold tabular-nums leading-none text-ink">{value}</div>
      {hint ? <div className="mt-1.5 text-[12px] text-mute">{hint}</div> : null}
    </>
  )
  const box = cn('rounded-sm border border-line bg-panel px-3 py-3 text-left', accent, onOpen && 'hover:bg-[#f7f9fc]')
  if (onOpen) {
    return (
      <button type="button" className={cn(box, 'w-full')} onClick={onOpen}>
        {inner}
      </button>
    )
  }
  return <div className={box}>{inner}</div>
}

export function Panel({
  title,
  right,
  children,
  className,
  padded = true,
}: {
  title: string
  right?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section className={cn('overflow-hidden rounded-sm border border-line bg-panel', className)}>
      <header className="flex items-center justify-between border-b border-line bg-[#f7fafc] px-3 py-2">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        {right}
      </header>
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  )
}
