import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CountHint, EmptyHint, Kpi, Panel, RowNo, TableHead } from '../components/ui'
import { evaluateGold, evaluateLive, evaluateScenarios, formatPct } from '../eval'
import { useSeaStore } from '../store'

export function VerifyPage() {
  const nav = useNavigate()
  const drafts = useSeaStore((s) => s.drafts)
  const exceptions = useSeaStore((s) => s.exceptions)
  const runs = useSeaStore((s) => s.runs)
  const inbox = useSeaStore((s) => s.inbox)
  const sendDenied = useSeaStore((s) => s.sendDenied)
  const gold = useMemo(() => evaluateGold(), [])
  const scenarios = useMemo(() => evaluateScenarios(), [])
  const live = evaluateLive({ drafts, exceptions, runs, inbox, sendDenied })
  const pipe = scenarios.pipeline

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-mute">
        가상 시드 서류로 규칙 추출·예외 판정을 실측한 값입니다. 현장 처리시간 절감·일반화 정확도가 아닙니다. 대표 KPI(예외 처리
        리드타임)는 선사 파일럿 스톱워치로 확정합니다.
      </p>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label="골드셋 필드 일치"
          value={formatPct(gold.hit, gold.total)}
          hint={`${gold.hit}/${gold.total} · 시드 ${gold.documents}건`}
          tone="ok"
        />
        <Kpi
          label="시나리오 검증"
          value={`${scenarios.pass}/${scenarios.total}`}
          hint="A/B/C 포함 규칙 적중"
          tone={scenarios.pass === scenarios.total ? 'ok' : 'bad'}
        />
        <Kpi label="미승인 발송" value={live.unapprovedSent} hint="성공 건수 · 잠금 규칙" tone={live.unapprovedSent ? 'bad' : 'ok'} />
        <Kpi
          label="발송 차단"
          value={live.sendDenied}
          hint="승인 전 발송 시도"
          tone={live.sendDenied ? 'info' : 'default'}
        />
      </div>

      <Panel title="시나리오" padded={false} right={<CountHint n={scenarios.total} />}>
        <table className="erp-table">
          <TableHead>
            <tr>
              <th>No.</th>
              <th>항목</th>
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
                <td className={c.pass ? 'font-semibold text-ok' : 'font-semibold text-bad'}>{c.pass ? 'PASS' : 'FAIL'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="추출 골드셋" padded={false} right={<CountHint n={gold.documents} />}>
        <table className="erp-table">
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
              <tr key={r.id} className="cursor-pointer" onClick={() => nav('/app/inbox')}>
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
      </Panel>

      <Panel title="시드 파이프라인" padded={false} right={<CountHint n={pipe.n} />}>
        {pipe.rows.length === 0 ? (
          <EmptyHint>시드 수신이 없습니다.</EmptyHint>
        ) : (
          <table className="erp-table">
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
      </Panel>

      <Panel title="이번 세션">
        <ul className="space-y-1 text-[13px]">
          <li>
            HITL 수정 {live.hitlEdited}/{live.hitlTotal} · 초안과 승인문이 다른 화주·내륙 건
          </li>
          <li>
            세션 골드셋 {live.goldTotal ? `${live.goldHit}/${live.goldTotal} (${formatPct(live.goldHit, live.goldTotal)})` : '처리 후 집계'} ·
            수신 처리 {live.runCount}건
          </li>
          <li>
            엔진 처리시간 중앙값 {live.medianElapsedMs == null ? '—' : `${live.medianElapsedMs} ms`} · 담당자 리드타임이 아님
          </li>
          <li>
            중복 수신 {live.duplicates} · 차단 전표 {live.blocked}
          </li>
        </ul>
      </Panel>
    </div>
  )
}
