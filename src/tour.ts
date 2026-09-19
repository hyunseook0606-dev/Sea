import { DEFAULT_POLICY } from './clocks'
import { extractFromSource } from './extract'
import { processInboxItem } from './engine'
import { CONFIRMED, INBOX, VOYAGES } from './seed'
import type { ExtractedField, ExceptionRecord, InboxItem, NotificationDraft, ProcessKind } from './types'

export type TourStepId = 'why' | 'mail' | 'read' | 'diff' | 'check' | 'send' | 'block' | 'dup'

export const TOUR_STEPS: { id: TourStepId; n: string; nav: string; chapter: string }[] = [
  { id: 'why', n: '01', nav: '소개', chapter: '소개' },
  { id: 'mail', n: '02', nav: '원문 수신', chapter: '대표 시나리오 (가상)' },
  { id: 'read', n: '03', nav: '받은 원문 읽기', chapter: '대표 시나리오 (가상)' },
  { id: 'diff', n: '04', nav: '확정본 비교', chapter: '대표 시나리오 (가상)' },
  { id: 'check', n: '05', nav: '확인 항목', chapter: '대표 시나리오 (가상)' },
  { id: 'send', n: '06', nav: '통보 승인', chapter: '대표 시나리오 (가상)' },
  { id: 'block', n: '07', nav: '모순 잠금', chapter: '안전 장치 (가상)' },
  { id: 'dup', n: '08', nav: '중복 처리', chapter: '안전 장치 (가상)' },
]

export type TourCase = {
  item: InboxItem
  fields: ExtractedField[]
  kind: ProcessKind
  key?: string
  exception?: ExceptionRecord
  drafts: NotificationDraft[]
}

function runCase(key: 'A' | 'B' | 'C', existingKeys: string[]): TourCase {
  const item = INBOX.find((i) => i.demoKey === key)
  if (!item) throw new Error(`시드 ${key} 없음`)
  const fields = extractFromSource(item.body, item.receivedAt)
  const result = processInboxItem({
    item,
    voyages: VOYAGES,
    confirmed: CONFIRMED,
    existingKeys,
    seq: 1,
    extracted: fields,
    policy: DEFAULT_POLICY,
  })
  return { item, fields, kind: result.kind, key: result.key, exception: result.exception, drafts: result.drafts ?? [] }
}

export function buildTourCases() {
  const a = runCase('A', [])
  const b = runCase('B', [])
  const c = runCase('C', a.key ? [a.key] : [])
  return { a, b, c }
}
