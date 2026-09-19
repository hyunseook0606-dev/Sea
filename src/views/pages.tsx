import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Pin } from 'lucide-react'
import {
  CHANNEL_LABEL,
  CountHint,
  DocNo,
  EmptyHint,
  InquiryBar,
  InquiryField,
  Panel,
  PriorityPill,
  RowNo,
  StatusPill,
  TableHead,
  labelOf,
} from '../components/ui'
import { readExtractorMode, writeExtractorMode, type ExtractorId } from '../extractor'
import { useSeaStore } from '../store'
import { BASIS_LABEL, RULE_MASTER } from '../engine'

const ROLE: Record<string, string> = {
  ops: '운항',
  approver: '승인자',
  admin: '관리',
}

export function VoyagesPage() {
  const nav = useNavigate()
  const voyages = useSeaStore((s) => s.voyages)
  const confirmed = useSeaStore((s) => s.confirmed)
  const addVoyage = useSeaStore((s) => s.addVoyage)
  const blank = { vessel: '', voyage: '', port: '' }
  const [draft, setDraft] = useState(blank)
  const [applied, setApplied] = useState(blank)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ vessel: '', voyage: '', service: '', port: 'BUSAN', terminal: 'PNC', berth: '', eta: '', etd: '', etb: '', cutoff: '' })
  const [notice, setNotice] = useState<string | null>(null)
  const rows = voyages.filter((v) => {
    if (applied.vessel && !v.vessel.includes(applied.vessel)) return false
    if (applied.voyage && !v.voyage.includes(applied.voyage)) return false
    if (applied.port && !`${v.port} ${v.terminal}`.includes(applied.port)) return false
    return true
  })
  return (
    <div>
      <InquiryBar
        onInquiry={() => setApplied(draft)}
        onReset={() => {
          setDraft(blank)
          setApplied(blank)
        }}
      >
        <InquiryField label="선박">
          <input className="erp-input w-36" value={draft.vessel} onChange={(e) => setDraft((d) => ({ ...d, vessel: e.target.value }))} />
        </InquiryField>
        <InquiryField label="항차">
          <input className="erp-input w-28" value={draft.voyage} onChange={(e) => setDraft((d) => ({ ...d, voyage: e.target.value }))} />
        </InquiryField>
        <InquiryField label="항구 / 터미널">
          <input className="erp-input w-36" value={draft.port} onChange={(e) => setDraft((d) => ({ ...d, port: e.target.value }))} />
        </InquiryField>
      </InquiryBar>
      {notice ? <p className="mb-2 text-[12px] text-mute">{notice}</p> : null}
      {open ? (
        <Panel title="항차 등록" className="mb-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {(['vessel', 'voyage', 'service', 'port', 'terminal', 'berth', 'eta', 'etd', 'etb', 'cutoff'] as const).map((k) => (
              <InquiryField key={k} label={k}>
                <input className="erp-input w-full" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
              </InquiryField>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="btn-primary py-1"
              onClick={() => {
                const r = addVoyage(form)
                setNotice(r.ok ? `등록 ${r.id}` : r.reason || '등록 불가')
                if (r.ok) setOpen(false)
              }}
            >
              저장
            </button>
            <button className="btn-ghost py-1" onClick={() => setOpen(false)}>
              닫기
            </button>
          </div>
        </Panel>
      ) : (
        <button className="btn-ghost mb-3 py-1" onClick={() => setOpen(true)}>
          항차 등록
        </button>
      )}
      <Panel title="항차" padded={false} right={<CountHint n={rows.length} />}>
        {rows.length === 0 ? (
          <EmptyHint>조회 조건에 맞는 항차가 없습니다.</EmptyHint>
        ) : (
          <table className="erp-table">
            <TableHead>
              <tr>
                <th>No.</th>
                <th>선박</th>
                <th>항차</th>
                <th>항로</th>
                <th>항구 / 터미널</th>
                <th>연결 항차</th>
                <th>확정 ETA</th>
                <th>체류</th>
                <th>상태</th>
              </tr>
            </TableHead>
            <tbody>
              {rows.map((v, i) => {
                const next = v.connectingVoyageId ? voyages.find((x) => x.id === v.connectingVoyageId) : undefined
                const sch = confirmed[v.id]
                return (
                  <tr key={v.id} className="cursor-pointer" onClick={() => nav(`/app/voyages/${v.id}`)}>
                    <td>
                      <RowNo n={i + 1} />
                    </td>
                    <td>{v.vessel}</td>
                    <td className="font-mono text-[12px]">{v.voyage}</td>
                    <td>{v.service}</td>
                    <td>
                      {v.port} / {v.terminal}
                    </td>
                    <td>{next ? `${next.vessel} ${next.voyage}` : '—'}</td>
                    <td className="font-mono text-[12px]">{sch?.eta}</td>
                    <td className="font-mono text-[12px]">{sch ? hoursBetweenLabel(sch.eta, sch.etd) : '—'}</td>
                    <td>
                      <StatusPill value={v.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}

function hoursBetweenLabel(a?: string, b?: string) {
  if (!a || !b) return '—'
  const ta = Date.parse(a.replace(' LT', '').replace(' ', 'T'))
  const tb = Date.parse(b.replace(' LT', '').replace(' ', 'T'))
  if (Number.isNaN(ta) || Number.isNaN(tb)) return '—'
  const h = Math.round(((tb - ta) / 36e5) * 10) / 10
  return `${h}h`
}

export function ExceptionsList() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const exceptions = useSeaStore((s) => s.exceptions)
  const voyages = useSeaStore((s) => s.voyages)
  const view = params.get('view') || 'all'
  const blank = { view, q: '', priority: 'all' }
  const [draft, setDraft] = useState(blank)
  const [applied, setApplied] = useState(blank)

  useEffect(() => {
    setDraft((d) => ({ ...d, view }))
    setApplied((a) => ({ ...a, view }))
  }, [view])

  const rows = exceptions
    .filter((e) => {
      if (applied.view === 'open' && !['open', 'review_required', 'awaiting_approval', 'partially_approved'].includes(e.status)) return false
      if (applied.view === 'blocked' && e.status !== 'blocked') return false
      if (applied.view === 'pending' && e.status !== 'awaiting_approval' && e.status !== 'partially_approved') return false
      if (applied.view === 'unmatched' && (e.status !== 'review_required' || Boolean(e.voyageId))) return false
      if (applied.priority !== 'all' && e.priority !== applied.priority) return false
      const v = voyages.find((x) => x.id === e.voyageId)
      const q = applied.q.trim()
      if (q && !`${e.id} ${e.summary} ${v?.vessel || ''} ${v?.voyage || ''}`.includes(q)) return false
      return true
    })
    .slice()
    .sort((a, b) => (a.reviewRank ?? 9) - (b.reviewRank ?? 9) || b.createdAt.localeCompare(a.createdAt))
  return (
    <div>
      <InquiryBar
        onInquiry={() => setApplied(draft)}
        onReset={() => {
          const next = { view: 'all', q: '', priority: 'all' }
          setDraft(next)
          setApplied(next)
        }}
      >
        <InquiryField label="상태">
          <select className="erp-input" value={draft.view} onChange={(e) => setDraft((d) => ({ ...d, view: e.target.value }))}>
            <option value="all">전체</option>
            <option value="open">진행</option>
            <option value="blocked">차단</option>
            <option value="pending">승인대기</option>
            <option value="unmatched">미매칭</option>
          </select>
        </InquiryField>
        <InquiryField label="우선순위">
          <select className="erp-input" value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>
            <option value="all">전체</option>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
        </InquiryField>
        <InquiryField label="예외번호 / 항차">
          <input className="erp-input w-48" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} placeholder="검색어" />
        </InquiryField>
      </InquiryBar>
      <Panel title="예외현황" padded={false} right={<CountHint n={rows.length} />}>
        {rows.length === 0 ? (
          <EmptyHint
            action={
              <button className="btn-primary" onClick={() => nav('/app/inbox')}>
                수신현황으로
              </button>
            }
          >
            조회 조건에 맞는 예외가 없습니다.
          </EmptyHint>
        ) : (
          <table className="erp-table">
            <TableHead>
              <tr>
                <th>No.</th>
                <th>예외번호</th>
                <th>항차</th>
                <th>기항</th>
                <th>우선</th>
                <th>여유</th>
                <th>상태</th>
                <th>요약</th>
              </tr>
            </TableHead>
            <tbody>
              {rows.map((e, i) => {
                const v = voyages.find((x) => x.id === e.voyageId)
                return (
                  <tr key={e.id} className="cursor-pointer" onClick={() => nav(`/app/exceptions/${e.id}`)}>
                    <td>
                      <RowNo n={i + 1} />
                    </td>
                    <td>
                      <DocNo onOpen={() => nav(`/app/exceptions/${e.id}`)}>{e.id}</DocNo>
                    </td>
                    <td>
                      {v?.vessel} {v?.voyage}
                    </td>
                    <td>
                      {v?.port} {v?.terminal}
                    </td>
                    <td>
                      <PriorityPill value={e.priority} />
                    </td>
                    <td className="font-mono text-[12px]">{e.reviewHeadline || '—'}</td>
                    <td>
                      <StatusPill value={e.status} />
                    </td>
                    <td className="max-w-md truncate">{e.summary}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}

export function ApprovalsPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const drafts = useSeaStore((s) => s.drafts)
  const approve = useSeaStore((s) => s.approveDraft)
  const view = params.get('view') || 'all'
  const blank = { view, channel: 'all', q: '' }
  const [draft, setDraft] = useState(blank)
  const [applied, setApplied] = useState(blank)

  useEffect(() => {
    setDraft((d) => ({ ...d, view }))
    setApplied((a) => ({ ...a, view }))
  }, [view])

  const rows = drafts.filter((d) => {
    if (applied.view === 'draft' && d.status !== 'draft' && d.status !== 'edited') return false
    if (applied.view === 'approved' && d.status !== 'approved' && d.status !== 'sent') return false
    if (applied.channel !== 'all' && d.channel !== applied.channel) return false
    const q = applied.q.trim()
    if (q && !`${d.title} ${d.exceptionId}`.includes(q)) return false
    return true
  })
  return (
    <div>
      <InquiryBar
        onInquiry={() => setApplied(draft)}
        onReset={() => {
          const next = { view: 'all', channel: 'all', q: '' }
          setDraft(next)
          setApplied(next)
        }}
      >
        <InquiryField label="채널">
          <select className="erp-input" value={draft.channel} onChange={(e) => setDraft((d) => ({ ...d, channel: e.target.value }))}>
            <option value="all">전체</option>
            <option value="shipper">화주</option>
            <option value="inland">내륙</option>
            <option value="internal">내부</option>
          </select>
        </InquiryField>
        <InquiryField label="상태">
          <select className="erp-input" value={draft.view} onChange={(e) => setDraft((d) => ({ ...d, view: e.target.value }))}>
            <option value="all">전체</option>
            <option value="draft">대기</option>
            <option value="approved">승인됨</option>
          </select>
        </InquiryField>
        <InquiryField label="예외번호 / 제목">
          <input className="erp-input w-48" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} placeholder="검색어" />
        </InquiryField>
      </InquiryBar>
      <Panel title="통보현황" padded={false} right={<CountHint n={rows.length} />}>
        {rows.length === 0 ? (
          <EmptyHint>조회 조건에 맞는 통보 초안이 없습니다.</EmptyHint>
        ) : (
          <table className="erp-table">
            <TableHead>
              <tr>
                <th>No.</th>
                <th>채널</th>
                <th>예외번호</th>
                <th>제목</th>
                <th>상태</th>
                <th />
              </tr>
            </TableHead>
            <tbody>
              {rows.map((d, i) => (
                <tr key={d.id} className="cursor-pointer" onDoubleClick={() => nav(`/app/exceptions/${d.exceptionId}`)}>
                  <td>
                    <RowNo n={i + 1} />
                  </td>
                  <td>{CHANNEL_LABEL[d.channel] || d.channel}</td>
                  <td>
                    <DocNo onOpen={() => nav(`/app/exceptions/${d.exceptionId}`)}>{d.exceptionId}</DocNo>
                  </td>
                  <td className="max-w-sm truncate">{d.title}</td>
                  <td>
                    <StatusPill value={d.status} />
                  </td>
                  <td className="text-right">
                    <button className="btn-ghost py-1" onClick={() => nav(`/app/exceptions/${d.exceptionId}`)}>
                      전표
                    </button>
                    <button
                      className="btn-primary ml-1 py-1"
                      disabled={d.status === 'approved' || d.status === 'sent' || d.status === 'rejected'}
                      onClick={() => approve(d.id)}
                    >
                      승인
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}

export function DataSourcesPage() {
  const sources = useSeaStore((s) => s.dataSources)
  return (
    <div>
      <Panel title="연계" padded={false}>
        <p className="border-b border-line px-3 py-2 text-[12px] text-mute">
          공모본은 원문 텍스트 업로드만 연결됩니다. 메일함·PDF/엑셀 파서·DCSA OVS는 현장 PoC 설계이며 이 화면에서 실제 연동하지 않습니다.
        </p>
        <table className="w-full text-left text-[13px]">
          <TableHead>
            <tr className="border-b border-line">
              <th className="py-2 font-medium">이름</th>
              <th className="font-medium">유형</th>
              <th className="font-medium">상태</th>
              <th className="font-medium">비고</th>
            </tr>
          </TableHead>
          <tbody>
            {sources.map((d) => (
              <tr key={d.id} className="border-b border-line/70">
                <td className="py-2.5">{d.name}</td>
                <td>{d.kind}</td>
                <td>
                  <StatusPill value={d.status} />
                </td>
                <td className="text-mute">{d.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

export function HistoryPage() {
  const nav = useNavigate()
  const exceptions = useSeaStore((s) => s.exceptions)
  const voyages = useSeaStore((s) => s.voyages)
  const drafts = useSeaStore((s) => s.drafts)
  const confirmedHistory = useSeaStore((s) => s.confirmedHistory)
  const pinnedExceptionIds = useSeaStore((s) => s.pinnedExceptionIds)
  const togglePinException = useSeaStore((s) => s.togglePinException)
  const blank = { q: '', status: 'all', pinned: 'all' }
  const [draft, setDraft] = useState(blank)
  const [applied, setApplied] = useState(blank)

  const rows = exceptions
    .filter((e) => {
      if (applied.status !== 'all' && e.status !== applied.status) return false
      if (applied.pinned === 'pinned' && !pinnedExceptionIds.includes(e.id)) return false
      const v = voyages.find((x) => x.id === e.voyageId)
      const q = applied.q.trim()
      if (q && !`${e.id} ${e.summary} ${v?.vessel || ''} ${v?.voyage || ''} ${e.incoming.vessel}`.includes(q)) return false
      return true
    })
    .sort((a, b) => {
      const ap = pinnedExceptionIds.includes(a.id) ? 0 : 1
      const bp = pinnedExceptionIds.includes(b.id) ? 0 : 1
      if (ap !== bp) return ap - bp
      return a.createdAt < b.createdAt ? 1 : -1
    })

  return (
    <div className="space-y-3">
      <InquiryBar
        onInquiry={() => setApplied(draft)}
        onReset={() => {
          setDraft(blank)
          setApplied(blank)
        }}
      >
        <InquiryField label="상태">
          <select className="erp-input" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
            <option value="all">전체</option>
            <option value="sent">발송</option>
            <option value="blocked">차단</option>
            <option value="awaiting_approval">승인대기</option>
            <option value="review_required">확인</option>
          </select>
        </InquiryField>
        <InquiryField label="고정">
          <select className="erp-input" value={draft.pinned} onChange={(e) => setDraft((d) => ({ ...d, pinned: e.target.value }))}>
            <option value="all">전체</option>
            <option value="pinned">고정만</option>
          </select>
        </InquiryField>
        <InquiryField label="예외번호 / 항차">
          <input className="erp-input w-48" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} placeholder="검색어" />
        </InquiryField>
      </InquiryBar>
      <Panel title="처리 이력" padded={false} right={<CountHint n={rows.length} />}>
        {rows.length === 0 ? (
          <EmptyHint>조회 조건에 맞는 이력이 없습니다.</EmptyHint>
        ) : (
          <table className="erp-table">
            <TableHead>
              <tr>
                <th className="w-10" />
                <th>No.</th>
                <th>시각</th>
                <th>예외번호</th>
                <th>항차</th>
                <th>변경</th>
                <th>상태</th>
                <th>화주 문장</th>
              </tr>
            </TableHead>
            <tbody>
              {rows.map((e, i) => {
                const v = voyages.find((x) => x.id === e.voyageId)
                const shipper = drafts.find((d) => d.exceptionId === e.id && d.channel === 'shipper')
                const pinned = pinnedExceptionIds.includes(e.id)
                return (
                  <tr key={e.id} className="cursor-pointer" onClick={() => nav(`/app/exceptions/${e.id}`)}>
                    <td>
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center"
                        title={pinned ? '고정 해제' : '고정'}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          togglePinException(e.id)
                        }}
                      >
                        <Pin size={13} className={pinned ? 'fill-[#2f62c0] text-[#2f62c0]' : 'text-[#c5cad3]'} />
                      </button>
                    </td>
                    <td>
                      <RowNo n={i + 1} />
                    </td>
                    <td className="font-mono text-[12px]">{e.createdAt}</td>
                    <td>
                      <DocNo onOpen={() => nav(`/app/exceptions/${e.id}`)}>{e.id}</DocNo>
                    </td>
                    <td>
                      {v ? `${v.vessel} ${v.voyage}` : e.incoming.vessel || '미매칭'}
                    </td>
                    <td className="max-w-[280px] truncate">{e.summary}</td>
                    <td>
                      <StatusPill value={e.status} />
                    </td>
                    <td className="max-w-[240px] truncate text-[12px] text-mute">{shipper?.body || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>
      <Panel title="확정본 버전" padded={false} right={<CountHint n={confirmedHistory.length} />}>
        {confirmedHistory.length === 0 ? (
          <EmptyHint>확정본 버전이 없습니다.</EmptyHint>
        ) : (
          <table className="erp-table">
            <TableHead>
              <tr>
                <th>시각</th>
                <th>항차</th>
                <th>주체</th>
                <th>내용</th>
                <th>예외번호</th>
              </tr>
            </TableHead>
            <tbody>
              {confirmedHistory.map((ver) => {
                const v = voyages.find((x) => x.id === ver.voyageId)
                return (
                  <tr key={ver.id}>
                    <td className="font-mono text-[12px]">{ver.at}</td>
                    <td>{v ? `${v.vessel} ${v.voyage}` : ver.voyageId}</td>
                    <td>{ver.actor}</td>
                    <td className="text-[12px]">{ver.note}</td>
                    <td>
                      {ver.exceptionId ? (
                        <DocNo onOpen={() => nav(`/app/exceptions/${ver.exceptionId}`)}>{ver.exceptionId}</DocNo>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}

export function AuditPage() {
  const audit = useSeaStore((s) => s.audit)
  const inbox = useSeaStore((s) => s.inbox)
  const exceptions = useSeaStore((s) => s.exceptions)
  const blank = { q: '' }
  const [draft, setDraft] = useState(blank)
  const [applied, setApplied] = useState(blank)
  const rows = audit.filter((a) => {
    const q = applied.q.trim()
    if (q && !`${a.title} ${a.detail} ${a.actor}`.includes(q)) return false
    return true
  })
  const processed = inbox.filter((i) => i.status !== 'queued' && i.status !== 'processing').length
  const sent = exceptions.filter((e) => e.status === 'sent').length
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="border border-line bg-white px-3 py-2 text-[12px] text-mute">
          처리 <span className="ml-1 font-mono text-[16px] font-semibold text-ink">{processed}</span>
        </div>
        <div className="border border-line bg-white px-3 py-2 text-[12px] text-mute">
          예외 <span className="ml-1 font-mono text-[16px] font-semibold text-ink">{exceptions.length}</span>
        </div>
        <div className="border border-line bg-white px-3 py-2 text-[12px] text-mute">
          발송 <span className="ml-1 font-mono text-[16px] font-semibold text-ink">{sent}</span>
        </div>
        <div className="border border-line bg-white px-3 py-2 text-[12px] text-mute">
          기록 <span className="ml-1 font-mono text-[16px] font-semibold text-ink">{audit.length}</span>
        </div>
      </div>
      <InquiryBar onInquiry={() => setApplied(draft)} onReset={() => { setDraft(blank); setApplied(blank) }}>
        <InquiryField label="사건 / 내용">
          <input className="erp-input w-56" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} placeholder="검색어" />
        </InquiryField>
      </InquiryBar>
      <Panel title="운영 기록" padded={false} right={<CountHint n={rows.length} />}>
        {rows.length === 0 ? (
          <EmptyHint>조회 조건에 맞는 기록이 없습니다.</EmptyHint>
        ) : (
        <table className="w-full text-left text-[13px]">
          <TableHead>
            <tr className="border-b border-line">
              <th className="py-2 font-medium">시각</th>
              <th className="font-medium">주체</th>
              <th className="font-medium">구분</th>
              <th className="font-medium">사건</th>
              <th className="font-medium">내용</th>
            </tr>
          </TableHead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-line/70">
                <td className="py-1.5 font-mono text-[12px]">{a.at}</td>
                <td>{a.actor}</td>
                <td>{labelOf(a.kind)}</td>
                <td>{a.title}</td>
                <td className="text-mute">{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Panel>
    </div>
  )
}

export function RulesPage() {
  const policy = useSeaStore((s) => s.policy)
  const setEtaReviewHours = useSeaStore((s) => s.setEtaReviewHours)
  const setMinConnectionHours = useSeaStore((s) => s.setMinConnectionHours)
  const setPolicyFlag = useSeaStore((s) => s.setPolicyFlag)
  return (
    <div className="space-y-3">
      <Panel title="회사 기준 (프로토타입 가상값)" padded={false} right={<CountHint n={5} />}>
        <table className="erp-table">
          <TableHead>
            <tr>
              <th>항목</th>
              <th>값</th>
              <th>출처</th>
            </tr>
          </TableHead>
          <tbody>
            <tr>
              <td>ETA 검토 창</td>
              <td>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="erp-input w-20"
                  value={policy.etaReviewHours}
                  onChange={(e) => setEtaReviewHours(Number(e.target.value))}
                />
                <span className="ml-1 text-mute">시간</span>
              </td>
              <td className="text-mute">회사 기준. DCSA 2026 Blueprint feeder 6h deviation 참고. 산업 표준 아님</td>
            </tr>
            <tr>
              <td>연결 여유 Demo Rule</td>
              <td>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="erp-input w-20"
                  value={policy.minConnectionHours}
                  onChange={(e) => setMinConnectionHours(Number(e.target.value))}
                />
                <span className="ml-1 text-mute">시간</span>
              </td>
              <td className="text-mute">회사 업무 기준. 프로토타입 가상값 24h. 산업 문헌값 아님</td>
            </tr>
            <tr>
              <td>연결 항차 비교</td>
              <td>
                <button type="button" className="btn-ghost py-1" onClick={() => setPolicyFlag('countConnecting', !policy.countConnecting)}>
                  {policy.countConnecting ? '사용' : '미사용'}
                </button>
              </td>
              <td className="text-mute">본선 ETD와 연결 ETD 차이</td>
            </tr>
            <tr>
              <td>접안 ETB 실효</td>
              <td>
                <button type="button" className="btn-ghost py-1" onClick={() => setPolicyFlag('checkEtbStale', !policy.checkEtbStale)}>
                  {policy.checkEtbStale ? '사용' : '미사용'}
                </button>
              </td>
              <td className="text-mute">직전 확정본 ETB와 신규 ETA 비교. ETA ≠ ETB</td>
            </tr>
            <tr>
              <td>부두·터미널 변경</td>
              <td>
                <button type="button" className="btn-ghost py-1" onClick={() => setPolicyFlag('countBerth', !policy.countBerth)}>
                  {policy.countBerth ? '사용' : '미사용'}
                </button>
              </td>
              <td className="text-mute">내륙 게이트 확인. 점수 없음</td>
            </tr>
            <tr>
              <td>미승인 발송</td>
              <td>잠금</td>
              <td className="text-mute">시스템</td>
            </tr>
          </tbody>
        </table>
        <p className="px-3 py-2 text-[12px] text-mute">
          여유시간은 확정본·원문 시각으로 계산합니다. 운영 위험 확률·비용이 아닙니다. 6h/24h는 Demo Rule이며 현장 PoC에서 회사 값으로 바꿉니다.
        </p>
      </Panel>
      <Panel title="검증·금지" padded={false} right={<CountHint n={RULE_MASTER.length} />}>
        <table className="erp-table">
          <TableHead>
            <tr>
              <th>ID</th>
              <th>구분</th>
              <th>규칙</th>
              <th>동작</th>
              <th>근거</th>
            </tr>
          </TableHead>
          <tbody>
            {RULE_MASTER.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-[12px]">{r.id}</td>
                <td>{BASIS_LABEL[r.kind]}</td>
                <td>
                  {r.id === 'R2'
                    ? `ETA 변경 ≥ ${policy.etaReviewHours}시간`
                    : r.id === 'R7'
                      ? `연결 여유 < ${policy.minConnectionHours}시간`
                      : r.title}
                </td>
                <td>{r.action}</td>
                <td className="text-mute">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

export function SettingsPage() {
  const reset = useSeaStore((s) => s.resetWorkspace)
  const operators = useSeaStore((s) => s.operators)
  const [mode, setMode] = useState<ExtractorId>(() => readExtractorMode())
  const setExtractor = (next: ExtractorId) => {
    writeExtractorMode(next)
    setMode(next)
  }
  return (
    <div className="space-y-3">
      <Panel title="시연 회사">
        <ul className="space-y-1 text-[13px]">
          <li>회사명: DEMO LINE (프로토타입 가상)</li>
          <li>부서: 운항팀</li>
          <li>대외 발송: 승인 후 모의 발송</li>
        </ul>
        <button className="btn-ghost mt-3" onClick={() => reset()}>
          워크스페이스 초기화
        </button>
      </Panel>
      <Panel title="추출기">
        <p className="mb-2 text-[12px] text-mute">
          SEA Extractor는 가상 기항문서 span을 학습한 구조화 모델입니다. 생성형 LLM을 학습한 것이 아닙니다. 변경 검증·발송 잠금은 규칙
          엔진이 담당합니다.
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['hybrid', '하이브리드 (권장)'],
              ['sea', 'SEA Extractor'],
              ['rules', '규칙만'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={mode === id ? 'btn-primary py-1' : 'btn-ghost py-1'} onClick={() => setExtractor(id)}>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-mute">
          현재:{' '}
          {mode === 'hybrid' ? 'SEA 우선 · 빈 칸 규칙' : mode === 'sea' ? 'SEA만' : mode === 'llm' ? '외부 LLM (키 없으면 하이브리드)' : '규칙만'}
        </p>
      </Panel>
      <Panel title="구성원">
        {operators.map((o) => (
          <div key={o.id} className="flex justify-between border-b border-line/70 py-2.5 text-[13px]">
            <span>
              {o.name} · {o.id}
            </span>
            <span className="text-mute">{ROLE[o.role] || o.role}</span>
          </div>
        ))}
      </Panel>
    </div>
  )
}

export function FavoritesPage() {
  const nav = useNavigate()
  const favorites = useSeaStore((s) => s.favorites)
  const toggleFavorite = useSeaStore((s) => s.toggleFavorite)
  return (
    <Panel title="자주 쓰는 화면" padded={false} right={<CountHint n={favorites.length} />}>
      {favorites.length === 0 ? (
        <p className="p-4 text-[13px] text-mute">화면 제목 옆 별표를 누르면 자주 쓰는 메뉴가 여기에 모입니다.</p>
      ) : (
        <table className="erp-table">
          <TableHead>
            <tr>
              <th>No.</th>
              <th>화면</th>
              <th />
            </tr>
          </TableHead>
          <tbody>
            {favorites.map((f, i) => (
              <tr key={f.path}>
                <td>
                  <RowNo n={i + 1} />
                </td>
                <td>{f.title}</td>
                <td className="text-right">
                  <button className="btn-primary py-1" onClick={() => nav(f.path)}>
                    열기
                  </button>
                  <button className="btn-ghost ml-1 py-1" onClick={() => toggleFavorite(f)}>
                    해제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}
