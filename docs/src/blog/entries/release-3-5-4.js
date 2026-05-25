import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        3.5.4 lands a real envelope encoding on <Link to="/charts/line-chart">LineChart</Link> and{" "}
        <Link to="/charts/area-chart">AreaChart</Link>, sharpens the axis surface (edge-anchored
        ticks, CSS-variable font sizes, per-axis class names), and gives every HOC a sibling to{" "}
        <code>emptyContent</code> with the new <code>loadingContent</code> slot. Under the hood,{" "}
        <code>boundsAccessor</code> and <code>band</code> now share a single ribbon primitive — one
        scene builder, one y-extent pass, one style cascade. Full release notes are on{" "}
        <a
          href="https://github.com/nteract/semiotic/blob/main/CHANGELOG.md#354---2026-05-21"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      <h2 id="band">Asymmetric bands and percentile fans</h2>
      <p>
        The new <code>band</code> prop on LineChart and AreaChart draws an asymmetric min/max
        envelope under the line/area, driven by independent <code>y0Accessor</code> and{" "}
        <code>y1Accessor</code>. That's distinct from the existing <code>boundsAccessor</code>{" "}
        (which is symmetric ±offset) and from <code>AreaChart.y0Accessor</code> (which replaces the
        area baseline). Pass a single <code>BandConfig</code> for one envelope or an array for
        percentile fans — p25/p75 stacked on top of p10/p90 is the canonical shape.
      </p>
      <p>
        Per-series by default: one ribbon per <code>lineBy</code> / <code>colorBy</code> group,
        colored from the parent line at <code>0.2</code> fillOpacity. Pass{" "}
        <code>perSeries: false</code> for an aggregate min/max envelope across all series. Bands are
        non-interactive by default (hovers pass through to the line on top); set{" "}
        <code>interactive: true</code> if the band should participate in hit testing. Band y0/y1
        values feed <code>yExtent</code> auto-derivation so a tall envelope can never clip; explicit{" "}
        <code>yExtent</code> still wins. Live demo at{" "}
        <Link to="/charts/line-chart#band">/charts/line-chart#band</Link>.
      </p>
      <p>
        Tooltip enrichment covers every interaction surface: the hovered datum carries{" "}
        <code>band: {`{ y0, y1 }`}</code> (first band) and <code>bands: [...]</code> (all bands) on
        the pointer hover path, each <code>allSeries[i].datum</code> in multi-mode, and the
        keyboard-navigation datum. The default tooltip auto-surfaces band rows when{" "}
        <code>band</code> is configured without a custom tooltip — string accessors become labels;
        function accessors fall back to <code>low</code> / <code>high</code>.
      </p>

      <h2 id="axes">Axis surface: edge anchors, CSS vars, per-axis targeting</h2>
      <ul>
        <li>
          <strong>
            <code>tickAnchor: "edges"</code> on <code>frameProps.axes[i]</code>
          </strong>{" "}
          — flips the leftmost tick&apos;s <code>text-anchor</code> to <code>start</code> and the
          rightmost to <code>end</code> on horizontal axes (and <code>dominant-baseline</code> to{" "}
          <code>hanging</code> / <code>auto</code> on vertical axes) so edge labels can&apos;t
          overflow the plot. Pairs naturally with <code>axisExtent: "exact"</code>: exact pins the
          domain to the literal data min/max; edges keeps the labels readable at those bounds. Edge
          detection is pixel-based, so inverted y scales and reversed-x streaming charts anchor
          correctly.
        </li>
        <li>
          <strong>
            <code>--semiotic-tick-font-size</code> and <code>--semiotic-axis-label-font-size</code>{" "}
            CSS variables
          </strong>{" "}
          — emitted from the canonical theme typography fields (<code>tickSize</code>,{" "}
          <code>labelSize</code>) alongside the existing tick/title font-family/size variables. Both{" "}
          <code>themeToCSS</code> and <code>ThemeProvider</code> write them;{" "}
          <code>themeToTokens</code> exports them as DTCG <code>dimension</code> tokens. SVG axes
          consume the vars via inline <code>style</code>, so an override on any ancestor (
          <code>{`<div style={{ "--semiotic-tick-font-size": "14px" }}>`}</code>) flows down without
          consumers needing <code>!important</code>.
        </li>
        <li>
          <strong>
            <code>data-orient</code> and per-axis class names
          </strong>{" "}
          — each axis now renders as its own{" "}
          <code>{`<g class="semiotic-axis semiotic-axis-{bottom|left|right|top}" data-orient="…">`}</code>{" "}
          inside <code>.stream-axes</code>. Style one axis at a time from external CSS:{" "}
          <code>{`[data-orient='left'] text { font-size: 14px }`}</code>. Tick text carries{" "}
          <code>semiotic-axis-tick</code>, axis labels <code>semiotic-axis-label</code>, and chart
          titles <code>semiotic-chart-title</code> for class-based targeting.
        </li>
      </ul>

      <h2 id="loading">loadingContent on every HOC</h2>
      <p>
        Sibling to <code>emptyContent</code>. When <code>loading</code> is true and{" "}
        <code>loadingContent</code> is set, it renders in place of the default shimmer-bar skeleton
        (wrapped in the same sized container so the chart slot stays reserved). Pass{" "}
        <code>loadingContent={`{false}`}</code> to suppress the loading UI entirely — the
        early-return becomes <code>null</code> and a consumer&apos;s outer loading state takes over.
        Threaded through <code>useChartSetup</code>, <code>useNetworkChartSetup</code>, and{" "}
        <code>useCustomChartSetup</code>; all 47 HOCs accept it via <code>BaseChartProps</code>.
      </p>

      <h2 id="ribbon-primitive">One ribbon primitive for bounds and band</h2>
      <p>
        Both public envelope APIs (<code>boundsAccessor</code> and <code>band</code>) now normalize
        to a single <code>resolvedRibbons: ResolvedRibbon[]</code> array at the PipelineStore layer,
        then flow through <code>xySceneBuilders/ribbonScene.ts</code> — one scene builder, one
        y-extent expansion pass, one style cascade. The dedicated <code>boundsScene.ts</code> and{" "}
        <code>bandScene.ts</code> modules are gone. Public prop surfaces stay distinct (asymmetric
        pairs read better as <code>band</code> than as a <code>boundsAccessor</code> union return
        type), but the implementation is no longer duplicated.
      </p>
      <p>
        Two correctness wins fell out of the unification: bounds ribbons now skip datums with
        null/NaN <code>y</code> (the coerced <code>+null === 0</code> previously rendered a ribbon
        around the implicit-zero "value" of a missing row), and a{" "}
        <code>kind: "bounds" | "band"</code> discriminator on each ribbon restricts{" "}
        <code>datum.band</code> / <code>datum.bands</code> tooltip enrichment to band-sourced
        envelopes — bounds stays decorative-only, matching its prior contract.
      </p>

      <h2 id="upgrade-notes">Upgrade notes</h2>
      <p>
        This release is additive. Consumers already using <code>boundsAccessor</code> get the
        null/NaN-row fix for free; anything that relied on the implicit-zero ribbon behavior should
        switch to filtering at the data layer. The website build now injects the Atom feed{" "}
        <code>{`<link rel="alternate">`}</code> via the prerender step instead of source HTML, which
        closes a parcel resolution failure on nested prerendered routes.
      </p>
    </>
  )
}

export default {
  slug: "release-3-5-4",
  title: "Semiotic 3.5.4",
  subtitle:
    "Asymmetric bands and percentile fans on LineChart/AreaChart, edge-anchored ticks, theme-driven CSS font-size variables, per-axis class names, loadingContent on every HOC, and one unified ribbon primitive for bounds and band.",
  author: "AI-Generated",
  date: "2026-05-21",
  tags: ["release"],
  excerpt:
    "3.5.4 adds a first-class asymmetric band encoding (with percentile fans) to LineChart and AreaChart, sharpens the axis surface with edge-anchored ticks, CSS-variable font sizes, and per-axis class names, ships loadingContent across every HOC, and collapses bounds + band into a single shared ribbon primitive.",
  component: Body,
}
