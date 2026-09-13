import type { ExtractedField, FieldKey, InboxItem, ScheduleFields } from './types'

const LABELS: Record<FieldKey, string> = {
  vessel: '선박',
  voyage: '항차',
  imo: 'IMO',
  port: '기항지',
  unlocode: 'UNLOCODE',
  terminal: '터미널',
  berth: '부두',
  eta: 'ETA',
  etb: 'ETB',
  etd: 'ETD',
  cutoff: 'CY Cut-off',
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

const PORTS: Array<[RegExp, string, string]> = [
  [/부산신항|부산|PUSAN|BUSAN|KRPUS/i, 'BUSAN', 'KRPUS'],
  [/인천|INCHEON|KRINC/i, 'INCHEON', 'KRINC'],
  [/광양|GWANGYANG|KRKAN/i, 'GWANGYANG', 'KRKAN'],
  [/상하이|SHANGHAI|CNSHA/i, 'SHANGHAI', 'CNSHA'],
  [/오사카|OSAKA|JPOSA/i, 'OSAKA', 'JPOSA'],
]

const TERMINALS = /\b(PNC|PNIT|HJNC|BPT|HPNT|BNCT|PNCT)\b/i

function pick(body: string, re: RegExp): string | undefined {
  return body.match(re)?.[1]?.trim()
}

function spanOf(body: string, snippet: string): [number, number] | undefined {
  if (!snippet) return undefined
  const i = body.toLowerCase().indexOf(snippet.toLowerCase())
  if (i < 0) return undefined
  return [i, i + snippet.length]
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function stamp(d: Date, h: number, m: number) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(h)}:${pad(m)} LT`
}

function parseReceived(receivedAt?: string): Date | undefined {
  if (!receivedAt) return undefined
  const t = Date.parse(receivedAt.replace(' ', 'T'))
  if (Number.isNaN(t)) return undefined
  const d = new Date(t)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function contextDate(body: string, receivedAt?: string): Date {
  const mdy = body.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(20\d{2})(?!\s*LT)/i)
  if (mdy) {
    const mon = MONTHS[mdy[2].slice(0, 3).toLowerCase()]
    return new Date(Number(mdy[3]), mon, Number(mdy[1]))
  }
  const md = body.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i)
  if (md) {
    const year = parseReceived(receivedAt)?.getFullYear() || 2026
    return new Date(year, MONTHS[md[2].slice(0, 3).toLowerCase()], Number(md[1]))
  }
  const iso = body.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const kr = body.match(/(\d{4})?년?\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (kr) {
    const year = kr[1] ? Number(kr[1]) : parseReceived(receivedAt)?.getFullYear() || 2026
    return new Date(year, Number(kr[2]) - 1, Number(kr[3]))
  }
  return parseReceived(receivedAt) || new Date(2026, 8, 12)
}

function parseClock(raw: string): { h: number; m: number } | undefined {
  const colon = raw.match(/(\d{1,2}):(\d{2})/)
  if (colon) return { h: Number(colon[1]), m: Number(colon[2]) }
  const compact = raw.match(/\b(\d{2})(\d{2})\s*LT\b/i) || raw.match(/\b(\d{4})\s*LT\b/i) || raw.match(/\b(\d{4})\s*$/)
  if (compact) {
    const hhmm = compact[1].length === 4 ? compact[1] : `${compact[1]}${compact[2] || ''}`
    if (hhmm.length === 4) {
      const h = Number(hhmm.slice(0, 2))
      const m = Number(hhmm.slice(2))
      if (h <= 23 && m <= 59) return { h, m }
    }
  }
  return undefined
}

export function normalizeTime(raw: string | undefined, body: string, receivedAt?: string): string {
  if (!raw) return ''
  if (/20\d{2}-\d{2}-\d{2}/.test(raw)) {
    const iso = raw.match(/(20\d{2}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/)
    if (iso) {
      const clock = parseClock(iso[2])
      if (clock) {
        const [y, mo, d] = iso[1].split('-').map(Number)
        return stamp(new Date(y, mo - 1, d), clock.h, clock.m)
      }
    }
    return raw.replace(/\s*LT$/i, '') + (raw.includes('LT') ? ' LT' : ' LT')
  }
  const clock = parseClock(raw)
  if (!clock) return raw.trim()
  const nearby = raw.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)
  const ctx = nearby
    ? new Date(contextDate(body, receivedAt).getFullYear(), MONTHS[nearby[2].slice(0, 3).toLowerCase()], Number(nearby[1]))
    : contextDate(body, receivedAt)
  return stamp(ctx, clock.h, clock.m)
}

export function normalizeCutoff(raw: string | undefined, body: string, receivedAt?: string): string {
  if (!raw) return ''
  const asTime = normalizeTime(raw, body, receivedAt)
  if (/20\d{2}-\d{2}-\d{2}/.test(asTime)) return asTime.replace(' LT', '')
  return raw.trim()
}

function field(key: FieldKey, value: string, body: string, snippet: string): ExtractedField {
  return {
    key,
    label: LABELS[key],
    value,
    sourceNote: value ? '원문' : '미추출',
    span: snippet ? spanOf(body, snippet) : undefined,
    verified: Boolean(value && snippet && body.toLowerCase().includes(snippet.toLowerCase())),
  }
}

function parseCsvRow(body: string): Partial<Record<FieldKey, string>> {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2 || !lines[0].includes(',')) return {}
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const values = lines[1].split(',').map((v) => v.trim())
  const map: Partial<Record<FieldKey, string>> = {}
  const alias: Record<string, FieldKey> = {
    vessel: 'vessel',
    선박: 'vessel',
    voyage: 'voyage',
    항차: 'voyage',
    imo: 'imo',
    port: 'port',
    항구: 'port',
    terminal: 'terminal',
    터미널: 'terminal',
    berth: 'berth',
    부두: 'berth',
    eta: 'eta',
    etb: 'etb',
    etd: 'etd',
    cutoff: 'cutoff',
    'cut-off': 'cutoff',
  }
  headers.forEach((h, i) => {
    const key = alias[h]
    if (key && values[i]) map[key] = values[i]
  })
  return map
}

function parseLabeled(body: string, label: string): string | undefined {
  return pick(body, new RegExp(`${label}\\s*[:：]\\s*([^\\n]+)`, 'i'))
}

export function extractFromSource(body: string, receivedAt?: string): ExtractedField[] {
  const csv = parseCsvRow(body)
  const revisedEta =
    pick(body, /revised\s+ETA\s+(\d{1,2}\s+[A-Za-z]{3}(?:\s+20\d{2}(?!\s*LT))?\s+\d{4}\s*LT|\d{4}\s*LT|\d{1,2}:\d{2})/i) ||
    pick(body, /ETA[^\n]*?(?:→|->|=>)\s*(?:revised\s+ETA\s+)?([0-9]{4}\s*LT|[0-9]{1,2}:[0-9]{2}|20\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2})/i) ||
    pick(body, /입항\s*예정[^\n]*?(?:→|->)\s*([^\n]+)/i)
  const etaRaw =
    csv.eta ||
    revisedEta ||
    parseLabeled(body, 'ETA') ||
    pick(body, /\bETA\s+(\d{1,2}\s+[A-Za-z]{3}(?:\s+20\d{2}(?!\s*LT))?\s+\d{4}\s*LT|\d{4}\s*LT|\d{1,2}:\d{2}|20\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2})/i) ||
    pick(body, /입항\s*예정[:\s]+([^\n]+)/i)

  const vessel =
    csv.vessel ||
    parseLabeled(body, '선박') ||
    pick(body, /\b(MV\s+[A-Z][A-Z0-9\- ]{1,24}?)(?:\s*\/|\s+Voy|\s*$)/im) ||
    pick(body, /\bVessel\s*[:：]\s*([^\n]+)/i) ||
    ''
  const voyage =
    csv.voyage ||
    parseLabeled(body, '항차') ||
    pick(body, /\bVoy(?:age)?\s*[:#]?\s*([0-9]{4}[A-Z])/i) ||
    pick(body, /\b([0-9]{4}[EWNS])\b/) ||
    ''
  const imo = csv.imo || pick(body, /\bIMO\s*[:#]?\s*(\d{7})\b/i) || ''
  const terminal = (csv.terminal || parseLabeled(body, '터미널') || pick(body, TERMINALS) || '').toUpperCase()
  const portHit = PORTS.find(([re]) => re.test(body) || (csv.port && re.test(csv.port)))
  const port = csv.port
    ? PORTS.find(([re]) => re.test(csv.port || ''))?.[1] || csv.port.toUpperCase()
    : portHit?.[1] || (terminal ? 'BUSAN' : '')
  const unlocode = portHit?.[2] || (port === 'BUSAN' ? 'KRPUS' : '')
  const berthAfter =
    pick(body, /Berth(?:\s+change)?\s+T\d\s*(?:→|->|=>)\s*(T\d)/i) ||
    pick(body, /부두[^\n]*?(?:→|->)\s*(T\d)/i)
  const berth = (csv.berth || berthAfter || parseLabeled(body, '부두') || pick(body, /\bBerth\s+(T\d)/i) || pick(body, /\b(T[1-9])\b/) || '').toUpperCase()
  const etb = csv.etb || parseLabeled(body, 'ETB') || pick(body, /\bETB\s+([0-9]{1,2}:[0-9]{2}|[0-9]{4}\s*LT)/i)
  const etd = csv.etd || parseLabeled(body, 'ETD') || pick(body, /\bETD\s+(\d{1,2}\s+[A-Za-z]{3}(?:\s+20\d{2}(?!\s*LT))?\s+\d{4}\s*LT|\d{1,2}:\d{2}|\d{4}\s*LT|20\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2})/i)
  const cutoffRaw =
    csv.cutoff ||
    pick(body, /CY cutoff remains\s+([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4})/i) ||
    pick(body, /(?:CY\s*)?(?:Cut-?off|cutoff)\s*(?:remains|:|：)?\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4}(?:\s+[0-9]{4})?|20\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2}[^\n]*)/i) ||
    pick(body, /반입\s*마감[:\s]+([^\n]+)/i)

  const etaNorm = normalizeTime(etaRaw, body, receivedAt)
  return [
    field('vessel', vessel.replace(/\s+/g, ' ').trim(), body, vessel),
    field('voyage', voyage, body, voyage),
    field('imo', imo, body, imo),
    field('port', port, body, csv.port || portHit?.[1] || ''),
    field('unlocode', unlocode, body, unlocode),
    field('terminal', terminal, body, terminal),
    field('berth', berth, body, berth),
    field('eta', etaNorm, body, etaRaw || ''),
    field('etb', normalizeTime(etb, body, receivedAt), body, etb || ''),
    field('etd', normalizeTime(etd, body, receivedAt), body, etd || ''),
    field('cutoff', normalizeCutoff(cutoffRaw, body, receivedAt), body, cutoffRaw || ''),
  ]
}

export function fieldsFromLlmJson(raw: Record<string, string>, body: string): ExtractedField[] {
  const g = (k: FieldKey) => (raw[k] || '').trim()
  return (Object.keys(LABELS) as FieldKey[]).map((key) => field(key, g(key), body, g(key)))
}

export function filledCount(fields: ExtractedField[]): number {
  return fields.filter((f) => f.value).length
}

export function scoreGold(fields: ExtractedField[], gold?: Partial<ScheduleFields>): { hit: number; total: number } {
  if (!gold) return { hit: 0, total: 0 }
  const keys = Object.keys(gold) as FieldKey[]
  let hit = 0
  let total = 0
  for (const key of keys) {
    const expect = (gold[key] || '').trim()
    if (!expect) continue
    total += 1
    const got = (fields.find((f) => f.key === key)?.value || '').trim()
    if (normVal(got) === normVal(expect) || normVal(got).includes(normVal(expect)) || normVal(expect).includes(normVal(got))) hit += 1
  }
  return { hit, total }
}

function normVal(s: string) {
  return s.toUpperCase().replace(/\s+/g, ' ').replace(' LT', '').trim()
}

export function goldOf(item: InboxItem) {
  return item.gold
}

export { LABELS }
