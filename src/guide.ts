export const WORKSPACE_TABS = [
  {
    id: 'CHANGE',
    label: '변경점',
    help: '확정본 대비 무엇이 달라졌는지입니다. 행을 누르면 왼쪽 원문에서 근거가 표시됩니다.',
    look: 'ETA 전후와 부두, Cut-off가 원문 유지인지(ETA로 바꾸지 않았는지) 봅니다.',
  },
  {
    id: 'SOURCE',
    label: '추출 필드',
    help: '원문에서 읽은 항차 필드입니다. 행을 누르면 원문이 하이라이트됩니다.',
    look: '시각·부두 값이 원문과 같은지 대조합니다.',
  },
  {
    id: 'ACTION',
    label: '확인 항목',
    help: '지금 담당자가 봐야 할 일입니다. 숫자가 위험 확률을 뜻하지 않습니다.',
    look: '접안·연결·내륙 Trigger와 이유를 봅니다. 연결은 Demo Rule, Cut-off는 ETA로 추론하지 않습니다.',
  },
  {
    id: 'CONTROL',
    label: '통보·승인',
    help: '화주·내륙·내부 초안입니다. 승인 전에는 나가지 않으며, 공모본 발송은 모의입니다.',
    look: '문장을 고친 뒤 승인합니다. 모순 전표면 초안이 없고 발송이 막혀 있어야 합니다.',
  },
  {
    id: 'AUDIT',
    label: '이력',
    help: '이 전표에서 일어난 처리 기록입니다.',
    look: '입력·비교·승인 시각이 남는지 봅니다.',
  },
] as const

export type WorkspaceTabId = (typeof WORKSPACE_TABS)[number]['id']

export const VERIFY_QUESTIONS = [
  {
    id: 'read',
    n: '①',
    title: '원문을 얼마나 읽는가',
    plain: '처음 보는 문장 패턴에서 선박·시각·부두를 맞게 뽑는지입니다. 가상 기항문이며 선사 실메일이 아닙니다.',
    not: '현장 정확도·업무 시간 절감·산업 통계가 아닙니다.',
  },
  {
    id: 'drift',
    n: '②',
    title: '잘못 읽으면 일이 어떻게 틀어지는가',
    plain: '추출 실수가 예외 전표나 발송 잠금까지 번지는지 같은 엔진에 정답 필드와 추출 결과를 각각 넣어 봅니다.',
    not: '추출기 점수만 올리는 실험이 아닙니다. 실패 사례(NURI, B)를 숨기지 않습니다.',
  },
  {
    id: 'rules',
    n: '③',
    title: '규칙이 바뀌면 확인 항목이 어떻게 바뀌는가',
    plain: 'ETA가 얼마나 늦고, 다음 항차까지 여유가 얼마인지에 따라 켜지는 확인 항목입니다.',
    not: '칸의 글자는 위험도 %·비용이 아닙니다. ETA만으로 Cut-off를 바꾸라고 하지 않습니다.',
  },
  {
    id: 'lock',
    n: '④',
    title: '잘못된 안내가 밖으로 나가는가',
    plain: '원문 모순, 미승인 문장, 원문에 없는 Cut-off가 발송되는지를 잠금 규칙으로 막는지 봅니다.',
    not: '연결 실패 확률을 예측하는 화면이 아닙니다.',
  },
] as const

export function isWorkspaceTab(value: string | null): value is WorkspaceTabId {
  return WORKSPACE_TABS.some((t) => t.id === value)
}
