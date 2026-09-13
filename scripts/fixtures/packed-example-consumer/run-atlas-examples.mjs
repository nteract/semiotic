import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import * as readers from "semiotic/atlas"
import * as core from "semiotic/atlas/core"
import * as themes from "semiotic/themes/react"
import { renderChartWithEvidence } from "semiotic/server"
import { diagnoseConfig } from "semiotic/ai"
import { atlasStory, atlasStoryNames } from "./atlas-stories.mjs"

const require = createRequire(import.meta.url)
const cjsCore = require("semiotic/atlas/core")
const cjsReaders = require("semiotic/atlas")
const cjsThemes = require("semiotic/themes/react")
for (const id of Object.keys(atlasStoryNames)) {
  const story = atlasStory(id)
  const props = JSON.parse(
    JSON.stringify({
      ...story.props,
      title: atlasStoryNames[id],
      description: story.question,
      summary: story.takeaway,
      accessibleTable: true
    })
  )
  assert.equal(
    diagnoseConfig(story.component, props).ok,
    true,
    `${id}: public diagnostics`
  )
  const result = renderChartWithEvidence(story.component, props)
  assert.ok(result.evidence.markCount > 0, `${id}: retained data marks`)
  assert.ok(!result.evidence.warnings.includes("EMPTY_SCENE"))
  assert.ok(!/NaN|Infinity/.test(result.svg))
  for (const [components, providers] of [
    [readers, themes],
    [cjsReaders, cjsThemes]
  ]) {
    const markup = renderToStaticMarkup(
      createElement(
        providers.ThemeProvider,
        {
          theme: {
            mode: "dark",
            colors: { text: "#123456", surface: "#654321" }
          }
        },
        createElement(components[story.component], props)
      )
    )
    assert.ok(markup.includes('role="img"'), `${id}: accessible reader markup`)
    assert.ok(markup.includes('fill="#123456"'), `${id}: shared text theme`)
    assert.ok(markup.includes('fill="#654321"'), `${id}: shared surface theme`)
  }
  const atlas = props.atlas ?? props.forest?.atlas ?? props.circuit.atlas
  assert.equal(
    core.prepareNetworkAtlas(atlas.spec, atlas.source).atlas.analysisRevision,
    atlas.analysisRevision
  )
  assert.deepEqual(
    cjsCore.prepareNetworkAtlas(atlas.spec, atlas.source),
    core.prepareNetworkAtlas(atlas.spec, atlas.source)
  )
  if (id === "checkout") {
    const value = (measure, subject) =>
      core.ledgerValue(atlas.ledger, measure, subject).value
    assert.equal(
      value("loop-users", "mobile/control") /
        value("assigned", "mobile/control"),
      0.08
    )
    assert.equal(
      value("loop-users", "mobile/treatment") /
        value("assigned", "mobile/treatment"),
      0.3
    )
    assert.equal(
      value("purchases", "mobile/treatment") /
        value("assigned", "mobile/treatment"),
      0.06
    )
    assert.equal(
      value("purchases", "treatment") / value("assigned", "treatment"),
      0.108
    )
  } else if (id === "search") {
    const { inputs } = story.fixture
    assert.equal(inputs.loopingSessions, 10000)
    assert.equal(inputs.catalogEligibleLoopSessions, 6000)
    assert.equal(inputs.loopingPurchases / inputs.loopingSessions, 0.05)
    assert.equal(
      inputs.nonLoopingPurchases /
        (inputs.completedSessions - inputs.loopingSessions),
      0.2
    )
    assert.equal(
      (inputs.loopingPurchases + inputs.nonLoopingPurchases) /
        inputs.completedSessions,
      0.17
    )
    assert.ok(
      core
        .prepareMotifBraid(atlas)
        .groups.some((group) => group.nodePath.length > 3)
    )
  } else if (id === "supplier") {
    assert.ok(
      core.getRequiredPaths(atlas, "A").value.dominatorIds.includes("X")
    )
    const { inputs } = story.fixture
    const allocated = Object.values(inputs.suppliers).reduce((a, b) => a + b, 0)
    assert.equal(
      inputs.dependsOnX.reduce((sum, name) => sum + inputs.suppliers[name], 0) /
        allocated,
      0.75
    )
    assert.equal((allocated - inputs.cExpandableTo) / allocated, 0.7)
    assert.equal(
      (inputs.demandPerWeek * inputs.outputRetentionTargetBps) / 10000 -
        inputs.cExpandableTo,
      4000
    )
  } else {
    const totals = props.reading.entry.totals
    if (id === "etl") {
      assert.equal(totals.capacity, 80000)
      assert.equal(totals.arrivals, 60000)
      assert.equal(totals.completions, 40000)
      assert.equal((totals.arrivals - totals.completions) * 60, 1200000)
    } else {
      assert.equal(totals.roots, 10000)
      assert.equal(totals.attempts, 30000)
      assert.equal(totals.retries, 20000)
      assert.equal(totals.queued, null)
    }
    const packet = core.exportCircuitEvidence(
      props.circuit,
      props.edition,
      props.reading
    )
    assert.equal(packet.analysisRevision, atlas.analysisRevision)
    assert.equal(packet.synthetic, true)
  }
}
console.log(
  "All five Atlas stories reproduce through packed public imports (ESM, CJS, serialized SVG and accessible React markup)."
)
