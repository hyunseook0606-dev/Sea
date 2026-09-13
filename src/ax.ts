export const AX_CAPABILITIES = [
  {
    id: 'ingest',
    en: 'Schedule Ingestion',
    label: '스케줄 수신',
    desc: '이메일, PDF, 엑셀로 들어오는 기항 자료를 한 수신함에서 처리합니다.',
    to: '/app/inbox',
  },
  {
    id: 'extract',
    en: 'Intelligent Extraction',
    label: '문서 추출',
    desc: '이메일·엑셀·PDF에서 선박·항차·ETA·선석을 전표 필드로 올립니다.',
    to: '/app/exceptions',
  },
  {
    id: 'diff',
    en: 'Change Detection',
    label: '변경 감지',
    desc: '직전 확정본과 비교해 달라진 값만 올립니다. 같은 변경이 다시 오면 새 전표를 만들지 않습니다.',
    to: '/app/exceptions',
  },
  {
    id: 'impact',
    en: 'Impact Analysis',
    label: '영향 확인',
    desc: '접안·연결 항차·내륙에서 확인할 일을 체크리스트로 올립니다. Cut-off는 원문에 있을 때만 유지합니다.',
    to: '/app/exceptions',
  },
  {
    id: 'approval',
    en: 'Human Approval',
    label: '담당자 승인',
    desc: '화주·내륙 초안을 수정·승인한 뒤에 발송합니다.',
    to: '/app/approvals',
  },
  {
    id: 'audit',
    en: 'Full Traceability',
    label: '감사 이력',
    desc: '추출, 비교, 수정, 승인, 발송이 시간순으로 남습니다.',
    to: '/app/audit',
  },
] as const

export const AX_PIPELINE = [
  { id: 'ingest', label: '수신', engine: '수신', to: '/app/inbox' },
  { id: 'extract', label: '추출', engine: '추출', to: '/app/exceptions' },
  { id: 'context', label: '맥락', engine: '맥락', to: '/app/exceptions' },
  { id: 'diff', label: '비교', engine: '비교', to: '/app/exceptions' },
  { id: 'exception', label: '예외', engine: '예외', to: '/app/exceptions' },
  { id: 'impact', label: '영향', engine: '영향', to: '/app/exceptions' },
  { id: 'action', label: '초안', engine: '초안', to: '/app/approvals' },
  { id: 'approval', label: '승인', engine: '승인', to: '/app/approvals' },
  { id: 'audit', label: '이력', engine: '발송', to: '/app/audit' },
] as const

export const AX_CASES = [
  {
    key: 'A' as const,
    title: '정상 기항 변경',
    tag: '정상 변경',
    vessel: 'MV HANARO / 2508W',
    summary: 'ETA 06:00 → 12:00, 부두 T2 → T3. Cut-off는 원문에 그대로입니다.',
    result: '예외 전표 · 확인 항목 · 화주·내륙·내부 초안',
    meaning: '입항 시각과 부두가 바뀐 정상 변경입니다. 확인 항목과 통보 초안이 전표에 올라옵니다.',
    reset: true,
  },
  {
    key: 'B' as const,
    title: '시각 모순 차단',
    tag: '시각 모순',
    vessel: 'MV HANARO / 2508W',
    summary: 'ETA 12:00, ETB 10:00. 접안이 입항보다 빠릅니다.',
    result: '검증 실패 · 대외 초안 없음 · 발송 차단',
    meaning: 'ETA와 ETB가 모순이면 대외 초안이 열리지 않고 발송이 막힙니다.',
    reset: false,
  },
  {
    key: 'C' as const,
    title: '중복 통보 억제',
    tag: '중복',
    vessel: 'MV HANARO / 2508W',
    summary: '같은 변경이 적힌 메일이 다시 들어옵니다.',
    result: '동일 변경 · 새 전표 없음',
    meaning: '이미 처리한 변경이 다시 오면 수신함에 중복으로만 남습니다.',
    reset: false,
  },
]
