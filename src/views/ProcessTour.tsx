import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SeaBrandLogo } from '../components/SeaLogo'
import { CHANNEL_LABEL, cn, labelOf } from '../components/ui'
import { CONFIRMED } from '../seed'
import { TOUR_STEPS, buildTourCases, type TourStepId } from '../tour'
import type { ExtractedField } from '../types'

function isStep(v: string | null): v is TourStepId {
  return TOUR_STEPS.some((s) => s.id === v)
}

function MailView({
  body,
  span,
}: {
  body: string
  span?: [number, number]
}) {
  if (!span) return <pre className="tour-mail">{body}</pre>
  return (
    <pre className="tour-mail">
      {body.slice(0, span[0])}
      <mark className="sea-span">{body.slice(span[0], span[1])}</mark>
      {body.slice(span[1])}
    </pre>
  )
}

export function ProcessTour() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const cases = useMemo(() => buildTourCases(), [])
  const [focus, setFocus] = useState<ExtractedField | null>(null)
  const [approved, setApproved] = useState(false)
  const raw = params.get('step')
  const step: TourStepId = isStep(raw) ? raw : 'why'
  const idx = TOUR_STEPS.findIndex((s) => s.id === step)
  const meta = TOUR_STEPS[idx] || TOUR_STEPS[0]
  const a = cases.a
  const b = cases.b
  const c = cases.c
  const ex = a.exception
  const prev = ex ? CONFIRMED[ex.voyageId] : undefined

  function go(id: TourStepId) {
    setFocus(null)
    setParams({ step: id }, { replace: true })
  }

  function shift(dir: number) {
    const next = TOUR_STEPS[idx + dir]
    if (next) go(next.id)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      const next = TOUR_STEPS[idx + (e.key === 'ArrowRight' ? 1 : -1)]
      if (!next) return
      setFocus(null)
      setParams({ step: next.id }, { replace: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, setParams])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  const why = (
    <div className="tour-prose">
      <p className="tour-kicker">소개</p>
      <h1>스케줄이 바뀐 뒤, 확인할 일과 통보 준비를 한 전표로 잇습니다.</h1>
      <p>
        스케줄 마스터가 없는 것이 아닙니다. DCSA가 다루는 것은 스케줄·예외의 공유와 취합입니다. 본 안이 설정하는 공백은 그 다음입니다.
        비정형 변경 원문이 들어온 뒤 확정본 비교, 영향 확인, 수신자별 통보 준비가 한 전표로 닫히지 않을 수 있다는 점입니다. SEA는 그
        원문만 읽고, 기존 운항관리를 대체하지 않습니다.
      </p>
      <ol className="tour-story">
        <li>
          <b>받은 원문 읽기</b>
          <span>받은 변경 원문에서 선박, 항차, 시각, 부두를 읽습니다. 발신자는 시드 예시이며 항상 터미널이라고 하지 않습니다.</span>
        </li>
        <li>
          <b>확정본 비교</b>
          <span>달라진 항목만 보여 줍니다. 같은 변경이 다시 수신되면 새 전표를 만들지 않습니다.</span>
        </li>
        <li>
          <b>확인 항목</b>
          <span>접안·연결·내륙에서 담당자가 볼 일을 회사 규칙으로 제시합니다. 위험 확률이 아닙니다.</span>
        </li>
        <li>
          <b>통보 승인</b>
          <span>화주·내륙·내부 초안을 올린 뒤, 담당자 승인 후에만 나갑니다. 원문이 모순이면 발송을 잠급니다. 공모본 발송은 모의입니다.</span>
        </li>
      </ol>
      <p className="tour-note">다음 화면부터 가상 시드 HANARO 2508W 한 건으로 이 순서를 보겠습니다.</p>
    </div>
  )

  const mail = (
    <div className="tour-prose">
      <p className="tour-kicker">수신 · 입구</p>
      <h1>운항팀이 받은 변경 원문입니다. 이 화면의 메일은 가상 시드입니다.</h1>
      <p>
        기항이 바뀌면 항상 터미널이 선사 운항팀에 메일을 준다는 현장 조사 결과가 아닙니다. 스케줄·선석 정보는 선사·대리점·터미널
        등 운영 주체 사이에서 오갈 수 있고, 표준 공유와 별개로 메일·문서 같은 비정형 원문이 들어올 수 있습니다. SEA가 다루는
        것은 그 원문을 받은 뒤의 확인·통보 준비입니다.
      </p>
      <div className="tour-dir">
        <p className="path">시드 수신 경로 예시: 변경 통지 → DEMO LINE 운항팀</p>
        <p>아래 한 통은 입항 시각과 부두 변경이 함께 적힌 공모용 가상 원문입니다. 화주·포워더에게 보내는 메일이 아닙니다.</p>
      </div>
      <p>
        수신 {a.item.receivedAt}. 입항 시각과 부두가 바뀌었고, Cut-off는 원문에 그대로 남아 있습니다. 화주·내륙 안내는 뒤의
        통보 승인에서 초안이 생깁니다.
      </p>
      <div className="tour-card">
        <div className="tour-card-meta">
          <span>{a.item.subject}</span>
          <span>{a.item.fileName}</span>
        </div>
        <MailView body={a.item.body} />
      </div>
    </div>
  )

  const read = (
    <div className="tour-prose">
      <p className="tour-kicker">받은 원문</p>
      <h1>원문에서 항차 정보를 읽습니다.</h1>
      <p>필드를 선택하면 아래 원문에서 근거 위치가 표시됩니다. 원문에 없는 값은 채우지 않습니다.</p>
      <div className="tour-fields">
        {a.fields
          .filter((f) => f.value)
          .map((f) => (
            <button
              key={f.key}
              type="button"
              className={cn('tour-field', focus?.key === f.key && 'is-on')}
              onClick={() => setFocus(f)}
            >
              <span>{f.label}</span>
              <b>{f.value}</b>
            </button>
          ))}
      </div>
      <div className="tour-card">
        <div className="tour-card-meta">원문 근거</div>
        <MailView body={a.item.body} span={focus?.span} />
      </div>
    </div>
  )

  const diff = (
    <div className="tour-prose">
      <p className="tour-kicker">확정본 비교</p>
      <h1>직전 확정본과 비교합니다.</h1>
      <p>달라진 항목과, 원문에 그대로 남은 항목을 함께 보여 줍니다. 비교 기준은 이 항차의 직전 확정본입니다.</p>
      <table className="tour-table">
        <thead>
          <tr>
            <th>항목</th>
            <th>확정본</th>
            <th>이번 원문</th>
            <th>의미</th>
          </tr>
        </thead>
        <tbody>
          {(ex?.changes ?? []).map((ch) => (
            <tr key={ch.key}>
              <td>{ch.label}</td>
              <td className="mono">{ch.previous || '—'}</td>
              <td className="mono">{ch.next || '—'}</td>
              <td>{ch.delta || '변경'}</td>
            </tr>
          ))}
          <tr>
            <td>CY Cut-off</td>
            <td className="mono">{prev?.cutoff || '—'}</td>
            <td className="mono">{ex?.incoming.cutoff || '원문 없음'}</td>
            <td>원문 유지. ETA만으로 Cut-off를 추론하지 않습니다.</td>
          </tr>
          <tr>
            <td>ETB</td>
            <td className="mono">{prev?.etb || '—'}</td>
            <td className="mono">{ex?.incoming.etb || '원문 없음'}</td>
            <td>직전 확정본 ETB. 원문에 없으면 미갱신으로 접안을 다시 봅니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  const check = (
    <div className="tour-prose">
      <p className="tour-kicker">확인 항목</p>
      <h1>담당자가 지금 확인할 일을 제시합니다.</h1>
      <p>
        아래는 회사 운영 규칙입니다. 위험 확률이 아닙니다. 연결 하한 24시간은 프로토타입 Demo Rule이며 산업 문헌값이 아닙니다.
        ETA만으로 Cut-off를 추론하지 않습니다.
      </p>
      <table className="tour-table">
        <thead>
          <tr>
            <th>확인 항목</th>
            <th>Trigger</th>
            <th>이유</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {(ex?.impact ?? []).map((im) => (
            <tr key={im.area}>
              <td>{im.area}</td>
              <td className="mono">{im.trigger}</td>
              <td>{im.reason}</td>
              <td>{labelOf(im.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {ex?.clocks?.length ? (
        <p className="tour-note">
          {ex.clocks
            .filter((c) => c.state !== 'ok' && c.state !== 'na')
            .map((c) => `${c.label}: ${c.detail}`)
            .join(' · ')}
        </p>
      ) : null}
    </div>
  )

  const send = (
    <div className="tour-prose">
      <p className="tour-kicker">통보 승인 · 출구</p>
      <h1>확인한 뒤, 화주·내륙·내부로 보내는 초안입니다.</h1>
      <p>
        앞 화면은 운항팀이 받은 것으로 상정한 가상 원문입니다. 아래는 그 변경을 확인한 뒤 밖으로 보내는 통보 초안입니다. 쓰는
        사람은 컨테이너 선사 운항팀입니다. 포워더용 화면이 아닙니다. 공모본 발송은 모의입니다.
      </p>
      <div className="tour-drafts">
        {a.drafts.map((d) => (
          <article key={d.id}>
            <h2>{CHANNEL_LABEL[d.channel] || d.title}</h2>
            <pre>{d.body}</pre>
          </article>
        ))}
      </div>
      <div className="tour-hitl">
        <label>
          <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
          화주 문장을 확인했습니다.
        </label>
        <p className={approved ? 'ok' : 'wait'}>{approved ? '승인됨 · 실제 발송은 이 화면에서 하지 않습니다.' : '승인 전 · 아직 발송되지 않습니다.'}</p>
      </div>
    </div>
  )

  const block = (
    <div className="tour-prose">
      <p className="tour-kicker">원문 모순</p>
      <h1>원문 시각이 모순이면 발송을 잠급니다.</h1>
      <p>
        가상 시드 B입니다. 같은 원문에 ETA 12:00과 ETB 10:00이 함께 있습니다. 접안이 입항보다 이를 수 없으므로 대외 초안을
        만들지 않습니다. 운영 위험을 단정하지 않고, 담당자가 원문을 다시 확인하도록 발송을 잠급니다.
      </p>
      <div className="tour-lock">{b.exception?.issues[0]?.message || '발송 잠금'}</div>
      <p className="tour-note">대외 초안 {b.drafts.length}건 · 전표 상태 {labelOf(b.exception?.status || 'blocked')}</p>
      <div className="tour-card">
        <div className="tour-card-meta">{b.item.subject}</div>
        <MailView body={b.item.body} />
      </div>
    </div>
  )

  const dup = (
    <div className="tour-prose">
      <p className="tour-kicker">중복 처리</p>
      <h1>같은 변경이 다시 오면 전표를 중복 생성하지 않습니다.</h1>
      <p>
        가상 시드 C입니다. 이미 처리한 입항·부두 변경과 동일한 내용이 재수신되었습니다. 수신 기록은 남기고, 예외 전표는 추가하지
        않습니다.
      </p>
      <div className="tour-dup">
        <div className="tour-card">
          <div className="tour-card-meta">첫 수신</div>
          <p className="mono">{a.item.subject}</p>
          <p>예외 전표가 생성되고, 확인 항목과 통보 초안이 올라갑니다.</p>
        </div>
        <div className="tour-card">
          <div className="tour-card-meta">재수신</div>
          <p className="mono">{c.item.subject}</p>
          <p className="ok">{c.kind === 'duplicate' ? '중복으로 처리 · 새 전표 없음' : c.kind}</p>
        </div>
      </div>
    </div>
  )

  const body =
    step === 'why'
      ? why
      : step === 'mail'
        ? mail
        : step === 'read'
          ? read
          : step === 'diff'
            ? diff
            : step === 'check'
              ? check
              : step === 'send'
                ? send
                : step === 'block'
                  ? block
                  : dup

  return (
    <div className="tour-root">
      <header className="tour-top">
        <button type="button" className="tour-logo" onClick={() => nav('/')} aria-label="SEA 홈">
          <SeaBrandLogo className="h-8" />
        </button>
        <span className="tour-top-title">프로세스 보기</span>
        <span className="tour-top-meta">
          {meta.chapter} · {idx + 1} / {TOUR_STEPS.length}
        </span>
        <button type="button" className="tour-quiet" onClick={() => nav('/')}>
          처음으로
        </button>
      </header>

      <div className="tour-body">
        <aside className="tour-rail">
          <p>가상 시드 한 건이 승인까지 가는 순서입니다.</p>
          <ol>
            {TOUR_STEPS.map((s, i) => (
              <li key={s.id}>
                {i === 0 || TOUR_STEPS[i - 1].chapter !== s.chapter ? <div className="tour-chap">{s.chapter}</div> : null}
                <button type="button" className={cn(s.id === step && 'is-on')} onClick={() => go(s.id)}>
                  <span>{s.n}</span>
                  {s.nav}
                </button>
              </li>
            ))}
          </ol>
        </aside>
        <main className="tour-main">{body}</main>
      </div>

      <footer className="tour-foot">
        <button type="button" className="btn-ghost" disabled={idx === 0} onClick={() => shift(-1)}>
          이전
        </button>
        <span>
          {meta.n} {meta.nav}
        </span>
        {idx === TOUR_STEPS.length - 1 ? (
          <button type="button" className="btn-primary" onClick={() => nav('/')}>
            처음으로
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => shift(1)}>
            다음
          </button>
        )}
      </footer>
    </div>
  )
}
