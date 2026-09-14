import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        Semiotic 3.9.0 focuses on charts that keep working as data arrives, a container resizes, or
        a reader switches from a pointer to a keyboard. The
        <a href="https://github.com/nteract/semiotic/blob/v3.9.0/CHANGELOG.md#390---2026-08-16">
          {" "}
          full changelog
        </a>{" "}
        lists the new public helpers and the rendering fixes behind that work.
      </p>
      <h2 id="streaming">Read a stream in event time</h2>
      <p>
        A sensor reading can arrive late. Drawing it at its arrival time can make a stable process
        appear to jump. RealtimeLineChart can now reorder input by <code>eventTime</code> and use{" "}
        <code>aggregate</code> to collect high-rate input into retained windows. Its handle exposes{" "}
        <code>flush()</code> when the host knows the stream has ended.
      </p>
      <p>
        The five realtime wrappers also share more of the chart contract: authored titles and
        descriptions, exact-value tables, legends, selection, linked hover, and observation. Start
        with the <Link to="/charts/realtime-line-chart">RealtimeLineChart guide</Link> to choose
        between a controlled dataset and incoming records pushed through a ref.
      </p>
      <h2 id="evaluation">Bring chart checks into one reading</h2>
      <p>
        A valid configuration is only one part of a useful chart. <code>evaluateChart</code>{" "}
        combines data-contract checks, representation diagnostics, accessibility findings, and
        optional render evidence into a ranked report. The CLI's <code>--evaluate</code> option and
        the MCP tool expose the same workflow. Findings help an author decide what to repair; a
        passing result does not establish that a dataset or conclusion is true.
      </p>
      <h2 id="observation">Make interaction visible to the application</h2>
      <p>
        <code>ObservationReadout</code> and <code>observedDatum</code> help an application show
        which item a reader is inspecting. <code>TooltipRoot</code> and the tooltip helpers support
        an application-owned shell. Typed cursor styling lets a mark signal an available action,
        while the action itself remains in the click and keyboard callbacks.
      </p>
      <p>
        The <Link to="/intelligence/observation-hooks">observation guide</Link> connects these
        pieces. Use a persistent readout when an explanation should remain available after the
        pointer leaves a mark.
      </p>
      <h2 id="rendering">Geometry and reading tools stay together</h2>
      <p>
        Responsive physics charts rebuild bodies, collision geometry, and visible labels as one
        layout. Hit testing follows visible marks more closely across chart families. Side legends
        reserve space for keyboard focus rings, and choropleth gradient legends work in both browser
        and static output. Compound charts such as MinimapChart and ScatterplotMatrix expose a
        single chart-level data table.
      </p>
      <p>
        Server-render fixes cover OrbitDiagram, grouped XY inputs, custom layouts, geographic flows,
        zero-valued edges, and theme scales. Settled physics output shares the live chart's margins
        and projections. These fixes matter when a reader moves between an interactive chart and a
        report made from the same configuration.
      </p>
      <h2 id="examples">Examples with a question to investigate</h2>
      <p>
        <Link to="/examples/how-a-hit-travels">How a Hit Travels</Link> follows titles through
        national Netflix rankings. <Link to="/examples/parataxis-machine">Parataxis Machine</Link>{" "}
        lets you inspect how neighboring clauses imply a relationship.
        <Link to="/examples/the-last-scarcity"> The Last Scarcity</Link> uses an interactive
        scenario to ask what cheap intelligence leaves scarce. Each puts the chart inside a larger
        explanation and keeps its evidence or modeling assumptions available.
      </p>
      <h2 id="upgrade-notes">Upgrade notes</h2>
      <p>
        Install with <code>npm install semiotic@3.9.0</code>. If you use a heatmap's
        <code> customColorScale</code>, supply a callable function; a plain object now fails
        validation. Side legends include a small focus-ring gutter; an explicit
        <code> legendLayout.edgeGutter</code> controls that space.
      </p>
      <p>
        In React push mode, omit <code>data</code> and use a ref. An empty array still selects
        controlled mode. Review the documented behavior when changing event-time or aggregate
        policies during a stream, and use <code>flush()</code> for a known end boundary. The{" "}
        <Link to="/migration">migration guide</Link> covers the wider version-3 API.
      </p>
      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/realtime-line-chart">RealtimeLineChart</Link>
        </li>
        <li>
          <Link to="/intelligence/cli-mcp">CLI and MCP</Link>
        </li>
        <li>
          <Link to="/accessibility/navigation">Keyboard and structured navigation</Link>
        </li>
        <li>
          <Link to="/blog/release-3-8-0">Semiotic 3.8.0</Link>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "release-3-9-0",
  title: "Semiotic 3.9.0",
  subtitle: "Live data, keyboard reading, and exported charts share more of the same behavior.",
  author: "Semiotic Team",
  date: "2026-08-18",
  tags: ["release"],
  excerpt:
    "3.9.0 improves event-time streaming, chart evaluation, observation, and responsive physics layouts. It also closes gaps between browser interaction and static rendering, so a chart remains understandable as its data and surroundings change.",
  component: Body,
}
