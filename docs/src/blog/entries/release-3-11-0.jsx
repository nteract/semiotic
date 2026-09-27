import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        Semiotic 3.11.0 improves the reliability of charts as their data changes, their containers
        resize, and their readers move between pointer interaction, keyboard navigation, and static
        exports. We have concentrated on correctness and the work behind each update. The{" "}
        <a href="https://github.com/nteract/semiotic/blob/v3.11.0/CHANGELOG.md#3110---2026-09-27">
          full changelog
        </a>{" "}
        groups the individual fixes by the behavior they affect.
      </p>

      <h2 id="why-care">A chart has to keep its meaning</h2>
      <p>
        A chart can look plausible while counting the wrong rows, giving an empty category area, or
        leaving a tooltip where a mark used to be. Those errors are difficult to catch in a
        screenshot of the initial render. This release follows charts through the operations that
        expose them: replacing data, pushing observations, changing a scale, resizing a panel, and
        exporting the result.
      </p>
      <p>
        For each confirmed defect, we also reviewed related renderers and public entry points. That
        work connects the visual reading to the source quantities, the accessible table, and the
        exported geometry. It gives both application authors and chart-generating agents more
        dependable behavior to build on.
      </p>

      <h2 id="data-and-statistics">Aggregation, hierarchy values, and statistical overlays</h2>
      <p>
        Aggregation now preserves typed grouping keys and series dimensions, excludes missing or
        invalid measures, and returns <code>null</code> when a group has no numeric observations.
        The public <code>rollup</code> transform accepts multiple grouping fields and a named output
        field. Vega-Lite and Flint imports share that aggregation logic, and imported histograms
        retain repeated observations so their bin counts describe the original data.
      </p>
      <p>
        Treemap, CirclePack, and TreeDiagram now agree on nonnegative value summation. An unvalued
        parent no longer acquires a phantom contribution, and a zero-valued leaf gets no area.
        Repeated names and IDs remain distinct through sorting and resizing. Bar and funnel domains
        also follow the aggregates actually drawn, including signed values and repeated categories.
      </p>
      <p>
        Trends and forecasts retain precision for timestamps and small values. Polynomial forecasts
        evaluate the fitted coefficients correctly; ordinal trends follow displayed category order;
        and automatic forecasts fit each series separately while honoring LOESS bandwidth.
        Prediction bands remain approximate intervals whose assumptions need to fit the analysis.
      </p>

      <h2 id="resize-and-interaction">Resizing, tooltips, and keyboard reading</h2>
      <p>
        Resizing updates marks and transition targets together with their axes. Temporarily hidden
        or very small containers retain data until layout recovers. This includes pixel-dependent
        bars, candlesticks, and ranges, as well as log and time scales. GoFish path hit testing now
        follows the painted curves and overlap order, and BumpChart ribbons expose the correct datum
        across their filled area.
      </p>
      <p>
        Keyboard navigation reaches more mark types with the same data available on pointer hover.
        Accessible tables preserve focus through paging and restore their opener when closed. Chart
        live regions announce keyboard focus; ordinary pointer movement stays visual by default.
        Summaries retain original categories, values, and distribution statistics without treating
        decoration as additional data.
      </p>
      <p>
        Custom tooltip wrappers gain <code>hasTooltipContent</code> to check a consumer's result
        before adding a surface. <code>markTooltipChrome</code> can mark renderer callbacks that
        already own their chrome, including callbacks passed through wrapper components. Empty
        results stay empty, and styled content avoids an extra tooltip box.
      </p>

      <h2 id="network-layouts">Sankey, ProcessSankey, and live network updates</h2>
      <p>
        Cyclic Sankey layouts use bounded, flow-weighted feedback ordering instead of enumerating
        every circuit. Parallel flows and self-links remain intact, widths use the original linear
        values, and circular routes stay complete during transitions. ProcessSankey reuses layout
        analysis across styling changes and resizing and computes crossing improvements with a
        temporal index and local swap calculations.
      </p>
      <p>
        Network mutations preserve raw records and custom accessors, batch array updates into one
        layout, and prevent stale worker results from overwriting newer topology. Worker startup or
        transport failures fall back to synchronous layout without repeatedly attempting the same
        failed startup. Dagre, Flextree, Lineage, Net Ensemble, and axis-fixed force also receive
        corrections to bounds, identity, callbacks, or traversal work.
      </p>

      <h2 id="physics-and-ai">Physics settling and AI delivery</h2>
      <p>
        Default physics settling drains scheduled arrivals before spending its settling budget.
        Contact fixes keep fast bodies inside their assigned bins and resolve overlapping dense
        piles. Less repeated collision work makes paced simulations cheaper while preserving arrival
        timing and event order. An explicitly supplied step limit remains a total limit.
      </p>
      <p>
        Dataset summaries inspect whole columns and report missing or excluded values. MCP HTTP
        uploads have separate admission limits and bounded deadlines, so a partial upload does not
        occupy a chart-execution slot. The AI reference, schemas, and task packets describe the same
        release as the package, including the distinction between a static data snapshot and React
        push mode.
      </p>

      <h2 id="upgrade-notes">Upgrade notes</h2>
      <p>
        Install with <code>npm install semiotic@3.11.0</code>. Review saved visual expectations
        where a corrected quantity, domain, or layout changes the output:
      </p>
      <ul>
        <li>
          <strong>Hierarchy values:</strong> leave parent values unset when leaves supply the
          measure. A node's own finite nonnegative value is added to its descendants. Supply unique
          IDs when structurally reordering records with repeated names or IDs.
        </li>
        <li>
          <strong>Aggregation:</strong> handle <code>null</code> for groups with no valid measures.
          When grouping by a field named <code>value</code>, give <code>rollup</code> a different
          <code> outputField</code> to avoid a collision. Count still includes every row.
        </li>
        <li>
          <strong>Time:</strong> date-only strings and inferred calendar ticks use UTC.
          ProcessSankey keeps numeric strings numeric and passes numbers or Dates to
          <code> timeFormat</code> according to its domain. Use explicit formatting when your
          reading requires another timezone.
        </li>
        <li>
          <strong>Streaming:</strong> omit <code>data</code> to select React push mode;
          <code> data={"{[]}"}</code> is a bounded empty dataset. Hierarchies take replacement root
          objects, and automatic forecast props require bounded data. Statistical annotations can
          operate on a push frame's retained data.
        </li>
        <li>
          <strong>Tooltips and announcements:</strong> keep plain tooltip callbacks unmarked; use
          <code> markTooltipChrome</code> only when the callback owns its surface. Check keyboard
          reading and table focus alongside hover after resizing.
        </li>
      </ul>
      <p>
        Use <Link to="/charts/process-sankey">ProcessSankey</Link> when elapsed time belongs in the
        flow geometry; use <Link to="/charts/sankey-diagram">SankeyDiagram</Link> for a static flow
        snapshot. Choose a hierarchy chart for a bounded tree and a node/edge chart for live
        topology. The <Link to="/migration">migration guide</Link> covers the broader version-3 API;
        the tagged changelog above records the changes specific to this release.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/accessibility">Accessibility guidance</Link>
        </li>
        <li>
          <Link to="/features/tooltips">Tooltip configuration</Link>
        </li>
        <li>
          <a href="https://github.com/nteract/semiotic/blob/v3.11.0/ai/reference.md">
            AI and API reference
          </a>
        </li>
        <li>
          <Link to="/blog/release-3-10-0">Semiotic 3.10.0</Link>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "release-3-11-0",
  title: "Semiotic 3.11.0",
  subtitle:
    "Correct quantities, resilient layouts, and consistent interaction as charts change and travel.",
  author: "The Semiotic Team",
  date: "2026-09-27",
  tags: ["release"],
  excerpt:
    "3.11.0 improves aggregation, hierarchy values, statistical overlays, and resizing across live and exported charts. Network layouts do less repeated work, accessible interaction keeps its context, and tooltip and AI tooling contracts are clearer.",
  component: Body,
}
