import { useState } from 'react'
import { ArrowLeft, ArrowRight, Calculator, CheckCircle2, FileCheck2, FileText, GitBranch, SearchCheck, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const steps = [
  { title: 'Port Call Change', short: '일정·작업·서비스 변화', icon: FileText },
  { title: 'Cost Impact', short: 'AI 영향항목·예외 분석', icon: FileCheck2 },
  { title: 'Rule Check', short: '사건·증빙·요율조건', icon: GitBranch },
  { title: 'Revised PDA', short: '수정 예상액·Next Action', icon: Calculator },
  { title: 'Evidence Assurance', short: 'Actual Cost·담당자 검토', icon: SearchCheck },
]

const won = (n: number) => `${(n / 10_000).toLocaleString('ko-KR')}만원`

export function ProcessDemo() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const CurrentIcon = steps[step].icon

  return <div className="min-h-screen bg-[#f3f6fa] text-[#182438]">
    <header className="sticky top-0 z-30 border-b border-[#dfe6ef] bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5"><button className="flex items-center gap-2 text-[13px] font-semibold" onClick={() => nav('/')}><ArrowLeft size={16} />PACE</button><div className="text-center"><b className="block text-[14px]">Port Call Cost Intelligence</b><span className="text-[11px] text-[#728096]">PC-2609 · 담당 DA-021 · SYNTHETIC DEMO</span></div><button className="rounded-md bg-[#173f73] px-4 py-2 text-[12px] font-semibold text-white" onClick={() => nav('/app/documents')}>가상 문서 열기 <ArrowRight className="ml-1 inline" size={14} /></button></div></header>

    <main className="mx-auto max-w-[1280px] px-5 py-9">
      <section className="rounded-2xl bg-[#0b3155] px-8 py-8 text-white"><p className="text-[11px] font-semibold tracking-[.16em] text-sky-200">PORT CALL COST INTELLIGENCE</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">기항 변화 이후의 비용 영향 판단과 검토 업무를 AX로 연결합니다.</h1><p className="mt-4 max-w-4xl text-[14px] leading-7 text-white/75">Port Call Change → Cost Impact → Rule Check → Revised PDA → Next Action → Actual Cost → Evidence Assurance</p></section>

      <nav className="mt-5 grid gap-2 md:grid-cols-5" aria-label="PACE 업무 단계">{steps.map((item, i) => { const Icon = item.icon; return <button key={item.title} onClick={() => setStep(i)} className={`rounded-xl border p-4 text-left transition ${step === i ? 'border-[#6f98d8] bg-[#edf3ff] shadow-sm' : 'border-[#dfe6ef] bg-white hover:bg-[#f9fbfd]'}`}><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-[#2f62c0]">0{i + 1}</span><Icon size={16} className={step === i ? 'text-[#2f62c0]' : 'text-[#8995a5]'} /></div><b className="mt-3 block text-[13px]">{item.title}</b><small className="mt-1 block text-[10px] text-[#718096]">{item.short}</small></button> })}</nav>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
        <article className="min-h-[460px] rounded-xl border border-[#dfe6ef] bg-white p-7">
          <div className="flex items-start justify-between border-b border-[#e7edf4] pb-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf3ff] text-[#2f62c0]"><CurrentIcon size={20} /></span><div><span className="text-[10px] font-bold tracking-[.12em] text-[#2f62c0]">WORK QUEUE 0{step + 1}</span><h2 className="mt-1 text-xl font-semibold">{steps[step].title}</h2></div></div><span className="rounded bg-[#f1f4f8] px-2 py-1 text-[10px] text-[#718096]">PC-2609 · SYNTHETIC DEMO</span></div>
          <div className="pt-6"><StepContent step={step} /></div>
          <div className="mt-7 flex justify-between border-t border-[#e7edf4] pt-5"><button disabled={step === 0} onClick={() => setStep((v) => Math.max(0, v - 1))} className="rounded-md border border-[#d7dfe9] px-4 py-2 text-[12px] disabled:opacity-35">이전</button><button onClick={() => step === steps.length - 1 ? nav('/app/documents') : setStep((v) => Math.min(steps.length - 1, v + 1))} className="rounded-md bg-[#173f73] px-4 py-2 text-[12px] font-semibold text-white">{step === steps.length - 1 ? '워크스페이스에서 직접 보기' : '다음 단계'} <ArrowRight className="ml-1 inline" size={14} /></button></div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-xl border border-[#dfe6ef] bg-white p-5"><h3 className="text-[14px] font-semibold">이 단계의 사람 역할</h3><p className="mt-3 text-[12px] leading-6 text-[#607086]">{['대리점 담당자가 한 기항에 속한 문서를 확인합니다.','AI가 제안한 필드와 낮은 확신도 값을 대리점 담당자가 보정합니다.','연결되지 않은 증빙·작업·규칙을 대리점이 보완합니다.','일정 변화가 실제 작업조건으로 이어졌는지 확인한 뒤 예상비용 반영 여부를 결정합니다.','선사 담당자가 차이 사유와 근거를 확인하고 최종 판단합니다.'][step]}</p></div>
          <div className="rounded-xl border border-[#dfe6ef] bg-white p-5"><h3 className="text-[14px] font-semibold">자동화 경계</h3><ul className="mt-3 space-y-2 text-[11px] leading-5 text-[#607086]"><li className="flex gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />AI는 후보와 근거를 제시합니다.</li><li className="flex gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />계산은 등록된 규칙만 사용합니다.</li><li className="flex gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />계약·지급·확정은 사람이 결정합니다.</li></ul></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-[11px] leading-5 text-slate-700"><b>Agent Workflow</b><br />Observe → Reason → Check → Recommend → Verify</div>
        </aside>
      </section>
    </main>
  </div>
}

function StepContent({ step }: { step: number }) {
  if (step === 0) return <div><p className="text-[13px] leading-6 text-[#607086]">기존 시스템의 일정·작업·서비스 변경과 PDA, 인보이스, SOF, FDA를 하나의 기항에 연결합니다.</p><div className="mt-5 grid gap-3 md:grid-cols-3">{[['PDA','PDA-BUS-PC2609-01.pdf','26개 필드'],['INVOICE','INV-STEV-260919-12.pdf','15개 필드'],['SOF','SOF-BUS-PC2609-001.pdf','10개 필드']].map(([type,file,meta]) => <div key={file} className="rounded-lg border border-[#dfe6ef] p-4"><FileText size={18} className="text-[#2f62c0]" /><span className="mt-4 block text-[9px] font-bold tracking-[.1em] text-[#718096]">{type}</span><b className="mt-1 block truncate font-mono text-[12px]">{file}</b><small className="mt-2 block text-[#718096]">{meta} · PC-2609</small></div>)}</div></div>
  if (step === 1) return <div><p className="text-[13px] leading-6 text-[#607086]">AI Cost Review Agent가 비용표현을 표준항목 후보로 연결하고, 같은 기항의 증빙 후보와 담당자가 확인할 예외를 제안합니다.</p><div className="mt-5 overflow-hidden rounded-lg border border-[#dfe6ef]"><table className="w-full text-left text-[12px]"><thead className="bg-[#f6f8fb] text-[#718096]"><tr><th className="p-3">Agent 단계</th><th className="p-3">입력 또는 결과</th><th className="p-3">근거</th><th className="p-3">상태</th></tr></thead><tbody>{[['비용 의미 매핑','Tug attendance → TOWAGE','도메인 사전 + TF-IDF','후보'],['증빙 연결','INV-TUG-260918-07.pdf','PC-2609 · 공급자 문서','연결'],['예외 탐지','예선 1회 추가','SOF 작업기록','설명된 차이'],['다음 행동','계약요율 버전 확인','Demo Rule DR-2026.1','사람 확인']].map((r) => <tr key={r[0]} className="border-t border-[#e7edf4]"><td className="p-3 font-semibold">{r[0]}</td><td className="p-3">{r[1]}</td><td className="p-3 text-[#718096]">{r[2]}</td><td className={`p-3 ${r[3] === '사람 확인' ? 'text-amber-700' : 'text-emerald-700'}`}>{r[3]}</td></tr>)}</tbody></table></div><p className="mt-4 text-[11px] text-[#718096]">Synthetic Benchmark v1: 비용항목 매핑 91.7% · 증빙 연결 85.5% · 예외 탐지 F1 94.7% · 합성 데이터 기반</p></div>
  if (step === 2) return <div><p className="text-[13px] leading-6 text-[#607086]">하역 작업비 한 줄을 실제 사건, 작업기록, 청구서와 적용 규칙 후보에 연결합니다.</p><div className="mt-8 flex flex-wrap items-center justify-center gap-3">{['작업 연장 사건','하역 서비스','하역 작업비','청구서','작업기록','요율 규칙'].map((x,i) => <div key={x} className={`rounded-lg border px-4 py-4 text-center text-[12px] ${i === 2 ? 'border-[#6f98d8] bg-[#edf3ff] font-semibold text-[#2457ac]' : i === 5 ? 'border-amber-300 bg-amber-50' : 'border-[#dfe6ef] bg-white'}`}>{x}{i === 5 && <small className="mt-1 block text-amber-700">조건 확인</small>}</div>)}</div><p className="mt-7 rounded-lg bg-[#f7f9fc] p-4 text-center text-[12px] text-[#607086]">관계가 없으면 값을 추정하지 않고 ‘증빙 부족’ 또는 ‘확인 필요’로 남깁니다.</p></div>
  if (step === 3) return <div><p className="text-[13px] leading-6 text-[#607086]">일정 변경 자체는 비용으로 확정하지 않습니다. 영향을 받을 수 있는 항목을 먼저 찾고 실제 작업기록과 적용 규칙이 확인된 항목만 예상비용에 반영합니다.</p><div className="mt-5 grid gap-3 md:grid-cols-3"><Amount label="최초 PDA" value={48_200_000} /><Amount label="확인 후 반영" value={5_400_000} plus /><Amount label="수정 예상액" value={53_600_000} strong /></div><div className="mt-4 space-y-2">{[['ETD 변경 → 토요일 작업 후보','미반영','실제 작업시간 확인 전'],['토요일 실제 작업 확인','+360만원','SOF·Demo Rule 연결'],['예선 1회 추가 확인','+180만원','공급자 인보이스·SOF 연결']].map((r) => <div key={r[0]} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-[#dfe6ef] p-4"><div><b className="text-[12px]">{r[0]}</b><small className="mt-1 block text-[#718096]">{r[2]}</small></div><strong className={`font-mono text-[13px] ${r[1] === '미반영' ? 'text-amber-700' : 'text-[#2f62c0]'}`}>{r[1]}</strong></div>)}</div></div>
  return <div><p className="text-[13px] leading-6 text-[#607086]">대리점이 근거를 정리하고 선사 담당자가 차이 사유와 미확인 항목을 검토합니다.</p><div className="mt-5 grid gap-3 md:grid-cols-3">{[['설명된 차이','예선료 +180만원','문서·사건 연결 완료','sky'],['확인 필요','하역비 +360만원','작업 승인근거 요청','amber'],['증빙 부족','대리점 수수료','계약·승인자료 요청','orange']].map(([status,item,action,tone]) => <div key={status} className="rounded-lg border border-[#dfe6ef] p-4"><span className={`rounded px-2 py-1 text-[10px] font-semibold ${tone === 'sky' ? 'bg-sky-50 text-sky-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-orange-50 text-orange-700'}`}>{status}</span><b className="mt-4 block text-[13px]">{item}</b><p className="mt-2 text-[11px] text-[#718096]">{action}</p></div>)}</div><div className="mt-5 flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-[12px] text-emerald-800"><CheckCircle2 size={18} />최종 정산·지급 판단은 선사 권한자가 수행하고 판단 근거와 수정이력을 남깁니다.</div></div>
}

function Amount({ label, value, plus, strong }: { label: string; value: number; plus?: boolean; strong?: boolean }) {
  return <div className={`rounded-lg border p-5 ${strong ? 'border-[#6f98d8] bg-[#edf3ff]' : 'border-[#dfe6ef]'}`}><span className="text-[11px] text-[#718096]">{label}</span><strong className={`mt-2 block font-mono text-xl ${strong ? 'text-[#2457ac]' : ''}`}>{plus ? '+' : ''}{won(value)}</strong></div>
}

