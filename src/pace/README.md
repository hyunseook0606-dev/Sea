# `src/pace`

기항비 검토 도메인입니다. 화면 상태와 가상 시드가 여기에 있습니다.

| 파일 | 역할 |
| --- | --- |
| `types.ts` | 기항, 사건, 비용항목, 문서, 요율, 검토이슈 |
| `seed.ts` | PC-2609 가상 시드 (금액·사건은 시연용) |
| `Workspace.tsx` | 사건 활성 여부에 따른 예상 FDA 계산 |
| `screens.tsx` | 문서 수신, AI 분석, 검토, Evidence Graph, 품질관리 |
| `WorkflowFrame.tsx` | 업무 프레임과 Cost Twin |
| `ProcessDemo.tsx` | `/flow` 5단계 안내 |
| `agentMetrics.ts` | 합성 벤치마크 표시값. 현장 실적이 아님 |

`Workspace`의 예상액 공식은 `기본 실적액 + (연결된 사건이 켜져 있으면 그 영향액)`입니다. 예측 모델이 아닙니다.
