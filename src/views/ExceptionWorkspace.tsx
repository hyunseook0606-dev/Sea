import { Pin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Mono, Panel, PriorityPill, StatusPill } from '../components/ui'
import { CLOCK_STATE_LABEL, formatHours, similarExceptions } from '../engine'
import { clockOf } from '../clocks'
import { useSeaStore } from '../store'
import type { AgentTask, ExceptionRecord, ExtractedField } from '../types'

const STAGES = [
  { id: 'CHANGE', label: '변경' },
  { id: 'SOURCE', label: '필드' },
  { id: 'ACTION', label: '확인' },
  { id: 'CONTROL', label: '통보' },
  { id: 'AUDIT', label: '이력' },
] as const

const SOURCE: Record<string, string> = {
  email: '이메일',
  xlsx: '엑셀',
  pdf: 'PDF',
}

function defaultStage(ex?: ExceptionRecord) {
  if (!ex) return 'CHANGE' as const
  if (ex.status === 'blocked' || (ex.status === 'review_required' && !ex.voyageId)) return 'ACTION' as const
  if (ex.status === 'awaiting_approval' || ex.status === 'partially_approved') return 'CONTROL' as const
  return 'CHANGE' as const
}

function SourceView({ body, span }: { body: string; span?: [number, number] }) {
  if (!span) return <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-ink">{body}</pre>
  return (
    <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-ink">
      {body.slice(0, span[0])}
      <mark className="sea-span">{body.slice(span[0], span[1])}</mark>
      {body.slice(span[1])}
    </pre>
  )
}

function TaskRow({ task, onToggle }: { task: AgentTask; onToggle: () => void }) {
  const can = task.status === 'pending_human' || task.status === 'done'
  return (
    <tr>
      <td className="w-8">
        <input type="checkbox" checked={task.status === 'done' || task.status === 'auto_done'} disabled={!can} onChange={onToggle} />
      </td>
      <td>
        <div className="text-[12px] font-medium">{task.title}</div>
        <div className="text-[12px] text-mute">{task.detail}</div>
      </td>
      <td className="w-[88px] text-right">
        <StatusPill value={task.status} />
      </td>
    </tr>
  )
}

export function ExceptionWorkspace() {
  const { id } = useParams()
  const nav = useNavigate()
  const exceptions = useSeaStore((s) => s.exceptions)
  const inbox = useSeaStore((s) => s.inbox)
  const voyages = useSeaStore((s) => s.voyages)
  const drafts = useSeaStore((s) => s.drafts)
  const parties = useSeaStore((s) => s.parties)
  const audit = useSeaStore((s) => s.audit)
  const confirmed = useSeaStore((s) => s.confirmed)
  const confirmedHistory = useSeaStore((s) => s.confirmedHistory)
  const editDraft = useSeaStore((s) => s.editDraft)
  const approveDraft = useSeaStore((s) => s.approveDraft)
  const rejectDraft = useSeaStore((s) => s.rejectDraft)
  const sendException = useSeaStore((s) => s.sendException)
  const applySimilarDrafts = useSeaStore((s) => s.applySimilarDrafts)
  const toggleTask = useSeaStore((s) => s.toggleTask)
  const pinnedExceptionIds = useSeaStore((s) => s.pinnedExceptionIds)
  const togglePinException = useSeaStore((s) => s.togglePinException)
  const [stage, setStage] = useState<(typeof STAGES)[number]['id']>('CHANGE')
  const [focus, setFocus] = useState<ExtractedField | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const ex = exceptions.find((e) => e.id === id)
  const item = ex ? inbox.find((i) => i.id === ex.inboxId) : undefined
  const voyage = ex ? voyages.find((v) => v.id === ex.voyageId) : undefined
  const connecting = voyage?.connectingVoyageId ? voyages.find((v) => v.id === voyage.connectingVoyageId) : undefined
  const relatedDrafts = drafts.filter((d) => d.exceptionId === ex?.id)
  const relatedAudit = audit.filter((a) => (ex ? a.detail.includes(ex.id) || a.title.includes(ex.id) : false)).slice(0, 24)
  const similar = ex ? similarExceptions(ex, exceptions) : []
  const versions = ex ? confirmedHistory.filter((v) => v.voyageId === ex.voyageId) : []
  const fired = ex?.rules.filter((r) => r.fired) || []

  useEffect(() => {
    setStage(defaultStage(ex))
    setFocus(null)
    setNotice(null)
  }, [ex?.id])

  if (!ex) {
    return (
      <div className="border border-line bg-panel py-16 text-center text-[13px] text-mute">
        예외가 없습니다.{' '}
        <button className="font-semibold text-[#2f62c0]" onClick={() => nav('/app/inbox')}>
          수신현황으로
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col gap-3 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <section className="border border-line bg-panel">
            <div className="grid gap-x-6 gap-y-1.5 border-b border-line px-3 py-2.5 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="mr-2 text-mute">예외번호</span>
                <span className="font-mono text-[12px]">{ex.id}</span>
              </div>
              <div>
                <span className="mr-2 text-mute">항차</span>
                {voyage ? (
                  <button type="button" className="text-[#2f62c0] hover:underline" onClick={() => nav(`/app/voyages/${voyage.id}`)}>
                    {voyage.vessel} / {voyage.voyage}
                  </button>
                ) : (
                  '미매칭'
                )}
              </div>
              <div>
                <span className="mr-2 text-mute">기항</span>
                {voyage ? `${voyage.port} ${voyage.terminal}` : ex.incoming.port || '—'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-mute">상태</span>
                <PriorityPill value={ex.priority} />
                {ex.reviewHeadline ? <span className="font-mono text-[12px] text-mute">{ex.reviewHeadline}</span> : null}
                <StatusPill value={ex.status} />
                <button
                  type="button"
                  className="ml-1 grid h-7 w-7 place-items-center"
                  title={pinnedExceptionIds.includes(ex.id) ? '고정 해제' : '고정'}
                  onClick={() => togglePinException(ex.id)}
                >
                  <Pin
                    size={14}
                    className={pinnedExceptionIds.includes(ex.id) ? 'fill-[#2f62c0] text-[#2f62c0]' : 'text-[#c5cad3]'}
                  />
                </button>
              </div>
              <div>
                <span className="mr-2 text-mute">수신</span>
                <span className="font-mono text-[12px]">{item?.id}</span>
                <span className="ml-2 text-mute">{SOURCE[item?.sourceType || ''] || item?.sourceType}</span>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="mr-2 text-mute">요약</span>
                {ex.summary}
              </div>
            </div>
            {ex.status === 'blocked' ? (
              <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-[13px] text-bad">
                {ex.issues.map((i) => i.message).join(' ')} 발송 불가
              </div>
            ) : null}
            <div className="flex gap-4 overflow-x-auto px-3 text-[13px]">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStage(s.id)}
                  className={
                    stage === s.id
                      ? 'shrink-0 border-b-2 border-[#2f62c0] pb-1.5 pt-2 font-semibold text-[#2f62c0]'
                      : 'shrink-0 pb-2 pt-2 text-[#667085] hover:text-ink'
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {notice ? <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">{notice}</div> : null}

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <Panel title="원문" className="xl:col-span-5" right={<span className="text-[12px] text-mute">{SOURCE[item?.sourceType || ''] || item?.sourceType}</span>}>
              <div className="mb-2 grid grid-cols-2 gap-1 text-[12px] text-mute">
                <div>발신 {item?.sender}</div>
                <div className="text-right">{item?.receivedAt}</div>
                <div className="col-span-2">{item?.fileName}</div>
              </div>
              <SourceView body={item?.body || ''} span={focus?.span} />
            </Panel>

            <Panel title={STAGES.find((s) => s.id === stage)?.label || '처리'} className="xl:col-span-7">
              {stage === 'SOURCE' && (
                <table className="erp-table">
                  <tbody>
                    {ex.fields.map((f) => (
                      <tr
                        key={f.key}
                        className="cursor-pointer"
                        onClick={() => setFocus(f)}
                      >
                        <td className="text-mute">{f.label}</td>
                        <td>
                          <Mono>{f.value || '—'}</Mono>
                        </td>
                        <td className="text-[12px] text-mute">{f.verified ? '확인됨' : '미확인'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {stage === 'CHANGE' && (
                <div>
                  <div className="mb-2 text-[12px] text-mute">직전 확정본 대비 {ex.changes.length}건</div>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>항목</th>
                        <th>이전</th>
                        <th>변경</th>
                        <th>차이</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.changes.map((c) => {
                        const field = ex.fields.find((f) => f.key === c.key)
                        return (
                          <tr
                            key={c.key}
                            className={field ? 'cursor-pointer' : undefined}
                            onClick={() => {
                              if (field) setFocus(field)
                            }}
                          >
                            <td>{c.label}</td>
                            <td className="font-mono text-[12px]">{c.previous}</td>
                            <td className="font-mono text-[12px] text-[#2f62c0]">{c.next}</td>
                            <td className="text-warn">{c.delta || '변경'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {ex.changes.length === 0 ? <p className="mt-2 text-[13px] text-mute">필드 변경 없음 또는 검증 단계에서 중단</p> : null}
                  <table className="erp-table mt-4">
                    <tbody>
                      <tr>
                        <td className="text-mute">Cut-off</td>
                        <td>원문 {ex.incoming.cutoff || '없음'} · 확정본 {confirmed[ex.voyageId]?.cutoff || '없음'}</td>
                      </tr>
                      <tr>
                        <td className="text-mute">연결 항차</td>
                        <td>{connecting ? `${connecting.vessel} / ${connecting.voyage}` : '데이터 없음'}</td>
                      </tr>
                    </tbody>
                  </table>
                  {versions.length > 0 ? (
                    <div className="mt-4">
                      <div className="mb-2 text-[12px] text-mute">이 항차 확정본 버전</div>
                      <table className="erp-table">
                        <thead>
                          <tr>
                            <th>시각</th>
                            <th>주체</th>
                            <th>내용</th>
                          </tr>
                        </thead>
                        <tbody>
                          {versions.map((v) => (
                            <tr key={v.id}>
                              <td className="font-mono text-[12px]">{v.at}</td>
                              <td>{v.actor}</td>
                              <td>
                                {v.note}
                                {v.exceptionId ? ` · ${v.exceptionId}` : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              )}
              {stage === 'ACTION' && (
                <div className="space-y-3">
                  {ex.issues.length > 0 ? (
                    <div className="border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-bad">
                      {ex.issues.map((i) => (
                        <div key={i.code}>{i.message}</div>
                      ))}
                    </div>
                  ) : null}
                  {!ex.voyageId ? (
                    <div className="border border-line bg-[#f7fafc] px-3 py-2 text-[13px]">
                      항차 마스터에 없습니다.{' '}
                      <button type="button" className="text-[#2f62c0] hover:underline" onClick={() => nav('/app/voyages')}>
                        항차 등록
                      </button>
                    </div>
                  ) : null}
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>영역</th>
                        <th>판정</th>
                        <th>이유</th>
                        <th>다음</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.impact.map((im) => (
                        <tr key={im.area}>
                          <td>{im.area}</td>
                          <td>
                            <StatusPill value={im.status} />
                          </td>
                          <td className="text-[12px] text-mute">{im.reason}</td>
                          <td className="text-[12px]">{im.nextAction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {fired.length > 0 ? (
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>적용 규칙</th>
                          <th>동작</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fired.map((r) => (
                          <tr key={r.id}>
                            <td>
                              {r.id} {r.rule}
                            </td>
                            <td>{r.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th />
                        <th>확인 항목</th>
                        <th>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.tasks.map((t) => (
                        <TaskRow key={t.id} task={t} onToggle={() => toggleTask(ex.id, t.id)} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {stage === 'CONTROL' && (
                <div className="space-y-3">
                  {relatedDrafts.length === 0 ? (
                    <p className="text-[13px] text-bad">
                      {ex.voyageId
                        ? '검증 실패로 대외 초안이 없습니다. 발송할 수 없습니다.'
                        : '항차 마스터에 없어 대외 초안이 없습니다.'}
                    </p>
                  ) : (
                    relatedDrafts.map((d) => (
                      <div key={d.id} className="border border-line">
                        <div className="flex items-center justify-between border-b border-line bg-[#f7fafc] px-3 py-1.5 text-[13px]">
                          <b>{d.title}</b>
                          <span className="ml-2 text-[12px] font-normal text-mute">
                            {parties.find((p) => p.kind === d.channel && (!p.terminal || p.terminal === ex.incoming.terminal))?.name ||
                              parties.find((p) => p.kind === d.channel)?.name ||
                              ''}
                          </span>
                          <StatusPill value={d.status} />
                        </div>
                        <textarea
                          className="h-28 w-full resize-none bg-transparent p-3 font-mono text-[12px] text-ink outline-none"
                          value={d.body}
                          disabled={d.status === 'sent' || ex.status === 'blocked'}
                          onChange={(e) => editDraft(d.id, e.target.value)}
                        />
                        <div className="flex gap-2 border-t border-line px-3 py-2">
                          <button className="btn-primary py-1" onClick={() => approveDraft(d.id)} disabled={ex.status === 'blocked' || d.status === 'approved' || d.status === 'sent'}>
                            승인
                          </button>
                          <button className="btn-ghost py-1" onClick={() => rejectDraft(d.id)} disabled={d.status === 'sent'}>
                            반려
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {stage === 'AUDIT' && (
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>시각</th>
                      <th>주체</th>
                      <th>사건</th>
                      <th>내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedAudit.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-mute">
                          이 전표에 대한 기록이 아직 없습니다.
                        </td>
                      </tr>
                    ) : (
                      relatedAudit.map((a) => (
                        <tr key={a.id}>
                          <td className="font-mono text-[12px]">{a.at}</td>
                          <td>{a.actor}</td>
                          <td>{a.title}</td>
                          <td className="text-mute">{a.detail}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        </div>

        <aside className="w-full shrink-0 xl:w-[280px]">
          <Panel title="확인 항목" padded={false}>
            {ex.tasks.length === 0 ? (
              <p className="p-3 text-[13px] text-mute">확인할 항목이 없습니다.</p>
            ) : (
              <table className="erp-table">
                <tbody>
                  {ex.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={() => toggleTask(ex.id, t.id)} />
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
          {connecting ? (
            <Panel title="연결 항차" className="mt-3">
              <p className="text-[13px]">
                {connecting.vessel} / {connecting.voyage}
              </p>
              <p className="mt-1 text-[12px] text-mute">
                {connecting.port} {connecting.terminal}
              </p>
              {clockOf(ex.clocks, 'CONNECTION') ? (
                <p className="mt-2 font-mono text-[12px]">
                  여유 {formatHours(clockOf(ex.clocks, 'CONNECTION')?.hours)} / 하한 {clockOf(ex.clocks, 'CONNECTION')?.thresholdHours}h
                </p>
              ) : null}
            </Panel>
          ) : null}
          <Panel title="여유시간" className="mt-3" padded={false}>
            {!ex.clocks?.length ? (
              <p className="p-3 text-[13px] text-mute">이 전표에서 계산된 여유시간이 없습니다.</p>
            ) : (
              <table className="erp-table">
                <tbody>
                  {ex.clocks.map((c) => (
                    <tr key={c.code}>
                      <td className="w-[72px] font-mono text-[12px]">{c.hours == null && c.code === 'BERTH' ? CLOCK_STATE_LABEL[c.state] : formatHours(c.hours, c.code === 'ETA_SLIP')}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px]">{c.label}</span>
                          <span className="text-[11px] text-mute">{CLOCK_STATE_LABEL[c.state]}</span>
                        </div>
                        <div className="text-[11px] text-mute">{c.detail}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {fired.length ? (
              <table className="erp-table border-t border-line">
                <tbody>
                  {fired.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="font-mono text-[11px] text-mute">{r.id}</div>
                        <div className="text-[12px]">{r.rule}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Panel>
          <Panel title="유사 예외" className="mt-3" padded={false}>
            {similar.length === 0 ? (
              <p className="p-3 text-[13px] text-mute">같은 선박·변경 패턴의 지난 예외가 없습니다.</p>
            ) : (
              <div className="divide-y divide-line">
                {similar.map((s) => (
                  <div key={s.id} className="px-3 py-2">
                    <button type="button" className="font-mono text-[12px] text-[#2f62c0] hover:underline" onClick={() => nav(`/app/exceptions/${s.id}`)}>
                      {s.id}
                    </button>
                    <div className="text-[12px]">
                      {s.vessel} {s.voyage}
                    </div>
                    <div className="text-[11px] text-mute">{s.reasons.join(' · ')}</div>
                    {ex.status !== 'sent' && ex.status !== 'blocked' && relatedDrafts.length > 0 ? (
                      <button
                        type="button"
                        className="btn-ghost mt-1 py-1"
                        onClick={() => {
                          const r = applySimilarDrafts(ex.id, s.id)
                          setNotice(r.ok ? `지난 승인 문장을 초안에 넣었습니다. (${s.id})` : r.reason || '적용 불가')
                          if (r.ok) setStage('CONTROL')
                        }}
                      >
                        문장 적용
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>
      <div className="sticky bottom-0 z-10 mt-3 flex items-center gap-2 border border-line bg-white px-3 py-2">
        <button type="button" className="btn-ghost" onClick={() => nav('/app/exceptions')}>
          목록
        </button>
        {voyage ? (
          <button type="button" className="btn-ghost" onClick={() => nav(`/app/voyages/${voyage.id}`)}>
            항차
          </button>
        ) : null}
        <button type="button" className="btn-ghost" onClick={() => setStage('CONTROL')}>
          통보 작성
        </button>
        <button
          type="button"
          className="btn-primary ml-auto"
          disabled={ex.status === 'blocked' || ex.status === 'sent' || !ex.voyageId}
          onClick={() => {
            const r = sendException(ex.id)
            setNotice(r.ok ? '발송 완료' : r.reason || '발송 불가')
          }}
        >
          발송
        </button>
      </div>
    </div>
  )
}
