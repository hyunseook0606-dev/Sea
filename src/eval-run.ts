import { evaluateSeed, formatPct } from './eval'

const r = evaluateSeed()
const out = {
  gold: {
    documents: r.gold.documents,
    hit: r.gold.hit,
    total: r.gold.total,
    pct: formatPct(r.gold.hit, r.gold.total),
    misses: r.gold.rows.filter((row) => row.misses.length).map((row) => ({ id: row.id, misses: row.misses })),
  },
  scenarios: {
    pass: r.scenarios.pass,
    total: r.scenarios.total,
    checks: r.scenarios.checks,
  },
  pipeline: r.scenarios.pipeline.counts,
}
console.log(JSON.stringify(out, null, 2))
