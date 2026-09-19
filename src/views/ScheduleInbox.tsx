import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CountHint, DocNo, EmptyHint, InquiryBar, InquiryField, Panel, RowNo, StatusPill, TableHead, cn } from '../components/ui'
import { useSeaStore } from '../store'

const SOURCE: Record<string, string> = {
  email: '이메일',
  xlsx: '엑셀',
  pdf: 'PDF',
}

export function ScheduleInbox() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const inbox = useSeaStore((s) => s.inbox)
  const exceptions = useSeaStore((s) => s.exceptions)
  const processInbox = useSeaStore((s) => s.processInbox)
  const processQueued = useSeaStore((s) => s.processQueued)
  const runDemo = useSeaStore((s) => s.runDemo)
  const processing = useSeaStore((s) => s.processingInboxId)
  const queuedN = inbox.filter((i) => i.status === 'queued').length
  const started = useRef<string | null>(null)
  const view = params.get('view') || 'all'
  const blank = { source: 'all', q: '', view }
  const [draft, setDraft] = useState(blank)
  const [applied, setApplied] = useState(blank)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const addInbox = useSeaStore((s) => s.addInbox)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [upload, setUpload] = useState({ sender: 'ops.desk@example.com', subject: '', fileName: 'schedule.txt', body: '' })

  useEffect(() => {
    setDraft((d) => ({ ...d, view }))
    setApplied((a) => ({ ...a, view }))
  }, [view])

  const rows = inbox.filter((i) => {
    if (applied.view === 'queued' && i.status !== 'queued') return false
    if (applied.view === 'processed' && i.status !== 'processed') return false
    if (applied.view === 'duplicate' && i.status !== 'duplicate') return false
    if (applied.source !== 'all' && i.sourceType !== applied.source) return false
    const q = applied.q.trim()
    if (q && !`${i.subject} ${i.sender} ${i.fileName} ${i.id}`.includes(q)) return false
    return true
  })
  const selected = rows.find((i) => i.id === selectedId) || rows[0]
  const selectedEx = selected ? exceptions.find((e) => e.inboxId === selected.id) : undefined

  useEffect(() => {
    const run = params.get('run')
    if (run !== 'A' && run !== 'B' && run !== 'C') return
    if (started.current === run) return
    started.current = run
    void (async () => {
      const r = await runDemo(run)
      if (r.exceptionId) nav(`/app/exceptions/${r.exceptionId}`)
      else if (r.kind === 'duplicate') nav('/app/exceptions')
    })()
  }, [params, runDemo, nav])

  return (
    <div>
      {uploadOpen ? (
        <Panel title="스케줄 원문 입력" className="mb-3">
          <p className="mb-2 text-[12px] text-mute">
            공모본은 원문 텍스트를 받아 처리합니다. PDF·엑셀 파일 자체를 파싱하지 않습니다. 아래 수신 목록은 가상 시드입니다.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <InquiryField label="발신">
              <input className="erp-input w-full" value={upload.sender} onChange={(e) => setUpload((u) => ({ ...u, sender: e.target.value }))} />
            </InquiryField>
            <InquiryField label="제목">
              <input className="erp-input w-full" value={upload.subject} onChange={(e) => setUpload((u) => ({ ...u, subject: e.target.value }))} />
            </InquiryField>
          </div>
          <InquiryField label="원문">
            <textarea
              className="erp-input mt-1 h-28 w-full font-mono text-[12px]"
              value={upload.body}
              onChange={(e) => setUpload((u) => ({ ...u, body: e.target.value }))}
              placeholder="메일·PDF·엑셀에서 복사한 원문을 붙여 넣습니다. 공모본은 텍스트만 처리합니다."
            />
          </InquiryField>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".txt,.eml,.csv,text/plain"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (/\.(pdf|xlsx|xls)$/i.test(file.name)) {
                  setUpload((u) => ({ ...u, fileName: file.name, subject: u.subject || file.name }))
                  e.target.value = ''
                  return
                }
                const reader = new FileReader()
                reader.onload = () => {
                  const text = typeof reader.result === 'string' ? reader.result : ''
                  setUpload((u) => ({ ...u, fileName: file.name, subject: u.subject || file.name, body: text }))
                }
                reader.readAsText(file)
              }}
            />
            <button
              className="btn-primary py-1"
              onClick={() => {
                if (!upload.body.trim()) return
                const id = addInbox({
                  sender: upload.sender,
                  subject: upload.subject || upload.fileName,
                  sourceType: upload.fileName.endsWith('.xlsx') || upload.fileName.endsWith('.csv') ? 'xlsx' : upload.fileName.endsWith('.pdf') ? 'pdf' : 'email',
                  fileName: upload.fileName,
                  body: upload.body,
                })
                setSelectedId(id)
                setUploadOpen(false)
                setUpload({ sender: 'ops.desk@example.com', subject: '', fileName: 'schedule.txt', body: '' })
              }}
            >
              대기 등록
            </button>
            <button className="btn-ghost py-1" onClick={() => setUploadOpen(false)}>
              닫기
            </button>
          </div>
        </Panel>
      ) : (
        <button className="btn-ghost mb-3 py-1" onClick={() => setUploadOpen(true)}>
          원문 입력
        </button>
      )}
      <InquiryBar
        onInquiry={() => setApplied(draft)}
        onReset={() => {
          setDraft({ source: 'all', q: '', view: 'all' })
          setApplied({ source: 'all', q: '', view: 'all' })
        }}
      >
        <InquiryField label="유형">
          <select className="erp-input" value={draft.source} onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}>
            <option value="all">전체</option>
            <option value="email">이메일</option>
            <option value="xlsx">엑셀</option>
            <option value="pdf">PDF</option>
          </select>
        </InquiryField>
        <InquiryField label="상태">
          <select className="erp-input" value={draft.view} onChange={(e) => setDraft((d) => ({ ...d, view: e.target.value }))}>
            <option value="all">전체</option>
            <option value="queued">대기</option>
            <option value="processed">처리됨</option>
            <option value="duplicate">중복</option>
          </select>
        </InquiryField>
        <InquiryField label="제목 / 발신">
          <input className="erp-input w-48" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} placeholder="검색어" />
        </InquiryField>
      </InquiryBar>
      <div className="grid grid-cols-12 gap-3">
        <Panel
          title="수신현황"
          className="col-span-12 xl:col-span-8"
          padded={false}
          right={
            <div className="flex items-center gap-2">
              <CountHint n={rows.length} />
              <button className="btn-primary py-1" disabled={Boolean(processing) || queuedN === 0} onClick={() => void processQueued()}>
                {processing ? '처리 중' : `대기 ${queuedN}건 전체 처리`}
              </button>
            </div>
          }
        >
          {rows.length === 0 ? (
            <EmptyHint>조회 조건에 맞는 수신 문서가 없습니다.</EmptyHint>
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <table className="erp-table">
                <TableHead>
                  <tr>
                    <th>No.</th>
                    <th>수신번호</th>
                    <th>수신 시각</th>
                    <th>유형</th>
                    <th>제목</th>
                    <th>상태</th>
                    <th>판정</th>
                    <th />
                  </tr>
                </TableHead>
                <tbody>
                  {rows.map((i, n) => {
                    const linked = exceptions.find((e) => e.inboxId === i.id)
                    return (
                      <tr
                        key={i.id}
                        className={cn('cursor-pointer', selected?.id === i.id && 'is-on')}
                        onClick={() => setSelectedId(i.id)}
                        onDoubleClick={() => {
                          if (linked) nav(`/app/exceptions/${linked.id}`)
                        }}
                      >
                        <td>
                          <RowNo n={n + 1} />
                        </td>
                        <td>
                          {linked ? (
                            <DocNo onOpen={() => nav(`/app/exceptions/${linked.id}`)}>{i.id}</DocNo>
                          ) : (
                            <span className="font-mono text-[12px]">{i.id}</span>
                          )}
                        </td>
                        <td className="font-mono text-[12px]">{i.receivedAt}</td>
                        <td>{SOURCE[i.sourceType] || i.sourceType}</td>
                        <td>
                          <div>{i.subject}</div>
                          <div className="text-[11px] text-mute">{i.sender}</div>
                        </td>
                        <td>
                          <StatusPill value={i.status} />
                        </td>
                        <td>{i.lastKind ? <StatusPill value={i.lastKind} /> : <span className="text-[12px] text-mute">—</span>}</td>
                        <td className="text-right">
                          {linked ? (
                            <button className="btn-ghost py-1" onClick={() => nav(`/app/exceptions/${linked.id}`)}>
                              예외 열기
                            </button>
                          ) : i.status === 'processed' || i.status === 'duplicate' ? (
                            <span className="text-[12px] text-mute">—</span>
                          ) : (
                            <button
                              disabled={processing === i.id || i.status === 'processing'}
                              className="btn-primary py-1"
                              onClick={async (ev) => {
                                ev.stopPropagation()
                                const r = await processInbox(i.id)
                                if (r.exceptionId) nav(`/app/exceptions/${r.exceptionId}`)
                                else if (r.kind === 'duplicate') nav('/app/exceptions')
                              }}
                            >
                              {processing === i.id ? '처리 중' : '처리'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel
          title="선택 원문"
          className="col-span-12 xl:col-span-4"
          right={selected ? <span className="text-[12px] text-mute">{SOURCE[selected.sourceType] || selected.sourceType}</span> : null}
        >
          {!selected ? (
            <p className="text-[13px] text-mute">수신 문서를 선택하면 원문이 여기에 열립니다.</p>
          ) : (
            <div>
              <div className="mb-2 text-[12px] text-mute">
                <div>{selected.sender}</div>
                <div className="font-mono">{selected.receivedAt}</div>
                <div>{selected.fileName}</div>
              </div>
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed">{selected.body}</pre>
              {selectedEx ? (
                <button className="btn-primary mt-3 w-full" onClick={() => nav(`/app/exceptions/${selectedEx.id}`)}>
                  예외 전표 열기
                </button>
              ) : selected.status === 'queued' ? (
                <button
                  className="btn-primary mt-3 w-full"
                  disabled={Boolean(processing)}
                  onClick={async () => {
                    const r = await processInbox(selected.id)
                    if (r.exceptionId) nav(`/app/exceptions/${r.exceptionId}`)
                  }}
                >
                  {processing === selected.id ? '처리 중' : '이 문서 처리'}
                </button>
              ) : null}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
