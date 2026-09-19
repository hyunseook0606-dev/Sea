import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CountHint, EmptyHint, Kpi, Panel, RowNo, TableHead } from '../components/ui'
import { EXTRACTOR_LABEL, LOCAL_EXTRACTORS, type LocalExtractorId } from '../extractor'
import { evaluateGoldByExtractor, evaluateLive, evaluateScenariosByExtractor } from '../eval'
import { evaluateOpsExperiments, shortLabel } from '../experiments'
import { VERIFY_QUESTIONS } from '../guide'
import rawMetrics from '../models/sea-metrics.json'
import { useSeaStore } from '../store'

type Prf = { precision: number; recall: number; f1: number; tp?: number; fp?: number; fn?: number }
type SplitScore = {
  hit: number
  total: number
  pct: number
  micro?: Prf
  macro_f1?: number
  by_field?: Record<string, Prf>
}
type SplitBlock = { n: number; rules: SplitScore; sea: SplitScore; hybrid: SplitScore }
type EpochRow = {
  epoch: number
  train_token_acc?: number
  train_seq_updates?: number
  val_micro_f1?: number
  val_field_pct?: number
  easy_field_pct?: number
  hard_field_pct?: number
}
type Safety = { hallucinated_cutoff?: { n: number; d: number; pct: number }; wrong_berth?: { n: number; d: number; pct: number } }
type SeaMetrics = {
  protocol?: string
  train_n: number
  note: string
  best_epoch?: number
  best_val_micro_f1?: number
  legacy_v1?: { hard_sea_field_match: number; hard_rules_field_match: number; note: string }
  epochs?: EpochRow[]
  easy: SplitBlock
  hard: SplitBlock
  test_ood_easy?: SplitBlock
  test_ood_hard?: SplitBlock
  safety_ood_hard_sea?: Safety
}

const metrics = rawMetrics as SeaMetrics

function More({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-sm border border-line bg-panel">
      <summary className="cursor-pointer px-3 py-2 text-[13px] font-semibold text-ink">{title}</summary>
      <div className="border-t border-line p-4">{children}</div>
    </details>
  )
}

export function VerifyPage() {
  const nav = useNavigate()
  const drafts = useSeaStore((s) => s.drafts)
  const exceptions = useSeaStore((s) => s.exceptions)
  const runs = useSeaStore((s) => s.runs)
  const inbox = useSeaStore((s) => s.inbox)
  const sendDenied = useSeaStore((s) => s.sendDenied)
  const goldBy = useMemo(() => evaluateGoldByExtractor(), [])
  const scenariosBy = useMemo(() => evaluateScenariosByExtractor(), [])
  const ops = useMemo(() => evaluateOpsExperiments(), [])
  const live = evaluateLive({ drafts, exceptions, runs, inbox, sendDenied })
  const [goldView, setGoldView] = useState<LocalExtractorId>('rules')
  const gold = goldBy[goldView]
  const scenarios = scenariosBy.rules
  const pipe = scenarios.pipeline
  const epochs = metrics.epochs ?? []
  const ood = metrics.test_ood_hard
  const safety = metrics.safety_ood_hard_sea
  const { sensitivity, propagation, safety: opsSafety } = ops
  const reviewTone = (label: string) => {
    if (label.includes('부족')) return 'font-semibold text-bad'
    if (label.includes('연결')) return 'text-[#b45309]'
    if (label.includes('ETA') || label.includes('ETB') || label.includes('내륙')) return 'text-[#2f62c0]'
    return 'text-mute'
  }
  const row = (label: string, block: SplitBlock) => (
    <tr>
      <td>{label}</td>
      <td>
        {block.rules.hit}/{block.rules.total} ({block.rules.pct}%)
      </td>
      <td>
        {block.sea.hit}/{block.sea.total} ({block.sea.pct}%)
      </td>
      <td>
        {block.hybrid.hit}/{block.hybrid.total} ({block.hybrid.pct}%)
      </td>
      <td>{block.rules.micro ? `${block.rules.micro.f1}` : '—'}</td>
      <td>{block.sea.micro ? `${block.sea.micro.f1}` : '—'}</td>
      <td>{block.n}</td>
    </tr>
  )

  return (
    <div className="space-y-3">
      <Panel title="이 화면이 하는 일">
        <p className="text-[13px] leading-relaxed text-[#3d4654]">
          업무 화면이 아닙니다. 가상 시드·합성 문장으로 시연 A/B/C가 <b>실제로 그렇게 도는지</b>를 숫자로 보여 줍니다. 산업
          통계·현장 정확도가 아닙니다. 아래 네 가지만 순서대로 보면 됩니다. 학습 곡선·영문 지표는 맨 아래 접힌 칸에 있습니다.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {VERIFY_QUESTIONS.map((q) => (
            <a key={q.id} href={`#verify-${q.id}`} className="block border border-line bg-[#f7fafc] px-3 py-2 hover:bg-white">
              <div className="text-[12px] font-semibold text-[#2f62c0]">
                {q.n} {q.title}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-[#3d4654]">{q.plain}</p>
              <p className="mt-1 text-[11px] text-mute">{q.not}</p>
            </a>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label="처음 보는 문장에서 필드 추출"
          value={ood?.sea.micro ? `${ood.sea.micro.f1}` : '—'}
          hint={`SEA vs 규칙 ${ood?.rules.micro?.f1 ?? '—'} · 가상 200건`}
          tone="ok"
        />
        <Kpi
          label="시연 문장 슬롯 (규칙)"
          value={`${goldBy.rules.hit}/${goldBy.rules.total}`}
          hint="시연문이 규칙에 맞게 작성됨 · 현장 정확도 아님"
        />
        <Kpi
          label="시연 A/B/C 통제 (규칙)"
          value={`${scenarios.pass}/${scenarios.total}`}
          hint="정상 변경 · 모순 잠금 · 중복 억제"
          tone={scenarios.pass === scenarios.total ? 'ok' : 'bad'}
        />
        <Kpi
          label="미승인 발송"
          value={live.unapprovedSent}
          hint="성공 0건이 목표"
          tone={live.unapprovedSent ? 'bad' : 'ok'}
        />
      </div>

      <div id="verify-read" className="scroll-mt-2">
      <Panel title="① 원문을 얼마나 읽는가">
        <p className="text-[13px] leading-relaxed text-[#3d4654]">
          {VERIFY_QUESTIONS[0].plain} 런타임 기본은 하이브리드입니다. 시연 11건은 규칙 추출기가 읽도록 쓰여 있어, 규칙 경로가
          슬롯을 다 맞춥니다. 그 숫자를 현장 일반화로 읽지 않습니다.
        </p>
        <table className="erp-table mt-3">
          <TableHead>
            <tr>
              <th>추출 방식</th>
              <th>시연 문장 슬롯</th>
              <th>시연 통제</th>
              <th>이 경로가 만든 전표</th>
            </tr>
          </TableHead>
          <tbody>
            {LOCAL_EXTRACTORS.map((id) => {
              const g = goldBy[id]
              const s = scenariosBy[id]
              const c = s.pipeline.counts
              return (
                <tr key={id}>
                  <td>{EXTRACTOR_LABEL[id]}</td>
                  <td className="font-mono text-[12px]">
                    {g.hit}/{g.total}
                  </td>
                  <td className={s.pass === s.total ? 'font-semibold text-ok' : 'font-semibold text-bad'}>
                    {s.pass}/{s.total}
                  </td>
                  <td className="text-[12px] text-mute">
                    예외 {c.exception || 0} · 차단 {c.blocked || 0} · 중복 {c.duplicate || 0} · 무변경 {c.unchanged || 0} · 미매칭{' '}
                    {c.unmatched || 0}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-2 text-[12px] text-mute">
          하이브리드는 A·C를 유지하고, B는 ETB를 놓치면 잠금이 안 걸리며 NURI는 ETA 오추출로 전표가 생깁니다. 둘 다 아래 ②의 실패
          사례입니다.
        </p>
      </Panel>
      </div>

      <div id="verify-drift" className="scroll-mt-2">
      <Panel title="② 잘못 읽으면 일이 어떻게 틀어지는가" padded={false}>
        <p className="px-3 pt-3 text-[13px] leading-relaxed text-[#3d4654]">
          {VERIFY_QUESTIONS[1].plain} 표에서 색이 들어간 칸은 정답 필드와 다른 전표가 나온 경우입니다.
        </p>
        <div className="mx-3 mt-3 grid gap-2 md:grid-cols-2">
          <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
            <b>NURI.</b> 원문 ETA 07:00 / ETD 20:00. 정답 경로에서는 변경이 없습니다. SEA가 출항 시각을 입항으로 읽으면 예외 전표가
            생기고 ETA +13시간으로 보입니다.
          </div>
          <div className="border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-relaxed text-red-800">
            <b>B.</b> 원문 ETA 12:00 / ETB 10:00. 규칙 경로는 발송을 막습니다. SEA가 ETB를 놓치면 잠금이 걸리지 않습니다.
          </div>
        </div>
        <table className="erp-table mt-3">
          <TableHead>
            <tr>
              <th>No.</th>
              <th>수신</th>
              <th>정답이면</th>
              <th>규칙</th>
              <th>SEA</th>
              <th>하이브리드</th>
              <th>SEA가 켠 확인</th>
            </tr>
          </TableHead>
          <tbody>
            {propagation.rows.map((r, i) => (
              <tr key={r.id} className={r.id === 'IN-NURI' || r.id === 'IN-B' ? 'bg-[#fff7ed]' : undefined}>
                <td>
                  <RowNo n={i + 1} />
                </td>
                <td className="font-mono text-[12px]">{r.id}</td>
                <td>{r.goldKindLabel}</td>
                <td className={r.byExtractor.rules.driftedFromGold ? 'font-semibold text-bad' : undefined}>{r.byExtractor.rules.kindLabel}</td>
                <td className={r.byExtractor.sea.driftedFromGold ? 'font-semibold text-bad' : undefined}>{r.byExtractor.sea.kindLabel}</td>
                <td className={r.byExtractor.hybrid.driftedFromGold ? 'font-semibold text-bad' : undefined}>
                  {r.byExtractor.hybrid.kindLabel}
                </td>
                <td className="max-w-[220px] truncate text-[12px] text-mute">{r.byExtractor.sea.headline || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      </div>

      <div id="verify-rules" className="scroll-mt-2">
      <Panel title="③ 규칙이 바뀌면 확인 항목이 어떻게 바뀌는가">
        <p className="text-[13px] leading-relaxed text-[#3d4654]">
          {VERIFY_QUESTIONS[2].plain} HANARO 2508W를 기준으로, 가로=다음 항차까지 여유, 세로=입항이 얼마나 늦었는지입니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-mute">
          <span>모니터 = 아직 확인 항목 없음</span>
          <span className="text-[#2f62c0]">ETA = 검토 창(6시간) 초과</span>
          <span className="text-[#b45309]">연결 = 다음 항차 간격이 Demo Rule(24시간)보다 짧음</span>
          <span className="font-semibold text-bad">부족 = 연결 여유가 없음</span>
        </div>
        <p className="mt-2 text-[12px] text-mute">
          ETA만으로 Cut-off를 추론하지 않습니다. ({sensitivity.r6NeverFires ? '이 표 전 칸에서 미발화' : '발화됨'})
        </p>
        <div className="mt-3 overflow-auto">
          <table className="erp-table">
            <TableHead>
              <tr>
                <th>ETA 지연 \ 연결 여유</th>
                {sensitivity.slackHours.map((h) => (
                  <th key={h}>{h}h</th>
                ))}
              </tr>
            </TableHead>
            <tbody>
              {sensitivity.etaHours.map((eta, i) => (
                <tr key={eta}>
                  <td className="font-mono text-[12px]">+{eta}h</td>
                  {sensitivity.matrix[i].map((label, j) => (
                    <td key={`${eta}-${sensitivity.slackHours[j]}`} className={`text-[12px] ${reviewTone(label)}`}>
                      {shortLabel(label)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <table className="erp-table mt-3">
          <TableHead>
            <tr>
              <th>추가 조건</th>
              <th>켜지는 확인</th>
              <th>전표 요약</th>
              <th>Cut-off 추론</th>
            </tr>
          </TableHead>
          <tbody>
            {sensitivity.extras.map((c) => (
              <tr key={`${c.etaDelta}-${c.berthChanged}-${c.etbUpdated}`}>
                <td>
                  ETA +{c.etaDelta}h · 여유 {c.slackHours}h
                  {c.berthChanged ? ' · T2→T3' : ''}
                  {c.etbUpdated ? '' : ' · 직전 확정본 ETB 미갱신'}
                </td>
                <td>{c.label}</td>
                <td className="text-[12px] text-mute">{c.headline}</td>
                <td>{c.r6 ? '켜짐' : '없음'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      </div>

      <div id="verify-lock" className="scroll-mt-2">
      <Panel title="④ 잘못된 안내가 밖으로 나가는가" padded={false} right={<CountHint n={opsSafety.total} />}>
        <p className="px-3 pt-3 text-[13px] leading-relaxed text-[#3d4654]">{VERIFY_QUESTIONS[3].plain}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 px-3 xl:grid-cols-4">
          <Kpi label="발송 차단 시도" value={live.sendDenied} hint="승인 전 발송" tone={live.sendDenied ? 'info' : 'default'} />
          <Kpi label="초안을 고친 건" value={`${live.hitlEdited}/${live.hitlTotal}`} hint="화주·내륙" />
          <Kpi
            label="엔진 처리(참고)"
            value={live.medianElapsedMs == null ? '—' : `${live.medianElapsedMs} ms`}
            hint="담당자 리드타임 아님"
          />
          <Kpi
            label="잠금 검사"
            value={`${opsSafety.pass}/${opsSafety.total}`}
            hint="하이브리드 B 실패는 ②"
            tone={opsSafety.checks.filter((c) => c.id !== 'B-hybrid').every((c) => c.pass) ? 'ok' : 'bad'}
          />
        </div>
        <table className="erp-table mt-3">
          <TableHead>
            <tr>
              <th>No.</th>
              <th>잠금</th>
              <th>결과</th>
              <th>판정</th>
            </tr>
          </TableHead>
          <tbody>
            {opsSafety.checks.map((c, i) => (
              <tr key={c.id}>
                <td>
                  <RowNo n={i + 1} />
                </td>
                <td>{c.title}</td>
                <td className="text-[12px] text-mute">{c.detail}</td>
                <td className={c.pass ? 'font-semibold text-ok' : 'font-semibold text-bad'}>{c.pass ? '통과' : '실패'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="erp-table mt-0">
          <TableHead>
            <tr>
              <th>No.</th>
              <th>시연 통제 (규칙 엔진)</th>
              <th>결과</th>
              <th>판정</th>
            </tr>
          </TableHead>
          <tbody>
            {scenarios.checks.map((c, i) => (
              <tr key={c.id}>
                <td>
                  <RowNo n={i + 1} />
                </td>
                <td>{c.title}</td>
                <td className="text-[12px] text-mute">{c.detail}</td>
                <td className={c.pass ? 'font-semibold text-ok' : 'font-semibold text-bad'}>{c.pass ? '통과' : '실패'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      </div>

      <More title="연구용 숫자 · 접어두기 (학습 분할, 곡선, 시드 상세)">
        <p className="mb-3 text-[12px] text-mute">
          처음 보는 문장 패턴(OOD)과 본 템플릿 패밀리(ID)를 나눕니다. 동결 v1 디코이 필드일치{' '}
          {metrics.legacy_v1?.hard_sea_field_match ?? 95.6}는 같은 문장 틀을 테스트에 넣어 고른 값이라 일반화로 쓰지 않습니다.{' '}
          {metrics.note}
        </p>
        <table className="erp-table">
          <TableHead>
            <tr>
              <th>분할</th>
              <th>규칙 일치</th>
              <th>SEA 일치</th>
              <th>하이브리드 일치</th>
              <th>규칙 F1</th>
              <th>SEA F1</th>
              <th>n</th>
            </tr>
          </TableHead>
          <tbody>
            {row('같은 문장 틀 · 쉬움', metrics.easy)}
            {row('같은 문장 틀 · 어려움', metrics.hard)}
            {metrics.test_ood_easy ? row('처음 보는 틀 · 쉬움', metrics.test_ood_easy) : null}
            {ood ? row('처음 보는 틀 · 어려움', ood) : null}
          </tbody>
        </table>
        <p className="mt-2 text-[12px] text-mute">
          학습 {metrics.train_n}건 · 검증 점수가 가장 좋았던 에폭 {metrics.best_epoch ?? '—'} (F1 {metrics.best_val_micro_f1 ?? '—'}
          ).
          {safety?.wrong_berth
            ? ` 처음 보는 틀에서 부두 오추출 ${safety.wrong_berth.n}/${safety.wrong_berth.d} (SEA). 원문에 없는 Cut-off ${safety.hallucinated_cutoff?.n}/${safety.hallucinated_cutoff?.d}. 합성 안전 플래그이며 상용 0%가 아닙니다.`
            : ''}
        </p>

        {epochs.length ? (
          <table className="erp-table mt-3">
            <TableHead>
              <tr>
                <th>에폭</th>
                <th>학습 토큰 정확도</th>
                <th>시퀀스 갱신</th>
                <th>검증 F1</th>
                <th>검증 필드일치</th>
              </tr>
            </TableHead>
            <tbody>
              {epochs.map((e) => (
                <tr key={e.epoch}>
                  <td>{e.epoch}</td>
                  <td>{e.train_token_acc ?? '—'}%</td>
                  <td>{e.train_seq_updates ?? '—'}</td>
                  <td>{e.val_micro_f1 ?? e.hard_field_pct ?? '—'}</td>
                  <td>{e.val_field_pct ?? e.easy_field_pct ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <div className="mt-3 flex gap-1">
          {LOCAL_EXTRACTORS.map((id) => (
            <button
              key={id}
              type="button"
              className={goldView === id ? 'btn-primary py-1' : 'btn-ghost py-1'}
              onClick={() => setGoldView(id)}
            >
              {EXTRACTOR_LABEL[id]}
            </button>
          ))}
        </div>
        <table className="erp-table mt-2">
          <TableHead>
            <tr>
              <th>No.</th>
              <th>수신</th>
              <th>제목</th>
              <th>일치</th>
              <th>누락</th>
            </tr>
          </TableHead>
          <tbody>
            {gold.rows.map((r, i) => (
              <tr key={`${r.extractor}-${r.id}`} className="cursor-pointer" onClick={() => nav('/app/inbox')}>
                <td>
                  <RowNo n={i + 1} />
                </td>
                <td className="font-mono text-[12px]">{r.id}</td>
                <td className="max-w-[320px] truncate">{r.subject}</td>
                <td className="font-mono text-[12px]">
                  {r.hit}/{r.total}
                </td>
                <td className="text-[12px] text-mute">
                  {r.misses.length ? r.misses.map((m) => `${m.label} ${m.expect}≠${m.got}`).join(' · ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pipe.rows.length === 0 ? (
          <EmptyHint>시드 수신이 없습니다.</EmptyHint>
        ) : (
          <table className="erp-table mt-3">
            <TableHead>
              <tr>
                <th>No.</th>
                <th>수신</th>
                <th>제목</th>
                <th>판정</th>
                <th>내용</th>
              </tr>
            </TableHead>
            <tbody>
              {pipe.rows.map((r, i) => (
                <tr key={r.id}>
                  <td>
                    <RowNo n={i + 1} />
                  </td>
                  <td className="font-mono text-[12px]">{r.id}</td>
                  <td className="max-w-[280px] truncate">{r.subject}</td>
                  <td>{r.kindLabel}</td>
                  <td className="max-w-[280px] truncate text-[12px] text-mute">{r.headline || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[12px] text-mute">
          이번 세션: 초안 수정 {live.hitlEdited}/{live.hitlTotal} · 수신 처리 {live.runCount}건 · 중복 {live.duplicates} · 차단{' '}
          {live.blocked}
        </p>
      </More>
    </div>
  )
}
