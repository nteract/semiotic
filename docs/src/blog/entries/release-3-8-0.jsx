/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        Semiotic 3.8.0 is a release about making ambitious charts cheaper to
        run and easier to trust. It moves expensive work away from the main
        thread, redraws only what changed, puts hard bounds around long-running
        streams, and gives both people and agents better evidence about what a
        chart is doing. It also trims the default package surface so consumers
        pay for specialized capabilities only when they choose them. Full
        release notes are on{" "}
        <a
          href="https://github.com/nteract/semiotic/blob/main/CHANGELOG.md#380---2026-07-11"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      <h2 id="notifications">Whole-Chart Findings Have a Home</h2>
      <p>
        Not every warning belongs to one mark. <code>ChartContainer</code> now
        accepts <code>notifications</code> for data-quality findings,
        accessibility audits, data-pitfall warnings, and host-authored notes
        that apply to the chart as a whole. They collapse into a
        severity-aware bell and open into dismissible cards, so a new finding
        never pushes a streaming chart around on the page.
      </p>
      <p>
        The notification layer includes an <code>aria-live</code> summary,
        semantic class hooks, stable dismiss-by-id behavior, and an{" "}
        <code>onNotificationDismiss</code> callback. The same finding can now be
        visible, announced, styled, and synchronized with a host store without
        inventing a fake annotation anchor.
      </p>

      <h2 id="performance">Less Work per Frame</h2>
      <p>
        The five Stream Frames are now memoized, and the XY, network, and geo
        render paths distinguish data-canvas work from interaction-canvas
        work. Hover changes and annotation retries no longer force a complete
        repaint of otherwise stable marks. Shared canvas-background and paint
        decision helpers keep those rules consistent across chart families.
      </p>
      <p>
        Long-running streams get safer defaults too. Growing windows now cap
        themselves at 100,000 points unless configured otherwise, warn once as
        they cross 50,000 points in development, and resize without the old
        repeated-shift cost. ID-keyed update and removal paths share the same
        optimized helpers, while XY decay and pulse reuse a single datum-index
        map.
      </p>

      <h2 id="stream-physics">StreamPhysicsFrame: Motion with Evidence</h2>
      <p>
        The largest new charting surface in 3.8.0 is{" "}
        <code>StreamPhysicsFrame</code>: a streaming frame for stories where
        movement is the mechanism—sampling, lateness, queues, routing,
        threshold crossings, collisions, and accumulation. Its bodies carry
        data, its walls and sensors come from chart geometry, and its pipeline
        has explicit running, paused, and settled states. Authors can execute
        the resident physics loop on the main thread or in a worker, suspend it
        when hidden, and keep deterministic control through the frame ref.
      </p>
      <p>
        This is a complete Semiotic frame rather than a particle layer. It has
        chart-derived colliders, body forces, regions, portals, absorption,
        annotations that can follow live bodies, legends, hover, click,
        selection without relayout, observation events, custom canvas drawing,
        and an imperative surface for pushing, inspecting, popping, and
        clearing bodies or region state. The optional Matter and Rapier
        adapters sit behind the same engine contract, while the built-in
        deterministic kernel remains the default.
      </p>
      <p>
        A process-authoring kit rides the same heartbeat. Capacity queues expose
        work, wait time, utilization, pressure, overflow, and completion
        evidence; finite resource pools make staff or machines explicit;
        service-level controllers and dependency gates model delay and blocked
        work; and journey ledgers, stage-region projections, reference
        envelopes, and trace comparisons turn the live mechanism into
        inspectable operations evidence. Those primitives power the physics HOC
        family, including EventDrop, Galton board, gauntlet, pile, collision,
        and process-flow charts, while <code>PhysicsCustomChart</code> keeps the
        lower-level frame available for bespoke systems.
      </p>
      <p>
        Most importantly, every animation has a non-animated truth. Settled
        projections produce ordinary scene nodes, standalone SVG, mark and
        simulation evidence, accessible semantic items, live announcements,
        and optional data tables. Reduced-motion readers, server exports, test
        agents, and people who arrive after the simulation stops all receive
        the same outcome. Server-side stepping can capture deterministic SVG
        frames and animated GIFs from the actual physics store instead of
        fabricating an animation from unrelated snapshots.
      </p>

      <h2 id="force-layout">Force Layouts Leave the Main Thread</h2>
      <p>
        <code>ForceDirectedGraph</code> gains <code>layoutExecution</code>,{" "}
        <code>layoutLoadingContent</code>, and <code>onLayoutStateChange</code>.
        Expensive layouts can settle in a module Web Worker and fall back to
        synchronous execution when workers are unavailable. The worker client
        now keeps a long-lived, request-addressed session instead of spawning
        and terminating a worker for every layout, while cancellation removes
        only the pending request.
      </p>
      <p>
        The force model itself is more expressive: degree-aware charge,
        degree-normalized link strength, radius-aware collision, weaker
        centering, and d3-force under the recipe-level <code>forceLayout</code>.
        SSR and first hydration remain synchronous for markup parity, and the
        same seed remains deterministic within this model—but geometry differs
        from earlier 3.x releases, so position-pinned snapshots need review.
      </p>

      <h2 id="annotations-and-layouts">Annotations and Layouts That Hold Up</h2>
      <p>
        New <code>x-band</code> annotations mark eras and phases as full-height
        regions in canvas and static SSR output. <code>intervalLanesLayout</code>
        now applies a minimum rendered width and packs in pixel space, keeping
        zero- and short-duration intervals visible without allowing them to
        overlap their neighbors.
      </p>
      <p>
        Custom XY, ordinal, network, and geo charts expose their last computed
        layout through <code>ref.current.getCustomLayout()</code>. Inspectors,
        validation layers, and statistics panels can read placement without
        running the layout twice. Interaction consumers also get a more
        reliable <code>unwrapDatum</code>, which now handles payloads nested
        under either <code>data</code> or <code>datum</code>.
      </p>

      <h2 id="smaller-package">A Smaller Default Surface</h2>
      <p>
        Physics chart HOCs no longer ride along with the root{" "}
        <code>semiotic</code> entry. Import <code>GaltonBoardChart</code>,{" "}
        <code>GauntletChart</code>, <code>PhysicsPileChart</code>, and related
        charts from <code>semiotic/physics</code>. That change cuts the measured
        full root package substantially while keeping the specialized family
        available as an explicit subpath. The misspelled{" "}
        <code>GuantletChart</code> alias is deprecated in favor of{" "}
        <code>GauntletChart</code>.
      </p>
      <p>
        <code>world-atlas</code> is now an optional peer, so applications that
        never resolve a built-in reference geography do not install it as a
        hard dependency. Library output now targets ES2020, and size budgets
        cover the physics, server, AI, recipes, utilities, and value entry
        points in addition to the core chart families.
      </p>

      <h2 id="agent-surface">A Focused Surface for Agents</h2>
      <p>
        Backend agents can import deterministic recommendation, validation,
        repair, grounding, and provider-tool adapters from{" "}
        <code>semiotic/ai/core</code> without loading the chart HOC catalog. The
        provider helpers now include <code>toOpenAIResponsesTool</code> alongside
        the Anthropic and OpenAI Chat Completions shapes.
      </p>
      <p>
        The MCP server adds a focused public profile with five task-oriented
        tools: create, improve, explain, audit, and inspect a chart schema. A
        generated AI surface manifest records the current component, export,
        renderability, tool, resource, and prompt inventory, and the portable
        Semiotic chart skill ships in the npm package for agent hosts that can
        install it.
      </p>

      <h2 id="experimental-adapters">Experimental Means Explicit</h2>
      <p>
        The DataPitfalls bridge and GoFish DisplayList adapter remain outside
        the stable API. Their exports keep the <code>unstable_</code> prefix on{" "}
        <code>semiotic/experimental</code>, including notification and
        annotation return paths for DataPitfalls findings. This is deliberate:
        those contracts depend on external schemas and render IR that are still
        being tested with real integrations.
      </p>

      <h2 id="upgrade-notes">Before You Upgrade</h2>
      <ul>
        <li>
          Move physics HOC imports from <code>semiotic</code> to{" "}
          <code>semiotic/physics</code>.
        </li>
        <li>
          Allow <code>worker-src 'self'</code> in Content Security Policy when
          worker-backed force layouts are enabled.
        </li>
        <li>
          Review force- and physics-position visual snapshots instead of
          accepting geometry changes blindly.
        </li>
        <li>
          Confirm ES2020 is compatible with the browsers and runtimes in your
          support matrix.
        </li>
        <li>
          Install <code>world-atlas</code> when using built-in reference
          geography resolution.
        </li>
      </ul>

      <p>
        See <Link to="/features/chart-containers">Chart Containers</Link>,{" "}
        <Link to="/intelligence/cli-mcp">CLI and MCP</Link>,{" "}
        <Link to="/intelligence/data-pitfalls">Data Pitfalls Bridge</Link>, and{" "}
        <Link to="/interoperability/gofish">GoFish DisplayList</Link> for the
        updated guides.
      </p>
    </>
  )
}

export default {
  slug: "release-3-8-0",
  title: "Semiotic 3.8.0",
  subtitle:
    "StreamPhysicsFrame, faster streaming and worker-backed layouts, whole-chart notifications, a smaller default bundle, and a focused deterministic surface for chart agents.",
  author: "AI-Generated",
  date: "2026-07-11",
  tags: ["release"],
  excerpt:
    "Semiotic 3.8.0 introduces StreamPhysicsFrame and its evidence-first process runtime, alongside bounded streaming work, selective canvas painting, persistent workers, chart-level findings, slimmer imports, stronger layouts, and a chart-free AI core with a focused public MCP profile.",
  component: Body,
}
