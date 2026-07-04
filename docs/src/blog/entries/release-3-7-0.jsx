/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        3.7.0 is the receivability release. Semiotic already had chart
        recommendation, chart interrogation, and native annotations; this version
        tightens the question that comes after "can an agent make a chart?" The
        chart now has to explain itself to a reader, expose a traversable
        structure, carry annotation provenance, and give agents safer ways to
        repair or vary a proposal. Full release notes are on{" "}
        <a
          href="https://github.com/nteract/semiotic/blob/main/CHANGELOG.md#370---2026-06-07"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      <h2 id="reader-grounding">Reader Grounding</h2>
      <p>
        The core accessibility and agent-readable surfaces are now explicit APIs.
        <code>auditAccessibility()</code> and{" "}
        <code>formatAccessibilityAudit()</code> grade chart configs against
        Chartability-style heuristics. <code>describeChart()</code> produces a
        layered description, <code>buildReaderGrounding()</code> bundles
        description, intent, and structure, and{" "}
        <code>buildNavigationTree()</code>, <code>AccessibleNavTree</code>, and{" "}
        <code>useNavigationSync()</code> expose a chart as a WAI-ARIA tree that
        can stay synchronized with canvas focus.
      </p>
      <p>
        The docs now surface that same intelligence on chart pages through
        at-a-glance grounding panels, with dedicated references for{" "}
        <Link to="/accessibility/audit">accessibility audit</Link>,{" "}
        <Link to="/accessibility/descriptions">chart descriptions</Link>,{" "}
        <Link to="/accessibility/navigation">structured navigation</Link>, and{" "}
        <Link to="/intelligence/reader-grounding">agent-reader grounding</Link>.
      </p>

      <h2 id="annotations">Annotations Become Design Objects</h2>
      <p>
        Annotations moved from "things the chart can draw" toward "things the
        chart can help place, explain, filter, and defend."{" "}
        <code>autoPlaceAnnotations</code> now composes collision-aware placement,
        curved connector routing, density budgets, progressive disclosure,
        responsive shedding, redundant association cues, cohesion modes,
        audience-aware amount, and defensive notes. Per-annotation{" "}
        <code>emphasis</code> establishes hierarchy, and provenance confidence
        supplies a stable reading order when hierarchy is not explicit.
      </p>
      <p>
        <code>AnnotationProvenance</code> and <code>AnnotationLifecycle</code>{" "}
        carry actor, evidence, confidence, stable identity, freshness, editorial
        status, and supersession metadata. The helpers{" "}
        <code>applyAnnotationLifecycle</code>, <code>applyAnnotationStatus</code>,
        and <code>filterAnnotationsByStatus</code> keep visual treatment,
        descriptions, and structured navigation aligned on the current set of
        notes. The new docs sections for{" "}
        <Link to="/annotations/design-guidance">annotation design guidance</Link>{" "}
        and{" "}
        <Link to="/annotations/provenance-lifecycle">
          provenance and lifecycle
        </Link>{" "}
        show the intended workflow.
      </p>

      <h2 id="agent-workflows">Agent Workflows</h2>
      <p>
        The AI surface gets more useful when an authoring session is treated as
        a session instead of one prompt. <code>enableConversationArc()</code>,{" "}
        <code>useConversationArc()</code>, <code>summarizeArc()</code>, durable
        sinks, and replay helpers expose an opt-in event stream for suggestions,
        interrogation, navigation, export, and annotation-status changes.{" "}
        <Link to="/intelligence/conversation-arc">Conversation Arc</Link> is the
        place to start if you want to persist that context.
      </p>
      <p>
        Variant discovery and repair also moved into the public surface.{" "}
        <code>proposeVariant()</code> emits registered variants, conservative
        heuristic transforms, and same-intent cross-family alternatives;{" "}
        <code>evaluateVariantProposal()</code> scores fit, novelty, risk, rubric
        deltas, and audience bias. <code>repairChartConfig()</code> critiques a
        proposed chart choice and returns safer alternatives for agent retry
        loops. MCP exposes both workflows through <code>proposeChartVariants</code>{" "}
        and <code>repairChartConfig</code>. The docs for{" "}
        <Link to="/intelligence/variant-discovery">variant discovery and repair</Link>{" "}
        cover the full path.
      </p>

      <h2 id="value-entry">A Value Entry Point</h2>
      <p>
        <Link to="/charts/big-number">BigNumber</Link> ships under{" "}
        <code>semiotic/value</code> as the catalog's focal-value answer: a KPI,
        scorecard, or headline number with formatting, thresholds, comparison,
        target, staleness, push-buffer, and slot APIs. It intentionally renders
        no chart family itself; <code>trendSlot</code> and <code>chartSlot</code>{" "}
        let consumers compose a sparkline, donut, scatterplot, or custom element
        without pulling those bundles into <code>semiotic/value</code>.
      </p>

      <h2 id="docs-and-gates">Docs And Gates</h2>
      <p>
        The docs now use the same intelligence APIs the package exports. The{" "}
        <Link to="/choose">Choose a Chart</Link> front door ranks the catalog by
        dataset, intent, and audience, then proposes reshapes that unlock charts
        a flat profile cannot already fit. Playground state is shareable in the
        URL, live examples copy the real rendered props instead of display
        stubs, and <code>llms.txt</code> is generated from the chart catalog.
      </p>
      <p>
        Release quality gates now check docs coverage, prop-table drift,
        playground control drift, generated LLM docs, capability coverage, and
        a broader SSR/CSR visual parity matrix. The goal is boring but important:
        the hand-authored docs should stay aligned with the canonical chart
        registry.
      </p>

      <h2 id="fixes">Fixes Worth Calling Out</h2>
      <ul>
        <li>
          Default tick and axis font size moved from 10px to 12px so shipped
          defaults clear the Chartability legibility floor.
        </li>
        <li>
          Hook-order regressions across loading, empty, and data transitions
          were fixed across the HOC catalog.
        </li>
        <li>
          Animated network charts no longer crash when parents pass fresh inline
          function props on each render.
        </li>
        <li>
          Annotation rendering now handles callout circles and rectangles
          consistently, including connector disable, opacity, and dash metadata.
        </li>
        <li>
          <code>linkedHover={`{{ mode: "series" }}`}</code> resolves series
          identity automatically, with <code>seriesField</code> as the override.
        </li>
      </ul>

      <h2 id="upgrade-notes">Upgrade Notes</h2>
      <p>
        Most of 3.7.0 is additive. The main visible change is typography:
        default tick and axis labels are now 12px, so visual snapshots and tight
        chart layouts may shift. If you need the previous look, set{" "}
        <code>theme.typography.tickSize</code> or{" "}
        <code>--semiotic-tick-font-size</code>.
      </p>
      <p>
        If you consume the AI schema programmatically, update expectations to
        version <code>3.7.0</code> and 47 chart schemas. The annotation lifecycle
        and status helpers only filter or restyle notes when you opt into those
        helpers, and the hook-order and network fixes are intended to remove
        crashes without changing the public prop contracts.
      </p>
    </>
  )
}

export default {
  slug: "release-3-7-0",
  title: "Semiotic 3.7.0",
  subtitle:
    "The receivability release: reader-grounded charts, structured navigation, annotation lifecycle, conversation-arc persistence, variant repair, and a new BigNumber value entry point.",
  author: "AI-Generated",
  date: "2026-06-07",
  tags: ["release"],
  excerpt:
    "3.7.0 makes Semiotic's AI and annotation work receivable: charts can describe themselves, expose structured navigation, carry annotation provenance, persist authoring context, repair or vary agent proposals, and render focal values through the new BigNumber entry point.",
  component: Body,
}
