import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HitlQueue } from '../components/HitlQueue'
import {
  CountHint,
  DocNo,
  EmptyHint,
  InquiryBar,
  InquiryField,
  Kpi,
  Panel,
  PriorityPill,
  RowNo,
  StatusPill,
  TableHead,
  cn,
} from '../components/ui'
import { useSeaStore } from '../store'

export function CommandCenter() {
  const nav = useNavigate()
  const exceptions = useSeaStore((s) => s.exceptions)
  const inbox = useSeaStore((s) => s.inbox)
  const voyages = useSeaStore((s) => s.voyages)
  const drafts = useSeaStore((s) => s.drafts)
  const processQueued = useSeaStore((s) => s.processQueued)
  const processInbox = useSeaStore((s) => s.processInbox)
  const processing = useSeaStore((s) => s.processingInboxId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const blank = { q: '', status: 'all' }
  const [draft, setDraft] = useState(blank)
  const [applied, setApplied] = useState(blank)

  const open = exceptions.filter((e) => ['open', 'review_required', 'partially_approved', 'awaiting_approval', 'blocked'].includes(e.status))
  const pending = drafts.filter((d) => d.status === 'draft' || d.status === 'edited')
  const blocked = exceptions.filter((e) => e.status === 'blocked')
  const unmatched = exceptions.filter((e) => e.status === 'review_required' && !e.voyageId)
  const high = exceptions.filter((e) => e.priority === 'high' && e.status !== 'sent' && e.status !== 'resolved')
  const queued = inbox.filter((i) => i.status === 'queued')
  const todoN = queued.length + blocked.length + unmatched.length + pending.length
  const selected = exceptions.find((e) => e.id === selectedId) || open[0] || exceptions.find((e) => e.status !== 'sent') || exceptions[0]
  const rows = exceptions.filter((e) => {
    if (applied.status === 'open' && !['open', 'review_required', 'awaiting_approval', 'partially_approved'].includes(e.status)) return false
    if (applied.status === 'blocked' && e.status !== 'blocked') return false
    if (applied.status === 'sent' && e.status !== 'sent') return false
    const v = voyages.find((x) => x.id === e.voyageId)
    const q = applied.q.trim()
    if (q && !`${e.id} ${e.summary} ${v?.vessel || ''} ${v?.voyage || ''} ${e.incoming.vessel}`.includes(q)) return false
    return true
  })

  useEffect(() => {
    if (selectedId && !exceptions.some((e) => e.id === selectedId)) setSelectedId(exceptions[0]?.id ?? null)
  }, [exceptions, selectedId])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="수신 대기" value={queued.length} hint="메일·엑셀·PDF" tone={queued.length ? 'warn' : 'ok'} onOpen={() => nav('/app/inbox?view=queued')} />
        <Kpi label="확인 필요" value={open.length} hint={high.length ? `우선 높음 ${high.length}` : '여유시간 순'} tone={open.length ? 'warn' : 'default'} onOpen={() => nav('/app/exceptions?view=open')} />
        <Kpi label="통보 대기" value={pending.length} hint="화주·내륙 초안" tone={pending.length ? 'info' : 'default'} onOpen={() => nav('/app/approvals?view=draft')} />
        <Kpi label="차단" value={blocked.length} hint="발송 불가" tone={blocked.length ? 'bad' : 'default'} onOpen={() => nav('/app/exceptions?view=blocked')} />
      </div>

      <div className="grid grid-cols-12 gap-3">
        <Panel
          title="오늘 할 일"
          className="col-span-12 xl:col-span-5"
          padded={false}
          right={
            <div className="flex items-center gap-2">
              <CountHint n={todoN} />
              <button className="btn-primary py-1" disabled={Boolean(processing) || queued.length === 0} onClick={() => void processQueued()}>
                {processing ? '처리 중' : queued.length ? `대기 ${queued.length}건 처리` : '대기 없음'}
              </button>
            </div>
          }
        >
          {todoN === 0 ? (
            <EmptyHint>처리할 수신·예외·통보가 없습니다.</EmptyHint>
          ) : (
            <div className="max-h-[360px] overflow-auto">
              <table className="erp-table">
                <TableHead>
                  <tr>
                    <th>구분</th>
                    <th>내용</th>
                    <th>상태</th>
                    <th />
                  </tr>
                </TableHead>
                <tbody>
                  {queued.map((i) => (
                    <tr key={i.id}>
                      <td>수신</td>
                      <td className="max-w-[200px] truncate">{i.subject}</td>
                      <td>
                        <StatusPill value="queued" />
                      </td>
                      <td className="text-right">
                        <button className="btn-primary py-1" disabled={Boolean(processing)} onClick={() => void processInbox(i.id)}>
                          처리
                        </button>
                      </td>
                    </tr>
                  ))}
                  {blocked.map((e) => (
                    <tr key={e.id} className="cursor-pointer" onClick={() => nav(`/app/exceptions/${e.id}`)}>
                      <td>차단</td>
                      <td className="font-mono text-[12px]">{e.id}</td>
                      <td>
                        <StatusPill value="blocked" />
                      </td>
                      <td className="text-right text-[12px] text-[#2f62c0]">전표</td>
                    </tr>
                  ))}
                  {unmatched.map((e) => (
                    <tr key={e.id} className="cursor-pointer" onClick={() => nav(`/app/exceptions/${e.id}`)}>
                      <td>미매칭</td>
                      <td className="truncate">{e.incoming.vessel || e.id}</td>
                      <td>
                        <StatusPill value="review_required" />
                      </td>
                      <td className="text-right text-[12px] text-[#2f62c0]">전표</td>
                    </tr>
                  ))}
                  {pending.map((d) => (
                    <tr key={d.id} className="cursor-pointer" onClick={() => nav(`/app/exceptions/${d.exceptionId}`)}>
                      <td>통보</td>
                      <td className="max-w-[200px] truncate">{d.title}</td>
                      <td>
                        <StatusPill value={d.status} />
                      </td>
                      <td className="text-right text-[12px] text-[#2f62c0]">승인</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="col-span-12 min-h-[360px] xl:col-span-7">
          <HitlQueue exception={selected} />
        </div>
      </div>

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
            <option value="open">진행</option>
            <option value="blocked">차단</option>
            <option value="sent">발송</option>
          </select>
        </InquiryField>
        <InquiryField label="예외번호 / 항차">
          <input className="erp-input w-48" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} placeholder="검색어" />
        </InquiryField>
      </InquiryBar>

      <Panel
        title="예외"
        padded={false}
        right={
          <div className="flex items-center gap-3">
            <CountHint n={rows.length} />
            <button className="text-[12px] font-medium text-[#2f62c0]" onClick={() => nav('/app/exceptions')}>
              예외현황
            </button>
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyHint>조회 조건에 맞는 예외가 없습니다.</EmptyHint>
        ) : (
          <div className="max-h-[360px] overflow-auto">
            <table className="erp-table">
              <TableHead>
                <tr>
                  <th>No.</th>
                  <th>우선</th>
                  <th>여유</th>
                  <th>예외번호</th>
                  <th>선박 / 항차</th>
                  <th>기항</th>
                  <th>변경</th>
                  <th>상태</th>
                </tr>
              </TableHead>
              <tbody>
                {rows.map((e, i) => {
                  const v = voyages.find((x) => x.id === e.voyageId)
                  return (
                    <tr
                      key={e.id}
                      className={cn('cursor-pointer', selected?.id === e.id && 'is-on')}
                      onClick={() => setSelectedId(e.id)}
                      onDoubleClick={() => nav(`/app/exceptions/${e.id}`)}
                    >
                      <td>
                        <RowNo n={i + 1} />
                      </td>
                      <td>
                        <PriorityPill value={e.priority} />
                      </td>
                      <td className="font-mono text-[12px]">{e.reviewHeadline || '—'}</td>
                      <td>
                        <DocNo onOpen={() => nav(`/app/exceptions/${e.id}`)}>{e.id}</DocNo>
                      </td>
                      <td>{v ? `${v.vessel} ${v.voyage}` : e.incoming.vessel || '미매칭'}</td>
                      <td>{v ? `${v.port} ${v.terminal}` : '—'}</td>
                      <td className="max-w-[240px] truncate">{e.summary}</td>
                      <td>
                        <StatusPill value={e.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
