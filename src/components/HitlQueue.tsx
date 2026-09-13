import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeaStore } from '../store'
import type { DraftChannel, ExceptionRecord } from '../types'
import { CHANNEL_LABEL, StatusPill } from './ui'

const TABS: { id: DraftChannel; label: string }[] = [
  { id: 'shipper', label: '화주' },
  { id: 'inland', label: '내륙' },
  { id: 'internal', label: '내부' },
]

export function HitlQueue({ exception }: { exception?: ExceptionRecord }) {
  const nav = useNavigate()
  const drafts = useSeaStore((s) => s.drafts)
  const approveDraft = useSeaStore((s) => s.approveDraft)
  const rejectDraft = useSeaStore((s) => s.rejectDraft)
  const editDraft = useSeaStore((s) => s.editDraft)
  const sendException = useSeaStore((s) => s.sendException)
  const [tab, setTab] = useState<DraftChannel>('shipper')
  const [notice, setNotice] = useState<string | null>(null)

  const related = exception ? drafts.filter((d) => d.exceptionId === exception.id) : []
  const current = related.find((d) => d.channel === tab)
  const blocked = exception?.status === 'blocked'
  const locked = blocked || current?.status === 'sent' || current?.status === 'rejected'

  if (!exception) {
    return (
      <section className="h-full rounded-sm border border-line bg-panel">
        <header className="border-b border-line bg-[#f7fafc] px-3 py-2">
          <h2 className="text-[13px] font-semibold">선택 예외 초안</h2>
        </header>
        <p className="p-4 text-[13px] leading-relaxed text-mute">
          예외를 선택하면 화주·내륙·내부 초안이 열립니다.
        </p>
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-[360px] flex-col rounded-sm border border-line bg-panel">
      <header className="flex items-center justify-between border-b border-line bg-[#f7fafc] px-3 py-2">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold">선택 예외 초안</h2>
          <p className="truncate text-[12px] text-mute">
            {exception.id} · {exception.incoming.vessel || '미매칭'} {exception.incoming.voyage}
          </p>
        </div>
        <button className="shrink-0 text-[12px] font-medium text-[#2f62c0]" onClick={() => nav(`/app/exceptions/${exception.id}`)}>
          전표 열기
        </button>
      </header>

      {blocked ? (
        <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-[12px] text-bad">
          {exception.issues[0]?.message || '검증 실패 · 발송 차단'}
        </div>
      ) : null}

      <div className="flex border-b border-line text-[12px]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? 'border-b-2 border-[#2f62c0] px-3 py-1.5 font-semibold text-[#2f62c0]'
                : 'border-b-2 border-transparent px-3 py-1.5 text-mute hover:text-ink'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-[11px] text-mute">
        <span>{current?.title || '초안 없음'}</span>
        {current ? <StatusPill value={current.status} /> : null}
      </div>

      {current ? (
        <textarea
          className="min-h-[160px] flex-1 resize-none bg-[#f7f8fa] p-3 font-mono text-[12px] leading-relaxed text-ink outline-none"
          value={current.body}
          disabled={locked}
          onChange={(e) => editDraft(current.id, e.target.value)}
        />
      ) : (
        <p className="flex-1 bg-[#f7f8fa] p-3 text-[12px] text-mute">이 채널 초안이 없습니다.</p>
      )}

      {notice ? <div className="border-t border-line px-3 py-1.5 text-[12px] text-warn">{notice}</div> : null}

      <div className="flex gap-2 border-t border-line p-3">
        <button className="btn-ghost" disabled={!current || locked || current.status === 'approved'} onClick={() => current && rejectDraft(current.id)}>
          반려
        </button>
        <button className="btn-ghost flex-1" disabled={!current || blocked || current.status === 'sent' || current.status === 'approved'} onClick={() => current && approveDraft(current.id)}>
          {CHANNEL_LABEL[tab]} 승인
        </button>
        <button
          className="btn-primary flex-1"
          disabled={blocked || exception.status === 'sent' || !exception.voyageId}
          onClick={() => {
            related.forEach((d) => {
              if (d.channel !== 'internal' && d.status !== 'approved' && d.status !== 'sent' && d.status !== 'rejected') approveDraft(d.id)
            })
            const r = sendException(exception.id)
            setNotice(r.ok ? '발송 완료' : r.reason || '발송 불가')
          }}
        >
          승인 후 발송
        </button>
      </div>
    </section>
  )
}
