import { useState, type ReactNode } from 'react'
import { Star } from 'lucide-react'
import { MAIL_A } from '../seed'
import { SeaBrandLogo } from './SeaLogo'

const FLOW_STAGES = [
  {
    id: 'ingest',
    no: '01',
    label: '수신',
    title: '스케줄 메일·엑셀이 한 수신함에 모입니다',
    desc: '기항 변경 메일·엑셀·PDF를 수신현황에서 처리합니다.',
    chrome: { module: '스케줄', tab: '수신현황', page: '수신현황' },
    to: '/app/inbox',
  },
  {
    id: 'extract',
    no: '02',
    label: '추출',
    title: '원문에서 운항 필드를 올립니다',
    desc: '선박·항차·ETA·선석을 전표 필드로 붙입니다. 값이 나온 구간은 원문에 표시됩니다.',
    chrome: { module: '예외', tab: '예외현황', page: '예외 전표' },
    to: '/app/exceptions',
  },
  {
    id: 'diff',
    no: '03',
    label: '비교',
    title: '직전 확정본과 다른 값만 올립니다',
    desc: '같은 변경이 다시 오면 새 전표를 만들지 않습니다.',
    chrome: { module: '예외', tab: '예외현황', page: '예외 전표' },
    to: '/app/exceptions',
  },
  {
    id: 'impact',
    no: '04',
    label: '확인',
    title: '확인할 일을 체크리스트로 만듭니다',
    desc: '접안·연결 항차·내륙을 확인 항목으로 올립니다. Cut-off는 원문에 있을 때만 유지합니다.',
    chrome: { module: '예외', tab: '예외현황', page: '예외 전표' },
    to: '/app/exceptions',
  },
  {
    id: 'hitl',
    no: '05',
    label: '승인',
    title: '화주·내륙 초안을 수정·승인합니다',
    desc: '담당자가 문장을 고치고 승인한 뒤 발송합니다.',
    chrome: { module: '통보', tab: '통보현황', page: '통보현황' },
    to: '/app/approvals',
  },
] as const

function StageBody({ id }: { id: (typeof FLOW_STAGES)[number]['id'] }) {
  if (id === 'ingest') {
    return (
      <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap bg-[#f7f8fa] p-3 font-mono text-[11px] leading-relaxed text-ink">
        {MAIL_A}
      </pre>
    )
  }
  if (id === 'extract') {
    return (
      <table className="w-full text-left font-mono text-[12px]">
        <tbody>
          {[
            ['VESSEL', 'MV HANARO'],
            ['VOYAGE', '2508W'],
            ['UN/LOCODE', 'KRPUS'],
            ['ETA', '2026-09-12 12:00 LT'],
            ['BERTH', 'T3'],
            ['CUT-OFF', '2026-09-11 18:00'],
          ].map(([k, v]) => (
            <tr key={k} className="border-b border-line">
              <td className="py-1.5 text-mute">{k}</td>
              <td className="py-1.5">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  if (id === 'diff') {
    return (
      <table className="w-full text-left font-mono text-[12px]">
        <thead className="text-[11px] text-mute">
          <tr>
            <th className="py-1 font-medium">항목</th>
            <th className="font-medium">이전</th>
            <th className="font-medium">변경</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line">
            <td className="py-1.5">ETA</td>
            <td className="text-mute line-through">06:00 LT</td>
            <td className="font-semibold text-[#1130c6]">12:00 LT (+6h)</td>
          </tr>
          <tr className="border-b border-line">
            <td className="py-1.5">BERTH</td>
            <td className="text-mute line-through">T2</td>
            <td className="font-semibold text-[#1130c6]">T3</td>
          </tr>
          <tr>
            <td className="py-1.5">CUT-OFF</td>
            <td colSpan={2} className="text-ok">
              원문 유지 · 변경 없음
            </td>
          </tr>
        </tbody>
      </table>
    )
  }
  if (id === 'impact') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ['접안', '확인 필요', 'T2 → T3'],
          ['연결 항차', '확인 필요', 'EASTERN WIND 2510E'],
          ['CY Cut-off', '갱신 없음', '원문에 변경 없음'],
          ['내륙', '확인 필요', 'T3 게이트'],
        ].map(([a, s, d]) => (
          <div key={a} className="border border-line bg-[#f7f8fa] p-3">
            <div className="text-[12px] text-mute">{a}</div>
            <div className="mt-0.5 text-[13px] font-semibold">{s}</div>
            <div className="mt-0.5 font-mono text-[11px] text-mute">{d}</div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-2 text-[12px]">
      {['화주 통보 초안', '내륙 배차 초안', '내부 운항 메모'].map((t) => (
        <div key={t} className="flex items-center justify-between border border-line bg-[#f7f8fa] px-3 py-2">
          <span>{t}</span>
          <span className="font-mono text-[11px] text-warn">미발송</span>
        </div>
      ))}
      <p className="text-mute">승인 후 발송</p>
    </div>
  )
}

function WorkspaceChrome({
  stage,
  children,
}: {
  stage: (typeof FLOW_STAGES)[number]
  children: ReactNode
}) {
  const modules = ['즐겨찾기', '현황', '스케줄', '예외', '통보', '기준정보']
  return (
    <div className="overflow-hidden bg-white">
      <div className="flex h-11 items-center overflow-x-auto border-b border-line px-2">
        <span className="flex w-[120px] shrink-0 items-center px-1">
          <SeaBrandLogo className="h-7" />
        </span>
        {modules.map((m) => (
          <span
            key={m}
            className={
              m === stage.chrome.module
                ? 'mx-0.5 shrink-0 rounded-full bg-[#eceaf6] px-2.5 py-1 text-[12px] font-semibold'
                : 'shrink-0 px-2.5 py-1 text-[12px] text-mute'
            }
          >
            {m}
          </span>
        ))}
      </div>
      <div className="flex h-8 items-center gap-4 border-b border-line pl-[128px] text-[13px]">
        <span className="border-b-2 border-[#2f62c0] pb-1 font-semibold text-[#2f62c0]">{stage.chrome.tab}</span>
      </div>
      <div className="flex h-9 items-center gap-2 border-b border-line px-3">
        <Star size={13} className="fill-amber-400 text-amber-400" />
        <span className="text-[13px] font-semibold">{stage.chrome.page}</span>
        <span className="rounded-full bg-[#2f62c0] px-2 py-0.5 text-[11px] font-semibold text-white">전체</span>
      </div>
      <div className="bg-[#eef2f6] p-3">
        <div className="mb-2 text-[13px] font-semibold">{stage.title}</div>
        {children}
      </div>
    </div>
  )
}

export function ProductFlow() {
  const [step, setStep] = useState(0)
  const current = FLOW_STAGES[step]

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-8 border-b border-[#e5e7eb]">
        {FLOW_STAGES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(i)}
            className={
              i === step
                ? 'border-b-2 border-[#1130c6] pb-3 text-[17px] font-semibold text-[#1130c6]'
                : 'pb-3 text-[17px] text-[#667085] hover:text-[#111]'
            }
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-[16px] leading-relaxed text-[#555]">{current.desc}</p>
      <div className="landing-media mt-10 overflow-hidden border border-[#e6e8ec] bg-white">
        <WorkspaceChrome stage={current}>
          <StageBody id={current.id} />
        </WorkspaceChrome>
      </div>
    </div>
  )
}
