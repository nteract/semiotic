/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"

// Metadata first so the sync check reads the canonical strings before UI copy.
const META = {
  slug: "physics-that-settles-into-charts",
  title: "Physics that settles into charts",
  subtitle:
    "Semiotic's physics frame adds motion only where movement carries the data claim: posterior samples fall into a quantile dotplot, event-time watermarks close real windows, and every animation still has a static projection, accessible readout, server export, and conversation-arc trace.",
  author: "Elijah Meeks",
  date: "2026-07-07",
  tags: ["case-study", "physics", "realtime"],
  excerpt:
    "The physics frame is not a particle-effect feature. It is a chart frame for cases where motion is the mechanism: sampling, lateness, queueing, routing, collision, and accumulation. The guardrail is simple: every physics chart must settle into a readable chart, expose the same state to readers and agents, and be exportable without asking the browser to perform the story live.",
}

const inlineCode = {
  fontFamily: "var(--semiotic-font-family-mono, ui-monospace, monospace)",
  fontSize: "0.9em",
}

const panel = {
  margin: "22px 0",
  padding: 18,
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  background: "var(--surface-1)",
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  margin: "22px 0",
}

const card = {
  padding: 16,
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  background: "var(--surface-1)",
}

const kicker = {
  display: "block",
  marginBottom: 8,
  color: "var(--accent, #00aeef)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const code = {
  margin: "20px 0",
  padding: 14,
  borderRadius: 8,
  border: "1px solid var(--surface-3)",
  background: "var(--surface-2)",
  overflowX: "auto",
  fontSize: 13,
}

const table = {
  width: "100%",
  borderCollapse: "collapse",
  margin: "20px 0",
}

const cell = {
  padding: "10px 12px",
  borderBottom: "1px solid var(--surface-3)",
  verticalAlign: "top",
  lineHeight: 1.5,
}

function LedgerCard({ title, mode, settled, trace, children }) {
  return (
    <div style={card}>
      <span style={kicker}>{mode}</span>
      <h3 style={{ margin: "0 0 8px" }}>{title}</h3>
      <p style={{ marginTop: 0 }}>{children}</p>
      <dl style={{ display: "grid", gap: 8, margin: 0 }}>
        <div>
          <dt style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 800 }}>
            Settled projection
          </dt>
          <dd style={{ margin: "2px 0 0" }}>{settled}</dd>
        </div>
        <div>
          <dt style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 800 }}>
            Trace
          </dt>
          <dd style={{ margin: "2px 0 0" }}>{trace}</dd>
        </div>
      </dl>
    </div>
  )
}

function PhysicsLedger() {
  return (
    <div style={grid}>
      <LedgerCard
        title="Watermarks"
        mode="stream process"
        settled="Event-time windows, on-time counts, late counts, and arrival order."
        trace="onTick runtime state, sensor observations, body selection, and conversation-arc edits."
      >
        Arrival time is the fall order. Event time is the binning system. A watermark is not a
        decorative line; it is the rule that closes old windows.
      </LedgerCard>
      <LedgerCard
        title="Plinko quantiles"
        mode="uncertainty process"
        settled="A quantile dotplot laid out from the same posterior-sample tokens."
        trace="Scenario, threshold, token count, replay, and selected drop events."
      >
        The board is a frequency-frame: each falling body is a posterior draw that keeps its identity
        when the motion ends.
      </LedgerCard>
      <LedgerCard
        title="Custom routing"
        mode="bespoke mechanism"
        settled="Lane totals, proximity sensor states, and selected packet state."
        trace="Route pushes, barrier state, sensor transitions, and reader grounding."
      >
        <Link to="/charts/physics-custom-chart">PhysicsCustomChart</Link> exists for the cases where
        barriers, proximity sensors, and custom colliders are the point of the chart.
      </LedgerCard>
    </div>
  )
}

function RuleTable() {
  return (
    <table style={table}>
      <thead>
        <tr>
          <th style={{ ...cell, textAlign: "left" }}>Rule</th>
          <th style={{ ...cell, textAlign: "left" }}>What it prevents</th>
          <th style={{ ...cell, textAlign: "left" }}>What shipped</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={cell}>Settle into a chart</td>
          <td style={cell}>Motion becoming spectacle after the reader loses the thread.</td>
          <td style={cell}>Histogram, dotplot, bar/pile, window table, and lane-state projections.</td>
        </tr>
        <tr>
          <td style={cell}>Make chrome physical</td>
          <td style={cell}>Decorative collisions detached from scales and annotations.</td>
          <td style={cell}>Scale-derived bins, walls, floors, thresholds, watermarks, and sensors.</td>
        </tr>
        <tr>
          <td style={cell}>Expose the runtime</td>
          <td style={cell}>A demo that looks right but cannot be audited or described.</td>
          <td style={cell}>Reader grounding, observation hooks, selected bodies, and arc events.</td>
        </tr>
        <tr>
          <td style={cell}>Export deterministically</td>
          <td style={cell}>A marketing GIF that is unrelated to the simulation being documented.</td>
          <td style={cell}>Server-side frame stepping for SVG frames and animated GIFs.</td>
        </tr>
      </tbody>
    </table>
  )
}

function PhysicsThatSettlesIntoCharts() {
  return (
    <>
      <p>
        A lot of physics in visualization is just glitter with velocity. Semiotic's physics work is
        more constrained than that. The claim is not "things move, therefore the chart is engaging."
        The claim is: some data stories have a mechanism, and the mechanism is easier to understand
        when the chart makes it visible.
      </p>

      <p>
        That is why the new surface is a frame, not a canvas toy. The bodies are data-bearing
        objects. The walls and sensors come from chart geometry. The animation has a runtime state.
        The final positions are still a chart. A reader who never watches the motion should still get
        the evidence.
      </p>

      <div style={panel}>
        <strong>Use physics when the movement is the data claim.</strong> Sampling, lateness,
        queueing, routing, threshold crossing, and accumulation can earn motion. A static ranking, a
        simple time series, or a normal bar chart usually cannot.
      </div>

      <h2>Two flagship examples</h2>
      <p>
        The first flagship example is{" "}
        <Link to="/examples/watermarks">Watermarks, Made Physical</Link>, a credited remake of the
        mechanic from <a href="https://flink-watermarks.wtf/">flink-watermarks.wtf</a> on top of{" "}
        <Link to="/charts/event-drop-chart">EventDropChart</Link>. It shows the thing stream
        processors care about but dashboards often hide: event time and arrival time are different
        axes of truth. A record can arrive late, a watermark can close a window, and the resulting
        classification is process state, not just mark color.
      </p>

      <p>
        The second is{" "}
        <Link to="/examples/plinko-quantile-dotplot">Plinko Quantile Dotplot</Link>. Posterior
        samples become semantic tokens through <code style={inlineCode}>generateTokens</code>, fall
        through <Link to="/charts/galton-board-chart">GaltonBoardChart</Link>, then settle into a
        quantile dotplot built from the same tokens. The animation is not a separate illustration.
        It is the sampling process that produces the final uncertainty display.
      </p>

      <PhysicsLedger />

      <h2>The API shape</h2>
      <p>
        The chart authoring surface stays ordinary React. You name the data fields that mean time,
        arrival, value, or category; the HOC builds the physics world from that chart contract.
      </p>

      <pre style={code}>{`import { EventDropChart } from "semiotic/physics"

<EventDropChart
  data={events}
  timeAccessor="eventTime"
  arrivalAccessor="arrivalTime"
  windows={{ size: 12 }}
  watermark={{ delay: 18 }}
  colorBy="source"
  frameProps={{
    onTick: (result, controls) => setRuntime(controls.snapshot()),
    onBodyPointerDown: (body) => setSelectedEvent(body?.datum),
  }}
/>`}</pre>

      <p>
        The important part is the <code style={inlineCode}>frameProps</code> bridge. It means the
        simulation is not sealed inside a renderer. Runtime state, observations, and selected bodies
        can feed readouts, tests, annotations, and AI tooling.
      </p>

      <h2>The guardrails</h2>
      <RuleTable />

      <p>
        These rules are the difference between a physics chart and a particle effect. The{" "}
        <Link to="/features/when-physics">When Physics?</Link> guide says the same thing as product
        guidance: pick the mode first. If the movement is not layout, process didactics, or flow
        texture with a readable fallback, do not use it.
      </p>

      <h2>Observable by readers and agents</h2>
      <p>
        The examples now opt in to the <Link to="/intelligence/conversation-arc">conversation
        arc</Link>. Change a scenario, adjust the watermark delay, inject a late burst, replay a
        Plinko board, select a body, or move the threshold: the local arc counter records the render
        and edit events. That is not analytics by default; it is an in-memory inspection surface so a
        human or adversarial test agent can verify that the chart's interaction story is visible.
      </p>

      <p>
        Reader grounding also learned about physics. A chart can now expose simulation parameters,
        body counts, active sensors, aggregates, and sediment state to the same interrogation layer
        that describes ordinary charts. That matters because a physics chart has more ways to lie:
        it can make an animation feel causal when the settled data says otherwise. Grounding gives
        the assistant and the test harness the boring facts.
      </p>

      <h2>Export without pretending</h2>
      <p>
        The server path matters for the same reason. An animated GIF of a physics chart should not be
        a fake sequence made by slicing more rows into the data. The new{" "}
        <code style={inlineCode}>generatePhysicsFrameSVGs</code> and{" "}
        <code style={inlineCode}>renderPhysicsToAnimatedGif</code> path steps the actual physics
        store and captures deterministic frames.
      </p>

      <pre style={code}>{`import { renderPhysicsToAnimatedGif } from "semiotic/server"
import { buildEventDropPhysics } from "semiotic/physics"

const layout = buildEventDropPhysics({
  data: events,
  timeAccessor: "eventTime",
  arrivalAccessor: "arrivalTime",
  windows: { size: 12 },
  watermark: { delay: 18 },
  size: [640, 360],
})

const gif = await renderPhysicsToAnimatedGif({
  width: 640,
  height: 360,
  config: layout.config,
  initialSpawns: layout.initialSpawns,
  initialSpawnPacing: layout.initialSpawnPacing,
}, {
  frameCount: 48,
  fps: 18,
})`}</pre>

      <p>
        That makes the README animation, the docs example, and the server export part of the same
        contract. If the simulation changes, the exported frames change with it.
      </p>

      <h2>Why this belongs in Semiotic</h2>
      <p>
        Physics is stateful integration. It is not a pure layout function. Positions depend on prior
        positions, collisions, impulses, sensors, sleep, and time. That needs a lifecycle owner: a
        world, a store, a frame loop, and a way to project moving bodies back into Semiotic's scene
        vocabulary.
      </p>

      <p>
        Once it is inside that frame contract, the rest of the library shows up: theming, hit
        testing, reduced-motion fallback, accessible readouts, server rendering, reader grounding,
        and the export path. The motion is new. The obligations are not.
      </p>
    </>
  )
}

export default {
  ...META,
  component: PhysicsThatSettlesIntoCharts,
}
