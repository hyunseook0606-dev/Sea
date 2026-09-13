import type { ClockState, DiffChange, OpsClock, PolicyParams, Priority, ScheduleFields } from './types'

export const DEFAULT_POLICY: PolicyParams = {
  etaReviewHours: 6,
  minConnectionHours: 24,
  countConnecting: true,
  countBerth: true,
  checkEtbStale: true,
}

export const CITE = {
  kim2021:
    'Kim 등(2021) 부산 컨테이너 터미널. 도착정보 갱신 후 선석·QC 재계획 주기 6h. 본 제품은 선석 최적화를 하지 않는다.',
  dcsaJit: 'DCSA Just-in-Time Port Call. ETA와 ETB는 별도 시각이다.',
  tsDwell:
    '부산 T/S 체류 하한 1일(Triangular 1–4–7일, arXiv:2608.07889). 월평균 6.1일(Cogoport Busan, 2026-02)은 임계로 쓰지 않는다.',
  econdbPnc: 'PNC 평균 체류 1.3일(Econdb, Busan terminal). 참고 통계이며 이 항차 확정본과 비교한다.',
  dcsaCut: 'DCSA: Cut-off는 Commercial/Booking. 기항 OVS 변경과 별도.',
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
    cite: CITE.kim2021,
    detail: etaChanged
      ? `${formatHours(slip, true)} · 검토 창 ${policy.etaReviewHours}h (부산 터미널 재계획 주기 문헌)`
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
    formula: '신규 ETA − 확정 ETB (ETB 미갱신일 때)',
    cite: CITE.dcsaJit,
    detail: etbStale
      ? `신규 ETA가 확정 ETB보다 ${formatHours(newEtaVsOldEtb)} 뒤. 접안 시각을 다시 받는다.`
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
    cite: CITE.tsDwell,
    detail:
      slack == null
        ? '연결 항차 시각 없음'
        : `${formatHours(slack)} · 하한 ${policy.minConnectionHours}h (T/S 체류 문헌 하한 1일. 평균 6.1일은 쓰지 않음)`,
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
        ? `원문 유지 · 리드 ${formatHours(cutoffLead)}. ETA로 파생하지 않음`
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
      ? `연결 ${formatHours(headlineClock.hours)} / 하한 ${headlineClock.thresholdHours}h`
      : headlineClock.code === 'ETA_SLIP'
        ? `ETA ${formatHours(headlineClock.hours, true)} / 창 ${headlineClock.thresholdHours}h`
        : headlineClock.code === 'ETB_STALE'
          ? `ETB 미갱신 ${formatHours(headlineClock.hours)}`
          : headlineClock.code === 'PORT_STAY'
            ? `체류 ${formatHours(headlineClock.previousHours)}→${formatHours(headlineClock.hours)}`
            : headlineClock.code === 'BERTH'
              ? '부두 변경 · 내륙 확인'
              : headlineClock.detail
    : '확인 항목 없음'

  return { priority, rank, headline, clocks }
}
