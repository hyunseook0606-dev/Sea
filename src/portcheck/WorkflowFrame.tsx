import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Ship, FileText, Link2, Calculator, ClipboardCheck, Check, RotateCcw, BrainCircuit } from 'lucide-react'
import { PORT_CALL } from './seed'
import type { PortEvent } from './types'
import './workspace.css'

const workQueues = [
  { id: 'documents', title: '문서 접수', detail: '문서팩 1건', status: '구조화 대기', icon: FileText },
  { id: 'agent', title: 'AI 분석', detail: '6개 비용항목', status: '후보·예외 생성', icon: BrainCircuit },
  { id: 'evidence', title: '근거 연결', detail: '5 / 6 항목', status: '대리점 보완 1건', icon: Link2 },
  { id: 'twin', title: '비용 영향', detail: '+540만원', status: '확인된 2건 반영', icon: Calculator },
  { id: 'review', title: '공동 검토', detail: '확인 2건', status: '선사 판단 대기', icon: ClipboardCheck },
]
const descriptions: Record<string, [string, string]> = {
  dashboard: ['기항 변화에서 실제비용 검산까지', '변경된 일정·작업·서비스가 어떤 비용과 근거에 영향을 주는지 분석하고 Revised PDA와 다음 행동을 제시합니다.'],
  documents: ['기항 문서를 접수하고 비용 검토 업무를 생성합니다', '문서팩을 확인한 뒤 등록하면 비용·사건·증빙이 PC-2609 워크스페이스에 연결됩니다.'],
  agent: ['AI가 비용항목과 근거 후보를 분석합니다', '형식과 표현이 다른 비용을 표준항목 후보로 연결하고, 증빙 부족·중복·금액 불일치를 담당자 검토 대상으로 분리합니다.'],
  evidence: ['이 비용이 발생한 근거를 확인합니다', '비용항목을 선택하면 관련 사건, 청구서, 작업기록과 적용 규칙을 함께 볼 수 있습니다.'],
  twin: ['일정 변화가 비용조건에 미치는 영향을 확인합니다', '일정 변경은 재검토 신호로 사용합니다. 실제 작업·서비스와 적용 규칙이 확인된 항목만 수정 예상액에 반영합니다.'],
  review: ['대리점이 정리한 차액과 근거를 선사가 확인합니다', 'PDA와 예상 FDA를 함께 비교합니다. 금액 차이는 오류 확정이 아니며, 미확인 항목은 양측 담당자가 질의·보완한 뒤 권한자가 판단합니다.'],
  verify: ['계산 규칙과 업무 통제를 관리합니다', '비용 계산, 증빙 없는 자동확정 차단과 공개요율 규칙의 출처·적용조건을 확인합니다.'],
}

export function WorkflowFrame({ view, children }: { view: string; children: ReactNode }) {
  const nav = useNavigate()
  const index = workQueues.findIndex(s => s.id === view)
  const [title, description] = descriptions[view]
  const next = workQueues[index + 1]
  return <div className="pc-workspace">
    <div className="pc-call-strip"><div className="pc-vessel"><Ship size={21} /><strong>{PORT_CALL.vesselName}</strong><span>{PORT_CALL.id}</span></div><span>PRINCIPAL / PORT AGENCY</span><span>부산항 · {PORT_CALL.berth}</span><span className="pc-demo-tag">SYNTHETIC DEMO</span></div>
    <section className="pc-ops-board" aria-label="현재 기항 공동업무 현황"><div className="pc-ops-title"><div><b>현재 기항 업무 현황</b><span>출항 후 비용 검토 · 담당 DA-021</span></div><button onClick={() => nav('/flow')}>업무 흐름 보기 <ArrowRight size={13} /></button></div><div className="pc-ops-grid">{workQueues.map((item) => { const Icon = item.icon; return <button key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={() => nav(`/app/${item.id}`)} className={view === item.id ? 'is-active' : ''}><span className="pc-ops-icon"><Icon size={17} /></span><span><small>{item.title}</small><strong>{item.detail}</strong><em>{item.status}</em></span></button> })}</div></section>
    <div className="pc-page-heading"><div><p>{index >= 0 ? `WORK QUEUE 0${index + 1}` : view === 'dashboard' ? 'PORT CALL COST INTELLIGENCE' : 'QUALITY CONTROL'}{view === 'twin' && ' / SCHEDULE-TO-COST'}</p><h1>{title}</h1><div>{description}</div></div></div>
    <div className="pc-page-content">{children}</div>
    <div className="pc-next-action"><span>{view === 'review' ? '대리점은 근거를 보완하고 선사 권한자는 정산·지급 여부를 최종 판단합니다.' : '각 비용항목은 문서·작업기록·규칙·승인 근거와 함께 검토됩니다.'}</span><button className="btn-primary" onClick={() => nav(next ? `/app/${next.id}` : '/app/verify')}>{next ? `다음 업무: ${next.title}` : '품질관리 열기'}<ArrowRight size={15} /></button></div>
  </div>
}

const amount = (value: number) => (value / 10000).toLocaleString('ko-KR')
export function CostSimulation({ events, onToggle, forecast }: { events: PortEvent[]; onToggle: (id: string) => void; forecast: number }) {
  const active = events.filter(event => event.enabled)
  const change = forecast - PORT_CALL.pdaTotal
  const impactCandidates = [
    ['도선료', '토요일·야간 조건 후보', '실제 도선시각', '확인 필요'],
    ['하역 작업비', '토요일 작업 조건 후보', 'SOF 실제 작업기록', '조건 확인'],
    ['접안 관련 비용', '예정 체류시간 증가', '실제 접안·이안기록', '확인 필요'],
  ]
  return <div className="pc-twin-stack">
    <section className="pc-impact-panel">
      <div className="pc-impact-head"><div><span>SCHEDULE CHANGE · SYNTHETIC DEMO</span><h2>ETD 변경에서 비용조건 후보를 찾습니다</h2></div><b>일정만으로 금액 확정 금지</b></div>
      <div className="pc-schedule-compare"><div><small>ORIGINAL PLAN</small><span>ETA <b>09.18 08:00</b></span><span>ETD <b>09.18 23:00</b></span></div><ArrowRight size={22} /><div className="changed"><small>CHANGED PLAN</small><span>ETA <b>09.18 08:00</b></span><span>ETD <b>09.19 06:00</b></span></div></div>
      <div className="pc-impact-table"><div className="head"><span>영향 비용항목</span><span>감지된 조건</span><span>확인할 근거</span><span>현재 처리</span></div>{impactCandidates.map(row => <div key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><em className={row[3] === '조건 확인' ? 'ready' : ''}>{row[3]}</em></div>)}</div>
    </section>
    <div className="pc-simulation">
    <section className="pc-event-panel"><div className="pc-section-title"><div><h2>확인된 사건과 규칙</h2><p>확인된 변화만 수정 예상액에 반영합니다.</p></div><button className="pc-text-button" onClick={() => events.filter(e => e.enabled).forEach(e => onToggle(e.id))}><RotateCcw size={13} />전체 해제</button></div>
      <div className="pc-events">{events.map((event, index) => <button key={event.id} className={`pc-event-row ${event.enabled ? 'selected' : ''}`} onClick={() => onToggle(event.id)} role="switch" aria-checked={event.enabled}><span className="pc-checkbox">{event.enabled && <Check size={15} />}</span><div className="pc-event-copy"><small>사건 0{index + 1} · {event.occurredAt}</small><h3>{event.title}</h3><p>{event.detail}</p><div className="pc-formula">{event.calculationBasis.replace('Demo Rule: ', '')}</div></div><span className="pc-event-amount">+{amount(event.costImpact)}<small>만원</small></span></button>)}</div>
      <div className="pc-simulation-note">화면의 금액과 Demo Rule은 기능 시연용 가상값입니다. 운영 적용 전 실제 일정·작업기록과 공식·계약요율을 연결해야 합니다.</div>
    </section>
    <section className="pc-result-panel" aria-live="polite"><div className="pc-section-title"><div><h2>수정 예상액</h2><p>확인된 사건 {active.length}건 반영 · KRW</p></div><span className="pc-live-dot">계산 반영</span></div>
      <div className="pc-result-total"><span>Revised PDA 후보</span><div><strong>{amount(forecast)}</strong><span>만원</span></div><p>최초 PDA 대비 <b>+{amount(change)}만원</b></p></div>
      <div className="pc-calculation"><div><span>최초 PDA <small>사전 예상비용</small></span><strong>{amount(PORT_CALL.pdaTotal)}만원</strong></div>{active.length ? active.map(event => <div key={event.id}><span>{event.title}</span><strong className="pc-blue">+{amount(event.costImpact)}만원</strong></div>) : <p className="pc-zero">확인된 추가 사건 없음 · 최초 PDA와 동일</p>}<div className="pc-calculation-total"><span>수정 예상액</span><strong>{amount(forecast)}만원</strong></div></div>
      <div className="pc-review-note"><ClipboardCheck size={19} /><div><strong>계산 다음은, 근거 확인입니다.</strong><p>사건 선택은 시뮬레이션입니다. 실제 청구와 승인 근거는 다음 검토 단계에서 확인합니다.</p></div></div>
    </section>
    </div>
  </div>
}
