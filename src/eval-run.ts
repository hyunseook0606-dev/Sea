import { LOCAL_EXTRACTORS } from './extractor'
import { evaluateSeed } from './eval'
import { evaluateOpsExperiments, shortLabel } from './experiments'

const r = evaluateSeed()
const ops = evaluateOpsExperiments()
const gold = Object.fromEntries(
  LOCAL_EXTRACTORS.map((id) => {
    const g = r.goldByExtractor[id]
    return [
      id,
      {
        hit: g.hit,
        total: g.total,
        slots: `${g.hit}/${g.total}`,
        documents: g.documents,
        misses: g.rows.filter((row) => row.misses.length).map((row) => ({ id: row.id, misses: row.misses })),
      },
    ]
  }),
)
const scenarios = Object.fromEntries(
  LOCAL_EXTRACTORS.map((id) => {
    const s = r.scenariosByExtractor[id]
    return [
      id,
      {
        pass: s.pass,
        total: s.total,
        checks: s.checks,
        pipeline: s.pipeline.counts,
      },
    ]
  }),
)

const { sensitivity, propagation, safety } = ops
const matrixShort = sensitivity.matrix.map((row) => row.map((label) => shortLabel(label)))

console.log(
  JSON.stringify(
    {
      note: 'Seed smoke + ops experiments. Not a generalization score. Do not report gold as 100%. Sensitivity is review triggers, not risk %.',
      gold,
      scenarios,
      propagation: {
        note: propagation.note,
        documents: propagation.documents,
        driftCounts: propagation.driftCounts,
        inventedCutoff: propagation.inventedCutoff,
        nuri: propagation.nuri,
        drifted: propagation.rows
          .filter((row) => LOCAL_EXTRACTORS.some((id) => row.byExtractor[id].driftedFromGold))
          .map((row) => ({
            id: row.id,
            gold: row.goldKindLabel,
            rules: row.byExtractor.rules.kindLabel,
            sea: row.byExtractor.sea.kindLabel,
            hybrid: row.byExtractor.hybrid.kindLabel,
            seaHeadline: row.byExtractor.sea.headline,
          })),
      },
      sensitivity: {
        note: sensitivity.note,
        policy: sensitivity.policy,
        etaHours: sensitivity.etaHours,
        slackHours: sensitivity.slackHours,
        r6NeverFires: sensitivity.r6NeverFires,
        matrix: sensitivity.matrix,
        matrixShort,
        extras: sensitivity.extras.map((c) => ({
          etaDelta: c.etaDelta,
          slackHours: c.slackHours,
          berthChanged: c.berthChanged,
          etbUpdated: c.etbUpdated,
          label: c.label,
          headline: c.headline,
          r6: c.r6,
        })),
      },
      safety: {
        note: safety.note,
        pass: `${safety.pass}/${safety.total}`,
        checks: safety.checks,
      },
    },
    null,
    2,
  ),
)
