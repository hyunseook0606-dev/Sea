import { useNavigate, useParams } from 'react-router-dom'
import { CountHint, EmptyHint, Panel, RowNo, StatusPill, TableHead } from '../components/ui'
import { formatHours, hoursBetween } from '../clocks'
import { useSeaStore } from '../store'

export function BoardPage() {
  const nav = useNavigate()
  const voyages = useSeaStore((s) => s.voyages)
  const confirmed = useSeaStore((s) => s.confirmed)
  const rows = voyages
    .map((v) => ({ v, sch: confirmed[v.id] }))
    .filter((x) => x.sch?.eta)
    .sort((a, b) => (a.sch?.eta || '').localeCompare(b.sch?.eta || ''))
  return (
    <Panel title="기항현황" padded={false} right={<CountHint n={rows.length} />}>
      {rows.length === 0 ? (
        <EmptyHint>확정 기항이 없습니다.</EmptyHint>
      ) : (
        <table className="erp-table">
          <TableHead>
            <tr>
              <th>No.</th>
              <th>선박 / 항차</th>
              <th>터미널</th>
              <th>ETA</th>
              <th>ETB</th>
              <th>ETD</th>
              <th>체류</th>
              <th>연결</th>
              <th>연결 여유</th>
            </tr>
          </TableHead>
          <tbody>
            {rows.map((row, i) => {
              const next = row.v.connectingVoyageId ? voyages.find((x) => x.id === row.v.connectingVoyageId) : undefined
              const nextSch = next ? confirmed[next.id] : undefined
              const slack = nextSch && row.sch ? hoursBetween(row.sch.etd || row.sch.eta, nextSch.etd || nextSch.eta) : null
              return (
                <tr key={row.v.id} className="cursor-pointer" onClick={() => nav(`/app/voyages/${row.v.id}`)}>
                  <td>
                    <RowNo n={i + 1} />
                  </td>
                  <td>
                    {row.v.vessel} <span className="font-mono text-[12px]">{row.v.voyage}</span>
                  </td>
                  <td>
                    {row.v.port} / {row.v.terminal}
                  </td>
                  <td className="font-mono text-[12px]">{row.sch?.eta}</td>
                  <td className="font-mono text-[12px]">{row.sch?.etb || '—'}</td>
                  <td className="font-mono text-[12px]">{row.sch?.etd}</td>
                  <td className="font-mono text-[12px]">{formatHours(hoursBetween(row.sch?.eta, row.sch?.etd))}</td>
                  <td>{next ? `${next.vessel} ${next.voyage}` : '—'}</td>
                  <td className="font-mono text-[12px]">{formatHours(slack)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

export function VoyageDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const voyages = useSeaStore((s) => s.voyages)
  const confirmed = useSeaStore((s) => s.confirmed)
  const history = useSeaStore((s) => s.confirmedHistory)
  const exceptions = useSeaStore((s) => s.exceptions)
  const v = voyages.find((x) => x.id === id)
  if (!v) {
    return (
      <div className="border border-line bg-panel py-16 text-center text-[13px] text-mute">
        항차가 없습니다.{' '}
        <button className="font-semibold text-[#2f62c0]" onClick={() => nav('/app/voyages')}>
          목록
        </button>
      </div>
    )
  }
  const sch = confirmed[v.id]
  const next = v.connectingVoyageId ? voyages.find((x) => x.id === v.connectingVoyageId) : undefined
  const nextSch = next ? confirmed[next.id] : undefined
  const related = exceptions.filter((e) => e.voyageId === v.id)
  const versions = history.filter((h) => h.voyageId === v.id)
  return (
    <div className="space-y-3">
      <Panel title={`${v.vessel} ${v.voyage}`}>
        <table className="erp-table">
          <tbody>
            <tr>
              <td className="text-mute">항로</td>
              <td>{v.service}</td>
            </tr>
            <tr>
              <td className="text-mute">기항</td>
              <td>
                {v.port} / {v.terminal} {sch?.berth}
              </td>
            </tr>
            <tr>
              <td className="text-mute">ETA / ETB / ETD</td>
              <td className="font-mono text-[12px]">
                {sch?.eta || '—'} · {sch?.etb || '—'} · {sch?.etd || '—'}
              </td>
            </tr>
            <tr>
              <td className="text-mute">체류</td>
              <td className="font-mono text-[12px]">{formatHours(hoursBetween(sch?.eta, sch?.etd))}</td>
            </tr>
            <tr>
              <td className="text-mute">CY Cut-off</td>
              <td className="font-mono text-[12px]">{sch?.cutoff || '원문 없음'}</td>
            </tr>
            <tr>
              <td className="text-mute">연결 항차</td>
              <td>
                {next ? (
                  <button className="text-[#2f62c0] hover:underline" onClick={() => nav(`/app/voyages/${next.id}`)}>
                    {next.vessel} {next.voyage}
                  </button>
                ) : (
                  '—'
                )}
                {nextSch ? ` · 여유 ${formatHours(hoursBetween(sch?.etd || sch?.eta, nextSch.etd || nextSch.eta))}` : ''}
              </td>
            </tr>
            <tr>
              <td className="text-mute">상태</td>
              <td>
                <StatusPill value={v.status} />
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>
      <Panel title="이 항차 예외" padded={false} right={<CountHint n={related.length} />}>
        {related.length === 0 ? (
          <EmptyHint>예외가 없습니다.</EmptyHint>
        ) : (
          <table className="erp-table">
            <TableHead>
              <tr>
                <th>예외번호</th>
                <th>여유</th>
                <th>상태</th>
              </tr>
            </TableHead>
            <tbody>
              {related.map((e) => (
                <tr key={e.id} className="cursor-pointer" onClick={() => nav(`/app/exceptions/${e.id}`)}>
                  <td className="font-mono text-[12px]">{e.id}</td>
                  <td className="text-[12px]">{e.reviewHeadline}</td>
                  <td>
                    <StatusPill value={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <Panel title="확정본 버전" padded={false} right={<CountHint n={versions.length} />}>
        <table className="erp-table">
          <TableHead>
            <tr>
              <th>시각</th>
              <th>주체</th>
              <th>내용</th>
            </tr>
          </TableHead>
          <tbody>
            {versions.map((ver) => (
              <tr key={ver.id}>
                <td className="font-mono text-[12px]">{ver.at}</td>
                <td>{ver.actor}</td>
                <td>{ver.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

export function VesselsPage() {
  const vessels = useSeaStore((s) => s.vessels)
  const voyages = useSeaStore((s) => s.voyages)
  return (
    <Panel title="선박" padded={false} right={<CountHint n={vessels.length} />}>
      <table className="erp-table">
        <TableHead>
          <tr>
            <th>No.</th>
            <th>선박</th>
            <th>IMO</th>
            <th>항로</th>
            <th>선적</th>
            <th>항차 수</th>
          </tr>
        </TableHead>
        <tbody>
          {vessels.map((vs, i) => (
            <tr key={vs.id}>
              <td>
                <RowNo n={i + 1} />
              </td>
              <td>{vs.name}</td>
              <td className="font-mono text-[12px]">{vs.imo}</td>
              <td>{vs.service}</td>
              <td>{vs.flag}</td>
              <td className="font-mono text-[12px]">{voyages.filter((v) => v.vessel === vs.name).length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

export function PartiesPage() {
  const parties = useSeaStore((s) => s.parties)
  const CHANNEL: Record<string, string> = { shipper: '화주', inland: '내륙', internal: '내부' }
  return (
    <Panel title="거래처" padded={false} right={<CountHint n={parties.length} />}>
      <table className="erp-table">
        <TableHead>
          <tr>
            <th>No.</th>
            <th>구분</th>
            <th>이름</th>
            <th>연락</th>
            <th>터미널</th>
          </tr>
        </TableHead>
        <tbody>
          {parties.map((p, i) => (
            <tr key={p.id}>
              <td>
                <RowNo n={i + 1} />
              </td>
              <td>{CHANNEL[p.kind] || p.kind}</td>
              <td>{p.name}</td>
              <td className="font-mono text-[12px]">{p.contact}</td>
              <td>{p.terminal || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

export function TerminalsPage() {
  const terminals = useSeaStore((s) => s.terminals)
  const voyages = useSeaStore((s) => s.voyages)
  return (
    <Panel title="터미널" padded={false} right={<CountHint n={terminals.length} />}>
      <table className="erp-table">
        <TableHead>
          <tr>
            <th>코드</th>
            <th>이름</th>
            <th>항구</th>
            <th>평균 체류(참고)</th>
            <th>항차</th>
            <th>출처</th>
          </tr>
        </TableHead>
        <tbody>
          {terminals.map((t) => (
            <tr key={t.code}>
              <td className="font-mono text-[12px]">{t.code}</td>
              <td>{t.name}</td>
              <td>{t.port}</td>
              <td className="font-mono text-[12px]">{t.turnaroundDays}일</td>
              <td className="font-mono text-[12px]">{voyages.filter((v) => v.terminal === t.code).length}</td>
              <td className="text-[12px] text-mute">{t.cite}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[12px] text-mute">평균 체류는 이 항차 확정본의 ETD−ETA와 비교하는 참고값입니다. 임계로 쓰지 않습니다.</p>
    </Panel>
  )
}
