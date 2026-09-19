import model from './models/sea-extractor.json'
import { extractFromSource, makeField, normalizeCutoff, normalizeTime } from './extract'
import type { ExtractedField, FieldKey } from './types'

type Weights = Record<string, number>

const WEIGHTS = model.weights as Weights
const LABELS = model.labels as string[]

const GAZ_PORTS = new Set(['BUSAN', 'INCHEON', 'GWANGYANG', 'PUSAN', '부산', '인천', '광양', 'KRPUS', 'KRINC', 'KRKAN'])
const GAZ_TERM = new Set(['PNC', 'PNIT', 'HJNC', 'BPT', 'HPNT', 'BNCT', 'PNCT'])
const GAZ_VESSEL = new Set([
  'HANARO',
  'BLUE',
  'OCEAN',
  'EASTERN',
  'WIND',
  'NURI',
  'HAEDONG',
  'SEAHAN',
  'BUSAN',
  'STAR',
  'ORION',
  'PACIFIC',
  'GREEN',
  'WAVE',
  'INCHEON',
  'SEA',
  'PIONEER',
  'MV',
])

const TOKEN_RE = /[A-Za-z0-9]+|[가-힣]+|[^\s]/gu
const VOY_RE = /^\d{4}[EWNS]$/i
const TIME_RE = /^(\d{1,2}:\d{2}|\d{4})$/
const BERTH_RE = /^T\d$/i
const IMO_RE = /^\d{7}$/
const KEYS: FieldKey[] = ['vessel', 'voyage', 'imo', 'port', 'unlocode', 'terminal', 'berth', 'eta', 'etb', 'etd', 'cutoff']

function tokenize(text: string): Array<{ tok: string; a: number; b: number }> {
  return [...text.matchAll(TOKEN_RE)].map((m) => ({
    tok: m[0],
    a: m.index ?? 0,
    b: (m.index ?? 0) + m[0].length,
  }))
}

function shape(tok: string) {
  return [...tok.slice(0, 12)]
    .map((ch) => {
      if (ch >= 'A' && ch <= 'Z') return 'A'
      if (ch >= 'a' && ch <= 'z') return 'a'
      if (ch >= '0' && ch <= '9') return '9'
      return '.'
    })
    .join('')
}

function features(tokens: string[], i: number) {
  const w = tokens[i]
  const wl = w.toLowerCase()
  const feats = [
    'bias',
    `w=${wl}`,
    `sh=${shape(w)}`,
    `pre=${wl.slice(0, 3)}`,
    `suf=${wl.slice(-3)}`,
    `dig=${/^\d+$/.test(w) ? 1 : 0}`,
    `voy=${VOY_RE.test(w) ? 1 : 0}`,
    `term=${GAZ_TERM.has(w.toUpperCase()) ? 1 : 0}`,
    `ves=${GAZ_VESSEL.has(w.toUpperCase()) ? 1 : 0}`,
    `port=${GAZ_PORTS.has(w.toUpperCase()) ? 1 : 0}`,
    `berth=${BERTH_RE.test(w) ? 1 : 0}`,
    `imo=${IMO_RE.test(w) ? 1 : 0}`,
    `time=${TIME_RE.test(w) ? 1 : 0}`,
    `hy=${w.includes('-') ? 1 : 0}`,
  ]
  if (i > 0) {
    const pw = tokens[i - 1].toLowerCase()
    feats.push(`pw=${pw}`, `psh=${shape(tokens[i - 1])}`, `big=${pw}|${wl}`)
  } else feats.push('bos')
  if (i + 1 < tokens.length) {
    feats.push(`nw=${tokens[i + 1].toLowerCase()}`, `nsh=${shape(tokens[i + 1])}`)
  } else feats.push('eos')
  return feats
}

function emit(feats: string[], lab: string) {
  let s = 0
  for (const f of feats) s += WEIGHTS[`${lab}\t${f}`] || 0
  return s
}

function trans(prev: string, lab: string) {
  return WEIGHTS[`TR\t${prev}|${lab}`] || 0
}

function viterbi(featSeq: string[][]) {
  if (!featSeq.length) return [] as string[]
  const n = featSeq.length
  const dp: number[][] = Array.from({ length: n }, () => Array(LABELS.length).fill(-1e18))
  const bp: number[][] = Array.from({ length: n }, () => Array(LABELS.length).fill(0))
  for (let j = 0; j < LABELS.length; j++) {
    dp[0][j] = emit(featSeq[0], LABELS[j]) + trans('*', LABELS[j])
  }
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < LABELS.length; j++) {
      const e = emit(featSeq[i], LABELS[j])
      let best = -1e18
      let bi = 0
      for (let p = 0; p < LABELS.length; p++) {
        const val = dp[i - 1][p] + trans(LABELS[p], LABELS[j]) + e
        if (val > best) {
          best = val
          bi = p
        }
      }
      dp[i][j] = best
      bp[i][j] = bi
    }
  }
  let last = 0
  for (let j = 1; j < LABELS.length; j++) if (dp[n - 1][j] > dp[n - 1][last]) last = j
  const path = Array(n)
  for (let i = n - 1; i >= 0; i--) {
    path[i] = LABELS[last]
    last = bp[i][last]
  }
  return path
}

function decodeRaw(text: string): Partial<Record<FieldKey, string>> {
  const toks = tokenize(text)
  if (!toks.length) return {}
  const tokens = toks.map((t) => t.tok)
  const labs = viterbi(tokens.map((_, i) => features(tokens, i)))
  const fields: Partial<Record<FieldKey, string>> = {}
  let i = 0
  while (i < labs.length) {
    const lab = labs[i]
    if (lab.startsWith('B-')) {
      const key = lab.slice(2) as FieldKey
      const start = toks[i].a
      let end = toks[i].b
      let j = i + 1
      while (j < labs.length && labs[j] === `I-${key}`) {
        end = toks[j].b
        j += 1
      }
      fields[key] = text.slice(start, end).trim()
      i = j
      continue
    }
    i += 1
  }
  if (fields.port) {
    const p = fields.port.toUpperCase()
    if (p === '부산' || p === 'PUSAN' || p === 'KRPUS') fields.port = 'BUSAN'
    else if (p === '인천' || p === 'KRINC') fields.port = 'INCHEON'
    else if (p === '광양' || p === 'KRKAN') fields.port = 'GWANGYANG'
    else fields.port = p
  }
  if (fields.terminal) fields.terminal = fields.terminal.toUpperCase()
  if (fields.berth) fields.berth = fields.berth.toUpperCase()
  if (fields.voyage) fields.voyage = fields.voyage.toUpperCase()
  return fields
}

export function extractWithSea(body: string, receivedAt?: string): ExtractedField[] {
  const raw = decodeRaw(body)
  const port = raw.port || ''
  const unlocode = port === 'BUSAN' ? 'KRPUS' : port === 'INCHEON' ? 'KRINC' : port === 'GWANGYANG' ? 'KRKAN' : ''
  return [
    makeField('vessel', (raw.vessel || '').replace(/\s+/g, ' ').trim(), body, raw.vessel || ''),
    makeField('voyage', raw.voyage || '', body, raw.voyage || ''),
    makeField('imo', raw.imo || '', body, raw.imo || ''),
    makeField('port', port, body, raw.port || ''),
    makeField('unlocode', unlocode, body, unlocode),
    makeField('terminal', raw.terminal || '', body, raw.terminal || ''),
    makeField('berth', raw.berth || '', body, raw.berth || ''),
    makeField('eta', normalizeTime(raw.eta, body, receivedAt), body, raw.eta || ''),
    makeField('etb', normalizeTime(raw.etb, body, receivedAt), body, raw.etb || ''),
    makeField('etd', normalizeTime(raw.etd, body, receivedAt), body, raw.etd || ''),
    makeField('cutoff', normalizeCutoff(raw.cutoff, body, receivedAt), body, raw.cutoff || ''),
  ]
}

export function extractHybrid(body: string, receivedAt?: string): ExtractedField[] {
  const sea = extractWithSea(body, receivedAt)
  const rules = extractFromSource(body, receivedAt)
  return KEYS.map((key) => {
    const s = sea.find((f) => f.key === key)!
    const r = rules.find((f) => f.key === key)!
    if (s.value) return { ...s, sourceNote: 'SEA' }
    if (r.value) return { ...r, sourceNote: '규칙' }
    return r
  })
}
