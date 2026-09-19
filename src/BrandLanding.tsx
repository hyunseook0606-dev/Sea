import { useEffect, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AX_CAPABILITIES, AX_CASES } from './ax'
import { PaceFlow } from './components/PaceFlow'
import { Reveal } from './components/Reveal'
import { PaceBrandLogo } from './components/PaceLogo'

const NAV = [
  { id: 'product', label: '제품', menu: true },
  { id: 'how', label: '기능' },
  { id: 'scenes', label: '작동 방식' },
  { id: 'about', label: '소개' },
] as const

const FIELD_PLACE = [
  {
    n: '01',
    role: '입력',
    title: '기항 변화와 비용 문서',
    desc: '일정·작업·서비스 변경과 PDA·인보이스·SOF·FDA를 같은 기항 ID로 연결합니다.',
    highlight: false,
  },
  {
    n: '02',
    role: '영향분석',
    title: '비용 영향과 규칙',
    desc: '변화의 영향을 받을 비용항목을 찾고 실제 작업·서비스와 적용 요율조건을 확인합니다.',
    highlight: false,
  },
  {
    n: '03',
    role: 'PACE',
    title: 'AI Cost Review Agent',
    desc: 'Observe · Reason · Check · Recommend · Verify 순서로 Revised PDA 후보와 다음 행동을 제안합니다.',
    highlight: true,
  },
  {
    n: '04',
    role: '검산',
    title: '실제비용과 근거',
    desc: 'FDA 실제비용을 예상액·기항 사건·문서 근거와 비교하고 담당자가 예외와 책임을 판단합니다.',
    highlight: false,
  },
]

const PILLARS = [
  {
    n: '01',
    title: '변화를 읽습니다',
    desc: '기항 일정과 작업·서비스 변경을 문서 및 기항 사건과 함께 읽어 비용 검토의 시작점을 만듭니다.',
    img: '/landing/berth.jpg',
    pos: 'object-center',
  },
  {
    n: '02',
    title: '비용 영향과 규칙을 확인합니다',
    desc: '영향받을 비용을 선별하고 실제 작업·서비스, 인보이스, 작업기록과 요율조건을 연결합니다.',
    img: '/landing/yard.jpg',
    pos: 'object-center',
  },
  {
    n: '03',
    title: '다음 행동과 실제 결과를 연결합니다',
    desc: 'Revised PDA 후보와 보완 행동을 제시하고 출항 후 FDA 실제비용과 Evidence를 검산합니다.',
    img: '/landing/voyage.jpg',
    pos: 'object-[center_30%]',
  },
]

const EASE = [0.22, 1, 0.36, 1] as const

function HeroStage({ onFlow, onWorkspace }: { onFlow: () => void; onWorkspace: () => void }) {
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
            Port-cost Assurance &amp; Control Engine
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
            기항 변화가 발생하면,
            <br />
            비용 영향과 다음 행동까지
          </motion.h1>
          <motion.p
            className="mt-6 max-w-xl text-[18px] leading-relaxed text-white/85"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.42, ease: EASE }}
          >
            일정·작업·서비스 변화를 해석해 영향을 받을 비용과 필요한 근거를 찾습니다. 규칙 엔진이 확인된 조건으로 Revised PDA
            후보를 계산하고, 출항 후 실제비용과 근거까지 검산합니다.
          </motion.p>
          <motion.div
            className="mt-8"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.48, ease: EASE }}
          >
            <PaceFlow variant="hero" />
          </motion.div>
          <motion.div
            className="mt-10 flex flex-wrap gap-3"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
          >
            <button type="button" onClick={onFlow} className="btn-nectar btn-nectar-light">
              업무 흐름 보기
            </button>
            <button type="button" onClick={onWorkspace} className="btn-nectar btn-nectar-light">
              워크스페이스
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function FlowVideo({ onWorkspace }: { onWorkspace: () => void }) {
  return (
    <div>
      <div className="landing-product-video relative">
        <iframe src="/app" title="PACE 기항 비용판 미리보기" className="h-full w-full border-0" tabIndex={-1} />
        <button type="button" className="absolute inset-0 cursor-pointer bg-transparent" onClick={onWorkspace} aria-label="PACE 워크스페이스 열기" />
      </div>
      <p className="mt-5 text-center text-[14px] text-[#667085]">
        PC-2609 · Port Call Change → Cost Impact → Actual Cost → Evidence Assurance
      </p>
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
        <p>PC-2609의 기항 변화 3건을 감지했습니다. 비용 영향 후보와 다음 행동을 확인하세요.</p>
        <button type="button" onClick={() => nav('/flow')}>
          업무 흐름
        </button>
      </div>

      <header className={stuck ? 'landing-header landing-header-stuck' : 'landing-header'}>
        <div className="mx-auto flex h-[99px] max-w-[1400px] items-center px-6">
          <a href="#home" className="flex shrink-0 items-center" aria-label="PACE 홈">
            <PaceBrandLogo className="h-[33px]" />
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
            <button type="button" onClick={() => nav('/flow')} className="btn-nectar hidden sm:inline-flex">
              업무 흐름
            </button>
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
            <button type="button" className="btn-nectar mt-2 w-full" onClick={() => nav('/flow')}>
              업무 흐름
            </button>
            <button type="button" className="btn-nectar mt-2 w-full" onClick={goApp}>
              워크스페이스
            </button>
          </div>
        ) : null}
      </header>

      <HeroStage onFlow={() => nav('/flow')} onWorkspace={goApp} />

      <section className="landing-place">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-[32px] font-semibold tracking-tight sm:text-[40px]">기존 시스템 위에서 변화의 비용 영향을 판단합니다</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-[#555]">
              국내 선박대리점 업무에는 예상 항비 계산, PDA·FDA 정산, 실제 항비 확인과 인보이스 수집이 포함됩니다.
              PACE는 기존 기항관리·DA·ERP의 일정·작업·비용 데이터를 연결해 변화 이후의 비용 영향 판단과 근거 검토를 수행합니다.
            </p>
          </Reveal>
          <div className="landing-steps mt-16">
            {FIELD_PLACE.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08} y={24}>
                <article className={s.highlight ? 'landing-step landing-step-sea' : 'landing-step'}>
                  <span className="landing-step-n">{s.n}</span>
                  <span className="landing-step-role">{s.role}</span>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="landing-place-note">
            PACE는 기존 기항관리·DA·ERP 시스템에 연결되는 Intelligence Layer입니다. 일정·작업·서비스 변화가 어떤 비용과 근거에
            영향을 주는지 분석하고, 검증된 항목부터 Revised PDA와 실제비용 검토로 이어 줍니다.
          </p>
        </div>
      </section>

      <section id="product" className="landing-band landing-band-soft">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-[36px] font-semibold leading-tight tracking-tight sm:text-[46px]">
              기항 변화에서,
              <br />
              실제비용 검산까지
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-[#555]">
              Port Call Change에서 Cost Impact와 Rule Check를 거쳐 Revised PDA와 Next Action을 제안하고, FDA 실제비용과 Evidence를 검산합니다.
            </p>
          </Reveal>
          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-12">
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

      <section className="landing-photos">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="landing-photos-grid">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.1} y={40} className="h-full">
                <article className="landing-photo">
                  <div className="landing-photo-media">
                    <img src={p.img} alt="" className={p.pos} />
                  </div>
                  <div className="landing-photo-body">
                    <div className="landing-photo-n">{p.n}</div>
                    <h3>{p.title}</h3>
                    <p>{p.desc}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="landing-band landing-band-soft">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-[36px] font-semibold tracking-tight sm:text-[46px]">Port Call Change에서 Evidence Assurance까지</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-[#555]">
              AI Cost Review Agent가 Observe → Reason → Check → Recommend → Verify 순서로 변화 이후의 비용 검토를 이어 갑니다.
            </p>
          </Reveal>
          <Reveal className="mt-12" delay={0.08} y={24}>
            <PaceFlow variant="landing" />
          </Reveal>
          <Reveal className="mt-16" delay={0.12} y={40}>
            <FlowVideo onWorkspace={goApp} />
          </Reveal>
        </div>
      </section>

      <section id="scenes" className="landing-band">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-[36px] font-semibold tracking-tight sm:text-[46px]">비용 검토 시나리오</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-[#555]">
              한 기항에서 자주 검토해야 하는 비용변화·근거부족·중복 후보를 업무 상태로 구분합니다.
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
            <p className="mt-3 text-[15px] text-[#2f62c0]">{selected.look}</p>
            <p className="mt-3 text-[16px] font-medium">{selected.result}</p>
            <button type="button" className="btn-nectar mt-10" onClick={() => nav(`/flow?step=${selected.key === 'B' ? 'block' : selected.key === 'C' ? 'dup' : 'mail'}`)}>
              PACE 프로세스 보기
            </button>
          </Reveal>
        </div>
      </section>

      <section id="about" className="bg-white pb-[160px] pt-10">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal y={40}>
            <div className="landing-split">
              <img src="/landing/berth.jpg" alt="선석에서 하역 중인 컨테이너선" />
              <div className="landing-split-copy">
                <h2 className="text-[32px] font-semibold leading-tight sm:text-[40px]">기존 시스템에 연결되는 Intelligence Layer</h2>
                <p className="mt-6 text-[16px] leading-relaxed text-white/90">
                  선박대리점의 DA·정산 담당자와 선사·선박관리사의 운항·재무 담당자가 함께 사용합니다. 기존 시스템에서 변경정보와
                  비용문서를 받아 영향분석, Revised PDA 검토, 실제비용과 근거 확인을 하나의 흐름으로 연결합니다.
                </p>
                <ul className="mt-8 space-y-3 text-[15px] text-white/85">
                  <li>범위: Cost Impact · Rule Check · Revised PDA · Evidence Assurance</li>
                  <li>업무 관계: Port Agency → Principal Operations / Finance</li>
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
            <PaceBrandLogo className="h-8" />
            <p className="mt-4 text-[14px] leading-relaxed text-[#666]">
              기항 변화 이후의 비용 영향, 다음 행동, 실제비용과 근거 검토를 연결합니다.
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
            <div className="text-[14px] font-semibold">소개</div>
            <div className="mt-4 space-y-2 text-[14px] text-[#666]">
              <a href="#about" className="block hover:text-[#1130c6]">
                대상
              </a>
              <p>Port Agency / Principal</p>
              <p>DA 검토 워크스페이스</p>
            </div>
          </div>
        </div>
        <div className="border-t border-[#eee] px-6 py-6 text-[12px] text-[#888]">
          <div className="mx-auto max-w-[1400px]">
            PACE · Port-cost Assurance &amp; Control Engine · Synthetic Demo
          </div>
        </div>
      </footer>
    </div>
  )
}
