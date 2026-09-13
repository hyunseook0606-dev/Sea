import type { ReactNode } from 'react'
import type { ExceptionStatus, Priority } from '../types'

export function cn(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ')
}

const PRIORITY: Record<Priority, string> = { high: '높음', medium: '보통', low: '낮음' }

const STATUS: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
  open: '진행',
  processing: '처리 중',
  processed: '처리됨',
  queued: '대기',
  review_required: '확인 필요',
  blocked: '차단',
  duplicate: '중복',
  awaiting_approval: '발송 대기',
  partially_approved: '일부 승인',
  sent: '발송',
  rejected: '반려',
  resolved: '완료',
  failed: '실패',
  connected: '연결됨',
  available: '준비',
  extension: '확장',
  draft: '초안',
  edited: '수정됨',
  approved: '승인',
  auto_done: '자동 완료',
  draft_ready: '초안 준비',
  pending_human: '확인 대기',
  done: '확인',
  at_sea: '항해',
  inbound: '입항 예정',
  alongside: '접안',
  departed: '출항',
  unchanged: '변경 없음',
  unmatched: '미매칭',
  no_update: '갱신 없음',
  unavailable: '데이터 없음',
  ingest: '수신',
  extract: '추출',
  context: '맥락',
  validate: '검증',
  diff: '비교',
  exception: '예외',
  impact: '영향',
  action: '초안',
  approval: '승인',
  send: '발송',
  human: '담당자',
}

export function labelOf(value: string) {
  return STATUS[value] || value.replaceAll('_', ' ')
}

export function PriorityPill({ value }: { value: Priority }) {
  const map = {
    high: 'bg-red-50 text-red-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-sky-50 text-mute',
  }
  return <span className={cn('rounded px-1.5 py-0.5 text-[12px]', map[value])}>{PRIORITY[value]}</span>
}

export function StatusPill({ value }: { value: ExceptionStatus | string }) {
  const tone =
    value === 'sent' || value === 'resolved' || value === 'processed' || value === 'connected' || value === 'approved'
      ? 'bg-emerald-50 text-ok'
      : value === 'blocked' || value === 'failed' || value === 'rejected'
        ? 'bg-red-50 text-bad'
        : value === 'duplicate' || value === 'no_update' || value === 'unchanged'
          ? 'bg-sky-50 text-mute'
          : value === 'review_required' || value === 'awaiting_approval' || value === 'partially_approved' || value === 'queued'
            ? 'bg-amber-50 text-warn'
            : 'bg-sky-50 text-brand'
  return <span className={cn('rounded px-1.5 py-0.5 text-[12px]', tone)}>{labelOf(value)}</span>
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

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[12px] tabular-nums">{children}</span>
}

export function PageHeader({
  title,
  desc,
  actions,
  kicker,
}: {
  title: string
  desc?: string
  actions?: ReactNode
  kicker?: string
}) {
  if (!desc && !actions && !kicker) return null
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        {kicker ? <div className="sea-kicker mb-0.5">{kicker}</div> : null}
        <span className="sr-only">{title}</span>
        {desc ? <p className="max-w-2xl text-[12px] leading-relaxed text-mute">{desc}</p> : null}
      </div>
      {actions}
    </div>
  )
}

export const CHANNEL_LABEL: Record<string, string> = {
  shipper: '화주',
  inland: '내륙',
  internal: '내부',
}

export function CountHint({ n }: { n: number }) {
  return <span className="text-[12px] font-normal text-mute">총 {n}건</span>
}

export function EmptyHint({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-[13px] leading-relaxed text-mute">{children}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export function InquiryBar({
  children,
  onInquiry,
  onReset,
}: {
  children: ReactNode
  onInquiry: () => void
  onReset?: () => void
}) {
  return (
    <form
      className="mb-3 flex flex-wrap items-end gap-2 border border-line bg-[#f4f7fa] px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault()
        onInquiry()
      }}
    >
      {children}
      <div className="ml-auto flex gap-1">
        {onReset ? (
          <button type="button" className="btn-ghost" onClick={onReset}>
            초기화
          </button>
        ) : null}
        <button type="submit" className="btn-primary">
          조회
        </button>
      </div>
    </form>
  )
}

export function InquiryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-[140px] flex-col gap-1 text-[12px] text-mute">
      {label}
      {children}
    </label>
  )
}

export function DocNo({ children, onOpen }: { children: ReactNode; onOpen?: () => void }) {
  return (
    <button
      type="button"
      className="font-mono text-[12px] text-[#2f62c0] hover:underline"
      onClick={(e) => {
        e.stopPropagation()
        onOpen?.()
      }}
    >
      {children}
    </button>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="text-[12px] font-medium text-mute">{children}</thead>
}
