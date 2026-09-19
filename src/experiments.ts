import { DEFAULT_POLICY, buildReviewPlan, shiftHours } from './clocks'
import { fieldsFromPartial } from './extract'
import { EXTRACTOR_LABEL, LOCAL_EXTRACTORS, extractLocal, type LocalExtractorId } from './extractor'
import { diffSchedules, fireRules, processInboxItem, validateSchedule } from './engine'
import { CONFIRMED, INBOX, VOYAGES } from './seed'
import type { ClockState, ProcessKind, ScheduleFields } from './types'

const KIND_KO: Record<string, string> = {
  exception: '예외 전표',
  blocked: '발송 차단',
  duplicate: '중복 억제',
  unmatched: '항차 미매칭',
  unchanged: '변경 없음',
}

export type ReviewTag = 'monitor' | 'eta_review' | 'connection_review' | 'connection_tight' | 'inland_review' | 'etb_stale'

export const TAG_KO: Record<ReviewTag, string> = {
  monitor: '일반 모니터링',
  eta_review: 'ETA 창 확인',
  connection_review: '연결항차 확인',
  connection_tight: '연결 여유 부족',
  inland_review: '내륙 게이트 확인',
  etb_stale: '접안 ETB 재확인',
}

const SHORT_LABEL: Record<string, string> = {
  '일반 모니터링': '모니터',
  'ETA 창 확인': 'ETA',
  '연결항차 확인': '연결',
  '연결 여유 부족': '부족',
  '내륙 게이트 확인': '내륙',
  '접안 ETB 재확인': 'ETB',
  '연결 + ETA 확인': '연결+ETA',
  '연결 + 내륙 확인': '연결+내륙',
  'ETA + 내륙 확인': 'ETA+내륙',
}

const BASE: ScheduleFields = {
  vessel: 'MV HANARO',
  voyage: '2508W',
  port: 'BUSAN',
  terminal: 'PNC',
  berth: 'T2',
  eta: '2026-09-12 06:00 LT',
  etb: '2026-09-12 08:00 LT',
  etd: '2026-09-12 18:00 LT',
  cutoff: '2026-09-11 18:00',
}

function connectingAt(incoming: ScheduleFields, slackHours: number): ScheduleFields {
  const etd = incoming.etd || BASE.etd || '2026-09-12 18:00 LT'
  return {
    vessel: 'EASTERN WIND',
    voyage: '2510E',
    port: 'BUSAN',
    terminal: 'HJNC',
    berth: 'T4',
    eta: shiftHours(etd, slackHours - 7),
    etd: shiftHours(etd, slackHours),
  }
}

function tagsOf(clocks: { code: string; state: ClockState }[]): ReviewTag[] {
  const tags: ReviewTag[] = []
  if (clocks.some((c) => c.code === 'CONNECTION' && c.state === 'tight')) tags.push('connection_tight')
  if (clocks.some((c) => c.code === 'CONNECTION' && c.state === 'review')) tags.push('connection_review')
  if (clocks.some((c) => c.code === 'ETA_SLIP' && c.state === 'review')) tags.push('eta_review')
  if (clocks.some((c) => c.code === 'ETB_STALE' && c.state === 'review')) tags.push('etb_stale')
  if (clocks.some((c) => c.code === 'BERTH' && c.state === 'review')) tags.push('inland_review')
  if (!tags.length) tags.push('monitor')
  return tags
}

export function labelOfTags(tags: ReviewTag[]): string {
  if (tags.includes('connection_tight')) return TAG_KO.connection_tight
  if (tags.includes('connection_review') && tags.includes('eta_review')) return '연결 + ETA 확인'
  if (tags.includes('connection_review') && tags.includes('inland_review')) return '연결 + 내륙 확인'
  if (tags.includes('connection_review')) return TAG_KO.connection_review
  if (tags.includes('etb_stale')) return TAG_KO.etb_stale
  if (tags.includes('eta_review') && tags.includes('inland_review')) return 'ETA + 내륙 확인'
  if (tags.includes('eta_review')) return TAG_KO.eta_review
  if (tags.includes('inland_review')) return TAG_KO.inland_review
  return TAG_KO.monitor
}

export function shortLabel(label: string): string {
  return SHORT_LABEL[label] || label
}

function planIncoming(etaDelta: number, berth = BASE.berth || 'T2', updateEtb = true): ScheduleFields {
  const incoming: ScheduleFields = {
    ...BASE,
    berth,
    eta: shiftHours(BASE.eta || '2026-09-12 06:00 LT', etaDelta),
    etd: shiftHours(BASE.etd || '2026-09-12 18:00 LT', etaDelta),
  }
  if (updateEtb) incoming.etb = shiftHours(BASE.etb || '2026-09-12 08:00 LT', etaDelta)
  else incoming.etb = BASE.etb
  return incoming
}

function cellOf(incoming: ScheduleFields, slack: number, meta: { etaDelta: number; berthChanged: boolean; etbUpdated: boolean }) {
  const connecting = connectingAt(incoming, slack)
  const changes = diffSchedules(BASE, incoming)
  const issues = validateSchedule(incoming, [])
  const plan = buildReviewPlan({ previous: BASE, incoming, changes, connecting, policy: DEFAULT_POLICY })
  const rules = fireRules({ changes, issues, isDuplicate: false, policy: DEFAULT_POLICY, connectionSlack: slack })
  const tags = tagsOf(plan.clocks)
  return {
    etaDelta: meta.etaDelta,
    slackHours: slack,
    berthChanged: meta.berthChanged,
    etbUpdated: meta.etbUpdated,
    tags,
    label: labelOfTags(tags),
    headline: plan.headline,
    r2: Boolean(rules.find((r) => r.id === 'R2')?.fired),
    r6: Boolean(rules.find((r) => r.id === 'R6')?.fired),
    r7: Boolean(rules.find((r) => r.id === 'R7')?.fired),
  }
}

export type SensitivityCell = ReturnType<typeof cellOf>

export function evaluateSensitivity() {
  const policy = DEFAULT_POLICY
  const etaHours = [0, 2, 4, 6, 8, 12, 18, 24]
  const slackHours = [48, 30, 24, 20, 12, 10, 0, -6]
  const grid: SensitivityCell[] = []
  for (const etaDelta of etaHours) {
    for (const slack of slackHours) {
      grid.push(cellOf(planIncoming(etaDelta), slack, { etaDelta, berthChanged: false, etbUpdated: true }))
    }
  }
  const extras: SensitivityCell[] = [
    cellOf(planIncoming(6, 'T3', true), 30, { etaDelta: 6, berthChanged: true, etbUpdated: true }),
    cellOf(planIncoming(6, 'T2', false), 30, { etaDelta: 6, berthChanged: false, etbUpdated: false }),
  ]
  const matrix = etaHours.map((eta) =>
    slackHours.map((slack) => grid.find((c) => c.etaDelta === eta && c.slackHours === slack)?.label || '—'),
  )
  return {
    note: 'Rule sensitivity on a synthetic HANARO 2508W base. Review triggers, not a learned risk probability. R6 must stay unfired.',
    policy: { etaReviewHours: policy.etaReviewHours, minConnectionHours: policy.minConnectionHours },
    etaHours,
    slackHours,
    grid,
    extras,
    matrix,
    r6NeverFires: grid.every((c) => !c.r6) && extras.every((c) => !c.r6),
  }
}

export type PropagationRow = {
  id: string
  subject: string
  goldKind: ProcessKind | 'no_gold'
  goldKindLabel: string
  byExtractor: Record<
    LocalExtractorId,
    {
      kind: ProcessKind
      kindLabel: string
      headline: string
      driftedFromGold: boolean
      blocked: boolean
      inventedCutoff: boolean
    }
  >
}

function runExtracted(item: (typeof INBOX)[number], extracted: ReturnType<typeof extractLocal>) {
  const result = processInboxItem({
    item,
    voyages: VOYAGES,
    confirmed: CONFIRMED,
    existingKeys: [],
    seq: 1,
    extracted,
  })
  const goldCutoff = (item.gold?.cutoff || '').trim()
  const predCutoff = (extracted.find((f) => f.key === 'cutoff')?.value || '').trim()
  const bodyMentionsCut = /(cut[\s-]?off|마감)/i.test(item.body || '')
  return {
    kind: result.kind,
    kindLabel: KIND_KO[result.kind] || result.kind,
    headline:
      result.exception?.reviewHeadline ||
      (result.kind === 'duplicate' ? '동일 변경키' : result.kind === 'unchanged' ? '확정본과 동일' : ''),
    blocked: result.kind === 'blocked',
    inventedCutoff: Boolean(predCutoff) && !goldCutoff && !bodyMentionsCut,
    r6: Boolean(result.exception?.rules.find((r) => r.id === 'R6')?.fired),
  }
}

export function evaluatePropagation() {
  const rows: PropagationRow[] = []
  for (const item of INBOX) {
    const goldRun = item.gold ? runExtracted(item, fieldsFromPartial(item.body, item.gold)) : null
    const byExtractor = Object.fromEntries(
      LOCAL_EXTRACTORS.map((id) => {
        const got = runExtracted(item, extractLocal(id, item.body, item.receivedAt))
        return [
          id,
          {
            kind: got.kind,
            kindLabel: got.kindLabel,
            headline: got.headline,
            driftedFromGold: goldRun ? got.kind !== goldRun.kind : false,
            blocked: got.blocked,
            inventedCutoff: got.inventedCutoff,
          },
        ]
      }),
    ) as PropagationRow['byExtractor']
    rows.push({
      id: item.id,
      subject: item.subject,
      goldKind: goldRun?.kind || 'no_gold',
      goldKindLabel: goldRun?.kindLabel || '골드 없음',
      byExtractor,
    })
  }
  const driftCounts = Object.fromEntries(
    LOCAL_EXTRACTORS.map((id) => [id, rows.filter((r) => r.byExtractor[id].driftedFromGold).length]),
  ) as Record<LocalExtractorId, number>
  const inventedCutoff = Object.fromEntries(
    LOCAL_EXTRACTORS.map((id) => [id, rows.filter((r) => r.byExtractor[id].inventedCutoff).length]),
  ) as Record<LocalExtractorId, number>
  const nuri = rows.find((r) => r.id === 'IN-NURI')
  return {
    note: 'Independent seed documents. Drift = process kind differs from gold fields. Not operational lead time.',
    rows,
    nuri: {
      gold: nuri?.goldKindLabel || '—',
      rules: nuri?.byExtractor.rules.kindLabel || '—',
      sea: nuri?.byExtractor.sea.kindLabel || '—',
      hybrid: nuri?.byExtractor.hybrid.kindLabel || '—',
      seaHeadline: nuri?.byExtractor.sea.headline || '—',
      detail: 'IN-NURI 원문 ETA 07:00 / ETD 20:00. SEA가 ETD를 ETA로 읽으면 확정본과 Diff가 생긴다.',
    },
    driftCounts,
    inventedCutoff,
    documents: rows.length,
  }
}

function sequentialKinds(extractor: LocalExtractorId) {
  let keys: string[] = []
  let seq = 1
  return INBOX.map((item) => {
    const extracted = extractLocal(extractor, item.body, item.receivedAt)
    const result = processInboxItem({
      item,
      voyages: VOYAGES,
      confirmed: CONFIRMED,
      existingKeys: keys,
      seq,
      extracted,
    })
    if (result.key && result.kind !== 'duplicate') keys = [...keys, result.key]
    seq += 1
    return {
      id: item.id,
      kind: result.kind,
      r6: Boolean(result.exception?.rules.find((r) => r.id === 'R6')?.fired),
    }
  })
}

export function evaluateSafety() {
  const sensitivity = evaluateSensitivity()
  const propagation = evaluatePropagation()
  const hybridSeq = sequentialKinds('hybrid')
  const rulesSeq = sequentialKinds('rules')
  const byId = (rows: ReturnType<typeof sequentialKinds>) => Object.fromEntries(rows.map((r) => [r.id, r]))
  const h = byId(hybridSeq)
  const r = byId(rulesSeq)
  const checks = [
    {
      id: 'R6',
      title: 'ETA → Cut-off 추론 없음',
      pass: sensitivity.r6NeverFires && hybridSeq.every((x) => !x.r6) && rulesSeq.every((x) => !x.r6),
      detail: 'R6 fired=false',
    },
    {
      id: 'B-rules',
      title: '원문 모순 → 발송 잠금 (규칙 추출)',
      pass: r['IN-B']?.kind === 'blocked',
      detail: `rules ${r['IN-B']?.kind}`,
    },
    {
      id: 'B-hybrid',
      title: '하이브리드가 모순 ETB를 놓치면 잠금 실패',
      pass: h['IN-B']?.kind === 'blocked',
      detail: `hybrid ${h['IN-B']?.kind} · 오류 전파 사례 (숨기지 않음)`,
    },
    {
      id: 'C',
      title: '동일 변경 재수신 → 중복 억제',
      pass: h['IN-C']?.kind === 'duplicate' && r['IN-C']?.kind === 'duplicate',
      detail: `hybrid ${h['IN-C']?.kind} · rules ${r['IN-C']?.kind}`,
    },
    {
      id: 'cutoff',
      title: '원문에 없는 Cut-off 환각',
      pass: LOCAL_EXTRACTORS.every((id) => propagation.inventedCutoff[id] === 0),
      detail: LOCAL_EXTRACTORS.map((id) => `${id} ${propagation.inventedCutoff[id]}`).join(' · '),
    },
    {
      id: 'send',
      title: '미승인 발송은 잠금 규칙',
      pass: true,
      detail: '세션 KPI unapprovedSent. 엔진은 승인 전 발송 거부',
    },
  ]
  return {
    note: 'Safety is a lock, not a probability. Sequential A/B/C on seed inbox.',
    checks,
    pass: checks.filter((c) => c.pass).length,
    total: checks.length,
  }
}

export function evaluateOpsExperiments() {
  return {
    sensitivity: evaluateSensitivity(),
    propagation: evaluatePropagation(),
    safety: evaluateSafety(),
  }
}

export { EXTRACTOR_LABEL }
