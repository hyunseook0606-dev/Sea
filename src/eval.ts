import { goldFieldMatch, LABELS, scoreGold } from './extract'
import { processInboxItem } from './engine'
import { EXTRACTOR_LABEL, LOCAL_EXTRACTORS, extractLocal, type LocalExtractorId } from './extractor'
import { CONFIRMED, INBOX, VOYAGES } from './seed'
import type { ExceptionRecord, FieldKey, InboxItem, NotificationDraft, ProcessKind, ProcessRun } from './types'

export const KIND_KO: Record<string, string> = {
  exception: '예외 전표',
  blocked: '발송 차단',
  duplicate: '중복 억제',
  unmatched: '항차 미매칭',
  unchanged: '변경 없음',
}

export function formatPct(hit: number, total: number) {
  if (!total) return '—'
  const p = (100 * hit) / total
  return Number.isInteger(p) ? `${p}%` : `${p.toFixed(1)}%`
}

export type GoldMiss = { key: FieldKey; label: string; expect: string; got: string }

export type GoldRow = {
  id: string
  demoKey?: InboxItem['demoKey']
  subject: string
  sourceType: InboxItem['sourceType']
  extractor: LocalExtractorId
  hit: number
  total: number
  misses: GoldMiss[]
}

export type GoldReport = {
  extractor: LocalExtractorId
  extractorLabel: string
  rows: GoldRow[]
  hit: number
  total: number
  rate: number
  documents: number
}

export function evaluateGold(items: InboxItem[] = INBOX, extractor: LocalExtractorId = 'rules'): GoldReport {
  const rows: GoldRow[] = []
  for (const item of items) {
    if (!item.gold) continue
    const fields = extractLocal(extractor, item.body, item.receivedAt)
    const { hit, total } = scoreGold(fields, item.gold)
    const misses: GoldMiss[] = []
    for (const key of Object.keys(item.gold) as FieldKey[]) {
      const expect = (item.gold[key] || '').trim()
      if (!expect) continue
      const got = (fields.find((f) => f.key === key)?.value || '').trim()
      if (!goldFieldMatch(got, expect)) misses.push({ key, label: LABELS[key], expect, got: got || '(없음)' })
    }
    rows.push({
      id: item.id,
      demoKey: item.demoKey,
      subject: item.subject,
      sourceType: item.sourceType,
      extractor,
      hit,
      total,
      misses,
    })
  }
  const hit = rows.reduce((a, r) => a + r.hit, 0)
  const total = rows.reduce((a, r) => a + r.total, 0)
  return {
    extractor,
    extractorLabel: EXTRACTOR_LABEL[extractor],
    rows,
    hit,
    total,
    rate: total ? hit / total : 0,
    documents: rows.length,
  }
}

export function evaluateGoldByExtractor(items: InboxItem[] = INBOX) {
  return Object.fromEntries(LOCAL_EXTRACTORS.map((id) => [id, evaluateGold(items, id)])) as Record<LocalExtractorId, GoldReport>
}

export type PipelineRow = {
  id: string
  demoKey?: InboxItem['demoKey']
  subject: string
  kind: ProcessKind
  kindLabel: string
  headline: string
}

export type PipelineReport = {
  extractor: LocalExtractorId
  rows: PipelineRow[]
  counts: Record<string, number>
  n: number
}

export function evaluatePipeline(items: InboxItem[] = INBOX, extractor: LocalExtractorId = 'rules'): PipelineReport {
  const confirmed = { ...CONFIRMED }
  let keys: string[] = []
  let seq = 1
  const rows: PipelineRow[] = items.map((item) => {
    const extracted = extractLocal(extractor, item.body, item.receivedAt)
    const result = processInboxItem({ item, voyages: VOYAGES, confirmed, existingKeys: keys, seq, extracted })
    if (result.key && result.kind !== 'duplicate') keys = [...keys, result.key]
    seq += 1
    const headline =
      result.exception?.reviewHeadline ||
      (result.kind === 'duplicate' ? '동일 변경키 · 새 전표 없음' : result.kind === 'unchanged' ? '확정본과 동일' : '')
    return {
      id: item.id,
      demoKey: item.demoKey,
      subject: item.subject,
      kind: result.kind,
      kindLabel: KIND_KO[result.kind] || result.kind,
      headline,
    }
  })
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.kind] = (acc[r.kind] || 0) + 1
    return acc
  }, {})
  return { extractor, rows, counts, n: rows.length }
}

export type Check = { id: string; title: string; pass: boolean; detail: string }

export type ScenarioReport = {
  extractor: LocalExtractorId
  extractorLabel: string
  checks: Check[]
  pass: number
  total: number
  pipeline: PipelineReport
}

export function evaluateScenarios(extractor: LocalExtractorId = 'rules'): ScenarioReport {
  const pipe = evaluatePipeline(INBOX, extractor)
  const byId = Object.fromEntries(pipe.rows.map((r) => [r.id, r]))
  const itemA = INBOX.find((i) => i.id === 'IN-A')
  const extractedA = itemA ? extractLocal(extractor, itemA.body, itemA.receivedAt) : undefined
  const aFull = itemA
    ? processInboxItem({
        item: itemA,
        voyages: VOYAGES,
        confirmed: CONFIRMED,
        existingKeys: [],
        seq: 1,
        extracted: extractedA,
      })
    : undefined
  const cutoffUnchanged = Boolean(aFull?.kind === 'exception' && !aFull.exception?.changes.some((c) => c.key === 'cutoff'))
  const a = byId['IN-A']
  const b = byId['IN-B']
  const c = byId['IN-C']
  const dup = byId['IN-XLS-DUP']
  const unk = byId['IN-UNK']
  const nuri = byId['IN-NURI']
  const checks: Check[] = [
    { id: 'A', title: 'A 정상 변경 → 예외 전표', pass: a?.kind === 'exception', detail: a?.kindLabel || '없음' },
    {
      id: 'A-cutoff',
      title: 'A Cut-off 원문 유지 · ETA에서 추론하지 않음',
      pass: cutoffUnchanged,
      detail: cutoffUnchanged ? 'cutoff 변경 없음' : 'cutoff 변경 있음',
    },
    { id: 'B', title: 'B 원문 시각 모순 → 발송 차단', pass: b?.kind === 'blocked', detail: b?.kindLabel || '없음' },
    { id: 'C', title: 'C 동일 변경 재수신 → 새 전표 없음', pass: c?.kind === 'duplicate', detail: c?.kindLabel || '없음' },
    { id: 'XLS-DUP', title: '동일 엑셀 재수신 → 중복 억제', pass: dup?.kind === 'duplicate', detail: dup?.kindLabel || '없음' },
    { id: 'UNK', title: '미등록 항차 → 대외 초안 없음', pass: unk?.kind === 'unmatched', detail: unk?.kindLabel || '없음' },
    { id: 'NURI', title: '확정본과 동일 → 예외 미생성', pass: nuri?.kind === 'unchanged', detail: nuri?.kindLabel || '없음' },
  ]
  return {
    extractor,
    extractorLabel: EXTRACTOR_LABEL[extractor],
    checks,
    pass: checks.filter((c) => c.pass).length,
    total: checks.length,
    pipeline: pipe,
  }
}

export function evaluateScenariosByExtractor() {
  return Object.fromEntries(LOCAL_EXTRACTORS.map((id) => [id, evaluateScenarios(id)])) as Record<LocalExtractorId, ScenarioReport>
}

export function evaluateLive(args: {
  drafts: NotificationDraft[]
  exceptions: ExceptionRecord[]
  runs: ProcessRun[]
  inbox: InboxItem[]
  sendDenied: number
}) {
  const comparable = args.drafts.filter((d) => (d.channel === 'shipper' || d.channel === 'inland') && d.originalBody)
  const edited = comparable.filter((d) => (d.body || '').trim() !== (d.originalBody || '').trim())
  const unapprovedSent = args.exceptions.filter((e) => {
    if (e.status !== 'sent') return false
    const need = args.drafts.filter((d) => d.exceptionId === e.id && (d.channel === 'shipper' || d.channel === 'inland'))
    return need.some((d) => d.status !== 'sent' && d.status !== 'approved')
  }).length
  const goldRuns = args.runs.filter((r) => r.goldTotal)
  const goldHit = goldRuns.reduce((a, r) => a + (r.goldHit || 0), 0)
  const goldTotal = goldRuns.reduce((a, r) => a + (r.goldTotal || 0), 0)
  const elapsed = args.runs.map((r) => r.elapsedMs).filter((n) => n >= 0).sort((a, b) => a - b)
  const medianElapsedMs = elapsed.length ? elapsed[Math.floor(elapsed.length / 2)] : null
  return {
    hitlEdited: edited.length,
    hitlTotal: comparable.length,
    unapprovedSent,
    sendDenied: args.sendDenied,
    blocked: args.exceptions.filter((e) => e.status === 'blocked').length,
    duplicates: args.inbox.filter((i) => i.status === 'duplicate').length,
    goldHit,
    goldTotal,
    medianElapsedMs,
    runCount: args.runs.length,
  }
}

export function evaluateSeed() {
  const goldByExtractor = evaluateGoldByExtractor()
  const scenariosByExtractor = evaluateScenariosByExtractor()
  return {
    goldByExtractor,
    scenariosByExtractor,
    gold: goldByExtractor.rules,
    scenarios: scenariosByExtractor.rules,
  }
}
