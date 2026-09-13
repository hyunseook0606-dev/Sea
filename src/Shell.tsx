import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Star } from 'lucide-react'
import { DemoMenu } from './components/DemoMenu'
import { CircleScrollbar } from './components/CircleScrollbar'
import { SeaBrandLogo } from './components/SeaLogo'
import { cn } from './components/ui'
import { useSeaStore } from './store'

type Leaf = { to: string; label: string; end?: boolean; exact?: boolean; badge?: 'queued' | 'open' | 'pending' }

type Group = { id: string; label: string; items: Leaf[] }

type Module = {
  id: string
  label: string
  to: string
  tabs: { to: string; label: string }[]
  groups: Group[]
}

const MODULES: Module[] = [
  {
    id: 'home',
    label: '현황',
    to: '/app',
    tabs: [
      { to: '/app', label: '현황' },
      { to: '/app/history', label: '처리 이력' },
    ],
    groups: [
      {
        id: 'home-view',
        label: '조회',
        items: [
          { to: '/app', label: '현황', end: true },
          { to: '/app/history', label: '처리 이력' },
        ],
      },
    ],
  },
  {
    id: 'schedule',
    label: '스케줄',
    to: '/app/inbox',
    tabs: [
      { to: '/app/inbox', label: '수신현황' },
      { to: '/app/board', label: '기항현황' },
      { to: '/app/voyages', label: '항차' },
    ],
    groups: [
      {
        id: 'sch',
        label: '스케줄',
        items: [
          { to: '/app/inbox', label: '수신현황', badge: 'queued' },
          { to: '/app/board', label: '기항현황' },
          { to: '/app/voyages', label: '항차' },
        ],
      },
    ],
  },
  {
    id: 'exception',
    label: '예외',
    to: '/app/exceptions',
    tabs: [{ to: '/app/exceptions', label: '예외현황' }],
    groups: [
      {
        id: 'ex',
        label: '예외',
        items: [{ to: '/app/exceptions', label: '예외현황', badge: 'open' }],
      },
    ],
  },
  {
    id: 'notice',
    label: '통보',
    to: '/app/approvals',
    tabs: [{ to: '/app/approvals', label: '통보현황' }],
    groups: [
      {
        id: 'nt',
        label: '통보',
        items: [{ to: '/app/approvals', label: '통보현황', badge: 'pending' }],
      },
    ],
  },
  {
    id: 'master',
    label: '기준정보',
    to: '/app/rules',
    tabs: [
      { to: '/app/rules', label: '규칙' },
      { to: '/app/vessels', label: '선박' },
      { to: '/app/parties', label: '거래처' },
      { to: '/app/terminals', label: '터미널' },
      { to: '/app/sources', label: '연계' },
      { to: '/app/audit', label: '이력조회' },
      { to: '/app/settings', label: '설정' },
    ],
    groups: [
      {
        id: 'md',
        label: '기준',
        items: [
          { to: '/app/rules', label: '규칙' },
          { to: '/app/vessels', label: '선박' },
          { to: '/app/parties', label: '거래처' },
          { to: '/app/terminals', label: '터미널' },
          { to: '/app/sources', label: '연계' },
        ],
      },
      {
        id: 'sys',
        label: '시스템',
        items: [
          { to: '/app/audit', label: '이력조회' },
          { to: '/app/settings', label: '설정' },
        ],
      },
    ],
  },
]

function isLeafActive(pathname: string, it: Leaf) {
  if (it.exact || it.end) return pathname === it.to || pathname === `${it.to}/` || (it.to === '/app' && (pathname === '/app' || pathname === '/app/'))
  if (it.to === '/app/exceptions') return pathname.startsWith('/app/exceptions')
  if (it.to === '/app') return pathname === '/app' || pathname === '/app/'
  return pathname === it.to || pathname.startsWith(`${it.to}/`)
}

function formatStamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function pageFilters(pathname: string): { title: string; key: string; items: { id: string; label: string }[] } {
  if (pathname.startsWith('/app/exceptions/') && pathname !== '/app/exceptions') {
    return { title: '예외 전표', key: 'view', items: [] }
  }
  if (pathname.startsWith('/app/exceptions')) return { title: '예외현황', key: 'view', items: [] }
  if (pathname.startsWith('/app/inbox')) return { title: '수신현황', key: 'view', items: [] }
  if (pathname.startsWith('/app/approvals')) return { title: '통보현황', key: 'view', items: [] }
  if (pathname.startsWith('/app/favorites')) return { title: '즐겨찾기', key: 'view', items: [] }
  if (pathname === '/app' || pathname === '/app/' || pathname.startsWith('/app/effects')) return { title: '현황', key: 'view', items: [] }
  if (pathname.startsWith('/app/voyages')) return { title: '항차', key: 'view', items: [] }
  if (pathname.startsWith('/app/board')) return { title: '기항현황', key: 'view', items: [] }
  if (pathname.startsWith('/app/vessels')) return { title: '선박', key: 'view', items: [] }
  if (pathname.startsWith('/app/parties')) return { title: '거래처', key: 'view', items: [] }
  if (pathname.startsWith('/app/terminals')) return { title: '터미널', key: 'view', items: [] }
  if (pathname.startsWith('/app/rules')) return { title: '규칙', key: 'view', items: [] }
  if (pathname.startsWith('/app/sources')) return { title: '연계', key: 'view', items: [] }
  if (pathname.startsWith('/app/audit')) return { title: '이력조회', key: 'view', items: [] }
  if (pathname.startsWith('/app/history')) return { title: '처리 이력', key: 'view', items: [] }
  if (pathname.startsWith('/app/settings')) return { title: '설정', key: 'view', items: [] }
  return { title: 'SEA', key: 'view', items: [] }
}

export function Shell() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const operator = useSeaStore((s) => s.operator)
  const processing = useSeaStore((s) => s.processingInboxId)
  const inbox = useSeaStore((s) => s.inbox)
  const exceptions = useSeaStore((s) => s.exceptions)
  const drafts = useSeaStore((s) => s.drafts)
  const voyages = useSeaStore((s) => s.voyages)
  const favorites = useSeaStore((s) => s.favorites)
  const toggleFavorite = useSeaStore((s) => s.toggleFavorite)
  const [now, setNow] = useState(() => new Date())
  const [menuQ, setMenuQ] = useState('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'g-fav': true,
    'home-view': true,
    sch: true,
    ex: true,
    nt: true,
    md: true,
    sys: true,
  })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const queued = inbox.filter((i) => i.status === 'queued').length
  const open = exceptions.filter((e) => !['sent', 'resolved', 'duplicate'].includes(e.status)).length
  const pending = drafts.filter((d) => d.status === 'draft' || d.status === 'edited').length
  const badges = { queued, open, pending }

  const modules = useMemo<Module[]>(() => {
    const favTabs =
      favorites.length > 0
        ? [{ to: '/app/favorites', label: '목록' }, ...favorites.map((f) => ({ to: f.path, label: f.title }))]
        : [{ to: '/app/favorites', label: '목록' }]
    return [{ id: 'fav', label: '즐겨찾기', to: '/app/favorites', tabs: favTabs, groups: [] }, ...MODULES]
  }, [favorites])

  const activeModule = useMemo(() => {
    if (pathname.startsWith('/app/favorites')) return modules[0]
    const hit = MODULES.find(
      (m) =>
        m.groups.some((g) => g.items.some((it) => isLeafActive(pathname, it))) ||
        m.tabs.some((t) => pathname === t.to || (t.to !== '/app' && pathname.startsWith(t.to))),
    )
    return hit || MODULES[0]
  }, [pathname, modules])

  const chrome = pageFilters(pathname)
  const detailId = pathname.startsWith('/app/exceptions/') && pathname !== '/app/exceptions' ? pathname.split('/')[3] : null
  const detailEx = detailId ? exceptions.find((e) => e.id === detailId) : undefined
  const detailVoyage = detailEx ? voyages.find((v) => v.id === detailEx.voyageId) : undefined
  const screenTitle = detailVoyage ? `${detailVoyage.vessel} ${detailVoyage.voyage}` : chrome.title
  const favPath = pathname.replace(/\/$/, '') || '/app'
  const starred = favorites.some((f) => f.path === favPath)
  const canStar = !pathname.startsWith('/app/favorites')
  const favLeaves: Leaf[] = favorites.map((f) => ({
    to: f.path,
    label: f.title,
    end: f.path === '/app',
    exact: true,
  }))
  const menuHits = menuQ.trim()
    ? [
        ...favLeaves.map((it) => ({ to: it.to, label: it.label })),
        ...MODULES.flatMap((m) => m.groups.flatMap((g) => g.items)),
      ].filter((it, i, arr) => it.label.includes(menuQ.trim()) && arr.findIndex((x) => x.to === it.to && x.label === it.label) === i)
    : []

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper text-ink">
      <header className="z-20 shrink-0 bg-white">
        <div className="flex h-11 items-center px-2">
          <button onClick={() => nav('/')} className="flex h-11 w-[168px] shrink-0 items-center px-2" aria-label="SEA 홈">
            <SeaBrandLogo className="h-9" />
          </button>
          <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            {modules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => nav(m.to)}
                className={cn(
                  'h-8 shrink-0 rounded-full px-3.5 text-[13px]',
                  activeModule.id === m.id ? 'bg-[#eceaf6] font-semibold text-[#2b2f44]' : 'text-[#5b6472] hover:bg-[#f4f5f8]',
                )}
              >
                {m.label}
              </button>
            ))}
          </nav>
          <div className="relative ml-3 hidden w-52 shrink-0 lg:block">
            <input
              value={menuQ}
              onChange={(e) => setMenuQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && menuHits[0]) {
                  nav(menuHits[0].to)
                  setMenuQ('')
                }
                if (e.key === 'Escape') setMenuQ('')
              }}
              placeholder="메뉴 검색"
              className="erp-input h-7 w-full bg-[#f7f8fa]"
            />
            {menuQ.trim() ? (
              <div className="absolute right-0 top-8 z-50 w-56 border border-line bg-white py-1 shadow-sm">
                {menuHits.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-mute">해당 메뉴 없음</div>
                ) : (
                  menuHits.map((it) => (
                    <button
                      key={`${it.to}-${it.label}`}
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f4f5f8]"
                      onClick={() => {
                        nav(it.to)
                        setMenuQ('')
                      }}
                    >
                      {it.label}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-3 pr-2 text-[12px] text-mute">
            <span className="hidden text-ink lg:inline">DEMO LINE</span>
            <DemoMenu />
            <span className={processing ? 'text-warn' : 'text-ok'}>{processing ? '처리 중' : '정상'}</span>
            <span className="hidden font-mono tabular-nums xl:inline">{formatStamp(now)}</span>
            <span className="font-mono text-ink">{operator.id}</span>
          </div>
        </div>
        <div className="flex h-8 items-center gap-4 overflow-x-auto border-t border-line px-3 pl-[176px] text-[13px]">
          {activeModule.tabs.map((t) => {
            const on =
              t.to === '/app'
                ? pathname === '/app' || pathname === '/app/'
                : t.to === '/app/exceptions'
                  ? pathname === '/app/exceptions' || pathname === '/app/exceptions/'
                  : pathname === t.to || pathname.startsWith(`${t.to}/`)
            return (
              <NavLink
                key={`${t.label}-${t.to}`}
                to={t.to}
                className={on ? 'border-b-2 border-[#2f62c0] pb-[5px] font-semibold text-[#2f62c0]' : 'pb-[7px] text-[#667085] hover:text-ink'}
              >
                {t.label}
              </NavLink>
            )
          })}
          {detailId ? <span className="shrink-0 border-b-2 border-[#2f62c0] pb-[5px] font-semibold text-[#2f62c0]">전표</span> : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[200px] shrink-0 flex-col border-r border-line bg-white">
          <div className="flex h-8 shrink-0 items-center border-b border-line px-3 text-[12px] text-[#8b95a1]">메뉴</div>
          <CircleScrollbar>
            <div className="min-h-[calc(100%+120px)] py-2 text-[13px]">
              {(() => {
                const expanded = openGroups['g-fav'] !== false
                const groupOn = pathname.startsWith('/app/favorites')
                return (
                  <div className="mb-0.5">
                    <button
                      type="button"
                      className={cn(
                        'mx-2 flex w-[calc(100%-16px)] items-center gap-1 rounded-full px-2 py-1.5 text-left text-[13px]',
                        groupOn ? 'bg-[#eceaf6] font-semibold text-[#2b2f44]' : 'text-[#3d4654] hover:bg-[#f4f5f8]',
                      )}
                      onClick={() => setOpenGroups((s) => ({ ...s, 'g-fav': s['g-fav'] === false }))}
                    >
                      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      즐겨찾기
                    </button>
                    {expanded ? (
                      favLeaves.length === 0 ? (
                        <div className="px-8 py-1.5 text-[12px] leading-snug text-mute">화면 제목 옆 별표를 누르면 여기에 모입니다.</div>
                      ) : (
                        favLeaves.map((it) => {
                          const on = isLeafActive(pathname, it)
                          return (
                            <NavLink
                              key={it.to}
                              to={it.to}
                              end={it.end}
                              className={cn(
                                'flex items-center gap-1 py-[3px] pr-2 pl-8',
                                on ? 'font-semibold text-[#2f62c0]' : 'text-[#4a5563] hover:bg-[#f7f8fa]',
                              )}
                            >
                              {on ? <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#2f62c0]" /> : <span className="mr-1 inline-block w-1.5" />}
                              <Star size={11} className="fill-amber-400 text-amber-400" />
                              <span className="flex-1 truncate">{it.label}</span>
                            </NavLink>
                          )
                        })
                      )
                    ) : null}
                  </div>
                )
              })()}
              {activeModule.groups.map((g) => {
                const expanded = openGroups[g.id] !== false
                const groupOn = g.items.some((it) => isLeafActive(pathname, it))
                return (
                  <div key={g.id} className="mb-0.5">
                    <button
                      type="button"
                      className={cn(
                        'mx-2 flex w-[calc(100%-16px)] items-center gap-1 rounded-full px-2 py-1.5 text-left text-[13px]',
                        groupOn ? 'bg-[#eceaf6] font-semibold text-[#2b2f44]' : 'text-[#3d4654] hover:bg-[#f4f5f8]',
                      )}
                      onClick={() => setOpenGroups((s) => ({ ...s, [g.id]: s[g.id] === false }))}
                    >
                      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {g.label}
                    </button>
                    {expanded
                      ? g.items.map((it) => {
                          const on = isLeafActive(pathname, it)
                          const count = it.badge ? badges[it.badge] : 0
                          return (
                            <NavLink
                              key={it.to}
                              to={it.to}
                              end={it.end}
                              className={cn(
                                'flex items-center gap-1 py-[3px] pr-2 pl-8',
                                on ? 'font-semibold text-[#2f62c0]' : 'text-[#4a5563] hover:bg-[#f7f8fa]',
                              )}
                            >
                              {on ? <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#2f62c0]" /> : <span className="mr-1 inline-block w-1.5" />}
                              <span className="flex-1">{it.label}</span>
                              {count > 0 ? <span className="font-mono text-[11px] text-[#2f62c0]">{count}</span> : null}
                            </NavLink>
                          )
                        })
                      : null}
                  </div>
                )
              })}
            </div>
          </CircleScrollbar>
          <div className="border-t border-line px-3 py-2 text-[11px] text-mute">
            {operator.name} · {operator.id}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 items-center gap-2 border-b border-line bg-white px-3">
            <button
              type="button"
              disabled={!canStar}
              aria-label={starred ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              title={starred ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              className="grid h-7 w-7 place-items-center rounded-sm text-[#c5cad3] enabled:hover:bg-[#f4f5f8] disabled:opacity-40"
              onClick={() => toggleFavorite({ path: favPath, title: screenTitle })}
            >
              <Star size={14} className={starred ? 'fill-amber-400 text-amber-400' : 'text-[#c5cad3]'} />
            </button>
            <span className="text-[14px] font-semibold">{screenTitle}</span>
            {detailId ? <span className="font-mono text-[12px] text-mute">{detailId}</span> : null}
            {detailId ? (
              <button type="button" className="text-[12px] text-[#2f62c0]" onClick={() => nav('/app/exceptions')}>
                목록
              </button>
            ) : null}
          </div>
          {processing ? (
            <div className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-800">
              수신 문서를 처리하고 있습니다.
            </div>
          ) : null}
          <main className="min-w-0 flex-1 overflow-auto p-3">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
