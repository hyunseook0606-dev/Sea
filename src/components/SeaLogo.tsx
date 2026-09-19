export function SeaBrandLogo({
  className = 'h-8',
}: {
  className?: string
}) {
  return (
    <span className={`${className} inline-flex w-auto max-w-[148px] items-center gap-1.5 whitespace-nowrap text-[#1130c6]`} aria-label="PACE">
      <span className="text-[21px] font-extrabold leading-none tracking-[-0.045em]">PACE</span>
      <span className="rounded-sm bg-[#1130c6] px-1 py-0.5 text-[8px] font-bold leading-none tracking-[0.08em] text-white">AX</span>
    </span>
  )
}

export function SeaWaveMark({
  className = 'h-8 w-8',
}: {
  className?: string
  tone?: 'brand' | 'light'
}) {
  return <SeaBrandLogo className={className} />
}

export function SeaWordmark({ compact = false }: { tone?: 'light' | 'brand'; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <SeaBrandLogo className={compact ? 'h-9' : 'h-11'} />
      {compact ? null : <span className="sr-only">Port-cost Assurance and Control Engine</span>}
    </span>
  )
}

export function SeaMark({ className = 'h-8' }: { className?: string }) {
  return <SeaBrandLogo className={className} />
}
