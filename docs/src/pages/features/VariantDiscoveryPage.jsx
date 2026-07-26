import React, { useEffect, useMemo, useState } from "react"
import { BoxPlot, RidgelinePlot } from "semiotic"
import {
  getCapability,
  profileData,
  proposeVariant,
  registerVariantDiscovery,
} from "semiotic/ai"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"
import {
  BIMODAL_PROPOSAL_ID,
  bimodalFixture,
  proposeBimodalRidgeline,
} from "../../talkDemos/bimodalVariant"

function BimodalVariantDemo() {
  const [proposerReady, setProposerReady] = useState(false)
  const [showVariant, setShowVariant] = useState(false)
  const profile = useMemo(() => profileData(bimodalFixture.data), [])

  useEffect(() => {
    const unregister = registerVariantDiscovery(proposeBimodalRidgeline)
    setProposerReady(true)
    return () => unregister()
  }, [])

  const proposal = useMemo(() => {
    if (!proposerReady) return null
    const capability = getCapability("BoxPlot")
    if (!capability) return null
    return proposeVariant("BoxPlot", capability, {
      profile,
      intent: "distribution",
    }).find(({ id }) => id === BIMODAL_PROPOSAL_ID)
  }, [profile, proposerReady])

  const proposalProps = useMemo(
    () => proposal?.buildProps?.(profile),
    [profile, proposal]
  )
  const baselineProps = {
    data: bimodalFixture.data,
    categoryAccessor: bimodalFixture.categoryAccessor,
    valueAccessor: bimodalFixture.valueAccessor,
    height: 320,
    title: "Box plot baseline",
  }

  return (
    <div
      style={{
        border: "1px solid var(--surface-3)",
        borderRadius: 10,
        background: "var(--surface-1)",
        padding: 16,
      }}
      data-demo-variant-source={proposal?.source ?? "registering"}
    >
      {showVariant && proposalProps ? (
        <RidgelinePlot
          {...proposalProps}
          height={320}
          title="Ridgeline reveals the separated latency modes"
        />
      ) : (
        <BoxPlot {...baselineProps} />
      )}
      <p style={{ margin: "8px 0", color: "var(--text-secondary)" }}>
        <strong>{proposal?.label ?? "Registering proposer…"}</strong>
        {proposal ? ` — ${proposal.rationale}` : ""}
      </p>
      <button
        type="button"
        disabled={!proposalProps}
        onClick={() => setShowVariant((value) => !value)}
      >
        {showVariant ? "Show BoxPlot baseline" : "Render proposed RidgelinePlot"}
      </button>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 0 }}>
        Hand-written proposer · source <code>{proposal?.source ?? "model"}</code> ·
        confidence {bimodalFixture.modelAssessment.confidence}
      </p>
    </div>
  )
}

export default function VariantDiscoveryPage() {
  return (
    <PageLayout
      title="Variant Discovery & Repair"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence/observation-hooks" },
        { label: "Variant Discovery & Repair", path: "/intelligence/variant-discovery" },
      ]}
      prevPage={{ title: "Vega-Lite Translator", path: "/intelligence/vega-lite" }}
      nextPage={{ title: "Capability Authoring", path: "/intelligence/capability-authoring" }}
    >
      <p>
        <Link to="/intelligence/suggestions">Chart suggestions</Link> rank the
        catalog for a dataset. Two further surfaces go beyond picking a
        component: <strong>variant discovery</strong> proposes and scores
        alternative <em>configurations</em> of a chart (beyond its hand-curated{" "}
        <code>capability.variants</code>), and <strong>repair</strong> critiques
        a chart choice and returns safer alternatives. Both keep the framework's
        generate-then-admit split: a proposer (heuristic or model) suggests; the
        scorer decides whether the suggestion is coherent, safe, and useful.
      </p>

      <h2 id="talk-fixture">Offline model-proposal fixture</h2>
      <p>
        This committed bimodal latency fixture makes the full plug point visible:
        a hand-written external-model result enters through{" "}
        <code>registerVariantDiscovery</code>, proposes{" "}
        <code>RidgelinePlot</code> over the <code>BoxPlot</code> baseline, and
        renders without a model call or network request. The{" "}
        <code>source: "model"</code> field is provenance, not a claim that a live
        frontier model generated this replay.
      </p>
      <BimodalVariantDemo />

      <h2 id="propose">Proposing variants</h2>
      <p>
        <code>proposeVariant(component, capability, context)</code> returns{" "}
        <code>VariantProposal[]</code>: the chart's registered variants as
        explicit proposals, a few conservative heuristic transforms, and
        same-intent cross-family alternatives when the data supports them.
      </p>
      <CodeBlock language="ts">{`import { proposeVariant, getCapability, profileData } from "semiotic/ai"

const data = [ /* … */ ]
const profile = profileData(data)
const capability = getCapability("BarChart")

const proposals = proposeVariant("BarChart", capability, {
  profile,
  intent: "rank",
  // existingVariants defaults to capability.variants
})
// → [{ id, baseComponent, label?, intentDeltas?, rubricDeltas?,
//      buildProps?, rationale?, source, variantKey?, tags? }, …]`}</CodeBlock>
      <p>
        A <code>VariantProposal</code> carries explicit provenance via{" "}
        <code>source</code> (<code>"manual"</code> for registered variants,{" "}
        <code>"heuristic"</code> for built-in transforms, <code>"model"</code>{" "}
        for proposers you register). The optional <code>buildProps(profile,
        audience?)</code> closure lets a proposal construct its own props without
        registering a full capability.
      </p>

      <h2 id="evaluate">Scoring a proposal</h2>
      <p>
        <code>evaluateVariantProposal(proposal, profile, audience?, options?)</code>{" "}
        scores a proposal against the same ingredients the recommender uses —
        the <code>fits()</code> gate, intent scores, rubric deltas, and audience
        bias — and adds discovery-specific <code>novelty</code> and{" "}
        <code>risk</code> channels.
      </p>
      <CodeBlock language="ts">{`import { evaluateVariantProposal } from "semiotic/ai"

const score = evaluateVariantProposal(proposal, profile, audience, {
  intent: "rank",
  baselineComponent: "BarChart",
})
// → { proposalId, fit (0–5), novelty (0–1), risk (0–1), reasons: string[] }`}</CodeBlock>
      <p>
        When the audience declares a non-visual{" "}
        <code>receptionModality</code> (e.g. <code>"screen-reader"</code>),
        scoring audits the proposal's props and folds a receivability penalty
        into <code>fit</code> — so a variant whose meaning can't survive the
        declared channel is ranked down, consistent with{" "}
        <Link to="/intelligence/suggestions">suggestCharts</Link>.
      </p>

      <h2 id="register">Registering a proposer</h2>
      <p>
        The built-in heuristics are a floor, not a ceiling.{" "}
        <code>registerVariantDiscovery(fn)</code> plugs an external heuristic- or
        model-driven proposer into <code>proposeVariant</code>, which dispatches
        through every registered function and de-duplicates by{" "}
        <code>proposal.id</code>. It returns an unregister callback.
      </p>
      <CodeBlock language="ts">{`import {
  proposeVariant, registerVariantDiscovery,
} from "semiotic/ai"

// A captured external-model judgment over the committed fixture.
const modelAssessment = {
  shape: "bimodal",
  rationale: "Two separated latency clusters are hidden by the summary.",
}

const unregister = registerVariantDiscovery((component, _capability, { profile }) => {
  const isFixture =
    profile.primary.category === "service" &&
    profile.primary.y === "latencyMs"
  if (component !== "BoxPlot" || !isFixture || modelAssessment.shape !== "bimodal") return []
  return [{
    id: "RidgelinePlot:bimodal-talk-fixture",
    baseComponent: "RidgelinePlot",
    source: "model",
    intentDeltas: { distribution: 1 },
    buildProps: () => ({
      data, categoryAccessor: "service", valueAccessor: "latencyMs", bins: 40,
    }),
    rationale: modelAssessment.rationale,
  }]
})

const proposals = proposeVariant("BoxPlot", capability, {
  profile, intent: "distribution",
})
unregister()`}</CodeBlock>
      <p>
        This preserves the split between <em>generation</em> and{" "}
        <em>admission</em>: a model proposes freely, and{" "}
        <code>evaluateVariantProposal</code> decides whether the proposal earns a
        place in the ranking. The same path backs the MCP{" "}
        <code>proposeChartVariants</code> tool (see{" "}
        <Link to="/intelligence/cli-mcp">CLI &amp; MCP</Link>); its structured
        output strips the non-serializable <code>buildProps</code> function while
        keeping the computed <code>props</code>.
      </p>

      <h2 id="repair">Repairing a chart choice</h2>
      <p>
        <code>repairChartConfig(component, data, options?)</code> validates that
        a chosen component is a sensible fit for a dataset and, when it isn't,
        returns alternatives that <em>do</em> fit — ranked by intent. The
        contract: a caller can always render <code>alternatives[0]</code> and get
        something useful, and <code>reason</code> is suitable for verbatim
        display.
      </p>
      <CodeBlock language="ts">{`import { repairChartConfig } from "semiotic/ai"

repairChartConfig("PieChart", productData, { intent: "rank" })
// → { status: "alternative",
//     component: "PieChart",
//     reason: "9 slices is too many for a pie chart",
//     alternatives: [ /* BarChart, DotPlot, … as Suggestions */ ] }`}</CodeBlock>
      <p><code>status</code> is one of:</p>
      <ul>
        <li><code>"ok"</code> — the chart fits; ship it.</li>
        <li><code>"alternative"</code> — the chart doesn't fit; <code>reason</code> says why and <code>alternatives</code> are charts that do.</li>
        <li><code>"unknown"</code> — no capability is registered for that component name; <code>alternatives</code> are best-effort defaults.</li>
      </ul>
      <p>
        <code>options</code> accepts <code>intent</code> (ranks the
        alternatives), <code>maxAlternatives</code> (default 3), an{" "}
        <code>audience</code> profile, and a precomputed <code>profile</code>.
        Repair is also exposed as the MCP <code>repairChartConfig</code> tool for
        agent retry loops — propose a chart, repair it, render the survivor.
      </p>
    </PageLayout>
  )
}
