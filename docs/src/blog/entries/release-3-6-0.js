/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        3.6.0 is the AI release. The library has carried{" "}
        <Link to="/intelligence/observation-hooks">observation hooks</Link>,{" "}
        <Link to="/charts/annotations">native annotations</Link>, and a{" "}
        <Link to="/features/server-side-rendering">streaming-first runtime</Link> for a while; this
        version turns those pieces into an explicit AI-facing surface. Charts now declare what
        they're for, datasets get profiled and ranked, audiences get calibrated, and conversations
        anchor back onto the chart instead of stopping at a chat bubble. Three case-study posts
        published alongside this release walk through what that makes possible. Full release notes
        are on{" "}
        <a
          href="https://github.com/nteract/semiotic/blob/main/CHANGELOG.md#360---2026-05-31"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      <h2 id="why-care">Why this matters</h2>
      <p>
        The default pattern for "AI on a chart" today is a chat box next to the visualization. The
        user types a question in prose, the model answers in prose, and the chart is decorative.
        Both ends lose information: the user has to verbalize which point they meant; the model has
        to verbalize where the answer applies. The chart already encodes those spatial signals on
        screen. The 3.6.0 surface is a bet that the right shape isn't "chat with a chart" but{" "}
        <em>two-way structured context</em> — charts emit profiled data and capability descriptors,
        models consume those AND return back annotations the chart natively renders.
      </p>
      <p>
        Three things compose under that frame: a heuristic recommendation engine that ranks charts
        for a dataset (so any agent can answer "which chart?"), a focus + interrogation pair that
        gives a chat surface a point-of-anchor (so any agent can answer "about which row?"), and a
        capability descriptor per chart that turns the library itself into a structured catalog (so
        an LLM can reason about the visualization options without prompt-stuffing the entire
        reference docs). None of these primitives require an LLM to be useful — the recommender is
        offline-deterministic; the interrogation hook is headless — but each one produces the kind
        of structured context that lands cleanly when a model is on the other side.
      </p>

      <h2 id="recommendation">A chart recommendation engine — heuristic-first, LLM-optional</h2>
      <p>
        Every chart in the library now ships a capability descriptor: what data shapes it serves,
        what intents (`trend`, `correlation`, `distribution`, `part-to-whole`, eleven more) it
        answers well, what settings change those answers, and what `buildProps` would look like
        against a given profile. <code>suggestCharts(data, options?)</code> returns a ranked list
        of suggestions with runnable props, an audit trail of reasons, and caveats. Pair it with an{" "}
        <code>AudienceProfile</code> — a serializable per-organization config of familiarity
        numbers and adoption targets — and the ranking calibrates to who is actually reading.
      </p>
      <p>
        The deeper architectural move is that <em>the same descriptors</em> feed{" "}
        <code>suggestDashboard</code> (composite multi-intent views with honest{" "}
        <code>intentsMissing</code> reporting),{" "}
        <code>suggestStretchCharts</code> (a literacy-growth surface that shows charts the audience
        is unfamiliar with but the data actually supports), <code>scoreChart</code> (single-chart
        introspection), <code>useChartSuggestions</code> (the React hook), and the MCP server's{" "}
        <code>suggestCharts</code> tool. One catalog, many surfaces. The post on{" "}
        <Link to="/blog/charts-that-know-what-theyre-for">
          Charts that know what they're for
        </Link>{" "}
        walks through the design, the audience layer, and the stretch surface in detail.
      </p>

      <h2 id="interrogation">Anchored conversation — focus + interrogation + annotation</h2>
      <p>
        The other half of "AI on a chart" is what happens when the user wants to ask about{" "}
        <em>this</em> point. Two new hooks compose into that pattern:{" "}
        <code>useChartFocus</code> subscribes to the chart's observation store and returns the
        latest hover/click as <code>{`{ datum, x, y, source }`}</code>;{" "}
        <code>useChartInterrogation</code> gives consumers a{" "}
        <code>{`{ ask, history, summary, annotations, loading, error, reset }`}</code> surface
        where the consumer brings their own LLM via <code>onQuery</code>. The hook supplies the
        model with the profiled data summary, the suggestion list, and the current focus datum as
        structured context; the model returns annotations the chart natively renders.
      </p>
      <p>
        The detail post —{" "}
        <Link to="/blog/anchored-conversations">Anchored conversations</Link> — works through the
        bidirectional loop: the user points at a data point, the AI answers about that specific
        point, and the answer lives on the chart as a clickable note. Pronouns work. Comparisons
        get cheap. Answers persist where they're useful. The chart accumulates institutional
        knowledge about itself.
      </p>
      <p>
        Compose that with the realtime runtime and the chat surface flips from passive observer to
        active narrator:{" "}
        <Link to="/blog/live-conversational-dashboard">Live conversational dashboards</Link>{" "}
        sketches the product shape — streaming data + an AI watching alongside you + anchored
        annotations + a conversational follow-up surface — and walks through the pieces that
        compose it.
      </p>

      <h2 id="capability-refinements">Capability descriptor refinements</h2>
      <p>
        Authoring the per-chart descriptors surfaced a few cases where the chart family's
        recommendation behavior was wrong on its face. Those are tightened in this release:
      </p>
      <ul>
        <li>
          <strong>
            <code>AreaChart</code> is now a single-series chart.
          </strong>{" "}
          Multi-series area overlays are an occlusion nightmare; the capability subselects to the
          leading series (largest cumulative y) when the input has 2+ groups and surfaces a caveat.
          Gradient fill is the baseline default. AreaChart now outranks LineChart on single-series
          trend (the gradient is more visually arresting than a thin line); LineChart still wins on
          multi-series because it shows the whole dataset instead of one slice.
        </li>
        <li>
          <strong>
            <code>DifferenceChart</code> accepts 2+ series via top-2 subselection.
          </strong>{" "}
          Previously rejected anything other than exactly two series; now picks the two series with
          the highest cumulative y and emits a caveat when subselecting from 3+. Makes the chart a
          real alternative on multi-series data where the comparison-between-two story is the
          interesting one.
        </li>
        <li>
          <strong>
            <code>Scatterplot</code> and <code>ConnectedScatterplot</code> prefer the canonical
            2-numeric form when a sequence axis is present.
          </strong>{" "}
          On <code>{`{quarter, revenue, profit}`}</code> data both charts now plot revenue ×
          profit (the canonical correlation form) instead of recapitulating a line chart on
          quarter. ConnectedScatterplot threads the sequence as <code>orderAccessor</code> so the
          path encodes temporal progression — Hans Rosling's "income vs life expectancy over
          years" shape, served automatically when the data supports it.
        </li>
        <li>
          <strong>
            <code>X_FIELD_HINT</code> recognizes calendar-segment field names.
          </strong>{" "}
          The profiler's x-axis name regex now matches <code>quarter</code>, <code>qtr</code>,{" "}
          <code>fiscal</code>, and <code>week</code>. Without this,{" "}
          <code>{`{quarter, revenue, region}`}</code> data fell into scatter-fallback provenance
          and series detection never fired — <code>lineBy</code> / <code>areaBy</code> were
          silently dropped and multi-series time-series charts zigzagged across regions.
        </li>
      </ul>

      <h2 id="agents">For agents — the MCP server and the CLI</h2>
      <p>
        <code>npx semiotic-mcp</code> launches a Model Context Protocol server that exposes{" "}
        <code>renderChart</code>, <code>interrogateChart</code>, <code>suggestCharts</code>, and{" "}
        <code>diagnoseConfig</code> as MCP tools. Agents inside Claude Code, Cursor, Windsurf, and
        other MCP-aware environments can drive Semiotic directly — render a static SVG, profile a
        dataset, ask the recommender for a ranked list, repair a config that doesn't validate.{" "}
        <code>npx semiotic-ai --doctor</code> covers the CLI variant: pass a{" "}
        <code>{`{component, props, data}`}</code> JSON spec and get back a validated config (or a
        ranked list of alternatives if the requested chart doesn't fit the data).
      </p>

      <h2 id="upgrade-notes">Upgrade notes</h2>
      <p>
        Most of 3.6.0 is additive. The capability-descriptor refinements above are the one
        behavior change worth flagging:
      </p>
      <ul>
        <li>
          <strong>AreaChart on multi-series data.</strong> If you were passing
          multi-series data to <code>AreaChart</code> directly (not via <code>suggestCharts</code>)
          and relying on the chart to render overlapping multi-area output, that path still works
          at the chart level — the capability change affects what the recommender suggests, not the
          chart's prop surface. The chart's <code>areaBy</code> prop is untouched. The change is
          about{" "}
          <code>suggestCharts</code> output: AreaChart suggestions now subselect their data.
        </li>
        <li>
          <strong>Scatterplot's x/y on sequence-shaped data.</strong> Same caveat — the chart still
          plots whatever you pass it; the recommender's <code>buildProps</code> output changes. Any
          code reading <code>suggestion.props.xAccessor</code> / <code>yAccessor</code> for charts
          with <code>{`{sequence, num1, num2}`}</code> shape will now see the two numerics in
          place of the sequence.
        </li>
        <li>
          <strong>
            <code>DifferenceChart</code> data pivoting.
          </strong>{" "}
          The chart's wide-form data contract (`{`{x, a, b}`}`) is unchanged. The recommender now
          pivots long-form input automatically and emits the wide form on{" "}
          <code>suggestion.props.data</code>.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "release-3-6-0",
  title: "Semiotic 3.6.0",
  subtitle:
    "The AI release. A heuristic chart recommender, audience-aware ranking, focus + interrogation hooks for two-way anchored conversation, an MCP server, and a per-chart capability layer that makes the library itself a structured catalog.",
  author: "AI-Generated",
  date: "2026-05-31",
  tags: ["release"],
  excerpt:
    "3.6.0 turns Semiotic's observation hooks, native annotations, and streaming runtime into an explicit AI-facing surface. Charts declare what they're for; datasets get profiled and ranked; audiences get calibrated; conversations anchor back to the chart instead of stopping at a chat bubble. Three case-study posts published alongside the release walk through what the new shape makes possible.",
  component: Body,
}
