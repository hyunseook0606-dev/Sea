import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'

export function CircleScrollbar({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [ui, setUi] = useState({ top: 8, overflow: false, circle: false, grabbing: false })
  const grab = useRef<{ startY: number; startTop: number } | null>(null)
  const track = useRef<HTMLDivElement>(null)

  const sync = useCallback(() => {
    const el = box.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const overflow = scrollHeight > clientHeight + 2
    const rail = Math.max(clientHeight - 28, 1)
    const max = Math.max(scrollHeight - clientHeight, 1)
    setUi((k) => ({ ...k, overflow, top: 8 + (scrollTop / max) * rail }))
  }, [])

  useEffect(() => {
    const el = box.current
    if (!el) return
    sync()
    el.addEventListener('scroll', sync)
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [sync])

  useEffect(() => {
    function move(e: globalThis.MouseEvent) {
      if (!grab.current || !box.current) return
      const el = box.current
      const rail = Math.max(el.clientHeight - 28, 1)
      const max = Math.max(el.scrollHeight - el.clientHeight, 1)
      const next = Math.min(rail, Math.max(0, grab.current.startTop + (e.clientY - grab.current.startY)))
      el.scrollTop = (next / rail) * max
    }
    function up() {
      grab.current = null
      setUi((k) => ({ ...k, grabbing: false }))
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  function beginDrag(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault()
    const el = box.current
    const railEl = track.current
    if (!el || !railEl) return
    const rect = railEl.getBoundingClientRect()
    const rail = Math.max(el.clientHeight - 28, 1)
    const y = Math.min(rail, Math.max(0, e.clientY - rect.top - 8))
    const max = Math.max(el.scrollHeight - el.clientHeight, 1)
    el.scrollTop = (y / rail) * max
    grab.current = { startY: e.clientY, startTop: y }
    setUi((k) => ({ ...k, circle: true, grabbing: true, top: 8 + y }))
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={box} className="menu-scroll h-full overflow-y-auto pr-2">
        {children}
      </div>
      {ui.overflow ? (
        <div
          ref={track}
          className="absolute inset-y-0 right-0 w-3 cursor-pointer"
          onMouseDown={beginDrag}
          onMouseLeave={() => setUi((k) => (k.grabbing ? k : { ...k, circle: false }))}
        >
          <span
            className={
              ui.circle || ui.grabbing
                ? 'pointer-events-none absolute right-px h-3.5 w-3.5 rounded-full bg-[#8b9aab] shadow-sm'
                : 'pointer-events-none absolute right-[5px] h-9 w-[3px] rounded-full bg-[#c5ced6]'
            }
            style={{ top: ui.top }}
          />
        </div>
      ) : null}
    </div>
  )
}
