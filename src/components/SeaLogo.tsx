export function SeaBrandLogo({
  className = 'h-8',
}: {
  className?: string
}) {
  return (
    <img
      src="/sea-logo.png"
      alt="SEA"
      className={`${className} w-auto max-w-[148px] object-contain object-left`}
    />
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
      {compact ? null : <span className="sr-only">Schedule Exception Agent</span>}
    </span>
  )
}

export function SeaMark({ className = 'h-8' }: { className?: string }) {
  return <SeaBrandLogo className={className} />
}
