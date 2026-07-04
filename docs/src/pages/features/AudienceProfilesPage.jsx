import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

export default function AudienceProfilesPage() {
  return (
    <PageLayout
      title="Audience Profiles"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence/observation-hooks" },
        { label: "Audience Profiles", path: "/intelligence/audience-profiles" },
      ]}
      prevPage={{ title: "Capability Authoring", path: "/intelligence/capability-authoring" }}
      nextPage={{ title: "CLI & MCP", path: "/intelligence/cli-mcp" }}
    >
      <p>
        The same dataset should rank differently for an executive, an analyst,
        and an on-call engineer — they read different charts fluently and the org
        wants them to grow in different directions. An <code>AudienceProfile</code>{" "}
        is the artifact that carries that knowledge. It is owned by the consuming
        organization, not the library: Semiotic provides the <em>structure</em>{" "}
        through which audience knowledge influences recommendations; the org
        supplies the knowledge — and the rationale.
      </p>

      <h2 id="shape">The profile</h2>
      <CodeBlock language="ts">{`import type { AudienceProfile } from "semiotic/ai"

const onCallReliability: AudienceProfile = {
  name: "On-call Reliability",        // surfaces in suggestion reasons

  // Per-chart familiarity (1..5) — overrides the descriptor's rubric.familiarity.
  // Charts not listed fall back to the descriptor.
  familiarity: { LineChart: 5, Heatmap: 4, BoxPlot: 3, ProcessSankey: 2 },

  // Adoption targets — which charts the org is growing or retiring, and WHY.
  targets: {
    BoxPlot: {
      direction: "increase",
      weight: 2,
      reason: "duration distributions matter more than average duration",
    },
    PieChart: { direction: "decrease", weight: 1 },
  },

  // Stretch-pick visibility: 0 = familiar-only, 1 = surface stretches
  // (default when an audience is set), 2 = widen what counts as a stretch.
  exposureLevel: 1,
}`}</CodeBlock>

      <h2 id="bias">How it shapes suggestions</h2>
      <p>
        Pass the profile to <Link to="/intelligence/suggestions">suggestCharts</Link>{" "}
        (and it flows into <Link to="/intelligence/scale">scale-aware</Link>{" "}
        suggestions and <Link to="/intelligence/variant-discovery">variant scoring</Link>).
        Two terms compose onto the fit-driven score:
      </p>
      <ul>
        <li>
          <strong>Familiarity bias</strong> — a chart the audience reads well is
          nudged up; an unfamiliar one down. Strong enough to reorder close
          calls, not strong enough to override <code>fits()</code> correctness.
        </li>
        <li>
          <strong>Target bias</strong> — an <code>increase</code> target wins
          near-ties; a <code>decrease</code> target falls back unless it's the
          only fit. <code>weight</code> (1–3) sets the magnitude.
        </li>
      </ul>
      <CodeBlock language="ts">{`import { suggestCharts } from "semiotic/ai"

const ranked = suggestCharts(data, {
  intent: "distribution",
  audience: onCallReliability,
})
// BoxPlot is nudged up (target); its suggestion.reasons names the
// audience policy that fired, so the bias is inspectable, not hidden.`}</CodeBlock>

      <h2 id="stretch">Stretch picks</h2>
      <p>
        <code>exposureLevel</code> governs whether the engine surfaces{" "}
        <em>stretch picks</em> — unfamiliar-but-relevant charts that grow literacy
        when the data and a declared target justify them. Stretch picks are the
        systematic version of "ship the unfamiliar chart that taught the org to
        see something new," shown <em>alongside</em> the familiar pick with their
        rationale and caveats so the trade-off is explicit.
      </p>

      <h2 id="receivability">Reception modality</h2>
      <p>
        <code>receptionModality</code> declares the channel the audience receives
        charts through — <code>"visual"</code> (default),{" "}
        <code>"screen-reader"</code>, <code>"sonified"</code>, or{" "}
        <code>"agent"</code>. When non-visual, <code>suggestCharts</code> audits
        each candidate and down-ranks charts whose meaning doesn't survive that
        channel (an 8-slice pie for a screen reader), adding the audit's findings
        to <code>caveats</code>. Familiarity and receivability are separate
        axes — a chart can be familiar yet unreceivable.
      </p>
      <CodeBlock language="ts">{`const screenReaderAudience: AudienceProfile = {
  name: "Screen-reader users",
  receptionModality: "screen-reader",
}
// suggestCharts(data, { intent: "part-to-whole", audience: screenReaderAudience })
// → a dense pie is down-ranked; its caveats explain why.`}</CodeBlock>

      <h2 id="governance">Governance</h2>
      <p>
        Audience profiles influence what people see, so they carry
        responsibilities — these keep audience calibration from becoming
        paternalism:
      </p>
      <ul>
        <li>
          <strong>Separate current familiarity from desired direction.</strong>{" "}
          "This audience currently reads heatmaps poorly" (<code>familiarity</code>)
          is different from "we don't want them to learn heatmaps." The latter is
          a <code>targets</code> decision, made explicitly.
        </li>
        <li>
          <strong>Require rationale for targets.</strong> A target without a{" "}
          <code>reason</code> is a hidden design ideology. The reason surfaces in
          suggestion <code>reasons[]</code> so it's contestable.
        </li>
        <li>
          <strong>Keep the model inspectable.</strong> Because the profile is a
          serializable artifact and the bias surfaces in reasons, "executives
          don't get box plots" can never be an invisible default — it's a line
          someone wrote and can revise.
        </li>
        <li>
          <strong>Treat stretch picks as curricular exposure, not novelty</strong>{" "}
          — and don't let low initial engagement auto-demote a chart that serves
          an explicit literacy goal.
        </li>
      </ul>

      <h2 id="helpers">Helpers</h2>
      <p>
        The pure functions behind the bias are exported for custom recommenders
        and tooling:
      </p>
      <ul>
        <li><code>applyAudienceBias(baseScore, rubric, component, audience, receivability?)</code> — the familiarity + target (+ receivability) bias used by <code>suggestCharts</code>.</li>
        <li><code>receivabilityBias(audit, modality)</code> — turns an accessibility audit into a score delta + caveats for a non-visual channel.</li>
        <li><code>effectiveFamiliarity(component, defaultFamiliarity, audience)</code> — the resolved familiarity for a chart under a profile.</li>
        <li><code>stretchFamiliarityCeiling(audience)</code> — the familiarity threshold below which a chart counts as a "stretch."</li>
      </ul>

      <p>
        Related: <Link to="/intelligence/suggestions">Chart Suggestions</Link> ·{" "}
        <Link to="/intelligence/scale">Scale-Aware Suggestions</Link> ·{" "}
        <Link to="/intelligence/capability-authoring">Capability Authoring</Link>{" "}
        · <Link to="/accessibility/audit">Chartability Audit</Link>
      </p>
    </PageLayout>
  )
}
