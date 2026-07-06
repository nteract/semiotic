/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        3.8.0 is a chart-operations release: chart-level notifications,
        worker-backed force layouts, richer interval and annotation primitives,
        and clearer experimental boundaries for the adapters that are still
        being proven with real consumers. Full release notes are on{" "}
        <a
          href="https://github.com/nteract/semiotic/blob/main/CHANGELOG.md#380---2026-07-05"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      <h2 id="notifications">Chart-Level Notifications</h2>
      <p>
        <code>ChartContainer</code> now accepts a <code>notifications</code>{" "}
        prop for findings that belong to the whole chart rather than one mark:
        data-pitfalls warnings, accessibility-audit findings, unplaceable data
        quality results, or host-authored notices. They collapse into a
        severity-aware bell with a count badge and open into dismissible cards,
        so streaming notices do not reflow the plot area.
      </p>
      <p>
        The notification layer also includes an <code>aria-live</code> summary,
        semantic class hooks, stable dismiss-by-id behavior, and an{" "}
        <code>onNotificationDismiss</code> callback for host telemetry or store
        synchronization.
      </p>

      <h2 id="force-layout">Force Layouts Move Off the Main Thread</h2>
      <p>
        <code>ForceDirectedGraph</code> gains <code>layoutExecution</code>,{" "}
        <code>layoutLoadingContent</code>, and <code>onLayoutStateChange</code>.
        In <code>auto</code> mode, expensive layouts settle in a short-lived
        module Web Worker and fall back to the synchronous path when workers are
        unavailable. SSR and first hydration stay synchronous for markup parity.
      </p>
      <p>
        The underlying force model is also more realistic: degree-aware charge,
        degree-normalized link strength, radius-aware collision, weaker
        centering, and d3-force under the recipe-level <code>forceLayout</code>.
        The same seed can produce different geometry than earlier 3.x builds, so
        position-pinned visual snapshots should be regenerated.
      </p>

      <h2 id="time-and-layout">Time, Intervals, and Custom Layouts</h2>
      <p>
        New <code>x-band</code> annotations mark eras or phases as full-height
        shaded regions in both canvas and SSR output.{" "}
        <code>intervalLanesLayout</code> now has a <code>minBarWidth</code> floor
        and packs in rendered-pixel space, keeping zero- and short-duration
        intervals visible without overlapping their neighbors.
      </p>
      <p>
        Custom chart hosts get a new readback path:{" "}
        <code>ref.current.getCustomLayout()</code> returns the most recent
        layout result for XY, ordinal, network, and geo custom HOCs. Inspectors,
        validation layers, and stats readouts can now consume the computed
        placement without re-running the layout function.
      </p>

      <h2 id="experimental-adapters">Experimental Adapters Stay Experimental</h2>
      <p>
        The DataPitfalls bridge and GoFish DisplayList adapter are intentionally
        still outside the stable public API. Import{" "}
        <code>unstable_toDataPitfallsChain</code> and{" "}
        <code>unstable_buildDataPitfallsBridge</code> from{" "}
        <code>semiotic/experimental</code>; import{" "}
        <code>unstable_fromGofishIR</code> from the same endpoint. The names are
        explicit because those contracts depend on external render-IR and review
        schemas that are still settling.
      </p>

      <h2 id="upgrade-notes">Upgrade Notes</h2>
      <p>
        Bump package consumers and MCP metadata to <code>3.8.0</code>. If you use
        Content Security Policy with force-directed graphs, allow workers from
        your own origin with <code>worker-src 'self'</code>. If you had imported
        DataPitfalls helpers from <code>semiotic/ai</code>, switch to the
        experimental names from <code>semiotic/experimental</code>.
      </p>

      <p>
        See <Link to="/features/chart-containers">Chart Containers</Link>,{" "}
        <Link to="/intelligence/data-pitfalls">Data Pitfalls Bridge</Link>, and{" "}
        <Link to="/interoperability/gofish">GoFish DisplayList</Link> for the
        updated docs.
      </p>
    </>
  )
}

export default {
  slug: "release-3-8-0",
  title: "Semiotic 3.8.0",
  subtitle:
    "Chart-level notifications, worker-backed force layouts, x-band annotations, sturdier interval lanes, custom-layout readback, and explicit experimental boundaries for DataPitfalls and GoFish adapters.",
  author: "AI-Generated",
  date: "2026-07-05",
  tags: ["release"],
  excerpt:
    "3.8.0 adds ChartContainer notifications for whole-chart findings, moves expensive ForceDirectedGraph layouts into a worker path, improves interval and x-band annotation handling, exposes custom-layout readback, and keeps the DataPitfalls and GoFish adapters on the unstable experimental endpoint.",
  component: Body,
}
