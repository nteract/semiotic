import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        3.5.2 is mostly a "factor and extend" release. The long-running HOC/Frame architecture audit
        got two more steps closer to landing, the realtime family picked up a{" "}
        <code>useStreamStatus</code> hook for outside-world push observability, and{" "}
        <Link to="/charts/process-sankey">ProcessSankey</Link> finally inherited{" "}
        <Link to="/charts/sankey-diagram">SankeyDiagram</Link>'s canvas particle pipeline so the two
        charts now share ribbon geometry and particle rendering end-to-end. Highlights below; full
        release notes are on{" "}
        <a
          href="https://github.com/nteract/semiotic/blob/main/CHANGELOG.md#352---2026-05-10"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      <h2 id="hooks-and-factoring">Hooks &amp; factoring</h2>
      <ul>
        <li>
          <strong>
            <code>useSeriesFeatures</code>
          </strong>{" "}
          — <code>forecast</code> + <code>anomaly</code> props are now first-class on AreaChart,
          Scatterplot, and ConnectedScatterplot (LineChart had them before; the others were carrying
          ~85 LOC of synthetic-key + lazy-load boilerplate each). Capability tags surface through{" "}
          <code>chartSpecs.ts</code> / <code>ai/capabilities.json</code> for AI agent discovery.
        </li>
        <li>
          <strong>
            <code>useEncodingDomain</code>
          </strong>{" "}
          — generic <code>[min, max]</code> tracker over bounded data + push-mode values, extracted
          from BubbleChart's <code>sizeBy</code> logic. Fixes a latent Scatterplot bug where{" "}
          <code>sizeBy</code> radii returned the raw data value as the pixel radius in push mode.
          String-field accessors hitting numeric-string values now coerce cleanly instead of leaking
          strings into the math.
        </li>
        <li>
          <strong>
            <code>useStreamStatus</code>
          </strong>{" "}
          — user-facing observer for push-API charts. Wraps a ref, intercepts <code>push</code> /{" "}
          <code>pushMany</code>, and exposes a reactive <code>status</code> enum (
          <code>"idle" | "active" | "stale"</code>) plus <code>lastPushTime</code>. Surfaced via{" "}
          <code>semiotic/utils</code> and <code>semiotic/realtime</code>. Wrap-once symbol guard
          prevents StrictMode double-wrap.
        </li>
        <li>
          <strong>
            <code>useXYLineStyle</code> hook (Phase 2 step 5 of the HOC/Frame audit)
          </strong>{" "}
          — the line-side analogue of <code>useXYPointStyle</code>. LineChart, MultiAxisLineChart,
          and MinimapChart (both main + overview lines) collapse to a single hook call covering base
          stroke width → color resolution → optional group-aware fill → <code>mergeShapeStyle</code>{" "}
          overlay → <code>wrapStyleWithSelection</code>. Net ~65 LOC removed across three HOCs.
        </li>
      </ul>

      <h2 id="process-sankey-particles">ProcessSankey unified with SankeyDiagram particles</h2>
      <p>
        Particles now ride the canvas + <code>ParticlePool</code> path that SankeyDiagram uses. The
        HOC writes pre-computed cubic bezier control points onto each ribbon spec;{" "}
        <code>NetworkPipelineStore</code>'s particle-pool gate broadened from{" "}
        <code>chartType === "sankey"</code> to also accept <code>customNetworkLayout</code>. SVG
        particle overlay deleted (~80 LOC, including the per-particle <code>&lt;circle&gt;</code>{" "}
        allocation per frame). Prop surface aligned: <code>showParticles</code> +{" "}
        <code>particleStyle</code>. Individual <code>particleRadius</code> /{" "}
        <code>particleDuration</code> / etc. props removed.
      </p>
      <p>
        Side benefit: ribbon geometry itself is now a single source of truth. SankeyDiagram and
        ProcessSankey both call <code>buildRibbonGeometry</code> for the M-C-L-C-Z path emission.
        SankeyDiagram passes the d3-sankey S-curve control points; ProcessSankey passes lane-aware
        single-point bends. Same code path; identical shapes when the inputs match.
      </p>

      <h2 id="regression-prop">
        <code>regression</code> prop on more charts
      </h2>
      <p>
        Scatterplot, BubbleChart, ConnectedScatterplot, BarChart, and DotPlot now accept a{" "}
        <code>regression</code> prop: <code>true</code> | method string (
        <code>"linear" | "polynomial" | "loess"</code>) | full <code>RegressionConfig</code>. Sugar
        over the existing trend annotation. Ordinal charts treat categories as integer indices and
        project the regression line through the band scale (with linear interpolation between band
        centers for LOESS fractional indices).
      </p>

      <h2 id="flow-map-push">FlowMap push API</h2>
      <p>
        <Link to="/charts/flow-map">FlowMap</Link> joined the realtime-capable HOC family. The frame
        gained a <code>geo-lines</code> variant on <code>useFrameImperativeHandle</code> plus{" "}
        <code>pushLine</code> / <code>pushManyLines</code> / <code>removeLine</code> /{" "}
        <code>getLines</code> / <code>lineIdAccessor</code> on <code>GeoPipelineStore</code>.{" "}
        <code>supportsPush: true</code> in capabilities; docs streaming demo flipped from{" "}
        <code>setState(flows)</code> to <code>ref.current.push(flow)</code>.
      </p>

      <h2 id="capability-matrix">Capability matrix</h2>
      <p>
        <code>ai/capabilities.json</code> indexes all 44 charts across 5 categories with{" "}
        <code>renderModes</code> / <code>supportsPush</code> / <code>supportsSSR</code> /{" "}
        <code>supportsLegend</code> / <code>supportsSelection</code> /{" "}
        <code>supportsLinkedHover</code> / <code>colorModel</code> / <code>layoutMode</code> /{" "}
        <code>specialFeatures</code> fields. Generated alongside <code>docs/capabilities.md</code>{" "}
        by <code>npm run docs:capabilities</code>; locked against <code>chartSpecs.ts</code> by{" "}
        <code>check:capabilities</code>. <code>suggestCharts({"{ capabilities }"})</code> accepts
        push/linkedHover/ssr/selection/legend constraints and surfaces a <code>filteredOut</code>{" "}
        list with reasons. Interactive filterable matrix at{" "}
        <Link to="/features/capabilities">/features/capabilities</Link>.
      </p>

      <h2 id="other-fixes">Other fixes worth mentioning</h2>
      <ul>
        <li>
          <strong>Bundle-size truth source</strong> — a new{" "}
          <code>scripts/sync-bundle-sizes.mjs</code> reads <code>package.json#exports</code>, gzips
          each entry point, and upserts the marker-block bundle-size tables in README.md, CLAUDE.md,
          and the AI system prompt. CI fails when a dependency bump nudges a bundle past its rounded
          boundary and the docs haven't been regenerated.
        </li>
        <li>
          <strong>Edge value preservation through bounded ingestion</strong> —{" "}
          <code>Number.isFinite(numValue) ? numValue : 1</code> instead of{" "}
          <code>Number(v) || 1</code>, so a legitimate <code>value: 0</code> edge survives
          end-to-end.
        </li>
        <li>
          <strong>
            <code>algorithm.js</code> → <code>algorithm.ts</code>
          </strong>{" "}
          — the last <code>.js</code> file in the chart source tree migrated to TypeScript. Types
          inlined as the canonical source.
        </li>
        <li>
          <strong>Keyboard nav skips invisible scene nodes</strong> —{" "}
          <code>extractNetworkNavPoints</code> skips <code>r &lt;= 0</code> circles and{" "}
          <code>w &lt;= 0 || h &lt;= 0</code> rects. Keyboard focus on ProcessSankey now lands on a
          real band/ribbon instead of an off-canvas color-binding placeholder.
        </li>
      </ul>

      <h2 id="upgrade-notes">Upgrade notes</h2>
      <p>Most of 3.5.2 is additive. Three small breaking changes worth flagging:</p>
      <ul>
        <li>
          <strong>ProcessSankey particle props consolidated</strong> — if you were setting{" "}
          <code>particleRadius</code> / <code>particleDuration</code> / <code>particleDensity</code>{" "}
          / <code>particleMaxPerEdge</code> directly, fold them into a single{" "}
          <code>particleStyle</code> object (matches SankeyDiagram's shape).
        </li>
        <li>
          <strong>
            <code>Number(v) || 1</code> → <code>Number.isFinite(numValue) ? numValue : 1</code>
          </strong>{" "}
          for network edge values — if you were relying on <code>value: 0</code> being silently
          swapped to <code>1</code>, that no longer happens. (You almost certainly weren't.)
        </li>
        <li>
          <strong>Strings as edge values now coerce instead of being dropped</strong> — bounded
          ingestion accepts numeric strings (<code>"5"</code> → <code>5</code>) instead of silently
          dropping them. Same for <code>sizeBy</code> string fields. Almost always what you want;
          flagged because the previous behavior was permissive.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "release-3-5-2",
  title: "Semiotic 3.5.2",
  subtitle:
    "Shared HOC hooks, ProcessSankey + SankeyDiagram particle unification, regression sugar on five more charts, FlowMap push API, and a capability matrix the MCP server can filter against.",
  author: "AI-Generated",
  date: "2026-05-10",
  tags: ["release"],
  excerpt:
    "3.5.2 is mostly a factor-and-extend release: useSeriesFeatures / useEncodingDomain / useStreamStatus / useXYLineStyle hooks land, ProcessSankey inherits SankeyDiagram's canvas particle pipeline, regression-line sugar extends to five more charts, FlowMap joins the push family, and ai/capabilities.json indexes all 44 charts.",
  component: Body,
}
