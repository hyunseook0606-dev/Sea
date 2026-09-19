import type { ClockState, DiffChange, OpsClock, PolicyParams, Priority, ScheduleFields } from './types'

export const DEFAULT_POLICY: PolicyParams = {
  etaReviewHours: 6,
  minConnectionHours: 24,
  countConnecting: true,
  countBerth: true,
  checkEtbStale: true,
}

export const CITE = {
  etaWindow:
    'ETA 검토 창은 회사 기준이다. DCSA 2026 Blueprint는 feeder에서 최근 스케줄 대비 6h 초과 deviation 시 갱신 절차를 둔다. 강제 표준이 아니다.',
  dcsaJit: 'ETA와 ETB는 별도 시각이다. 비교 기준은 직전 확정본 ETB이다.',
  demoConn: '연결 여유 하한은 회사 업무 기준이다. 프로토타입 Demo Rule이며 산업 문헌값이 아니다.',
  econdbPnc: '체류 시간은 이 항차 확정본·원문으로 계산한다. 터미널 평균 체류 통계를 임계로 쓰지 않는다.',
  dcsaCut: 'Cut-off는 선박 스케줄과 연결될 수 있으나, SEA는 ETA만으로 추론하지 않는다. 원문에 있을 때만 추출·비교한다.',
  inland: '부두·터미널 변경은 내륙 게이트 확인. 가점 점수가 아니다.',
}

export function parseStamp(raw?: string): number | null {
  if (!raw) return null
  const s = raw.replace(' LT', '').trim()
  if (!s) return null
  const iso = s.includes('T') ? s : s.replace(' ', 'T')
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
}

export function shiftHours(raw: string, hours: number): string {
  const t = parseStamp(raw)
  if (t == null) return raw
  const d = new Date(t + hours * 36e5)
  const p = (n: number) => String(n).padStart(2, '0')
  const core = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  return /LT/i.test(raw) ? `${core} LT` : core
}

export function hoursBetween(from?: string, to?: string): number | null {
  const a = parseStamp(from)
  const b = parseStamp(to)
  if (a == null || b == null) return null
  return Math.round(((b - a) / 36e5) * 10) / 10
}

export function formatHours(h: number | null | undefined, signed = false): string {
  if (h == null || !Number.isFinite(h)) return '—'
  const n = Number.isInteger(h) ? String(h) : h.toFixed(1)
  if (!signed) return `${n}h`
  if (h > 0) return `+${n}h`
  return `${n}h`
}

export const CLOCK_STATE_LABEL: Record<ClockState, string> = {
  ok: '유지',
  review: '확인',
  tight: '부족',
  na: '자료없음',
}

export function normalizePolicy(raw?: Partial<PolicyParams> & { etaHighHours?: number } | null): PolicyParams {
  const review = Number(raw?.etaReviewHours ?? raw?.etaHighHours)
  const conn = Number(raw?.minConnectionHours)
  return {
    etaReviewHours: Number.isFinite(review) && review > 0 ? review : DEFAULT_POLICY.etaReviewHours,
    minConnectionHours: Number.isFinite(conn) && conn > 0 ? conn : DEFAULT_POLICY.minConnectionHours,
    countConnecting: raw?.countConnecting !== false,
    countBerth: raw?.countBerth !== false,
    checkEtbStale: raw?.checkEtbStale !== false,
  }
}

function etaSlipHours(changes: DiffChange[]): number {
  const eta = changes.find((c) => c.key === 'eta')
  if (eta?.delta) {
    const n = Math.abs(parseFloat(eta.delta))
    if (Number.isFinite(n)) return n
  }
  return Math.abs(hoursBetween(changes.find((c) => c.key === 'eta')?.previous, changes.find((c) => c.key === 'eta')?.next) || 0)
}

export function clockOf(clocks: OpsClock[] | undefined, code: OpsClock['code']): OpsClock | undefined {
  return clocks?.find((c) => c.code === code)
}

export function buildReviewPlan(args: {
  previous: ScheduleFields
  incoming: ScheduleFields
  changes: DiffChange[]
  connecting?: ScheduleFields
  policy?: Partial<PolicyParams> | null
}): { priority: Priority; rank: number; headline: string; clocks: OpsClock[] } {
  const policy = normalizePolicy(args.policy)
  const { previous, incoming, changes, connecting } = args
  const clocks: OpsClock[] = []
  const slip = etaSlipHours(changes)
  const etaChanged = changes.some((c) => c.key === 'eta')
  const berthChanged = changes.some((c) => c.key === 'berth' || c.key === 'terminal')
  const cutoffChanged = changes.some((c) => c.key === 'cutoff')

  const etaState: OpsClock['state'] = !etaChanged ? 'ok' : slip >= policy.etaReviewHours ? 'review' : 'ok'
  clocks.push({
    code: 'ETA_SLIP',
    label: 'ETA 변경',
    hours: etaChanged ? slip : 0,
    thresholdHours: policy.etaReviewHours,
    state: etaState,
    formula: '|신규 ETA − 확정 ETA|',
    cite: CITE.etaWindow,
    detail: etaChanged
      ? `${formatHours(slip, true)} · 검토 창 ${policy.etaReviewHours}h (회사 기준)`
      : 'ETA 변경 없음',
  })

  const newEtaVsOldEtb = hoursBetween(previous.etb, incoming.eta)
  const etbUpdated = Boolean(incoming.etb) && incoming.etb !== previous.etb
  const etbStale =
    policy.checkEtbStale &&
    Boolean(previous.etb) &&
    Boolean(incoming.eta) &&
    (newEtaVsOldEtb ?? 0) > 0 &&
    !etbUpdated
  clocks.push({
    code: 'ETB_STALE',
    label: '접안 ETB',
    hours: etbStale ? newEtaVsOldEtb : hoursBetween(incoming.eta, incoming.etb),
    thresholdHours: null,
    state: etbStale ? 'review' : incoming.etb ? 'ok' : 'na',
    formula: '신규 ETA − 직전 확정본 ETB (ETB 미갱신일 때)',
    cite: CITE.dcsaJit,
    detail: etbStale
      ? `신규 ETA가 직전 확정본 ETB(${previous.etb})보다 ${formatHours(newEtaVsOldEtb)} 뒤. 접안 시각을 다시 확인한다.`
      : incoming.etb
        ? `ETA→ETB ${formatHours(hoursBetween(incoming.eta, incoming.etb))}`
        : 'ETB 없음',
  })

  const prevStay = hoursBetween(previous.eta, previous.etd)
  const nextStay = hoursBetween(incoming.eta, incoming.etd)
  const stayCompressed = prevStay != null && nextStay != null && nextStay < prevStay && etaChanged
  clocks.push({
    code: 'PORT_STAY',
    label: '체류',
    hours: nextStay,
    previousHours: prevStay,
    thresholdHours: null,
    state: stayCompressed ? 'review' : nextStay == null ? 'na' : 'ok',
    formula: 'ETD − ETA',
    cite: CITE.econdbPnc,
    detail:
      prevStay != null && nextStay != null
        ? `${formatHours(prevStay)} → ${formatHours(nextStay)}${stayCompressed ? ' · 체류 압축' : ''}`
        : '체류 계산 불가',
  })

  const slack = connecting ? hoursBetween(incoming.etd || incoming.eta, connecting.etd || connecting.eta) : null
  let connState: OpsClock['state'] = 'na'
  if (!policy.countConnecting || !connecting) connState = 'na'
  else if (slack == null) connState = 'na'
  else if (slack < 0) connState = 'tight'
  else if (slack < policy.minConnectionHours) connState = 'review'
  else connState = 'ok'
  clocks.push({
    code: 'CONNECTION',
    label: '연결 여유',
    hours: slack,
    thresholdHours: policy.minConnectionHours,
    state: connState,
    formula: '연결 항차 ETD − 본선 ETD',
    cite: CITE.demoConn,
    detail:
      slack == null
        ? '연결 항차 시각 없음'
        : `${formatHours(slack)} · Demo Rule ${policy.minConnectionHours}h (회사 기준)`,
  })

  clocks.push({
    code: 'BERTH',
    label: '부두',
    hours: null,
    thresholdHours: null,
    state: policy.countBerth && berthChanged ? 'review' : berthChanged ? 'ok' : 'ok',
    formula: '부두 또는 터미널 변경',
    cite: CITE.inland,
    detail: berthChanged ? '내륙 게이트 확인' : '부두 변경 없음',
  })

  const cutoffLead = hoursBetween(incoming.cutoff, incoming.etd)
  clocks.push({
    code: 'CUTOFF',
    label: 'CY 마감 리드',
    hours: cutoffLead,
    thresholdHours: null,
    state: cutoffChanged ? 'review' : incoming.cutoff ? 'ok' : 'na',
    formula: 'ETD − CY Cut-off (원문에 있을 때만)',
    cite: CITE.dcsaCut,
    detail: cutoffChanged
      ? `원문에 Cut-off 변경. 리드 ${formatHours(cutoffLead)}`
      : incoming.cutoff
        ? `원문 유지 · 리드 ${formatHours(cutoffLead)}. ETA만으로 추론하지 않음`
        : '원문에 Cut-off 없음',
  })

  const tight = clocks.some((c) => c.state === 'tight')
  const highReview = clocks.some((c) => c.code !== 'BERTH' && c.code !== 'CUTOFF' && c.state === 'review')
  const medium = clocks.some((c) => (c.code === 'BERTH' || c.code === 'CUTOFF') && c.state === 'review')
  const priority: Priority = tight || highReview ? 'high' : medium ? 'medium' : 'low'
  const rank = tight ? 0 : highReview ? 1 : medium ? 5 : 9
  const headlineClock =
    clocks.find((c) => c.state === 'tight') ||
    clocks.find((c) => c.code === 'CONNECTION' && c.state === 'review') ||
    clocks.find((c) => c.code === 'ETB_STALE' && c.state === 'review') ||
    clocks.find((c) => c.code === 'ETA_SLIP' && c.state === 'review') ||
    clocks.find((c) => c.state === 'review')
  const headline = headlineClock
    ? headlineClock.code === 'CONNECTION'
      ? `연결 ${formatHours(headlineClock.hours)} / Demo Rule ${headlineClock.thresholdHours}h`
      : headlineClock.code === 'ETA_SLIP'
        ? `ETA ${formatHours(headlineClock.hours, true)} / 창 ${headlineClock.thresholdHours}h`
        : headlineClock.code === 'ETB_STALE'
          ? `직전 확정본 ETB 미갱신 ${formatHours(headlineClock.hours)}`
          : headlineClock.code === 'PORT_STAY'
            ? `체류 ${formatHours(headlineClock.previousHours)}→${formatHours(headlineClock.hours)}`
            : headlineClock.code === 'BERTH'
              ? '부두 변경 · 내륙 확인'
              : headlineClock.detail
    : '확인 항목 없음'

  return { priority, rank, headline, clocks }
}
