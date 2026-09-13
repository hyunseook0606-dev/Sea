import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AX_CAPABILITIES, AX_CASES } from './ax'
import { Reveal } from './components/Reveal'
import { SeaBrandLogo } from './components/SeaLogo'

const NAV = [
  { id: 'product', label: '제품', menu: true },
  { id: 'how', label: '기능' },
  { id: 'scenes', label: '작동 방식' },
  { id: 'about', label: '회사' },
] as const

const FACTS = [
  ['대상', '국적 컨테이너·피더 운항팀'],
  ['입력', '메일 · PDF · 엑셀'],
  ['Cut-off', '원문에 있을 때만 유지'],
  ['발송', '승인 후 발송'],
]

const PILLARS = [
  {
    title: '원문에서 항차 필드를 읽습니다',
    desc: '선박·항차·ETA·선석을 메일·엑셀·PDF에서 올려 전표에 붙입니다.',
    img: '/landing/berth.jpg',
    pos: 'object-center',
  },
  {
    title: '확정본과 다른 값만 올립니다',
    desc: '직전 확정본과 비교합니다. 시각이 모순이면 발송을 막고, 같은 변경이 다시 오면 새 전표를 만들지 않습니다.',
    img: '/landing/yard.jpg',
    pos: 'object-center',
  },
  {
    title: '확인 항목과 통보를 한 전표에서',
    desc: '접안·연결 항차·내륙을 체크하고, 화주·내륙 초안을 고친 뒤 승인·발송합니다.',
    img: '/landing/voyage.jpg',
    pos: 'object-[center_30%]',
  },
]

const EASE = [0.22, 1, 0.36, 1] as const

function HeroStage({ onWorkspace }: { onWorkspace: () => void }) {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const imgY = useTransform(scrollY, [0, 700], [0, 120])

  return (
    <section id="home" className="landing-hero">
      <motion.div className="landing-hero-media" style={reduce ? undefined : { y: imgY }}>
        <img src="/landing/hero.jpg" alt="컨테이너선이 갠트리 크레인 아래 선석에 접안한 모습" />
      </motion.div>
      <div className="landing-hero-overlay" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-99px)] max-w-[1400px] items-center px-6 py-24">
        <div className="max-w-[640px] text-white">
          <motion.p
            className="text-[15px] tracking-[0.04em] text-white/80"
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: EASE }}
          >
            Schedule Exception Agent
          </motion.p>
          <motion.div
            className="mt-5 h-px w-10 bg-white"
            initial={reduce ? false : { opacity: 0, scaleX: 0.4 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.22, ease: EASE }}
          />
          <motion.h1
            className="mt-6 text-[40px] font-semibold leading-[1.18] tracking-tight sm:text-[56px]"
            initial={reduce ? false : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.28, ease: EASE }}
          >
            스케줄이 바뀐 다음,
            <br />
            확인할 일을 한 화면에서
          </motion.h1>
          <motion.p
            className="mt-6 max-w-xl text-[18px] leading-relaxed text-white/85"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.42, ease: EASE }}
          >
            기항 변경 메일·엑셀을 직전 확정본과 비교하고, 확인 항목과 화주·내륙 통보를 한 전표에서 처리합니다.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-wrap gap-3"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
          >
            <button type="button" onClick={onWorkspace} className="btn-nectar btn-nectar-light">
              워크스페이스
            </button>
            <a href="#how" className="btn-nectar btn-nectar-light">
              작동 방식 보기
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function FlowVideo({ onWorkspace }: { onWorkspace: () => void }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLVideoElement>(null)
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el || reduce || !ok) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => setOk(false))
        else el.pause()
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ok, reduce])

  if (!ok) {
    return (
      <div className="landing-media border border-[#e6e8ec] bg-white px-8 py-16 text-center">
        <p className="text-[16px] text-[#555]">워크스페이스에서 수신부터 승인까지 보면 됩니다.</p>
        <button type="button" className="btn-nectar mt-8" onClick={onWorkspace}>
          워크스페이스
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="landing-product-video">
        <video
          ref={ref}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setOk(false)}
          controls={Boolean(reduce)}
          aria-label="HANARO 2506W 예외 전표. 변경, 필드, 확인, 통보 순으로 처리하는 화면"
        >
          <source src="/landing/hero.webm" type="video/webm" />
        </video>
      </div>
      <p className="mt-5 text-center text-[14px] text-[#667085]">HANARO 2506W · 변경 · 필드 · 확인 · 통보</p>
    </div>
  )
}

export function BrandLanding() {
  const nav = useNavigate()
  const [menu, setMenu] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const [stuck, setStuck] = useState(false)
  const [scene, setScene] = useState<(typeof AX_CASES)[number]['key']>('A')
  const selected = AX_CASES.find((c) => c.key === scene) || AX_CASES[0]
  const goApp = () => nav('/app')

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing-root min-h-screen bg-white text-[#111]">
      <div className="easy-notification-bar">
        <p>기항 변경 수신 · 예외 확인 · 통보 승인</p>
        <button type="button" onClick={goApp}>
          워크스페이스
        </button>
      </div>

      <header className={stuck ? 'landing-header landing-header-stuck' : 'landing-header'}>
        <div className="mx-auto flex h-[99px] max-w-[1400px] items-center px-6">
          <a href="#home" className="flex shrink-0 items-center" aria-label="SEA 홈">
            <SeaBrandLogo className="h-[33px]" />
          </a>
          <nav className="ml-14 hidden items-center gap-10 text-[16px] text-[#222] lg:flex">
            {NAV.map((n) =>
              'menu' in n && n.menu ? (
                <div
                  key={n.id}
                  className="relative"
                  onMouseEnter={() => setProductOpen(true)}
                  onMouseLeave={() => setProductOpen(false)}
                >
                  <a href={`#${n.id}`} className="inline-flex h-[99px] items-center hover:text-[#1130c6]">
                    {n.label}
                  </a>
                  {productOpen ? (
                    <div className="absolute left-1/2 top-[99px] z-50 w-[320px] -translate-x-1/2 border border-[#eee] bg-white py-3 shadow-[0_12px_40px_rgba(17,48,198,0.08)]">
                      {AX_CAPABILITIES.map((f) => (
                        <a
                          key={f.id}
                          href="#product"
                          className="block px-5 py-2.5 text-[14px] hover:bg-[#f2f7ff] hover:text-[#1130c6]"
                          onClick={() => setProductOpen(false)}
                        >
                          {f.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <a key={n.id} href={`#${n.id}`} className="hover:text-[#1130c6]">
                  {n.label}
                </a>
              ),
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={goApp} className="btn-nectar hidden sm:inline-flex">
              워크스페이스
            </button>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center lg:hidden"
              aria-label="메뉴"
              onClick={() => setMenu((v) => !v)}
            >
              <span className="flex flex-col gap-[3px]">
                <span className="block h-0.5 w-3.5 bg-[#111]" />
                <span className="block h-0.5 w-3.5 bg-[#111]" />
                <span className="block h-0.5 w-3.5 bg-[#111]" />
              </span>
            </button>
          </div>
        </div>
        {menu ? (
          <div className="border-t border-[#eee] px-6 py-3 lg:hidden">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="block py-2" onClick={() => setMenu(false)}>
                {n.label}
              </a>
            ))}
            <button type="button" className="btn-nectar mt-2 w-full" onClick={goApp}>
              워크스페이스
            </button>
          </div>
        ) : null}
      </header>

      <HeroStage onWorkspace={goApp} />

      <section className="border-b border-[#eee] bg-white py-16">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-10 px-6 sm:grid-cols-4">
          {FACTS.map(([k, v], i) => (
            <Reveal key={k} delay={i * 0.08} y={28}>
              <div className="text-[13px] font-semibold text-[#1130c6]">{k}</div>
              <div className="mt-2 text-[17px] font-medium leading-snug">{v}</div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="product" className="landing-band landing-band-soft">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-[36px] font-semibold leading-tight tracking-tight sm:text-[46px]">
              기항이 바뀐 뒤의
              <br />
              운항 업무를 닫습니다
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-[#555]">
              수신한 스케줄을 확정본과 비교하고, 확인할 일과 통보 초안을 같은 전표에서 처리합니다.
            </p>
          </Reveal>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {AX_CAPABILITIES.map((f, i) => (
              <Reveal key={f.id} delay={i * 0.07} y={36}>
                <div className="text-[13px] font-semibold text-[#1130c6]">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="mt-3 text-[22px] font-semibold">{f.label}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#555]">{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-[160px] pt-0">
        <div className="mx-auto grid max-w-[1400px] gap-6 px-6 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.12} y={56} className="h-full">
              <article className="landing-media relative min-h-[420px] overflow-hidden">
                <img src={p.img} alt="" className={`absolute inset-0 h-full w-full object-cover ${p.pos}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1130c6] via-[#1130c6]/55 to-[#1130c6]/10" />
                <div className="relative flex h-full min-h-[420px] flex-col justify-end p-8 text-white">
                  <h3 className="text-[24px] font-semibold leading-snug">{p.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/90">{p.desc}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="how" className="landing-band landing-band-soft">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-[36px] font-semibold tracking-tight sm:text-[46px]">수신부터 승인까지</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-[#555]">
              수신 · 추출 · 비교 · 확인 · 승인을 한 흐름으로 처리합니다.
            </p>
          </Reveal>
          <Reveal className="mt-16" delay={0.12} y={40}>
            <FlowVideo onWorkspace={goApp} />
          </Reveal>
        </div>
      </section>

      <section id="scenes" className="landing-band">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-[36px] font-semibold tracking-tight sm:text-[46px]">자주 보는 기항 변경</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-[#555]">
              같은 수신함에서 처리되는 세 가지 건입니다.
            </p>
          </Reveal>
          <Reveal className="mt-14 flex flex-wrap justify-center gap-8 border-b border-[#e5e7eb]" delay={0.08} y={24}>
            {AX_CASES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setScene(c.key)}
                className={
                  scene === c.key
                    ? 'border-b-2 border-[#1130c6] pb-3 text-[17px] font-semibold text-[#1130c6]'
                    : 'pb-3 text-[17px] text-[#667085] hover:text-[#111]'
                }
              >
                {c.title}
              </button>
            ))}
          </Reveal>
          <Reveal className="mx-auto mt-12 max-w-3xl text-center" delay={0.12}>
            <div className="text-[14px] font-semibold text-[#1130c6]">{selected.tag}</div>
            <h3 className="mt-3 text-[28px] font-semibold">{selected.title}</h3>
            <p className="mt-4 text-[16px] leading-relaxed text-[#444]">{selected.meaning}</p>
            <p className="mt-4 text-[15px] text-[#666]">{selected.summary}</p>
            <p className="mt-3 text-[16px] font-medium">{selected.result}</p>
            <button type="button" className="btn-nectar mt-10" onClick={() => nav(`/app/inbox?run=${selected.key}`)}>
              이 건 열기
            </button>
          </Reveal>
        </div>
      </section>

      <section id="about" className="bg-white pb-[160px] pt-10">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal y={40}>
            <div className="landing-media grid min-h-[420px] overflow-hidden lg:grid-cols-2">
              <img src="/landing/berth.jpg" alt="선석에서 하역 중인 컨테이너선" className="h-full min-h-[320px] w-full object-cover" />
              <div className="flex flex-col justify-center bg-[#1130c6] px-10 py-14 text-white sm:px-14">
                <h2 className="text-[32px] font-semibold leading-tight sm:text-[40px]">기존 운항관리와 함께 씁니다</h2>
                <p className="mt-6 text-[16px] leading-relaxed text-white/90">
                  SEA는 메일·엑셀로 기항 변경을 받는 국적 컨테이너·피더 운항팀용입니다. 기간계를 교체하지 않고, 변경 이후
                  확인과 통보만 처리합니다.
                </p>
                <ul className="mt-8 space-y-4 text-[15px] text-white/85">
                  <li>범위: 기항 변경 확인 · 화주·내륙 통보 승인</li>
                  <li>회사: DEMO LINE · 운항 워크스페이스</li>
                </ul>
                <button type="button" className="btn-nectar btn-nectar-light mt-10 self-start" onClick={goApp}>
                  워크스페이스
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-[#eee] bg-white">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <SeaBrandLogo className="h-8" />
            <p className="mt-4 text-[14px] leading-relaxed text-[#666]">
              기항 스케줄 변경 이후의 예외 확인과 통보를 한 워크스페이스에서 처리합니다.
            </p>
          </div>
          <div>
            <div className="text-[14px] font-semibold">제품</div>
            <div className="mt-4 space-y-2 text-[14px] text-[#666]">
              {AX_CAPABILITIES.slice(0, 4).map((f) => (
                <a key={f.id} href="#product" className="block hover:text-[#1130c6]">
                  {f.label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[14px] font-semibold">기능</div>
            <div className="mt-4 space-y-2 text-[14px] text-[#666]">
              <a href="#how" className="block hover:text-[#1130c6]">
                수신부터 승인
              </a>
              <a href="#scenes" className="block hover:text-[#1130c6]">
                작동 방식
              </a>
              <button type="button" className="block hover:text-[#1130c6]" onClick={goApp}>
                워크스페이스
              </button>
            </div>
          </div>
          <div>
            <div className="text-[14px] font-semibold">회사</div>
            <div className="mt-4 space-y-2 text-[14px] text-[#666]">
              <a href="#about" className="block hover:text-[#1130c6]">
                소개
              </a>
              <p>DEMO LINE</p>
              <p>운항팀 워크스페이스</p>
            </div>
          </div>
        </div>
        <div className="border-t border-[#eee] px-6 py-6 text-[12px] text-[#888]">
          <div className="mx-auto max-w-[1400px]">SEA · Schedule Exception Agent · 옥현서 · 한국항공대학교 물류전공</div>
        </div>
      </footer>
    </div>
  )
}
