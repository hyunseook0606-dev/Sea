import type {
  DiffChange,
  ExceptionRecord,
  ExtractedField,
  FieldKey,
  SimilarHit,
  ImpactItem,
  InboxItem,
  NotificationDraft,
  PolicyParams,
  ProcessKind,
  RuleHit,
  ScheduleFields,
  ValidationIssue,
  VoyageRecord,
} from './types'
import { LABELS, extractFromSource } from './extract'
import { buildReviewPlan, hoursBetween, normalizePolicy } from './clocks'

export { extractFromSource }
export { buildReviewPlan, DEFAULT_POLICY, formatHours, hoursBetween, normalizePolicy, parseStamp, clockOf, CITE, CLOCK_STATE_LABEL } from './clocks'

export const RULE_MASTER = [
  {
    id: 'R1',
    kind: 'invariant' as const,
    title: '스케줄 필드 변경 감지',
    action: '예외 생성',
    note: '직전 확정본과 값이 다르면 전표를 만듭니다.',
  },
  {
    id: 'R2',
    kind: 'company_policy' as const,
    title: 'ETA 변경 시간',
    action: '검토 창 비교',
    note: '기본 6h는 Kim 등(2021) 부산 터미널 재계획 주기. 선석 최적화는 하지 않는다. 회사 값으로 바꾼다.',
  },
  {
    id: 'R3',
    kind: 'invariant' as const,
    title: '같은 원문의 항차·시각 모순',
    action: '확인 필요 · 발송 잠금',
    note: '원문 안에서 ETB가 ETA보다 빠르면 운영 위험이 아니라 통보문 오류로 봅니다.',
  },
  {
    id: 'R4',
    kind: 'invariant' as const,
    title: '동일 변경 재수신',
    action: '중복 예외 억제',
    note: '선박·항차·기항·변경 키가 같으면 새 전표를 만들지 않습니다.',
  },
  {
    id: 'R5',
    kind: 'invariant' as const,
    title: '대외 통보',
    action: '담당자 승인 필수',
    note: '미승인 문장은 나가지 않습니다.',
  },
  {
    id: 'R6',
    kind: 'forbid' as const,
    title: 'ETA → Cut-off 자동 확정',
    action: '적용하지 않음',
    note: '화물 Cut-off는 원문에 있을 때만 비교합니다.',
  },
  {
    id: 'R7',
    kind: 'company_policy' as const,
    title: '연결 항차 여유',
    action: '하한 비교',
    note: '하한 24h는 부산 T/S 체류 문헌 하한 1일. 평균 6.1일은 쓰지 않는다.',
  },
] as const

export const BASIS_LABEL: Record<string, string> = {
  invariant: '검증',
  structure: '구조',
  company_policy: '회사 기준',
  forbid: '적용 안 함',
}

export function nowStamp(base = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${base.getFullYear()}-${p(base.getMonth() + 1)}-${p(base.getDate())} ${p(base.getHours())}:${p(base.getMinutes())}:${p(base.getSeconds())}`
}

export function clock(base = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(base.getHours())}:${p(base.getMinutes())}:${p(base.getSeconds())}`
}

export function fieldsToSchedule(fields: ExtractedField[], fallback: ScheduleFields): ScheduleFields {
  const g = (k: FieldKey) => fields.find((f) => f.key === k)?.value || ''
  return {
    vessel: g('vessel') || fallback.vessel,
    voyage: g('voyage') || fallback.voyage,
    imo: g('imo') || fallback.imo,
    port: g('port') || fallback.port,
    unlocode: g('unlocode') || fallback.unlocode,
    terminal: g('terminal') || fallback.terminal,
    berth: g('berth') || fallback.berth,
    eta: g('eta') || fallback.eta,
    etb: g('etb') || fallback.etb,
    etd: g('etd') || fallback.etd,
    cutoff: g('cutoff') || fallback.cutoff,
  }
}

export function diffSchedules(prev: ScheduleFields, next: ScheduleFields): DiffChange[] {
  const keys: FieldKey[] = ['vessel', 'voyage', 'port', 'terminal', 'berth', 'eta', 'etb', 'etd', 'cutoff']
  const out: DiffChange[] = []
  for (const key of keys) {
    const a = (prev[key] || '').trim()
    const b = (next[key] || '').trim()
    if (!b || a === b) continue
    if (!a) {
      out.push({ key, label: LABELS[key], previous: '—', next: b })
      continue
    }
    out.push({
      key,
      label: LABELS[key],
      previous: a,
      next: b,
      delta: key === 'eta' || key === 'etb' || key === 'etd' ? hoursDelta(a, b) : undefined,
    })
  }
  return out
}

function hoursDelta(a: string, b: string): string | undefined {
  const ta = Date.parse(a.replace(' LT', '').replace(' ', 'T'))
  const tb = Date.parse(b.replace(' LT', '').replace(' ', 'T'))
  if (Number.isNaN(ta) || Number.isNaN(tb)) return undefined
  const h = (tb - ta) / 36e5
  const sign = h > 0 ? '+' : ''
  return `${sign}${h}h`
}

function etaAbsHours(changes: DiffChange[]): number {
  const etaChange = changes.find((c) => c.key === 'eta')
  if (!etaChange?.delta) return 0
  const n = Math.abs(parseFloat(etaChange.delta))
  return Number.isFinite(n) ? n : 0
}

export function fireRules(args: {
  changes: DiffChange[]
  issues: ValidationIssue[]
  isDuplicate: boolean
  policy?: Partial<PolicyParams> | null
  connectionSlack?: number | null
}): RuleHit[] {
  const { changes, issues, isDuplicate } = args
  const policy = normalizePolicy(args.policy)
  const hours = etaAbsHours(changes)
  const slack = args.connectionSlack
  return [
    {
      id: 'R1',
      rule: '스케줄 필드 변경 감지',
      action: '예외 생성',
      fired: changes.length > 0 && !isDuplicate && issues.every((i) => i.code !== 'ETB_BEFORE_ETA'),
      basis: 'invariant',
    },
    {
      id: 'R2',
      rule: `ETA 변경 ≥ ${policy.etaReviewHours}시간 (부산 터미널 재계획 주기 문헌)`,
      action: '검토 창 비교',
      fired: hours >= policy.etaReviewHours,
      basis: 'company_policy',
    },
    {
      id: 'R3',
      rule: '같은 원문의 항차·시각 모순 또는 필수값 누락',
      action: '확인 필요 · 발송 잠금',
      fired: issues.length > 0,
      basis: 'invariant',
    },
    {
      id: 'R4',
      rule: '동일 변경 재수신',
      action: '중복 예외 억제',
      fired: isDuplicate,
      basis: 'invariant',
    },
    {
      id: 'R5',
      rule: '대외 통보',
      action: '담당자 승인 필수',
      fired: true,
      basis: 'invariant',
    },
    {
      id: 'R6',
      rule: 'ETA 변경 → CY Cut-off 자동 확정',
      action: '적용하지 않음 (화물 프로세스는 별도)',
      fired: false,
      basis: 'forbid',
    },
    {
      id: 'R7',
      rule: `연결 여유 < ${policy.minConnectionHours}시간 (T/S 체류 문헌 하한)`,
      action: '연결 확인',
      fired: slack != null && slack < policy.minConnectionHours,
      basis: 'company_policy',
    },
  ]
}

export function validateSchedule(next: ScheduleFields, extracted: ExtractedField[]): ValidationIssue[] {
  const has = (k: FieldKey) => Boolean(extracted.find((f) => f.key === k)?.value)
  const issues: ValidationIssue[] = []
  if (!next.voyage) issues.push({ code: 'VOYAGE_MISSING', message: '항차번호가 없습니다. 검토함으로 이동합니다.', field: 'voyage' })
  if (!next.vessel) issues.push({ code: 'VESSEL_MISSING', message: '선박명이 없습니다.', field: 'vessel' })
  const eta = Date.parse((next.eta || '').replace(' LT', '').replace(' ', 'T'))
  const etb = Date.parse((next.etb || '').replace(' LT', '').replace(' ', 'T'))
  const etd = Date.parse((next.etd || '').replace(' LT', '').replace(' ', 'T'))
  if (has('eta') && has('etb') && !Number.isNaN(eta) && !Number.isNaN(etb) && etb < eta) {
    issues.push({
      code: 'ETB_BEFORE_ETA',
      message: 'ETB가 ETA보다 빠릅니다. 원문을 확인하세요. 발송이 잠깁니다.',
      field: 'etb',
    })
  }
  if (has('etb') && has('etd') && !Number.isNaN(etb) && !Number.isNaN(etd) && etd < etb) {
    issues.push({ code: 'ETD_BEFORE_ETB', message: 'ETD가 ETB보다 빠릅니다.', field: 'etd' })
  }
  return issues
}

export function duplicateKey(s: ScheduleFields): string {
  return [s.vessel, s.voyage, s.port, s.eta, s.berth, s.terminal].map((x) => (x || '').toUpperCase()).join('|')
}

export function buildImpact(
  changes: DiffChange[],
  cutoffUnchanged: boolean,
  connecting?: ScheduleFields,
  incoming?: ScheduleFields,
  previous?: ScheduleFields,
): ImpactItem[] {
  const eta = changes.some((c) => c.key === 'eta' || c.key === 'etb')
  const berth = changes.some((c) => c.key === 'berth' || c.key === 'terminal')
  const stay = incoming ? hoursBetween(incoming.eta, incoming.etd) : null
  const prevStay = previous ? hoursBetween(previous.eta, previous.etd) : null
  const slack = connecting && incoming ? hoursBetween(incoming.etd || incoming.eta, connecting.etd || connecting.eta) : null
  const etbGap = previous && incoming ? hoursBetween(previous.etb, incoming.eta) : null
  return [
    {
      area: '접안 협의',
      status: eta || berth ? 'review_required' : 'unchanged',
      reason:
        eta || berth
          ? `체류 ${prevStay != null && stay != null ? `${prevStay}h→${stay}h` : '계산 불가'}${etbGap != null && etbGap > 0 ? ` · 신규 ETA가 확정 ETB보다 ${etbGap}h 뒤` : ''}`
          : '변경 없음',
      dataConsidered: 'ETA, ETB, ETD, Berth, Terminal',
      nextAction: '터미널 협의 시각 확인',
    },
    {
      area: '연결 항차',
      status: connecting && eta ? 'review_required' : connecting ? 'unchanged' : 'unavailable',
      reason:
        slack == null
          ? connecting
            ? '연결 항차는 있으나 시각을 계산할 수 없습니다.'
            : '연결된 피더 항차 데이터가 없습니다.'
          : `연결 ETD − 본선 ETD = ${slack}h`,
      dataConsidered: '본선 ETD, 연결 항차 ETD',
      nextAction: connecting ? '피더/연결 출항 창 확인' : '데이터 확보 후 재평가',
    },
    {
      area: '화물 Cut-off',
      status: cutoffUnchanged ? 'no_update' : changes.some((c) => c.key === 'cutoff') ? 'review_required' : 'no_update',
      reason: cutoffUnchanged
        ? `원문에 Cut-off 변경 없음. 리드 ${incoming ? hoursBetween(incoming.cutoff, incoming.etd) ?? '—' : '—'}h. ETA로 파생하지 않음.`
        : '원문에 Cut-off 값이 새로 들어왔습니다.',
      dataConsidered: '원문 Cut-off 필드 (Commercial / Booking 계열)',
      nextAction: cutoffUnchanged ? '화물 마감은 별도 통지가 올 때만 갱신' : '기존 화물 조건과 비교',
    },
    {
      area: '내륙 운송',
      status: berth ? 'review_required' : 'unchanged',
      reason: berth ? '부두/터미널 변경은 게이트·대기 동선 확인이 필요합니다.' : '부두 변경 없음',
      dataConsidered: 'Berth, Terminal',
      nextAction: berth ? '내륙 배차 게이트 재지정 여부 확인' : '해당 없음',
    },
  ]
}

export function buildTasks(issues: ValidationIssue[], isDuplicate: boolean): ExceptionRecord['tasks'] {
  if (isDuplicate) {
    return [{ id: 't0', title: '중복 예외 억제', status: 'auto_done', detail: '동일 변경 키 · 새 전표 없음' }]
  }
  if (issues.length) {
    return [
      { id: 't1', title: '원문 모순 확인', status: 'blocked', detail: issues[0].message },
      { id: 't2', title: '외부 통보 초안', status: 'blocked', detail: '검증 실패 · 발송 불가' },
    ]
  }
  return [
    { id: 't1', title: '접안 관련 조건 확인', status: 'pending_human', detail: '담당자 확인 필요' },
    { id: 't2', title: '화주 통보 초안', status: 'draft_ready', detail: '승인 전 미발송' },
    { id: 't3', title: '내륙 통보 초안', status: 'draft_ready', detail: '승인 전 미발송' },
    { id: 't4', title: '내부 운항 기록', status: 'draft_ready', detail: '내부 채널' },
    { id: 't5', title: '예외 레코드 저장', status: 'auto_done', detail: '감사 로그에 기록됨' },
  ]
}

export function buildDrafts(exceptionId: string, prev: ScheduleFields, next: ScheduleFields, changes: DiffChange[]): NotificationDraft[] {
  const changed = (k: FieldKey) => changes.find((c) => c.key === k)
  const eta = changed('eta')
  const berth = changed('berth') || changed('terminal')
  const cutoff = changed('cutoff')
  const shipperBits = [
    `항차 ${next.voyage} ${next.vessel}의 ${next.port}(${next.terminal})`,
    eta ? `입항 예정이 ${eta.previous}에서 ${eta.next}로 변경되었습니다.` : '입항 일정 통보입니다.',
    berth ? `접안 부두는 ${berth.previous}에서 ${berth.next}로 변경됩니다.` : '',
    cutoff
      ? `CY 반입 마감이 ${cutoff.previous}에서 ${cutoff.next}로 변경되었습니다.`
      : `CY 반입 마감은 원문 기준 ${next.cutoff || prev.cutoff || '별도 통지 없음'}입니다.`,
  ].filter(Boolean)
  const inlandBits = [
    `${next.voyage} ${next.vessel}, ${next.terminal}`,
    berth ? `부두 ${berth.previous}→${berth.next}` : '부두 변경 없음',
    eta ? `접안 예정 ${eta.next} 전후.` : '',
    berth ? '게이트·대기 동선 재지정 바랍니다.' : '',
  ].filter(Boolean)
  const shipper = `안녕하세요.\n${shipperBits.join(' ')}\n반입·배차 일정을 확인해 주시기 바랍니다.`
  const inland = inlandBits.join(' ')
  const internal = `변경 ${changes.map((c) => `${c.label} ${c.previous} → ${c.next}`).join(', ') || '필드 변경 없음'}. Cut-off ${next.cutoff || prev.cutoff || '원문 없음'}.`
  return [
    {
      id: `${exceptionId}-shipper`,
      exceptionId,
      channel: 'shipper',
      title: '화주 통보 초안',
      status: 'draft',
      body: shipper,
      originalBody: shipper,
    },
    {
      id: `${exceptionId}-inland`,
      exceptionId,
      channel: 'inland',
      title: '내륙 운송 초안',
      status: 'draft',
      body: inland,
      originalBody: inland,
    },
    {
      id: `${exceptionId}-internal`,
      exceptionId,
      channel: 'internal',
      title: '내부 운항 메모',
      status: 'draft',
      body: internal,
      originalBody: internal,
    },
  ]
}

export function nextExceptionId(seq: number, at = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `EX-${String(at.getFullYear()).slice(2)}${p(at.getMonth() + 1)}${p(at.getDate())}-${String(seq).padStart(4, '0')}`
}

export function matchVoyage(fields: ExtractedField[], voyages: VoyageRecord[]): VoyageRecord | undefined {
  const v = fields.find((f) => f.key === 'voyage')?.value
  const vessel = fields.find((f) => f.key === 'vessel')?.value
  if (v) {
    const byVoy = voyages.find((x) => x.voyage.toUpperCase() === v.toUpperCase())
    if (byVoy) return byVoy
  }
  if (vessel) {
    const name = vessel.toUpperCase().replace(/^MV\s+/, '')
    return voyages.find((x) => x.vessel.toUpperCase().replace(/^MV\s+/, '').includes(name) || name.includes(x.vessel.toUpperCase().replace(/^MV\s+/, '')))
  }
  return undefined
}

const EMPTY_SCHEDULE: ScheduleFields = {
  vessel: '',
  voyage: '',
  port: '',
  terminal: '',
  berth: '',
  eta: '',
  etd: '',
}

export function processInboxItem(args: {
  item: InboxItem
  voyages: VoyageRecord[]
  confirmed: Record<string, ScheduleFields>
  existingKeys: string[]
  seq: number
  extracted?: ExtractedField[]
  policy?: Partial<PolicyParams> | null
}): {
  kind: ProcessKind
  exception?: ExceptionRecord
  drafts?: NotificationDraft[]
  duplicateOf?: string
  key?: string
} {
  const { item, voyages, confirmed, existingKeys, seq } = args
  const policy = normalizePolicy(args.policy)
  const extracted = args.extracted || extractFromSource(item.body, item.receivedAt)
  const voyage = matchVoyage(extracted, voyages) || voyages.find((v) => v.id === item.linkedVoyageId)
  if (!voyage) {
    const incoming = fieldsToSchedule(extracted, EMPTY_SCHEDULE)
    const issues: ValidationIssue[] = [
      { code: 'VOYAGE_UNMATCHED', message: '항차 마스터에 없는 선박·항차입니다. 대외 초안을 만들지 않았습니다.' },
    ]
    const id = nextExceptionId(seq)
    const exception: ExceptionRecord = {
      id,
      inboxId: item.id,
      voyageId: '',
      createdAt: nowStamp(),
      priority: 'medium',
      reviewRank: 5,
      reviewHeadline: '항차 미매칭',
      clocks: [],
      status: 'review_required',
      summary: issues[0].message,
      fields: extracted,
      previous: EMPTY_SCHEDULE,
      incoming,
      changes: [],
      issues,
      rules: fireRules({ changes: [], issues, isDuplicate: false, policy }),
      impact: buildImpact([], true),
      tasks: [
        { id: 't1', title: '항차 마스터 확인', status: 'pending_human', detail: '선박·항차를 등록한 뒤 다시 처리' },
        { id: 't2', title: '외부 통보 초안', status: 'blocked', detail: '미매칭 · 초안 없음' },
      ],
    }
    return { kind: 'unmatched', exception, key: duplicateKey(incoming) }
  }
  const prev = confirmed[voyage.id] || EMPTY_SCHEDULE
  const incoming = fieldsToSchedule(extracted, prev)
  const key = duplicateKey(incoming)
  if (existingKeys.includes(key)) {
    return { kind: 'duplicate', duplicateOf: key, key }
  }
  const changes = diffSchedules(prev, incoming)
  const issues = validateSchedule(incoming, extracted)
  const cutoffUnchanged = !changes.some((c) => c.key === 'cutoff')
  const connectingVoyage = voyage.connectingVoyageId ? voyages.find((x) => x.id === voyage.connectingVoyageId) : undefined
  const connectingSchedule = connectingVoyage ? confirmed[connectingVoyage.id] : undefined
  const connectionSlack = connectingSchedule ? hoursBetween(incoming.etd || incoming.eta, connectingSchedule.etd || connectingSchedule.eta) : null
  const rules = fireRules({ changes, issues, isDuplicate: false, policy, connectionSlack })
  const impact = buildImpact(changes, cutoffUnchanged, connectingSchedule, incoming, prev)
  const plan = buildReviewPlan({ previous: prev, incoming, changes, connecting: connectingSchedule, policy })
  const id = nextExceptionId(seq)
  const blocked = issues.length > 0
  if (!blocked && changes.length === 0) {
    return { kind: 'unchanged', key }
  }
  const exception: ExceptionRecord = {
    id,
    inboxId: item.id,
    voyageId: voyage.id,
    createdAt: nowStamp(),
    priority: blocked ? 'high' : plan.priority,
    reviewRank: blocked ? 0 : plan.rank,
    reviewHeadline: blocked ? issues[0].message : plan.headline,
    clocks: plan.clocks,
    status: blocked ? 'blocked' : 'open',
    summary: blocked
      ? issues[0].message
      : changes.map((c) => `${c.label} ${c.previous} → ${c.next}`).join(' · '),
    fields: extracted,
    previous: prev,
    incoming,
    changes,
    issues,
    rules,
    impact,
    tasks: buildTasks(issues, false),
  }
  if (blocked) return { kind: 'blocked', exception, key }
  return { kind: 'exception', exception, drafts: buildDrafts(id, prev, incoming, changes), key }
}

function normVessel(s: string) {
  return s.toUpperCase().replace(/^MV\s+/, '').replace(/\s+/g, ' ').trim()
}

export function similarExceptions(current: ExceptionRecord, all: ExceptionRecord[]): SimilarHit[] {
  const keys = new Set(current.changes.map((c) => c.key))
  return all
    .filter((e) => e.id !== current.id)
    .map((e) => {
      const reasons: string[] = []
      let score = 0
      if (normVessel(e.incoming.vessel) && normVessel(e.incoming.vessel) === normVessel(current.incoming.vessel)) {
        score += 3
        reasons.push('동일 선박')
      }
      if (e.incoming.port && e.incoming.port === current.incoming.port) {
        score += 1
        reasons.push('동일 기항')
      }
      if (e.incoming.terminal && e.incoming.terminal === current.incoming.terminal) {
        score += 1
        reasons.push('동일 터미널')
      }
      const overlap = e.changes.filter((c) => keys.has(c.key))
      if (overlap.length) {
        score += overlap.length * 2
        reasons.push(`변경 ${overlap.map((c) => c.label).join('·')}`)
      }
      if (e.status === 'sent' || e.status === 'resolved') {
        score += 1
        reasons.push('처리 완료')
      }
      return {
        id: e.id,
        score,
        reasons,
        vessel: e.incoming.vessel,
        voyage: e.incoming.voyage,
        summary: e.summary,
        status: e.status,
        createdAt: e.createdAt,
      }
    })
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}
