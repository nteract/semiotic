import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        Semiotic 3.10.0 makes more of a chart's authored behavior survive the trip from an
        interactive page to a report: styling rules, accessible descriptions, number formats, and
        geometry. The{" "}
        <a href="https://github.com/nteract/semiotic/blob/v3.10.0/CHANGELOG.md#3100---2026-09-10">
          full changelog
        </a>{" "}
        records the individual additions and fixes.
      </p>
      <h2 id="style-rules">Style rules reach more chart families</h2>
      <p>
        Suppose a threshold turns an unusually large value red. A reader should see the same
        emphasis in the browser and in an exported SVG. This release completes
        <code> styleRules</code> support for WaterfallChart, MultiAxisLineChart, FlowMap,
        ProcessFlowChart, MinimapChart, CandlestickChart, DifferenceChart, and ScatterplotMatrix
        across their React and static-render paths.
      </p>
      <p>
        The rule applies to the mark that carries the value: a route in a flow map, a body in a
        process chart, or the relevant fill in a difference chart. Multi-axis thresholds read the
        original series value. The <Link to="/features/style-rules">style rules guide</Link> shows
        how to express those conditions without building a separate styling callback for each
        destination.
      </p>
      <h2 id="readable-exports">Descriptions and formats survive export</h2>
      <p>
        Authored descriptions now reach the SVG overlay's description on XY, ordinal, network, and
        geographic frames. Geographic overlays use the correct chart name, and title and description
        IDs are local to each instance, so neighboring charts do not compete for the same accessible
        text.
      </p>
      <p>
        Radar, funnel, pie, and donut tooltips honor <code>valueFormat</code>. Candlestick hatch
        fills and stroke widths reach both renderers; multi-axis named color schemes agree in static
        output. Gauge center readouts use portable SVG, and non-finite flow-map values fall back to
        the minimum stroke width.
      </p>
      <h2 id="interaction">Interaction follows the current chart</h2>
      <p>
        Bubble charts gain their documented two-axis brush, and stacked and grouped bars use the
        same value-axis brushing as BarChart. Realtime histogram improvements cover responsive
        sizing, axis visibility, inverted vertical direction, and linked hover and brush. Physics
        updates rebuild bodies, collision geometry, and chart chrome together when the chart's
        source or layout changes.
      </p>
      <h2 id="examples">Stories you can read, change, and take away</h2>
      <p>
        The new examples start with familiar questions: why did the same groceries cost more, what
        changed between jobs estimates, and how did a delay travel through an aircraft's day? Their
        controls let you choose a comparison; their notes and exports keep the dates and
        qualifications with it.
      </p>
      <ul>
        <li>
          <Link to="/examples/grocery-bill">The grocery receipt</Link> attributes a basket's price
          change to its items.
        </li>
        <li>
          <Link to="/examples/jobs-report">The jobs report has a second draft</Link> compares
          successive estimates of the same month.
        </li>
        <li>
          <Link to="/examples/reservoir-guide">The reservoir field guide</Link> separates stored
          water, capacity, and the seasonal average.
        </li>
        <li>
          <Link to="/examples/plane-day">Follow an aircraft's day</Link> traces a delay across
          linked flights.
        </li>
        <li>
          <Link to="/examples/superpersuasion">The art of being worth choosing</Link> follows a
          recommendation through evidence and correction.
        </li>
      </ul>
      <h2 id="upgrade-notes">Upgrade notes</h2>
      <p>
        Install with <code>npm install semiotic@3.10.0</code>. Review charts that already supply
        <code> styleRules</code> to one of the newly covered forms: previously ignored rules may now
        change visible marks. Also check radial charts with custom
        <code> valueFormat</code> callbacks, since their default tooltips now use them.
      </p>
      <p>
        For a chart you export, compare the interactive reading with the static SVG after upgrading,
        including descriptions and units. The <Link to="/migration">migration guide</Link> covers
        the broader version-3 API, and the tagged changelog above gives the scope of this release.
      </p>
      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/features/style-rules">Declarative style rules</Link>
        </li>
        <li>
          <Link to="/accessibility">Accessibility guidance</Link>
        </li>
        <li>
          <Link to="/examples">Interactive examples</Link>
        </li>
        <li>
          <Link to="/blog/release-3-9-0">Semiotic 3.9.0</Link>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "release-3-10-0",
  title: "Semiotic 3.10.0",
  subtitle:
    "The rules, labels, and interactions you author follow the chart from the browser to a shared report.",
  author: "Semiotic Team",
  date: "2026-09-10",
  tags: ["release"],
  excerpt:
    "3.10.0 extends declarative styling across chart families and fixes differences between live charts and static SVG. New interactive stories show how to keep a comparison’s sources, dates, and qualifications attached when it travels.",
  component: Body,
}
