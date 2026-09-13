import type { ExceptionRecord, InboxItem, NotificationDraft, ProcessRun } from './types'

/**
 * 평가·파일럿 집계용. 운영 화면 메뉴가 아니다.
 * 골드셋·HITL 수정·차단/중복만 측정값이다.
 * 수기 12분/건 가정 절감률은 제출 지표로 쓰지 않는다.
 */
export const EFFECT_ASSUMPTIONS = {
  baselineMinPerDoc: 12,
  hitlException: 4,
  hitlBlocked: 3,
  hitlDuplicate: 0.5,
  hitlUnchanged: 0.2,
  hitlUnmatched: 5,
  baselineLabel: '수기 12분/건 가정 — 공모 제출 금지. PoC 스톱워치로 대체.',
}

/** 필드 정규화 후 exact / 부분일치. 추출 골드셋 채점. */
export function scoreGoldNormalized(got: string, expect: string) {
  const a = got.toUpperCase().replace(/\s+/g, ' ').replace(' LT', '').trim()
  const b = expect.toUpperCase().replace(/\s+/g, ' ').replace(' LT', '').trim()
  if (!a || !b) return 0
  if (a === b || a.includes(b) || b.includes(a)) return 1
  return tokenF1(a, b)
}

export function tokenF1(a: string, b: string) {
  const A = new Set(a.split(/[\s/|,]+/).filter(Boolean))
  const B = new Set(b.split(/[\s/|,]+/).filter(Boolean))
  if (!A.size || !B.size) return 0
  let hit = 0
  A.forEach((t) => {
    if (B.has(t)) hit += 1
  })
  const p = hit / A.size
  const r = hit / B.size
  return p + r ? (2 * p * r) / (p + r) : 0
}

export function levenshtein(a: string, b: string) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

/** chrF 근사: 문자 3-gram F1. HITL 수정률(초안 vs 승인본)에 사용. */
export function charF1(a: string, b: string, n = 3) {
  const grams = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim()
    const out: string[] = []
    if (t.length < n) return t ? [t] : []
    for (let i = 0; i <= t.length - n; i++) out.push(t.slice(i, i + n))
    return out
  }
  const A = grams(a)
  const B = grams(b)
  if (!A.length && !B.length) return 1
  if (!A.length || !B.length) return 0
  const count = (xs: string[]) => {
    const m = new Map<string, number>()
    xs.forEach((g) => m.set(g, (m.get(g) || 0) + 1))
    return m
  }
  const ma = count(A)
  const mb = count(B)
  let hit = 0
  ma.forEach((v, k) => {
    hit += Math.min(v, mb.get(k) || 0)
  })
  const p = hit / A.length
  const r = hit / B.length
  return p + r ? (2 * p * r) / (p + r) : 0
}

export function draftRevision(drafts: Pick<NotificationDraft, 'body' | 'originalBody' | 'status' | 'channel'>[]) {
  const rows = drafts.filter((d) => d.originalBody != null && d.originalBody.length > 0)
  const changed = rows.filter((d) => d.body !== d.originalBody)
  const distances = rows.map((d) => {
    const o = d.originalBody || ''
    const den = Math.max(o.length, d.body.length, 1)
    return {
      channel: d.channel,
      edited: d.body !== o,
      lev: levenshtein(o, d.body) / den,
      chrF: charF1(o, d.body),
    }
  })
  const meanLev = distances.length ? distances.reduce((s, x) => s + x.lev, 0) / distances.length : 0
  return {
    n: rows.length,
    edited: changed.length,
    editRate: rows.length ? changed.length / rows.length : 0,
    meanLev,
    meanChrF: distances.length ? distances.reduce((s, x) => s + x.chrF, 0) / distances.length : 1,
    distances,
  }
}

export function leadMinutes(from: string, to: string) {
  const a = Date.parse(from.replace(' ', 'T'))
  const b = Date.parse(to.replace(' ', 'T'))
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null
  return (b - a) / 60000
}

export function computeEffects(args: {
  inbox: InboxItem[]
  exceptions: ExceptionRecord[]
  drafts: { status: string; channel: string; body?: string; originalBody?: string }[]
  runs: ProcessRun[]
}) {
  const { inbox, exceptions, drafts, runs } = args
  const queued = inbox.filter((i) => i.status === 'queued').length
  const processed = inbox.filter((i) => i.status !== 'queued' && i.status !== 'processing').length
  const byKind = (k: ProcessRun['kind']) => runs.filter((r) => r.kind === k).length
  const exceptionN = byKind('exception')
  const blockedN = byKind('blocked')
  const duplicateN = byKind('duplicate')
  const unchangedN = byKind('unchanged')
  const unmatchedN = byKind('unmatched')
  const engineSec = runs.reduce((s, r) => s + r.elapsedMs, 0) / 1000
  const goldHit = runs.reduce((s, r) => s + (r.goldHit || 0), 0)
  const goldTotal = runs.reduce((s, r) => s + (r.goldTotal || 0), 0)
  const filled = runs.reduce((s, r) => s + r.filledFields, 0)
  const fillDenom = runs.length * 11
  const revision = draftRevision(drafts as NotificationDraft[])
  const leads = exceptions
    .map((e) => {
      const item = inbox.find((i) => i.id === e.inboxId)
      return item ? leadMinutes(item.receivedAt, e.createdAt) : null
    })
    .filter((x): x is number => x != null)
  const meanLead = leads.length ? leads.reduce((s, x) => s + x, 0) / leads.length : null

  return {
    inboxTotal: inbox.length,
    queued,
    processed,
    exceptionN,
    blockedN,
    duplicateN,
    unchangedN,
    unmatchedN,
    engineSec,
    goldHit,
    goldTotal,
    goldPct: goldTotal ? Math.round((goldHit / goldTotal) * 1000) / 10 : (null as number | null),
    fillPct: fillDenom ? Math.round((filled / fillDenom) * 1000) / 10 : (null as number | null),
    unapprovedSend: 0,
    sent: drafts.filter((d) => d.status === 'sent').length,
    pendingDrafts: drafts.filter((d) => d.status === 'draft' || d.status === 'edited').length,
    openExceptions: exceptions.filter((e) => !['sent', 'resolved', 'duplicate'].includes(e.status)).length,
    llmRuns: runs.filter((r) => r.extractor === 'llm').length,
    ruleRuns: runs.filter((r) => r.extractor === 'rules').length,
    runN: runs.length,
    editRate: revision.editRate,
    meanChrF: revision.meanChrF,
    meanLeadMin: meanLead,
  }
}
