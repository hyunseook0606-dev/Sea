import type { CostItem, EvidenceDocument, PortCall, PortEvent, ReviewIssue, TariffRule } from './types'

export const PORT_CALL: PortCall = {
  id: 'PC-2609',
  vesselName: 'MV HAEJIN',
  imo: '9992609',
  port: 'BUSAN',
  terminal: 'BLUEHARBOR TERMINAL',
  berth: 'B-03',
  eta: '2026-09-18 08:00',
  etd: '2026-09-19 22:00',
  status: 'review',
  currency: 'KRW',
  pdaTotal: 48_200_000,
}

export const EVENTS: PortEvent[] = [
  {
    id: 'EV-WEEKEND',
    portCallId: PORT_CALL.id,
    kind: 'schedule_extension',
    title: '토요일 실제 작업 확인',
    detail: 'ETD 변경 뒤 SOF에서 토요일 06:00까지 이어진 작업을 확인한 가상 기록',
    occurredAt: '2026-09-19 00:00',
    costImpact: 3_600_000,
    calculationBasis: 'Demo Rule: 확인된 토요일 작업 × 대상 기본 작업비 7,200,000원 × 50%',
    enabled: true,
  },
  {
    id: 'EV-TUG',
    portCallId: PORT_CALL.id,
    kind: 'extra_service',
    title: '예선 1회 추가',
    detail: '선석 이동에 따른 예선 서비스 1회 추가 기록',
    occurredAt: '2026-09-18 20:30',
    costImpact: 1_800_000,
    calculationBasis: 'Demo Rule: 예선 1회 1,800,000원',
    enabled: true,
  },
  {
    id: 'EV-BERTH',
    portCallId: PORT_CALL.id,
    kind: 'berth_extension',
    title: '실제 접안시간 6시간 연장',
    detail: '변경된 예정시간이 아니라 실제 접안기록 확인이 필요한 항목',
    occurredAt: '2026-09-19 00:00',
    costImpact: 900_000,
    calculationBasis: 'Demo Rule: 연장 1시간 150,000원 × 6시간',
    enabled: false,
  },
]

export const COST_ITEMS: CostItem[] = [
  { id: 'C-PILOT', portCallId: PORT_CALL.id, code: 'PILOTAGE', label: '도선료', vendor: 'BLUEHARBOR PILOT SERVICE', pdaAmount: 6_400_000, baseActualAmount: 6_400_000, status: 'matched', varianceReason: 'PDA와 일치', evidenceIds: ['DOC-PILOT'], tariffRuleId: 'R-PILOT' },
  { id: 'C-TUG', portCallId: PORT_CALL.id, code: 'TOWAGE', label: '예선료', vendor: 'BLUEHARBOR TUG SERVICES', pdaAmount: 7_200_000, baseActualAmount: 7_200_000, eventId: 'EV-TUG', status: 'explained', varianceReason: '선석 이동으로 1회 추가', evidenceIds: ['DOC-TUG', 'DOC-WORK'], tariffRuleId: 'R-TUG' },
  { id: 'C-STEV', portCallId: PORT_CALL.id, code: 'STEVEDORING', label: '하역 작업비', vendor: 'BLUEHARBOR STEVEDORING', pdaAmount: 18_000_000, baseActualAmount: 18_000_000, eventId: 'EV-WEEKEND', status: 'review', varianceReason: '토요일 작업 할증 근거 확인 필요', evidenceIds: ['DOC-STEV', 'DOC-WORK'], tariffRuleId: 'R-WEEKEND' },
  { id: 'C-MOOR', portCallId: PORT_CALL.id, code: 'MOORING', label: '계선료', vendor: 'BLUEHARBOR MOORING', pdaAmount: 3_600_000, baseActualAmount: 3_600_000, status: 'matched', varianceReason: 'PDA와 일치', evidenceIds: ['DOC-MOOR'] },
  { id: 'C-BERTH', portCallId: PORT_CALL.id, code: 'BERTH', label: '접안 관련 비용', vendor: 'BLUEHARBOR TERMINAL', pdaAmount: 9_000_000, baseActualAmount: 9_000_000, eventId: 'EV-BERTH', status: 'matched', varianceReason: '연장 사건 미적용', evidenceIds: ['DOC-BERTH'], tariffRuleId: 'R-BERTH' },
  { id: 'C-AGENCY', portCallId: PORT_CALL.id, code: 'AGENCY', label: '대리점 수수료', vendor: 'PACE PORT AGENCY', pdaAmount: 4_000_000, baseActualAmount: 4_000_000, status: 'missing_evidence', varianceReason: '승인자료 미연결', evidenceIds: [] },
]

export const DOCUMENTS: EvidenceDocument[] = [
  { id: 'DOC-PDA', portCallId: PORT_CALL.id, type: 'PDA', fileName: 'PDA-BUS-PC2609-01.pdf', issuer: 'PACE PORT AGENCY', receivedAt: '2026-09-16 10:20', isSynthetic: true, extractionStatus: 'extracted', fields: 26, confidence: 0.98 },
  { id: 'DOC-RDA', portCallId: PORT_CALL.id, type: 'RDA', fileName: 'RDA-BUS-PC2609-01.pdf', issuer: 'PACE PORT AGENCY', receivedAt: '2026-09-19 07:30', isSynthetic: true, extractionStatus: 'extracted', fields: 14, confidence: 0.96 },
  { id: 'DOC-TUG', portCallId: PORT_CALL.id, type: 'INVOICE', fileName: 'INV-TUG-260918-07.pdf', issuer: 'BLUEHARBOR TUG SERVICES', receivedAt: '2026-09-20 09:10', isSynthetic: true, extractionStatus: 'extracted', fields: 12, confidence: 0.96 },
  { id: 'DOC-STEV', portCallId: PORT_CALL.id, type: 'INVOICE', fileName: 'INV-STEV-260919-12.pdf', issuer: 'BLUEHARBOR STEVEDORING', receivedAt: '2026-09-20 09:24', isSynthetic: true, extractionStatus: 'review', fields: 15, confidence: 0.86 },
  { id: 'DOC-WORK', portCallId: PORT_CALL.id, type: 'WORK_LOG', fileName: 'SOF-BUS-PC2609-001.pdf', issuer: 'BLUEHARBOR TERMINAL', receivedAt: '2026-09-20 08:50', isSynthetic: true, extractionStatus: 'extracted', fields: 10, confidence: 0.94 },
  { id: 'DOC-PILOT', portCallId: PORT_CALL.id, type: 'RECEIPT', fileName: 'RCPT-PILOT-01.pdf', issuer: 'BLUEHARBOR PILOT SERVICE', receivedAt: '2026-09-20 08:44', isSynthetic: true, extractionStatus: 'extracted', fields: 7, confidence: 0.97 },
  { id: 'DOC-MOOR', portCallId: PORT_CALL.id, type: 'RECEIPT', fileName: 'RCPT-MOOR-01.pdf', issuer: 'BLUEHARBOR MOORING', receivedAt: '2026-09-20 09:05', isSynthetic: true, extractionStatus: 'extracted', fields: 7, confidence: 0.95 },
  { id: 'DOC-BERTH', portCallId: PORT_CALL.id, type: 'INVOICE', fileName: 'INV-BERTH-01.pdf', issuer: 'BLUEHARBOR TERMINAL', receivedAt: '2026-09-20 09:31', isSynthetic: true, extractionStatus: 'extracted', fields: 8, confidence: 0.93 },
  { id: 'DOC-FDA', portCallId: PORT_CALL.id, type: 'FDA', fileName: 'FDA-BUS-PC2609-01.pdf', issuer: 'PACE PORT AGENCY', receivedAt: '2026-09-21 11:00', isSynthetic: true, extractionStatus: 'review', fields: 24, confidence: 0.91 },
]

export const RULES: TariffRule[] = [
  { id: 'R-PILOT', name: '도선료 참조 규칙', version: 'DR-2026.1', ruleType: 'demo_rule', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', formula: '가상 문서 고정액', source: 'Demo Rule · 운영 전 계약요율 연결 필요' },
  { id: 'R-TUG', name: '예선 추가 사용 규칙', version: 'DR-2026.1', ruleType: 'demo_rule', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', formula: '1,800,000원 × 추가 횟수', source: 'Demo Rule · 운영 전 계약요율 연결 필요' },
  { id: 'R-WEEKEND', name: '토요일 작업 할증', version: 'DR-2026.1', ruleType: 'demo_rule', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', formula: '대상 기본 작업비 × 50%', source: 'Demo Rule · 계약 적용과 승인 근거 확인 필요' },
  { id: 'R-BERTH', name: '접안시간 연장 규칙', version: 'DR-2026.1', ruleType: 'demo_rule', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', formula: '150,000원 × 연장 시간', source: 'Demo Rule · 운영 전 계약요율 연결 필요' },
]

export const ISSUES: ReviewIssue[] = [
  { id: 'I-APPROVAL', costItemId: 'C-STEV', type: 'approval', severity: 'high', message: '토요일 작업 할증의 확인·승인 근거가 연결되지 않았습니다.', recommendedAction: '작업지시 또는 담당자 확인자료 연결', resolved: false },
  { id: 'I-AGENCY', costItemId: 'C-AGENCY', type: 'missing_evidence', severity: 'medium', message: '대리점 수수료의 승인자료가 연결되지 않았습니다.', recommendedAction: '계약 또는 승인자료 확인', resolved: false },
  { id: 'I-TUG', costItemId: 'C-TUG', type: 'tariff', severity: 'low', message: '추가 예선 1회의 Demo Rule 적용을 확인했습니다.', recommendedAction: '운영 전 계약요율 버전 연결', resolved: true },
]
