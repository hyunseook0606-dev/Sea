# SEA — Schedule Exception Agent

중소 국적선사 기항 예외 대응 운영 플랫폼 프로토타입.

```bash
cd sea-platform
npm install
npm run dev
```

브라우저: http://localhost:5173/

## 심사 시연 (2–3분)

1. 랜딩에서 **OPERATIONS PLATFORM** 또는 **EVALUATOR DEMO · CASE A**
2. Inbox **DEMO A** — HANARO 2508W, ETA +6h, T2→T3. Cut-off는 유지(자동 확정 없음)
3. Intelligence Layer: SOURCE → CHANGE → ASSESSMENT → CONTROL
4. 화주/내륙 초안 수정 후 Approve. 승인 전 Send는 거절됨
5. **DEMO B** — ETA 12:00 / ETB 10:00 → 검토함, 발송 차단
6. **DEMO C** — 동일 메일 재전송 → 중복 예외 억제

설정에서 **Reset workspace**로 초기화할 수 있습니다. 로그인·위치권한 없음. 발송은 모의입니다.
