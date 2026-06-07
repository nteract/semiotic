import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

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
  registerVariantDiscovery,
  getRegisteredVariantDiscovery,
  clearVariantDiscovery,
} from "semiotic/ai"

const unregister = registerVariantDiscovery((component, capability, context) => {
  // propose from your own model / rules
  return [{ id: \`\${component}:my-variant\`, baseComponent: component, source: "model" }]
})

getRegisteredVariantDiscovery() // inspect registered proposers
unregister()                    // or clearVariantDiscovery() to reset all`}</CodeBlock>
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
