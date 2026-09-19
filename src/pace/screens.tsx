import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Calculator,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileStack,
  FileText,
  GitBranch,
  Info,
  LoaderCircle,
  PlayCircle,
  Sparkles,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import { Kpi, Panel, RowNo, cn } from '../components/ui'
import { COST_ITEMS, DOCUMENTS, EVENTS, ISSUES, PORT_CALL, RULES } from './seed'
import { AGENT_BENCHMARK } from './agentMetrics'
import type { CostItem, CostStatus, PortEvent } from './types'

const money = (n: number) => `${Math.round(n / 10_000).toLocaleString('ko-KR')}만원`
function costState(cost: CostItem, amount: number): CostStatus {
  if (['review', 'suspected', 'missing_evidence'].includes(cost.status)) return cost.status
  return amount === cost.pdaAmount ? 'matched' : 'explained'
}
const statusLabel: Record<CostStatus, string> = {
  matched: '일치',
  explained: '설명된 차이',
  review: '확인 필요',
  suspected: '오류 의심',
  missing_evidence: '증빙 부족',
}
const statusTone: Record<CostStatus, string> = {
  matched: 'bg-emerald-50 text-emerald-700',
  explained: 'bg-sky-50 text-sky-700',
  review: 'bg-amber-50 text-amber-700',
  suspected: 'bg-red-50 text-red-700',
  missing_evidence: 'bg-orange-50 text-orange-700',
}

function CostPill({ value }: { value: CostStatus }) {
  return <span className={cn('rounded px-1.5 py-0.5 text-[12px] font-medium', statusTone[value])}>{statusLabel[value]}</span>
}

export function Dashboard({ forecast, variance, reviewCount, amount, onGo }: { forecast: number; variance: number; reviewCount: number; amount: (cost: CostItem) => number; onGo: (to: string) => void }) {
  return <div className="space-y-4">
    <section className="overflow-hidden rounded-xl border border-[#bfd0e8] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-[#0b3155] px-5 py-4 text-white">
        <div><span className="text-[10px] font-semibold tracking-[.14em] text-sky-200">PORT CALL COST INTELLIGENCE</span><h2 className="mt-1 text-lg font-semibold">PC-2609 · 부산항 · 운영 변화 3건 감지</h2><p className="mt-1 text-[11px] text-white/70">변경된 기항정보에서 비용 영향 후보와 담당자의 다음 행동을 구성했습니다.</p></div>
        <button className="rounded-md bg-white px-4 py-2 text-[11px] font-semibold text-[#173f73]" onClick={() => onGo('/app/twin')}>비용 영향분석 열기</button>
      </div>
      <div className="grid gap-px bg-[#dfe6ef] md:grid-cols-[1.1fr_1fr_1.2fr]">
        <div className="bg-white p-4"><span className="text-[10px] font-semibold text-mute">PORT CALL CHANGE</span><div className="mt-2 space-y-2 text-[12px]"><p><b>ETD</b> <span className="ml-2 font-mono text-mute line-through">09.18 23:00</span> <span className="mx-1 text-sky-700">→</span> <b className="font-mono text-sky-800">09.19 06:00</b></p><p><b>Tug Service</b> <span className="ml-2">2 → 3회</span></p><p><b>Working Time</b> <span className="ml-2">+6h</span></p></div></div>
        <div className="bg-white p-4"><span className="text-[10px] font-semibold text-mute">COST IMPACT</span><div className="mt-2 flex flex-wrap gap-2">{['도선료','예선료','하역 작업비'].map((x) => <span key={x} className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800">{x}</span>)}</div><p className="mt-3 text-[11px] leading-5 text-mute">실제 작업·서비스와 적용 규칙을 확인한 항목만 Revised PDA 후보에 반영합니다.</p></div>
        <div className="bg-white p-4"><span className="text-[10px] font-semibold text-mute">NEXT ACTION</span><div className="mt-2 grid gap-2 text-[11px]">{['SOF 실제 작업시각 확인','예선 Invoice 요청','Revised PDA 반영 검토'].map((x, i) => <div key={x} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#edf3ff] text-[9px] font-bold text-[#2f62c0]">{i + 1}</span><b>{x}</b></div>)}</div></div>
      </div>
    </section>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Kpi label="최초 PDA" value={money(PORT_CALL.pdaTotal)} hint="입항 전 예상비용" />
      <Kpi label="수정 예상액" value={money(forecast)} hint="확인 후 반영된 사건 기준" tone="info" />
      <Kpi label="예상 차액" value={`+${money(variance)}`} hint="오류가 아닌 검토 대상" tone="warn" />
      <Kpi label="사람 확인" value={`${reviewCount}건`} hint="자동 확정하지 않음" tone="bad" />
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
      <Panel title="비용항목 현황" padded={false} right={<button className="text-[12px] text-sky-700" onClick={() => onGo('/app/review')}>전체 검토</button>}>
        <table className="erp-table"><thead><tr><th>No.</th><th>항목</th><th>PDA</th><th>현재 예상</th><th>상태</th><th>근거</th></tr></thead><tbody>{COST_ITEMS.map((c, i) => <tr key={c.id}><td><RowNo n={i + 1} /></td><td><b>{c.label}</b><div className="text-[11px] text-mute">{c.vendor}</div></td><td className="font-mono">{money(c.pdaAmount)}</td><td className="font-mono">{money(amount(c))}</td><td><CostPill value={costState(c, amount(c))} /></td><td>{c.evidenceIds.length}건</td></tr>)}</tbody></table>
      </Panel>
      <div className="space-y-4">
        <Panel title="확인 필요"><div className="space-y-3">{ISSUES.filter((i) => !i.resolved).map((i) => <div key={i.id} className="rounded border border-amber-200 bg-amber-50 p-3"><div className="flex gap-2"><TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-700" /><div><b className="text-[12px]">{i.message}</b><p className="mt-1 text-[11px] text-amber-900">{i.recommendedAction}</p></div></div></div>)}</div></Panel>
        <Panel title="설계 원칙"><ul className="space-y-2 text-[12px] text-mute"><li>• AI 추출값마다 원문 근거 표시</li><li>• 계산·요율은 규칙 엔진 담당</li><li>• 계약·지급 판단은 담당자 담당</li></ul></Panel>
      </div>
    </div>
  </div>
}

export function Documents() {
  type UploadState = {
    status: 'idle' | 'reading' | 'ready' | 'scanned' | 'error' | 'registered'
    fileName?: string
    pages?: number
    chars?: number
    excerpt?: string
    keywords?: string[]
    amounts?: string[]
    message?: string
  }
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' })
  const [demoLoaded, setDemoLoaded] = useState(() => window.sessionStorage.getItem('pace-demo-loaded') === '1')
  const nav = useNavigate()

  async function readPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUpload({ status: 'error', fileName: file.name, message: 'PDF 파일만 등록할 수 있습니다.' })
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setUpload({ status: 'error', fileName: file.name, message: '20MB 이하 PDF를 사용해 주세요.' })
      return
    }
    setUpload({ status: 'reading', fileName: file.name })
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      const data = new Uint8Array(await file.arrayBuffer())
      const pdf = await pdfjsLib.getDocument({ data }).promise
      const pageTexts: string[] = []
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
        const page = await pdf.getPage(pageNo)
        const content = await page.getTextContent()
        pageTexts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
      }
      const text = pageTexts.join('\n').replace(/\s+/g, ' ').trim()
      if (text.length < 30) {
        setUpload({ status: 'scanned', fileName: file.name, pages: pdf.numPages, chars: text.length, message: '텍스트 레이어를 찾지 못했습니다. 스캔 PDF OCR은 현장 PoC 구현 범위입니다.' })
        return
      }
      const vocabulary = ['PDA', 'FDA', 'INVOICE', 'PILOTAGE', 'TOWAGE', 'STEVEDORING', 'MOORING', '도선료', '예선료', '하역료', '계선료', '항비']
      const upper = text.toUpperCase()
      const keywords = vocabulary.filter((word) => upper.includes(word.toUpperCase()))
      const amounts = Array.from(text.matchAll(/(?:KRW|USD|₩|\$)?\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?/gi)).map((m) => m[0].trim()).slice(0, 8)
      setUpload({ status: 'ready', fileName: file.name, pages: pdf.numPages, chars: text.length, excerpt: text.slice(0, 420), keywords, amounts })
    } catch {
      setUpload({ status: 'error', fileName: file.name, message: 'PDF를 읽지 못했습니다. 암호화 또는 손상 여부를 확인해 주세요.' })
    }
  }

  const tone = upload.status === 'ready' || upload.status === 'registered' ? 'border-emerald-200 bg-emerald-50' : upload.status === 'error' || upload.status === 'scanned' ? 'border-amber-200 bg-amber-50' : 'border-line bg-white'

  return <div className="space-y-4">
    <div className="rounded border border-sky-200 bg-sky-50 px-4 py-3 text-[12px] leading-6 text-sky-950"><Info className="mr-2 inline" size={14} /><b>접수 대기:</b> 문서팩의 PDA·Revised DA·공급자 인보이스·SOF·FDA를 확인한 뒤 PC-2609 워크스페이스에 등록하세요.</div>

    <Panel title="Port Call Document Intake">
      <div className="grid gap-5 xl:grid-cols-[minmax(420px,.95fr)_1.05fr]">
        <div className="overflow-hidden rounded-xl border border-line bg-[#f3f6fa]">
          <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3"><div className="flex items-center gap-2"><BookOpen size={16} className="text-sky-700" /><b className="text-[12px]">PC-2609 Disbursement Document Pack</b><span className="rounded bg-[#eef2f6] px-2 py-0.5 text-[9px] text-mute">SYNTHETIC DOCUMENT</span></div><a className="text-[11px] font-semibold text-sky-700" href="/demo/PACE_demo_port_call_pack.pdf" target="_blank" rel="noreferrer">원문 열기</a></div>
          <iframe title="PC-2609 기항비 문서팩" src="/demo/PACE_demo_port_call_pack.pdf#page=1&view=FitH&toolbar=0" className="h-[430px] w-full bg-white" />
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-[.14em] text-sky-700">PORT CALL PC-2609 · DOCUMENT INTAKE</span>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#173f73]">문서팩을 기항 비용 워크스페이스에 등록합니다.</h2>
          <p className="mt-3 text-[12px] leading-6 text-mute">PDA, Revised DA, 예선·하역 공급자 인보이스, Statement of Facts와 FDA를 한 기항에 연결합니다. 필드와 금액을 구조화한 뒤 담당자가 확인할 예외항목을 분리합니다.</p>

          {!demoLoaded ? <>
            <div className="mt-5 space-y-2">{[
              ['1', '문서 분류', 'PDA·RDA·Invoice·SOF·FDA를 기항 PC-2609에 연결'],
              ['2', '비용 대사', 'PDA와 FDA 항목을 비교하고 공급자 증빙을 연결'],
              ['3', '예외 생성', '추가비용과 증빙 부족 항목을 담당자 검토로 전환'],
            ].map(([no, title, body]) => <div key={no} className="flex gap-3 rounded-lg border border-line p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#173f73] text-[10px] font-bold text-white">{no}</span><div><b className="text-[12px]">{title}</b><p className="mt-1 text-[11px] text-mute">{body}</p></div></div>)}</div>
            <button className="btn-primary mt-5 !w-full !justify-center !py-3" onClick={() => { window.sessionStorage.setItem('pace-demo-loaded', '1'); setDemoLoaded(true) }}><PlayCircle size={17} />문서팩 등록 및 구조화</button>
            <p className="mt-2 text-center text-[10px] text-mute">Synthetic Document · 외부 전송 없이 현재 세션에서 구성</p>
          </> : <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 size={19} /><b className="text-[13px]">PC-2609 문서 구조화 완료</b></div>
            <div className="mt-4 grid grid-cols-3 gap-2">{[['비용항목', '6개'], ['설명된 변화', '2건'], ['사람 확인', '2건']].map(([a, b]) => <div key={a} className="rounded-lg bg-white p-3 text-center"><strong className="block text-lg text-[#173f73]">{b}</strong><span className="text-[10px] text-mute">{a}</span></div>)}</div>
            <div className="mt-4 space-y-2 text-[11px]"><p>✓ 추가 예선 +180만원: 청구서·작업기록 연결</p><p>! 토요일 작업 +360만원: 승인 근거 확인 필요</p><p>! 대리점 수수료: 계약·승인자료 미연결</p></div>
            <button className="btn-primary mt-5 !w-full !justify-center !py-3" onClick={() => nav('/app/evidence')}>비용 근거 검토 시작 <ArrowRight size={15} /></button>
          </div>}
        </div>
      </div>
    </Panel>

    <details className="rounded-xl border border-line bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4"><Upload size={16} className="text-mute" /><div className="flex-1"><b className="block text-[12px]">외부 문서 가져오기</b><span className="text-[10px] text-mute">텍스트 PDF 기본 추출 · 스캔본은 OCR 연결 필요</span></div><span className="rounded bg-[#eef2f6] px-2 py-1 text-[10px] text-mute">BETA</span></summary>
      <div className="border-t border-line p-5">
        <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
          <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-sky-300 bg-sky-50/60 p-5 text-center hover:bg-sky-50">{upload.status === 'reading' ? <LoaderCircle className="animate-spin text-sky-700" size={25} /> : <Upload className="text-sky-700" size={25} />}<b className="mt-3 text-[12px]">텍스트 PDF 선택</b><p className="mt-2 text-[10px] leading-5 text-mute">20MB 이하 · 브라우저에서만 처리</p><input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={readPdf} /></label>
          <div className={cn('min-h-44 rounded-xl border p-5', tone)}>
            {upload.status === 'idle' && <div className="grid h-full place-items-center text-center text-[11px] leading-6 text-mute">파일을 넣으면 페이지 수, 비용 키워드와<br />금액 후보를 보여줍니다.</div>}
            {upload.status === 'reading' && <div className="grid h-full place-items-center text-[12px] text-sky-800">텍스트 레이어를 읽고 있습니다…</div>}
            {['error', 'scanned'].includes(upload.status) && <div><b className="text-[12px]">{upload.fileName}</b><p className="mt-3 text-[11px] leading-6 text-amber-900">{upload.message}</p></div>}
            {(upload.status === 'ready' || upload.status === 'registered') && <div><div className="flex justify-between gap-3"><div><b className="block text-[12px]">{upload.fileName}</b><span className="text-[10px] text-mute">{upload.pages}페이지 · {upload.chars?.toLocaleString()}자</span></div><span className="rounded bg-emerald-100 px-2 py-1 text-[10px] text-emerald-700">기본 추출 완료</span></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div><p className="text-[10px] font-semibold text-mute">키워드 후보</p><p className="mt-1 text-[11px] leading-5">{upload.keywords?.join(' · ') || '없음'}</p></div><div><p className="text-[10px] font-semibold text-mute">금액 후보</p><p className="mt-1 font-mono text-[10px] leading-5">{upload.amounts?.join(' · ') || '없음'}</p></div></div><p className="mt-3 line-clamp-3 rounded bg-white/70 p-3 text-[10px] leading-5 text-mute">{upload.excerpt}</p></div>}
          </div>
        </div>
      </div>
    </details>

    <details className="rounded-xl border border-line bg-white"><summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4"><FileStack size={16} className="text-mute" /><div className="flex-1"><b className="block text-[12px]">연결 문서 목록</b><span className="text-[10px] text-mute">PC-2609에 연결된 증빙과 처리상태</span></div><span className="text-[10px] text-mute">{DOCUMENTS.length}건</span></summary><div className="border-t border-line"><table className="erp-table"><thead><tr><th>No.</th><th>유형</th><th>파일</th><th>연결상태</th></tr></thead><tbody>{DOCUMENTS.map((d, i) => <tr key={d.id}><td><RowNo n={i + 1} /></td><td>{d.type}</td><td className="font-mono text-[11px]">{d.fileName}</td><td>{d.extractionStatus === 'review' ? '사람 확인 필요' : '근거 연결 완료'}</td></tr>)}</tbody></table></div></details>
  </div>
}

export function Review({ selected, onSelect, amount }: { selected: CostItem; onSelect: (id: string) => void; amount: (c: CostItem) => number }) {
  const nav = useNavigate()
  const rule = RULES.find((r) => r.id === selected.tariffRuleId)
  const docs = DOCUMENTS.filter((d) => selected.evidenceIds.includes(d.id))
  const issues = ISSUES.filter((i) => i.costItemId === selected.id)
  return <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]"><Panel title="PDA–예상 FDA 비교" padded={false}><table className="erp-table"><thead><tr><th>항목</th><th>PDA</th><th>현재 예상</th><th>차이</th><th>상태</th></tr></thead><tbody>{COST_ITEMS.map((c) => { const a = amount(c); return <tr key={c.id} className={selected.id === c.id ? 'is-on cursor-pointer' : 'cursor-pointer'} onClick={() => onSelect(c.id)}><td><b>{c.label}</b><div className="text-[11px] text-mute">{c.vendor}</div></td><td className="font-mono">{money(c.pdaAmount)}</td><td className="font-mono">{money(a)}</td><td className={a !== c.pdaAmount ? 'font-mono text-amber-700' : 'font-mono text-mute'}>{a === c.pdaAmount ? '—' : `+${money(a - c.pdaAmount)}`}</td><td><CostPill value={costState(c, amount(c))} /></td></tr>})}</tbody></table></Panel><div className="space-y-4"><Panel title={`${selected.label} · 검토 근거`}><p className="text-[13px] font-semibold">{selected.varianceReason}</p><div className="mt-4 space-y-2">{docs.length ? docs.map((d) => <div key={d.id} className="flex items-center gap-2 rounded border border-line px-3 py-2"><FileText size={14} className="text-sky-700" /><span className="flex-1 truncate font-mono text-[11px]">{d.fileName}</span><span className="text-[10px] text-mute">근거</span></div>) : <p className="rounded bg-orange-50 p-3 text-[12px] text-orange-800">연결된 증빙이 없습니다.</p>}</div>{rule ? <div className="mt-4 rounded bg-[#f7fafc] p-3"><p className="text-[11px] text-mute">적용 규칙</p><b className="mt-1 block text-[12px]">{rule.name}</b><p className="mt-1 text-[11px] text-mute">{rule.formula}</p><p className="mt-2 text-[10px] text-amber-700">{rule.source}</p></div> : null}</Panel>{issues.map((i) => <Panel key={i.id} title="검토 항목"><p className="text-[12px]">{i.message}</p><button className="btn-primary mt-3" onClick={() => nav('/app/evidence')}>근거 연결 현황 확인</button></Panel>)}</div></div>
}

export function Evidence({ selected, onSelect }: { selected: CostItem; onSelect: (id: string) => void }) {
  const docs = DOCUMENTS.filter((d) => selected.evidenceIds.includes(d.id))
  const rule = RULES.find((r) => r.id === selected.tariffRuleId)
  const event = EVENTS.find((e) => e.id === selected.eventId)
  return <div className="grid gap-4 xl:grid-cols-[280px_1fr]"><Panel title="비용항목"><div className="space-y-1">{COST_ITEMS.map((c) => <button key={c.id} className={cn('flex w-full items-center justify-between rounded px-3 py-2 text-left text-[12px]', selected.id === c.id ? 'bg-[#eaf5fb] font-semibold text-sky-800' : 'hover:bg-[#f4f7fa]')} onClick={() => onSelect(c.id)}>{c.label}<ChevronRight size={12} /></button>)}</div></Panel><Panel title={`${selected.label} · Evidence Graph`}><div className="pc-graph"><GraphNode icon={CircleDollarSign} kicker="COST ITEM" title={selected.label} body={`${selected.vendor} · ${statusLabel[selected.status]}`} primary /><div className="pc-edge" /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{event ? <GraphNode icon={GitBranch} kicker="PORT EVENT" title={event.title} body={event.detail} /> : null}{docs.map((d) => <GraphNode key={d.id} icon={FileText} kicker={d.type} title={d.fileName} body={`${d.issuer} · 확신도 ${Math.round(d.confidence * 100)}%`} />)}{rule ? <GraphNode icon={Calculator} kicker="TARIFF RULE" title={rule.name} body={rule.formula} warn /> : null}{!docs.length ? <GraphNode icon={TriangleAlert} kicker="MISSING" title="증빙 미연결" body="계약 또는 승인자료 확인 필요" warn /> : null}</div></div><div className="mt-6 rounded border border-sky-200 bg-sky-50 p-4 text-[12px] leading-6 text-sky-950"><b>설명 가능한 결과</b><br />{selected.varianceReason}. 각 연결은 원문·규칙·사람 확인으로 되돌아갈 수 있어야 하며, 관계가 없으면 자동 확정하지 않습니다.</div></Panel></div>
}

const pct = (value: number) => `${(value * 100).toFixed(1)}%`

export function AgentAnalysis() {
  const [validationView, setValidationView] = useState<'result' | 'matrix' | 'data' | 'code'>('result')
  const m = AGENT_BENCHMARK.metrics
  const stages = [
    ['1', '문서 의미 해석', '비용 표현과 문맥을 읽고 표준항목 후보 생성'],
    ['2', '증빙 후보 연결', '같은 기항의 인보이스·작업기록·규칙을 탐색'],
    ['3', '예외 우선순위', '누락·중복·금액 불일치를 검토 대상으로 분리'],
    ['4', '검토 행동 제안', '차이 이유와 필요한 확인자료를 담당자에게 제시'],
  ]
  const views = [
    ['result', '실행 결과'],
    ['matrix', '혼동행렬'],
    ['data', '입력·오류'],
    ['code', '재현 코드'],
  ] as const
  return <div className="space-y-4">
    <div className="rounded-xl border border-[#b8d3f2] bg-[#eef6ff] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-semibold tracking-[.14em] text-[#2f62c0]">AI COST REVIEW AGENT</p><h2 className="mt-2 text-xl font-semibold text-[#0b3155]">문서를 읽고, 비용의 근거와 다음 확인 행동을 제안합니다.</h2><p className="mt-2 max-w-3xl text-[12px] leading-6 text-[#52657a]">AI는 형식과 표현이 다른 비용을 표준항목 후보로 연결하고 증빙 후보와 예외를 제시합니다. 금액 계산은 규칙 엔진, 계약·지급·FDA 확정은 담당자가 수행합니다.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#2f62c0]">SYNTHETIC BENCHMARK v1</span></div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">{stages.map(([n, title, body]) => <div key={n} className="rounded-lg border border-white bg-white/85 p-4"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#173f73] text-[10px] font-bold text-white">{n}</span><b className="mt-3 block text-[12px]">{title}</b><p className="mt-1 text-[10px] leading-5 text-mute">{body}</p></div>)}</div>
    </div>

    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-6 text-amber-950"><b>평가대상 구분:</b> 실제 기항 스케줄 30건을 평가한 결과가 아닙니다. 코드가 생성한 합성 비용 레코드 180개를 30개 시나리오 그룹으로 묶어 비용 의미 매핑을 시험했습니다. ETA·ETB·ETD·선석·작업 이벤트 추출과 실제 PDF 양식 정확도는 아직 측정하지 않았습니다.</div>

    <div className="grid gap-3 md:grid-cols-5"><Kpi label="합성 비용 매핑" value={pct(m.mappingAccuracy)} hint="Accuracy · n=180" tone="info" /><Kpi label="합성 증빙 연결" value={pct(m.evidenceLinkAccuracy)} hint="정확도 · 증빙 존재 165건" /><Kpi label="규칙 예외 탐지" value={pct(m.exceptionF1)} hint="F1 · 삽입 오류 45건" tone="warn" /><Kpi label="잘못된 자동확정" value={`${m.falseAutoClear}건`} hint="통제된 합성 시험" tone="ok" /><Kpi label="End-to-End" value={pct(m.endToEndAccuracy)} hint="합성 레코드 단위" /></div>

    <Panel title="코드 기반 검증 결과" right={<span className="text-[10px] text-mute">seed 2609 · 실행결과 고정</span>}>
      <div className="flex flex-wrap gap-1 border-b border-line pb-3">{views.map(([id, label]) => <button key={id} onClick={() => setValidationView(id)} className={cn('rounded px-3 py-2 text-[11px] font-semibold', validationView === id ? 'bg-[#173f73] text-white' : 'bg-[#f1f4f8] text-mute hover:bg-[#e7edf5]')}>{label}</button>)}</div>
      {validationView === 'result' ? <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <div className="rounded-lg bg-[#101827] p-4 font-mono text-[11px] leading-6 text-[#c9d5e6]"><span className="text-emerald-400">$ python pace_ai/evaluate_agent.py</span><br />benchmark = PACE Synthetic Benchmark v1<br />seed = 2609<br />train = {AGENT_BENCHMARK.scope.trainPhrases} synthetic phrases<br />test = {AGENT_BENCHMARK.scope.costItems} synthetic cost records<br /><span className="text-sky-300">mapping_accuracy = {m.mappingAccuracy.toFixed(4)}</span><br />evidence_link_accuracy = {m.evidenceLinkAccuracy.toFixed(4)}<br />exception_f1 = {m.exceptionF1.toFixed(4)}<br />false_auto_clear = {m.falseAutoClear}<br /><span className="text-emerald-400">ASSERTIONS PASSED</span></div>
        <div className="space-y-3">{[['합성 비용 매핑', m.mappingAccuracy], ['합성 증빙 연결', m.evidenceLinkAccuracy], ['규칙 예외 탐지 F1', m.exceptionF1], ['End-to-End', m.endToEndAccuracy]].map(([label, value]) => <div key={label as string}><div className="mb-1 flex justify-between text-[11px]"><b>{label}</b><span className="font-mono">{pct(value as number)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e8edf3]"><div className="h-full rounded-full bg-[#3465b7]" style={{ width: pct(value as number) }} /></div></div>)}</div>
      </div> : null}
      {validationView === 'matrix' ? <div className="mt-4 overflow-x-auto"><p className="mb-3 text-[11px] leading-5 text-mute">행은 정답, 열은 예측입니다. 접안으로 과분류된 예선 6건과 계선 7건이 주요 오류입니다.</p><table className="erp-table min-w-[680px]"><thead><tr><th>정답 ＼ 예측</th>{AGENT_BENCHMARK.labels.map((label) => <th key={label} className="text-center">{label}</th>)}</tr></thead><tbody>{AGENT_BENCHMARK.confusionMatrix.map((row, i) => <tr key={AGENT_BENCHMARK.labels[i]}><td><b>{AGENT_BENCHMARK.labels[i]}</b></td>{row.map((value, j) => <td key={j} className={cn('text-center font-mono', i === j && value ? 'bg-emerald-50 font-semibold text-emerald-800' : value ? 'bg-red-50 font-semibold text-red-700' : 'text-mute')}>{value}</td>)}</tr>)}</tbody></table><div className="mt-4 grid gap-2 md:grid-cols-3">{AGENT_BENCHMARK.classMetrics.map((row) => <div key={row.label} className="rounded border border-line p-3"><div className="flex justify-between"><b className="text-[11px]">{row.label}</b><span className="text-[10px] text-mute">n={row.support}</span></div><p className="mt-2 font-mono text-[10px] text-mute">P {pct(row.precision)} · R {pct(row.recall)} · F1 {pct(row.f1)}</p></div>)}</div></div> : null}
      {validationView === 'data' ? <div className="mt-4"><div className="grid gap-3 md:grid-cols-4">{[['자료 출처', '코드 생성 합성문장'], ['학습', `${AGENT_BENCHMARK.scope.trainPhrases}개 · 표현군 ${AGENT_BENCHMARK.splitAudit.trainFamilies}개`], ['평가', `${AGENT_BENCHMARK.scope.costItems}개 · 표현군 ${AGENT_BENCHMARK.splitAudit.testFamilies}개`], ['실제 문서', '0건 · 미검증']].map(([a,b]) => <div key={a} className="rounded border border-line bg-[#f8fafc] p-3"><span className="text-[10px] text-mute">{a}</span><b className="mt-1 block text-[11px]">{b}</b></div>)}</div><div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-6 text-emerald-950"><b>Split Audit:</b> 학습-평가 표현군 중복 {AGENT_BENCHMARK.splitAudit.familyOverlap}개 · 완전 동일 레코드 {AGENT_BENCHMARK.splitAudit.exactRecordOverlap}개. {AGENT_BENCHMARK.splitAudit.note}</div><div className="mt-4 overflow-hidden rounded border border-line"><table className="erp-table"><thead><tr><th>ID</th><th>합성 입력</th><th>정답</th><th>예측</th><th>결과</th></tr></thead><tbody>{AGENT_BENCHMARK.sampleRows.map((row) => <tr key={row.id}><td className="font-mono text-[10px]">{row.id}</td><td className="font-mono text-[10px]">{row.input}</td><td>{row.answer}</td><td>{row.prediction}</td><td className={row.result === '정답' ? 'text-emerald-700' : 'font-semibold text-red-700'}>{row.result}</td></tr>)}</tbody></table></div></div> : null}
      {validationView === 'code' ? <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><pre className="overflow-x-auto rounded-lg bg-[#101827] p-4 text-[10px] leading-6 text-[#c9d5e6]"><code>{`SEED = 2609\nmodel = CharNgramCentroid().fit(train)\n\nfor record in synthetic_records:\n    label = model.predict(record.description)\n    evidence = link_same_group(record, label)\n    exceptions = run_deterministic_controls(record, evidence)\n\naccuracy = correct_mapping / 180\nassert false_auto_clear == 0`}</code></pre><div className="rounded border border-line p-4 text-[11px] leading-6"><b>재현 파일</b><p className="mt-2 text-mute">evaluate_agent.py가 같은 seed로 데이터 생성·학습·예측·평가를 한 번에 수행하고 metrics.json과 predictions.jsonl을 저장합니다.</p><p className="mt-3 rounded bg-amber-50 p-3 text-amber-900">코드가 실행된다는 사실은 입증하지만, 실제 양식과의 동등성은 입증하지 않습니다.</p></div></div> : null}
    </Panel>

    <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <Panel title="PC-2609 Agent 분석 예시" right={<span className="text-[10px] text-mute">정답셋 기반 결과 재현</span>}>
        <div className="space-y-3"><div className="rounded border border-line bg-[#f8fafc] p-4"><div className="flex items-center gap-2"><FileText size={15} className="text-sky-700" /><b className="text-[12px]">입력 표현</b></div><p className="mt-2 font-mono text-[11px] text-mute">“Tug attendance for berth shifting · 1 movement”</p></div><div className="grid gap-3 md:grid-cols-2"><div className="rounded border border-sky-200 bg-sky-50 p-4"><div className="flex items-center gap-2"><BrainCircuit size={15} className="text-sky-700" /><b className="text-[12px]">AI 비용항목 후보</b></div><strong className="mt-3 block text-[17px] text-[#0b3155]">예선료 · TOWAGE</strong><p className="mt-1 text-[10px] text-mute">표현·문맥 기반 표준항목 매핑</p></div><div className="rounded border border-indigo-200 bg-indigo-50 p-4"><div className="flex items-center gap-2"><Sparkles size={15} className="text-indigo-700" /><b className="text-[12px]">Agent 다음 행동</b></div><p className="mt-3 text-[11px] leading-5">선석 이동 기록과 인보이스가 연결되었습니다. 운영 적용 전 계약요율 버전을 확인하십시오.</p></div></div><div className="rounded border border-line p-4 text-[11px] leading-6"><b>연결 근거</b><br />INV-TUG-260918-07.pdf · SOF-BUS-PC2609-001.pdf · Demo Rule DR-2026.1</div></div>
      </Panel>
      <Panel title="평가 범위와 해석">
        <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded bg-[#f3f6fa] p-3"><b className="block text-lg text-[#0b3155]">{AGENT_BENCHMARK.scope.scenarioGroups}</b><span className="text-[10px] text-mute">합성 그룹</span></div><div className="rounded bg-[#f3f6fa] p-3"><b className="block text-lg text-[#0b3155]">{AGENT_BENCHMARK.scope.costItems}</b><span className="text-[10px] text-mute">합성 비용 레코드</span></div><div className="rounded bg-[#f3f6fa] p-3"><b className="block text-lg text-[#0b3155]">{AGENT_BENCHMARK.scope.controlledAnomalies}</b><span className="text-[10px] text-mute">삽입 통제오류</span></div></div>
        <p className="mt-4 text-[11px] leading-6 text-mute"><b className="text-ink">모델:</b> {AGENT_BENCHMARK.model}</p><ul className="mt-3 space-y-2 text-[10px] leading-5 text-mute">{AGENT_BENCHMARK.limitations.map((x) => <li key={x}>• {x}</li>)}</ul>
      </Panel>
    </div>
  </div>
}

function GraphNode({ icon: Icon, kicker, title, body, primary, warn }: { icon: typeof FileText; kicker: string; title: string; body: string; primary?: boolean; warn?: boolean }) {
  return <div className={cn('rounded-xl border p-4', primary ? 'border-sky-400 bg-sky-50' : warn ? 'border-amber-300 bg-amber-50' : 'border-line bg-white')}><div className="flex items-center gap-2"><Icon size={15} className={primary ? 'text-sky-700' : warn ? 'text-amber-700' : 'text-mute'} /><span className="text-[9px] font-semibold tracking-[.12em] text-mute">{kicker}</span></div><b className="mt-3 block text-[12px]">{title}</b><p className="mt-1 text-[10px] leading-5 text-mute">{body}</p></div>
}

export function Verification({ events, forecast }: { events: PortEvent[]; forecast: number }) {
  const activeImpact = events.filter((e) => e.enabled).reduce((s, e) => s + e.costImpact, 0)
  const checks = [
    ['PDA 합계', COST_ITEMS.reduce((s, c) => s + c.pdaAmount, 0) === PORT_CALL.pdaTotal, '비용항목 합계와 PDA 총액 비교'],
    ['Cost Twin 합계', forecast === PORT_CALL.pdaTotal + activeImpact, '활성 사건 증감액과 예상 FDA 비교'],
    ['근거 없는 자동확정 차단', COST_ITEMS.filter((c) => c.evidenceIds.length === 0).every((c) => c.status !== 'matched'), '증빙 없는 항목의 일치 판정 금지'],
    ['Demo Rule 출처', RULES.every((r) => r.ruleType === 'demo_rule'), '운영 요율로 오인하지 않도록 규칙 유형 표시'],
    ['사람 확인 항목', ISSUES.some((i) => !i.resolved), '미확인 항목이 검토 큐에 남는지 확인'],
  ] as const
  const passed = checks.filter((c) => c[1]).length
  return <div className="space-y-4"><div className="rounded border border-sky-200 bg-sky-50 px-4 py-3 text-[12px] leading-relaxed text-sky-950"><b>Quality Control:</b> PC-2609의 계산·상태 통제와 공개요율 규칙의 출처·조건을 확인합니다. 현재 환경은 가상 문서(Synthetic Document)를 사용합니다.</div><div className="grid gap-3 md:grid-cols-3"><Kpi label="Port Call" value="1건" hint="PC-2609" /><Kpi label="자동 통제" value={`${passed}/${checks.length}`} hint="현재 실행 결과" tone={passed === checks.length ? 'ok' : 'bad'} /><Kpi label="자동 지급" value="비활성" hint="권한자 승인 필요" tone="ok" /></div><Panel title="자동 통제 결과" padded={false}><table className="erp-table"><thead><tr><th>No.</th><th>검사</th><th>내용</th><th>결과</th></tr></thead><tbody>{checks.map((c, i) => <tr key={c[0]}><td><RowNo n={i + 1} /></td><td><b>{c[0]}</b></td><td className="text-[12px] text-mute">{c[2]}</td><td className={c[1] ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>{c[1] ? '통과' : '실패'}</td></tr>)}</tbody></table></Panel>
    <Panel title="공개요율 규칙화 확인" right={<a className="text-[11px] font-semibold text-sky-700" href="https://busan.mof.go.kr/ko/board.do?bbsIdx=130847&menuIdx=4468" target="_blank" rel="noreferrer">공식 공지 열기</a>}>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]"><div><div className="grid gap-3 md:grid-cols-4">{[['공개자료', '공식 공지 연결'], ['적용대상', '원문 대조'], ['시행일', '버전 관리'], ['할증조건', '중복조건 확인']].map(([label, value], i) => <div key={label} className={cn('rounded-lg border p-4', i === 3 ? 'border-sky-300 bg-sky-50' : 'border-line')}><span className="text-[10px] text-mute">{label}</span><b className="mt-2 block text-[12px]">{value}</b></div>)}</div><p className="mt-4 rounded bg-[#f7fafc] p-3 text-[11px] leading-6">적용대상·시행일·할증조건을 원문 조항과 연결한 뒤에만 계산 규칙을 활성화합니다. 원문 검증이 끝나지 않은 산식과 금액은 제시하지 않습니다.</p></div><div className="rounded-lg border border-line p-4 text-[11px] leading-6 text-mute"><b className="block text-[12px] text-ink">검증 순서</b><ol className="mt-2 space-y-1"><li>1. 공식 문서와 시행일 확인</li><li>2. 적용대상·단위·구간 구조화</li><li>3. 할증 적용범위와 중복조건 대조</li><li>4. 입력조건·계산결과·원문 근거 동시 표시</li></ol><p className="mt-3 border-t border-line pt-3">이 화면은 실제 기업 청구액을 산출하는 기능이 아니라, 출처가 확인된 요율을 코드화하고 검산하는 통제 절차를 보여 줍니다.</p></div></div>
    </Panel>
    <Panel title="현장 검증 Backlog"><div className="grid gap-3 md:grid-cols-3">{[['실제 문서 추출', '실제 PDA·FDA·인보이스 · 필드별 Precision·Recall·F1'], ['실제 증빙 연결', '기항별 원문 세트 · Top-1 연결 정확도와 AI 수정률'], ['업무 효과', '동일 과업 A/B · 완료시간·질의 왕복·누락 탐지율']].map(([a, b]) => <div key={a} className="rounded border border-dashed border-line p-4"><b className="text-[12px]">{a}</b><p className="mt-1 text-[11px] text-mute">{b}</p><span className="mt-3 inline-block rounded bg-[#eef2f6] px-2 py-1 text-[10px] text-mute">POC PLANNED · 실제자료 미확보</span></div>)}</div></Panel></div>
}


