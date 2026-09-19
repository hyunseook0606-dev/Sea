# PACE — Port-cost Assurance & Control Engine

2026 해운·항만·물류 AX 혁신 아이디어 공모전 프로토타입입니다.

선박대리점이 PDA·FDA·청구서·작업기록·요율 근거를 한 기항에 연결하고, 선사·선박관리사가 차액과 미확인 근거를 검토하는 AX 계층입니다. 새로운 PDA/FDA 작성 시스템이나 자동 지급 시스템이 아닙니다.

**Live demo:** https://pace-port-call-intelligence.vercel.app

## 한 줄 요약

기항 일정·작업·서비스가 바뀐 뒤, PDA와 FDA가 *왜* 달라졌는지를 문서·사건·요율(Demo Rule)로 설명하고 사람이 확인합니다.

## 이 저장소가 보여주는 것

| 화면 | 경로 | 확인 포인트 |
| --- | --- | --- |
| 소개 | `/` | 제품 범위와 자동화 경계 |
| 5단계 시연 | `/flow` | Port Call Change → Evidence Assurance |
| 문서 수신 | `/app/documents` | 6쪽 가상 문서팩 + 정답셋 1클릭 적재 |
| AI 분석 | `/app/agent` | 합성 벤치마크와 해석 제한 |
| 비용 영향 | `/app/twin` | 확인된 사건만 예상 FDA에 반영 |
| Evidence Graph | `/app/evidence` | 비용–사건–문서–규칙 연결 |
| 공동 검토 | `/app/review` | 대리점 정리 → 선사 확인 |
| 품질관리 | `/app/verify` | 자동확정 차단, Demo Rule 표기 |

## 이 저장소가 보여주지 않는 것

- 실제 선사·대리점 문서, OCR 정확도, 현장 검토시간 단축 실적
- 국내 표준요율 또는 기업 계약요율 (화면 산식은 **Demo Rule**)
- 자동 지급·계약 확정·분쟁 판정
- 이전 아이디어(SEA, 스케줄 예외 에이전트)의 코드. 이 저장소에는 포함하지 않습니다.

데모 기항은 가상 기항 **PC-2609 / MV HAEJIN / BUSAN** 1건입니다. 금액·사건·문서는 시연용 시드입니다.

## 권장 시연 순서

1. `/`에서 제품 범위 확인
2. `/flow`에서 5단계 업무 흐름 확인
3. `/app/documents`에서 가상 문서팩을 열고 **문서팩 등록 및 구조화** 클릭
4. `/app/agent` → `/app/twin` → `/app/evidence` → `/app/review` → `/app/verify`

로그인 없이 열립니다. 브라우저에서 처리하며 서버로 문서를 올리지 않습니다.

## 로컬 실행

필요 환경: Node.js 20+

```bash
npm install
npm run dev
```

주소: http://localhost:5173/

```bash
npm run build    # 타입체크 + 프로덕션 빌드
npm run preview  # 빌드 결과 확인
```

합성 벤치마크 재현 (Python 3):

```bash
python pace_ai/evaluate_agent.py
```

결과는 `pace_ai/reports/`에 저장됩니다. 수치는 코드 생성 합성 레코드 기준이며 실제 문서 추출 성능이 아닙니다.

## 디렉터리 구조

```text
public/demo/          가상 기항 문서팩 PDF
src/App.tsx           라우팅
src/BrandLanding.tsx  소개 화면
src/Shell.tsx         업무 화면 껍데기
src/pace/             기항비 검토 도메인
  types.ts            기항·비용·문서·규칙 타입
  seed.ts             PC-2609 가상 시드
  ProcessDemo.tsx     /flow
  Workspace.tsx       화면 상태 (사건 on/off, 예상액)
  screens.tsx         문서·AI·검토·근거·검증 화면
  WorkflowFrame.tsx   업무 프레임 + Cost Twin
  agentMetrics.ts     합성 벤치마크 표시값
src/components/       로고, 흐름도, KPI/패널
pace_ai/              합성 벤치마크 재현 코드
```

## 데이터와 규칙

- **가상 문서:** `public/demo/PACE_demo_port_call_pack.pdf` (6쪽)
- **정답셋:** `src/pace/seed.ts` — 비용 6항목, 사건 3건(기본 활성 2건), 사람 확인 2건
- **Demo Rule 예:** 토요일 작업 50% × 7,200,000원, 예선 추가 1,800,000원, 접안 연장 150,000원/시간. 국내 공개요율 그 자체가 아닙니다.
- **자유 PDF 업로드:** 텍스트 레이어 추출만. 스캔 OCR·표 복원·원문 하이라이트는 미구현입니다.

## 자동화 경계

- AI는 후보와 근거를 제안합니다.
- 합계·수량×단가·증빙 유무는 규칙으로 점검합니다.
- 근거가 없으면 자동 일치 처리하지 않습니다.
- 최종 정산·지급 판단은 선사 측 권한자가 합니다.

## 기술 스택

Vite · React 19 · TypeScript · Tailwind CSS · React Router · Zustand

정적 배포입니다. 백엔드 API와 인증은 없습니다.
