import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AX_CASES } from '../ax'
import { useSeaStore } from '../store'

export function DemoMenu() {
  const nav = useNavigate()
  const runDemo = useSeaStore((s) => s.runDemo)
  const processing = useSeaStore((s) => s.processingInboxId)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        className="h-7 rounded-sm border border-line px-2 text-[12px] text-ink hover:bg-[#f4f5f8]"
        onClick={() => setOpen((v) => !v)}
      >
        시연
      </button>
      {open ? (
        <div className="absolute right-0 top-8 z-40 w-[280px] border border-line bg-white py-1 shadow-sm">
          <div className="px-3 py-1.5 text-[11px] text-mute">샘플 수신 문서</div>
          {AX_CASES.map((c) => (
            <button
              key={c.key}
              type="button"
              disabled={Boolean(processing)}
              className="block w-full px-3 py-2 text-left hover:bg-[#f4f5f8]"
              onClick={() => {
                setOpen(false)
                void (async () => {
                  const r = await runDemo(c.key)
                  if (r.exceptionId) nav(`/app/exceptions/${r.exceptionId}`)
                  else nav('/app/exceptions')
                })()
              }}
            >
              <div className="text-[13px] font-semibold">{c.title}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-mute">{c.summary}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
