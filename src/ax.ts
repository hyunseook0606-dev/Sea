export const PACE_FLOW = [
  { id: 'change', label: 'Port Call Change', hint: '일정·작업·서비스 변화', to: '/app/documents' },
  { id: 'impact', label: 'Cost Impact', hint: '영향 비용항목 선별', to: '/app/twin' },
  { id: 'check', label: 'Rule Check', hint: '실제 조건·요율 검산', to: '/app/twin' },
  { id: 'revised', label: 'Revised PDA', hint: '수정 예상액 후보', to: '/app/twin' },
  { id: 'action', label: 'Next Action', hint: '증빙·확인 업무 제안', to: '/app/review' },
  { id: 'assurance', label: 'Evidence Assurance', hint: '실제비용·근거 검산', to: '/app/evidence' },
] as const

export const FIELD_FLOW = [
  { id: 'change', label: 'Port Call Change', hint: '일정·작업·서비스', highlight: false },
  { id: 'impact', label: 'Cost Impact', hint: '영향항목·규칙', highlight: true },
  { id: 'revised', label: 'Revised PDA', hint: '수정 예상액·행동', highlight: false },
  { id: 'assurance', label: 'Evidence Assurance', hint: '실제비용·근거', highlight: false },
] as const

export const AX_CAPABILITIES = [
  {
    id: 'extract',
    en: 'Document Intelligence',
    label: '문서에서 비용항목 읽기',
    desc: 'PDA·인보이스·영수증·작업기록에서 금액과 서비스명을 읽고, 추출값마다 원문 위치를 남깁니다.',
    to: '/app/documents',
  },
  {
    id: 'normalize',
    en: 'Semantic Mapping',
    label: '서로 다른 비용명 연결',
    desc: 'Towage·Tug Service처럼 표현이 다른 항목을 같은 비용 후보로 연결하고, 확신이 낮으면 사람이 확인합니다.',
    to: '/app/documents',
  },
  {
    id: 'evidence',
    en: 'Evidence Graph',
    label: '비용의 근거 연결',
    desc: '기항 사건·실제 서비스·문서·요율·승인자료를 비용항목에 연결해 차이의 이유를 되짚을 수 있게 합니다.',
    to: '/app/evidence',
  },
  {
    id: 'twin',
    en: 'Cost Twin',
    label: '기항 변화의 비용 영향분석',
    desc: '작업 연장·예선 추가·접안시간 변화에서 영향을 받을 항목을 찾고 확인된 조건을 Revised PDA 후보에 반영합니다.',
    to: '/app/twin',
  },
  {
    id: 'review',
    en: 'Human Review',
    label: '확인이 필요한 항목만 검토',
    desc: '설명된 차이와 근거 부족 항목을 나누어 보여 주며 계약·지급 판단은 담당자에게 남깁니다.',
    to: '/app/review',
  },
  {
    id: 'control',
    en: 'Control & Audit',
    label: '자동 확정 차단',
    desc: '근거가 없거나 검증 전 규칙이 적용된 항목은 자동 확정하지 않고 검토 큐와 이력에 남깁니다.',
    to: '/app/verify',
  },
] as const

export const AX_CASES = [
  {
    key: 'A' as const,
    title: '주말 작업 연장',
    tag: 'PORT EVENT · SCHEDULE EXTENSION',
    vessel: 'MV HAEJIN / PC-2609',
    summary: '작업기록에 금요일 종료 예정 작업이 토요일 06:00까지 연장된 것으로 접수되었습니다.',
    result: '예상 FDA +360만원 · 작업일지와 할증 근거 확인',
    meaning: 'Cost Twin이 등록 비용규칙으로 예상 차액을 계산하고, 작업시간과 승인 근거를 담당자에게 요청합니다.',
    look: '사건·계산식·인보이스·작업기록이 하나의 비용항목에 연결됩니다.',
    reset: true,
  },
  {
    key: 'B' as const,
    title: '예선 1회 추가',
    tag: 'PORT EVENT · EXTRA SERVICE',
    vessel: 'MV HAEJIN / PC-2609',
    summary: '선석 이동 기록과 함께 예선 서비스 1회가 추가 접수되었습니다.',
    result: '예상 FDA +180만원 · 인보이스와 서비스 기록 연결',
    meaning: 'PDA에 없던 서비스가 기항 사건과 증빙에 연결되면 예상 FDA에 반영됩니다.',
    look: '금액만 비교하지 않고 서비스 발생 근거까지 함께 보여 줍니다.',
    reset: false,
  },
  {
    key: 'C' as const,
    title: '증빙이 없는 수수료',
    tag: 'CONTROL EXCEPTION · EVIDENCE GAP',
    vessel: 'MV HAEJIN / PC-2609',
    summary: '대리점 수수료의 계약 또는 승인자료가 연결되지 않은 상태입니다.',
    result: '자동 일치 금지 · 담당자 확인 큐 유지',
    meaning: '금액이 PDA와 같아도 근거가 없으면 자동 확정하지 않습니다.',
    look: 'Evidence Graph에 미연결 상태와 필요한 후속 조치가 표시됩니다.',
    reset: false,
  },
] as const
