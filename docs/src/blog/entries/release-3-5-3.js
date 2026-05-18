import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        3.5.3 is a release-confidence pass with a few user-facing additions.{" "}
        <Link to="/charts/difference-chart">DifferenceChart</Link> graduates into the chart
        family, exact axis ticks are available across XY and ordinal HOCs, SwimlaneChart can round
        lane ends, ProcessSankey gets lifecycle timing hints, and the new blog / feed / OG-card
        pipeline gives longer-form docs a home. Full release notes are on{" "}
        <a
          href="https://github.com/nteract/semiotic/blob/main/CHANGELOG.md#353---2026-05-18"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      <h2 id="chart-api">Chart API updates</h2>
      <ul>
        <li>
          <strong>DifferenceChart</strong> fills the region between two series and switches color at
          each interpolated crossover. It supports overlay lines, SSR, the push API, and bounded
          streaming via <code>windowSize</code>.
        </li>
        <li>
          <strong>
            <code>axisExtent="exact"</code>
          </strong>{" "}
          pins generated axis ticks to literal data bounds, while explicit tick values still win.
        </li>
        <li>
          <strong>
            <code>roundedTop</code> on SwimlaneChart
          </strong>{" "}
          uses the shared per-corner rectangle geometry so canvas and SVG output agree.
        </li>
        <li>
          <strong>
            <code>buildHistogramTooltip</code>
          </strong>{" "}
          gives RealtimeHistogram binned tooltips that say range, count, and category instead of
          leaking the generic x/y shape.
        </li>
      </ul>

      <h2 id="process-sankey">ProcessSankey lifecycle timing</h2>
      <p>
        ProcessSankey now accepts <code>systemInTimeAccessor</code> and{" "}
        <code>systemOutTimeAccessor</code>. Use them when the moment something enters a source node
        or leaves a target node is different from the edge&apos;s own start/end time — queueing,
        active work, discharge, delayed settlement, and similar process timelines. The band outline
        extends to the lifecycle bounds and paints per-edge gradient stubs so those waits are visible
        without changing the underlying edge flow.
      </p>
      <p>
        The same pass fixed body hover on ProcessSankey bands, stopped decorative stubs from
        intercepting interaction, aligned the axis to actual band lifetimes, and made short numeric
        domains render as numbers instead of Unix-epoch dates in the default tooltip.
      </p>

      <h2 id="docs-ai">Docs and AI surfaces</h2>
      <p>
        The new blog launches with seven entries, Atom feed generation, Open Graph card generation,
        and prerendered article metadata. The AI capability matrix now indexes all 45 chart schemas,
        including DifferenceChart, and the capability freshness check is part of CI and release
        checks. A new blog-entry sync gate keeps the rendered article metadata aligned with the
        RSS/OG/prerender metadata mirror.
      </p>

      <h2 id="upgrade-notes">Upgrade notes</h2>
      <p>
        This release is additive for most users. If you use ProcessSankey and pass custom margins
        with a legend, legend reservation now respects explicitly-set margin sides. If you consume
        <code>ai/capabilities.json</code>, the total chart count is now 45 and QuadrantChart correctly
        reports SSR support.
      </p>
    </>
  )
}

export default {
  slug: "release-3-5-3",
  title: "Semiotic 3.5.3",
  subtitle:
    "DifferenceChart, exact axis ticks, Swimlane rounded ends, ProcessSankey lifecycle timing, the new blog pipeline, and refreshed 45-chart AI capabilities.",
  author: "Elijah Meeks",
  date: "2026-05-18",
  tags: ["release"],
  excerpt:
    "3.5.3 adds DifferenceChart, exact axis ticks, Swimlane rounded ends, and ProcessSankey lifecycle timing; it also launches the docs blog, refreshes AI capabilities to 45 chart schemas, and wires new release gates for capability and blog metadata drift.",
  component: Body,
}
