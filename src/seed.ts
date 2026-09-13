import type { DataSource, ExceptionRecord, InboxItem, NotificationDraft, Operator, PartyMaster, ScheduleFields, ScheduleVersion, TerminalMaster, VesselMaster, VoyageRecord } from './types'
import { buildImpact, fireRules } from './engine'
import { buildReviewPlan } from './clocks'

export const VESSELS: VesselMaster[] = [
  { id: 'VS-HANARO', name: 'MV HANARO', imo: '9876543', service: 'KRPUS Feeder Loop', flag: 'KR' },
  { id: 'VS-BLUE', name: 'BLUE OCEAN', imo: '9451208', service: 'CNSHA–KRPUS', flag: 'PA' },
  { id: 'VS-EASTERN', name: 'EASTERN WIND', imo: '9612040', service: 'PUS Feeder', flag: 'KR' },
  { id: 'VS-NURI', name: 'MV NURI', imo: '9328813', service: 'KRPUS–JPOSA', flag: 'KR' },
  { id: 'VS-HAEDONG', name: 'MV HAEDONG', imo: '9781104', service: 'KRPUS Feeder Loop', flag: 'KR' },
  { id: 'VS-SEAHAN', name: 'MV SEAHAN', imo: '9510333', service: 'PUS Feeder', flag: 'KR' },
  { id: 'VS-STAR', name: 'MV BUSAN STAR', imo: '9402215', service: 'KRPUS–JPOSA', flag: 'KR' },
]

export const PARTIES: PartyMaster[] = [
  { id: 'P-SH-PNC', kind: 'shipper', name: '한진글로벌포워딩(데모)', contact: 'cs@demo-fwd.kr', terminal: 'PNC' },
  { id: 'P-SH-PNIT', kind: 'shipper', name: '신항 수출입 화주(데모)', contact: 'export@demo-shipper.kr', terminal: 'PNIT' },
  { id: 'P-IN-PNC', kind: 'inland', name: '신항 내륙운송(데모)', contact: 'dispatch@demo-inland.kr', terminal: 'PNC' },
  { id: 'P-IN-HJNC', kind: 'inland', name: 'HJNC 게이트 배차(데모)', contact: 'gate@demo-inland.kr', terminal: 'HJNC' },
  { id: 'P-OPS', kind: 'internal', name: 'DEMO LINE 운항팀', contact: 'ops@demo-line.kr' },
]

export const TERMINALS: TerminalMaster[] = [
  { code: 'PNC', name: 'Pusan Newport Company', port: 'BUSAN', turnaroundDays: 1.3, cite: 'Econdb Busan terminal · 참고 통계, 임계 아님' },
  { code: 'PNIT', name: 'Pusan Newport International Terminal', port: 'BUSAN', turnaroundDays: 1.7, cite: 'Econdb Busan terminal · 참고 통계, 임계 아님' },
  { code: 'HJNC', name: 'Hanjin Busan New Port', port: 'BUSAN', turnaroundDays: 1.1, cite: 'Econdb Busan terminal · 참고 통계, 임계 아님' },
]

export const OPERATOR: Operator = { id: 'OPS-021', name: '운항 담당', role: 'ops' }

export const OPERATORS: Operator[] = [
  OPERATOR,
  { id: 'OPS-007', name: '팀장 (승인자)', role: 'approver' },
  { id: 'ADM-001', name: '플랫폼 관리', role: 'admin' },
]

export const VOYAGES: VoyageRecord[] = [
  {
    id: 'V-HANARO-2508W',
    vessel: 'MV HANARO',
    voyage: '2508W',
    service: 'KRPUS Feeder Loop',
    port: 'BUSAN',
    terminal: 'PNC',
    status: 'inbound',
    connectingVoyageId: 'V-EASTERN-2510E',
  },
  {
    id: 'V-HANARO-2506W',
    vessel: 'MV HANARO',
    voyage: '2506W',
    service: 'KRPUS Feeder Loop',
    port: 'BUSAN',
    terminal: 'PNC',
    status: 'departed',
  },
  {
    id: 'V-BLUE-2609W',
    vessel: 'BLUE OCEAN',
    voyage: '2609W',
    service: 'CNSHA–KRPUS',
    port: 'BUSAN',
    terminal: 'PNIT',
    status: 'at_sea',
  },
  {
    id: 'V-EASTERN-2510E',
    vessel: 'EASTERN WIND',
    voyage: '2510E',
    service: 'PUS Feeder',
    port: 'BUSAN',
    terminal: 'HJNC',
    status: 'at_sea',
  },
  {
    id: 'V-NURI-2507W',
    vessel: 'MV NURI',
    voyage: '2507W',
    service: 'KRPUS–JPOSA',
    port: 'BUSAN',
    terminal: 'PNC',
    status: 'departed',
  },
  {
    id: 'V-HAEDONG-2512W',
    vessel: 'MV HAEDONG',
    voyage: '2512W',
    service: 'KRPUS Feeder Loop',
    port: 'BUSAN',
    terminal: 'PNIT',
    status: 'inbound',
  },
  {
    id: 'V-SEAHAN-2509E',
    vessel: 'MV SEAHAN',
    voyage: '2509E',
    service: 'PUS Feeder',
    port: 'BUSAN',
    terminal: 'HJNC',
    status: 'at_sea',
  },
  {
    id: 'V-STAR-2511W',
    vessel: 'MV BUSAN STAR',
    voyage: '2511W',
    service: 'KRPUS–JPOSA',
    port: 'BUSAN',
    terminal: 'PNC',
    status: 'inbound',
    connectingVoyageId: 'V-SEAHAN-2509E',
  },
]

export const CONFIRMED: Record<string, ScheduleFields> = {
  'V-HANARO-2508W': {
    vessel: 'MV HANARO',
    voyage: '2508W',
    imo: '9876543',
    port: 'BUSAN',
    unlocode: 'KRPUS',
    terminal: 'PNC',
    berth: 'T2',
    eta: '2026-09-12 06:00 LT',
    etb: '2026-09-12 08:00 LT',
    etd: '2026-09-12 18:00 LT',
    cutoff: '2026-09-11 18:00',
  },
  'V-HANARO-2506W': {
    vessel: 'MV HANARO',
    voyage: '2506W',
    imo: '9876543',
    port: 'BUSAN',
    unlocode: 'KRPUS',
    terminal: 'PNC',
    berth: 'T3',
    eta: '2026-08-29 13:00 LT',
    etb: '2026-08-29 15:00 LT',
    etd: '2026-08-29 22:00 LT',
    cutoff: '2026-08-28 18:00',
  },
  'V-BLUE-2609W': {
    vessel: 'BLUE OCEAN',
    voyage: '2609W',
    port: 'BUSAN',
    unlocode: 'KRPUS',
    terminal: 'PNIT',
    berth: 'T1',
    eta: '2026-09-15 09:00 LT',
    etd: '2026-09-15 18:00 LT',
    cutoff: '2026-09-14 16:00',
  },
  'V-EASTERN-2510E': {
    vessel: 'EASTERN WIND',
    voyage: '2510E',
    port: 'BUSAN',
    unlocode: 'KRPUS',
    terminal: 'HJNC',
    berth: 'T4',
    eta: '2026-09-13 04:00 LT',
    etd: '2026-09-13 11:00 LT',
  },
  'V-NURI-2507W': {
    vessel: 'MV NURI',
    voyage: '2507W',
    port: 'BUSAN',
    terminal: 'PNC',
    berth: 'T2',
    eta: '2026-09-08 07:00 LT',
    etd: '2026-09-08 20:00 LT',
    cutoff: '2026-09-07 18:00',
  },
  'V-HAEDONG-2512W': {
    vessel: 'MV HAEDONG',
    voyage: '2512W',
    port: 'BUSAN',
    unlocode: 'KRPUS',
    terminal: 'PNIT',
    berth: 'T3',
    eta: '2026-09-14 08:00 LT',
    etd: '2026-09-14 19:00 LT',
    cutoff: '2026-09-13 17:00',
  },
  'V-SEAHAN-2509E': {
    vessel: 'MV SEAHAN',
    voyage: '2509E',
    port: 'BUSAN',
    unlocode: 'KRPUS',
    terminal: 'HJNC',
    berth: 'T5',
    eta: '2026-09-16 06:00 LT',
    etd: '2026-09-16 14:00 LT',
  },
  'V-STAR-2511W': {
    vessel: 'MV BUSAN STAR',
    voyage: '2511W',
    port: 'BUSAN',
    unlocode: 'KRPUS',
    terminal: 'PNC',
    berth: 'T2',
    eta: '2026-09-13 10:00 LT',
    etd: '2026-09-13 22:00 LT',
    cutoff: '2026-09-12 18:00',
  },
}

export const MAIL_A = `From: pnc.ops.agent@example.com
To: ops@demo-line.kr
Subject: 2508W HANARO — ETA revision

MV HANARO / Voy 2508W / PNC
ETA 12 Sep 0600LT → revised ETA 1200LT.
Berth change T2 → T3.
CY cutoff remains 11 Sep 1800.

Please update your port call file accordingly.
`

export const MAIL_B = `From: terminal.desk@example.com
To: ops@demo-line.kr
Subject: 2508W time check

MV HANARO / Voy 2508W / PNC
ETA 12:00
ETB 10:00
ETD 18:00
`

export const MAIL_C = `From: pnc.ops.agent@example.com
To: ops@demo-line.kr
Cc: nightwatch@demo-line.kr
Subject: Fw: 2508W HANARO — ETA revision

MV HANARO / Voy 2508W / PNC
ETA 12 Sep 0600LT → revised ETA 1200LT.
Berth change T2 → T3.
CY cutoff remains 11 Sep 1800.
`

export const INBOX: InboxItem[] = [
  {
    id: 'IN-A',
    demoKey: 'A',
    receivedAt: '2026-09-12 08:41:02',
    sender: 'pnc.ops.agent@example.com',
    subject: '2508W HANARO — ETA revision',
    sourceType: 'email',
    fileName: '2508W-HANARO-ETA-revision.eml',
    body: MAIL_A,
    linkedVoyageId: 'V-HANARO-2508W',
    status: 'queued',
    gold: { vessel: 'MV HANARO', voyage: '2508W', terminal: 'PNC', berth: 'T3', eta: '2026-09-12 12:00 LT', cutoff: '2026-09-11 18:00' },
  },
  {
    id: 'IN-B',
    demoKey: 'B',
    receivedAt: '2026-09-12 08:55:19',
    sender: 'terminal.desk@example.com',
    subject: '2508W time check',
    sourceType: 'email',
    fileName: '2508W-contradiction.eml',
    body: MAIL_B,
    linkedVoyageId: 'V-HANARO-2508W',
    status: 'queued',
    gold: { vessel: 'MV HANARO', voyage: '2508W', eta: '2026-09-12 12:00 LT', etb: '2026-09-12 10:00 LT' },
  },
  {
    id: 'IN-C',
    demoKey: 'C',
    receivedAt: '2026-09-12 09:12:44',
    sender: 'pnc.ops.agent@example.com',
    subject: 'Fw: 2508W HANARO — ETA revision',
    sourceType: 'email',
    fileName: '2508W-HANARO-forward.eml',
    body: MAIL_C,
    linkedVoyageId: 'V-HANARO-2508W',
    status: 'queued',
    gold: { vessel: 'MV HANARO', voyage: '2508W', berth: 'T3', eta: '2026-09-12 12:00 LT' },
  },
  {
    id: 'IN-XLS',
    receivedAt: '2026-09-12 09:40:00',
    sender: 'partner.liner@example.com',
    subject: 'Weekly coastal sheet — BLUE OCEAN',
    sourceType: 'xlsx',
    fileName: 'coastal-2509.xlsx',
    body: 'vessel,voyage,terminal,berth,eta,etd\nBLUE OCEAN,2609W,PNIT,T1,2026-09-15 15:00,2026-09-15 22:00',
    linkedVoyageId: 'V-BLUE-2609W',
    status: 'queued',
    gold: { vessel: 'BLUE OCEAN', voyage: '2609W', terminal: 'PNIT', eta: '2026-09-15 15:00 LT' },
  },
  {
    id: 'IN-KR',
    receivedAt: '2026-09-12 10:05:11',
    sender: 'hjnc.planning@example.com',
    subject: '[HJNC] EASTERN WIND 2510E 부두 변경',
    sourceType: 'email',
    fileName: '2510E-berth.eml',
    body: `선박: EASTERN WIND
항차: 2510E
터미널: HJNC
부두 T4 → T5
ETA 13 Sep 0400LT
ETD 13 Sep 1100LT`,
    linkedVoyageId: 'V-EASTERN-2510E',
    status: 'queued',
    gold: { vessel: 'EASTERN WIND', voyage: '2510E', berth: 'T5' },
  },
  {
    id: 'IN-NURI',
    receivedAt: '2026-09-12 10:18:00',
    sender: 'ops.desk@example.com',
    subject: 'NURI 2507W 스케줄 재확인',
    sourceType: 'email',
    fileName: '2507W-confirm.eml',
    body: `MV NURI / Voy 2507W / PNC
ETA 08 Sep 0700LT
ETD 08 Sep 2000LT
Berth T2`,
    linkedVoyageId: 'V-NURI-2507W',
    status: 'queued',
    gold: { vessel: 'MV NURI', voyage: '2507W', eta: '2026-09-08 07:00 LT' },
  },
  {
    id: 'IN-HAE',
    receivedAt: '2026-09-12 11:02:33',
    sender: 'pnit.control@example.com',
    subject: 'HAEDONG 2512W ETA delay',
    sourceType: 'pdf',
    fileName: '2512W-port-call.pdf',
    body: `PORT CALL NOTICE
Vessel: MV HAEDONG
Voyage: 2512W
Terminal PNIT Berth T3
ETA 14 Sep 1400LT
ETD 14 Sep 2300LT
CY cutoff remains 13 Sep 1700`,
    linkedVoyageId: 'V-HAEDONG-2512W',
    status: 'queued',
    gold: { vessel: 'MV HAEDONG', voyage: '2512W', eta: '2026-09-14 14:00 LT', cutoff: '2026-09-13 17:00' },
  },
  {
    id: 'IN-STAR',
    receivedAt: '2026-09-12 11:21:08',
    sender: 'commercial@example.com',
    subject: 'BUSAN STAR 2511W CY cut-off revision',
    sourceType: 'email',
    fileName: '2511W-cutoff.eml',
    body: `MV BUSAN STAR / Voy 2511W / PNC
ETA 13 Sep 1000LT
Berth T2
CY cutoff: 2026-09-12 12:00`,
    linkedVoyageId: 'V-STAR-2511W',
    status: 'queued',
    gold: { voyage: '2511W', cutoff: '2026-09-12 12:00' },
  },
  {
    id: 'IN-XLS-DUP',
    receivedAt: '2026-09-12 11:44:00',
    sender: 'partner.liner@example.com',
    subject: 'Re: Weekly coastal sheet — BLUE OCEAN',
    sourceType: 'xlsx',
    fileName: 'coastal-2509-fwd.xlsx',
    body: 'vessel,voyage,terminal,berth,eta,etd\nBLUE OCEAN,2609W,PNIT,T1,2026-09-15 15:00,2026-09-15 22:00',
    linkedVoyageId: 'V-BLUE-2609W',
    status: 'queued',
    gold: { vessel: 'BLUE OCEAN', voyage: '2609W', eta: '2026-09-15 15:00 LT' },
  },
  {
    id: 'IN-UNK',
    receivedAt: '2026-09-12 12:03:41',
    sender: 'unknown.agent@example.com',
    subject: 'MV ORION 2599W ETA',
    sourceType: 'email',
    fileName: 'orion-unknown.eml',
    body: `MV ORION / Voy 2599W / PNC
ETA 18 Sep 0900LT
Berth T6`,
    status: 'queued',
    gold: { vessel: 'MV ORION', voyage: '2599W' },
  },
  {
    id: 'IN-SEA',
    receivedAt: '2026-09-12 12:30:00',
    sender: 'seahan.ops@example.com',
    subject: 'SEAHAN 2509E ETD update',
    sourceType: 'email',
    fileName: '2509E-etd.eml',
    body: `Vessel: MV SEAHAN
Voyage: 2509E
Terminal: HJNC
Berth T5
ETA 16 Sep 0600LT
ETD 16 Sep 1800LT`,
    linkedVoyageId: 'V-SEAHAN-2509E',
    status: 'queued',
    gold: { vessel: 'MV SEAHAN', voyage: '2509E', etd: '2026-09-16 18:00 LT' },
  },
]

export const DATA_SOURCES: DataSource[] = [
  { id: 'ds-email', name: '스케줄 메일함', kind: '이메일', status: 'connected', note: '원문 텍스트 수신', prototype: true },
  { id: 'ds-pdf', name: '기항 PDF', kind: 'PDF', status: 'connected', note: '원문 붙여넣기 시뮬', prototype: true },
  { id: 'ds-xls', name: '파트너 엑셀', kind: '엑셀', status: 'connected', note: 'CSV/텍스트 시뮬', prototype: true },
  { id: 'ds-api', name: '항차 API', kind: 'API', status: 'available', note: '미연결', prototype: true },
  { id: 'ds-dcsa', name: 'DCSA OVS', kind: '표준', status: 'extension', note: '예정', prototype: true },
]

const MEM_PREV: ScheduleFields = {
  vessel: 'MV HANARO',
  voyage: '2506W',
  imo: '9876543',
  port: 'BUSAN',
  unlocode: 'KRPUS',
  terminal: 'PNC',
  berth: 'T2',
  eta: '2026-08-29 06:00 LT',
  etb: '2026-08-29 08:00 LT',
  etd: '2026-08-29 18:00 LT',
  cutoff: '2026-08-28 18:00',
}

const MEM_NEXT: ScheduleFields = CONFIRMED['V-HANARO-2506W']

const MEM_CHANGES = [
  { key: 'berth' as const, label: '부두', previous: 'T2', next: 'T3' },
  { key: 'eta' as const, label: 'ETA', previous: '2026-08-29 06:00 LT', next: '2026-08-29 13:00 LT', delta: '+7h' },
  { key: 'etb' as const, label: 'ETB', previous: '2026-08-29 08:00 LT', next: '2026-08-29 15:00 LT', delta: '+7h' },
  { key: 'etd' as const, label: 'ETD', previous: '2026-08-29 18:00 LT', next: '2026-08-29 22:00 LT', delta: '+4h' },
]

const MEM_PLAN = buildReviewPlan({ previous: MEM_PREV, incoming: MEM_NEXT, changes: MEM_CHANGES })
const MEM_IMPACT = buildImpact(MEM_CHANGES, true, undefined, MEM_NEXT, MEM_PREV)
const MEM_RULES = fireRules({ changes: MEM_CHANGES, issues: [], isDuplicate: false, connectionSlack: null })

export const MEMORY_INBOX: InboxItem = {
  id: 'IN-MEM',
  receivedAt: '2026-08-28 09:12:00',
  sender: 'pnc.ops.agent@example.com',
  subject: '2506W HANARO — ETA / berth revision',
  sourceType: 'email',
  fileName: '2506W-HANARO-revision.eml',
  body: `MV HANARO / Voy 2506W / PNC
ETA 29 Aug 0600LT → revised ETA 1300LT.
Berth change T2 → T3.
CY cutoff remains 28 Aug 1800.`,
  linkedVoyageId: 'V-HANARO-2506W',
  status: 'processed',
  lastKind: 'exception',
}

export const MEMORY_EXCEPTION: ExceptionRecord = {
  id: 'EX-260828-0001',
  inboxId: 'IN-MEM',
  voyageId: 'V-HANARO-2506W',
  createdAt: '2026-08-28 09:14:22',
  priority: MEM_PLAN.priority,
  reviewRank: MEM_PLAN.rank,
  reviewHeadline: MEM_PLAN.headline,
  clocks: MEM_PLAN.clocks,
  status: 'sent',
  summary: 'ETA 2026-08-29 06:00 LT → 2026-08-29 13:00 LT · 부두 T2 → T3',
  fields: [
    { key: 'vessel', label: '선박', value: 'MV HANARO', sourceNote: '원문', verified: true },
    { key: 'voyage', label: '항차', value: '2506W', sourceNote: '원문', verified: true },
    { key: 'port', label: '기항지', value: 'BUSAN', sourceNote: '원문', verified: true },
    { key: 'terminal', label: '터미널', value: 'PNC', sourceNote: '원문', verified: true },
    { key: 'berth', label: '부두', value: 'T3', sourceNote: '원문', verified: true },
    { key: 'eta', label: 'ETA', value: '2026-08-29 13:00 LT', sourceNote: '원문', verified: true },
    { key: 'etb', label: 'ETB', value: '2026-08-29 15:00 LT', sourceNote: '확정본', verified: true },
    { key: 'etd', label: 'ETD', value: '2026-08-29 22:00 LT', sourceNote: '확정본', verified: true },
    { key: 'cutoff', label: 'CY Cut-off', value: '2026-08-28 18:00', sourceNote: '원문 유지', verified: true },
  ],
  previous: MEM_PREV,
  incoming: MEM_NEXT,
  changes: MEM_CHANGES,
  issues: [],
  rules: MEM_RULES,
  impact: MEM_IMPACT,
  tasks: [
    { id: 't1', title: '접안 관련 조건 확인', status: 'done', detail: 'PNC T3 접안 창 확인' },
    { id: 't2', title: '화주 통보 초안', status: 'auto_done', detail: '승인 후 발송' },
    { id: 't3', title: '내륙 통보 초안', status: 'auto_done', detail: '승인 후 발송' },
    { id: 't4', title: '내부 운항 기록', status: 'done', detail: '내부 채널' },
    { id: 't5', title: '예외 레코드 저장', status: 'auto_done', detail: '감사 로그에 기록됨' },
  ],
}

const MEM_SHIPPER = `안녕하세요.
항차 2506W MV HANARO의 BUSAN(PNC) 입항 예정이 2026-08-29 06:00 LT에서 2026-08-29 13:00 LT로 변경되었습니다. 접안 부두는 T2에서 T3로 변경됩니다. CY 반입 마감은 원문 기준 2026-08-28 18:00이며, ETA 변경만으로 마감을 바꾸지 않았습니다.
T3 반입 시 게이트 혼잡을 피하려면 내륙 쪽에 동선을 먼저 안내해 주시기 바랍니다.`

const MEM_INLAND = `2506W MV HANARO, PNC 부두 T2→T3. 접안 예정 2026-08-29 13:00 LT 전후. T3 게이트·대기 동선 재지정 바랍니다. Cut-off는 원문 유지.`

const MEM_INTERNAL = `변경 부두 T2 → T3, ETA 06:00 → 13:00 (+7h). Cut-off는 원문에 있을 때만 유지. ETA로 파생하지 않음.
대외 문장에 내부 추정 금액을 넣지 말 것. T3 접안 창은 터미널과 확인 완료.`

export const MEMORY_DRAFTS: NotificationDraft[] = [
  {
    id: 'EX-260828-0001-shipper',
    exceptionId: 'EX-260828-0001',
    channel: 'shipper',
    title: '화주 통보 초안',
    status: 'sent',
    body: MEM_SHIPPER,
    originalBody: MEM_SHIPPER,
    editedBy: 'OPS-021',
  },
  {
    id: 'EX-260828-0001-inland',
    exceptionId: 'EX-260828-0001',
    channel: 'inland',
    title: '내륙 운송 초안',
    status: 'sent',
    body: MEM_INLAND,
    originalBody: MEM_INLAND,
    editedBy: 'OPS-021',
  },
  {
    id: 'EX-260828-0001-internal',
    exceptionId: 'EX-260828-0001',
    channel: 'internal',
    title: '내부 운항 메모',
    status: 'sent',
    body: MEM_INTERNAL,
    originalBody: MEM_INTERNAL,
    editedBy: 'OPS-021',
  },
]

export function initialConfirmedHistory(): ScheduleVersion[] {
  return Object.entries(CONFIRMED).map(([voyageId, fields], i) => ({
    id: `VER-BASE-${i + 1}`,
    voyageId,
    at: voyageId === 'V-HANARO-2506W' ? '2026-08-28 11:02:00' : '2026-09-01 09:00:00',
    actor: voyageId === 'V-HANARO-2506W' ? 'OPS-021' : 'SYSTEM',
    exceptionId: voyageId === 'V-HANARO-2506W' ? 'EX-260828-0001' : undefined,
    fields,
    note: voyageId === 'V-HANARO-2506W' ? '통보 발송 · 확정본 갱신' : '기초 확정본',
  }))
}

export const INITIAL_INBOX: InboxItem[] = [MEMORY_INBOX, ...INBOX]
