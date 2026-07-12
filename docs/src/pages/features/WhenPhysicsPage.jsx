import React from "react"
import { Link } from "react-router-dom"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"

const modeRows = [
  {
    mode: "Layout",
    readout: "Read at rest",
    use: "Collision relaxation, swarms, piles, and packed bodies where motion is how the layout finds a stable position.",
    component: <Link to="/charts/collision-swarm-chart">CollisionSwarmChart</Link>,
  },
  {
    mode: "Process",
    readout: "Read the transition and the result",
    use: "The simulation mirrors the system being explained: sampling through bins, late-event barriers, backpressure, or settling into categories.",
    component: <Link to="/charts/event-drop-chart">EventDropChart</Link>,
  },
  {
    mode: "Uncertainty",
    readout: "Read the settled distribution",
    use: "Posterior samples or scenario draws fall through a process and rest as a quantile dotplot or histogram — motion frames frequency, not network topology.",
    component: <Link to="/charts/galton-board-chart">GaltonBoardChart</Link>,
  },
  {
    mode: "Texture",
    readout: "Read the base chart",
    use: "Particles decorate flow direction or activity. Keep this in the host chart unless the bodies carry data, collisions, or state.",
    component: <Link to="/features/realtime-encoding">Realtime Encoding</Link>,
  },
]

const hocRows = [
  {
    name: "GaltonBoardChart",
    path: "/charts/galton-board-chart",
    when: "Posterior samples, uncertainty, binned outcomes, and Plinko-style explainers.",
    settled: "Histogram or quantile-dotplot projection.",
  },
  {
    name: "EventDropChart",
    path: "/charts/event-drop-chart",
    when: "Event time versus arrival time, watermarks, lateness, queueing, and windows.",
    settled: "Window counts, late counts, and closed/open state.",
  },
  {
    name: "PhysicsPileChart",
    path: "/charts/physics-pile-chart",
    when: "Unitized counting, category bins, sedimented totals, and materialized denominators.",
    settled: "Category totals and represented value.",
  },
  {
    name: "CollisionSwarmChart",
    path: "/charts/collision-swarm-chart",
    when: "Dot strips and grouped distributions where collisions reveal local density without hiding the quantitative axis.",
    settled: "X-axis distribution with optional group lanes and counts.",
  },
  {
    name: "ProcessFlowChart",
    path: "/charts/process-flow-chart",
    when: "Multi-body workflows with capacitated stages, rework portals, and feature groups that complete only when every member is absorbed.",
    settled: "Stage occupancy counts and group completion ledger.",
  },
  {
    name: "GauntletChart",
    path: "/charts/gauntlet-chart",
    when: "One compound plan degraded by timed gate effects (lift balloons and drag particles).",
    settled: "Property inventory, viability, and outcome state.",
  },
  {
    name: "PhysicalFlowChart",
    path: "/charts/physical-flow-chart",
    when: "Packets on authored routes where throughput stays readable as a static layer.",
    settled: "Route throughput and node totals.",
  },
  {
    name: "PhysicsCustomChart",
    path: "/charts/physics-custom-chart",
    when: "The scene needs custom colliders, sensors, spawn rules, or overlays that the HOCs do not expose.",
    settled: "Your layout must return the projection evidence explicitly.",
  },
]

const budgetRows = [
  ["Autoplay", "Short enough to understand in one pass; provide pause and replay when motion continues."],
  ["Reduced motion", "Render the settled projection first, then let users opt into replay where appropriate."],
  ["Time scale", "Use replay time scale for arrival pacing, not to slow gravity or the physics clock."],
  ["Body count", "Keep live bodies within a readable range; aggregate, evict, or sediment long streams."],
  ["Accessibility", "Expose the settled chart, aggregate rows, and milestone observations as the accessible object."],
]

const ledgerCode = `const displacementLedger = {
  source: "arrivalTime and eventTime",
  body: "one event body per row",
  displacement: "body falls into the event-time window bin",
  barrier: "watermark closes old windows",
  sensor: "late bodies cross into the late gutter",
  projection: "window totals and late counts",
  accessibleReadout: "settled table + live milestone observations",
}`

const budgetCode = `<EventDropChart
  data={events}
  timeAccessor="eventTime"
  arrivalAccessor="arrivalTime"
  windows={{ size: 12 }}
  watermark={{ delay: 18 }}
  timeScale={0.08}        // replay pacing only
  paused={prefersReducedMotion}
  frameProps={{
    onTick: (result, controls) => setRuntime(controls.snapshot()),
    onBodyPointerDown: (body) => setSelectedEvent(body?.datum),
  }}
/>`

function GuidanceTable({ columns, rows }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} style={styles.th}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, index) => (
                <td key={index} style={styles.td}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function WhenPhysicsPage() {
  return (
    <PageLayout
      title="When Physics?"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "When Physics?", path: "/features/when-physics" },
      ]}
      prevPage={{ title: "Push API", path: "/features/push-api" }}
      nextPage={{ title: "Physics process guide", path: "/features/physics-process-guide" }}
    >
      <section>
        <p style={styles.lede}>
          Use physics when movement carries a data claim: a body is delayed, blocked,
          sorted, sampled, counted, or settled because of the data. If movement only
          makes a static chart feel active, use ordinary chart animation or no motion.
        </p>
        <p>
          For process HOCs (Gauntlet vs ProcessFlow), capacity queues, body marks, and
          the example checklist, see the{" "}
          <Link to="/features/physics-process-guide">Physics process guide</Link>.
        </p>
        <div style={styles.callout}>
          <strong>Rule of thumb:</strong> every physics chart needs a settled projection
          that is still a useful chart when the animation is paused, skipped, or rendered
          for reduced motion.
        </div>
      </section>

      <section>
        <h2>Four Modes</h2>
        <p>
          Pick the mode before picking the component. Most confusion comes from
          putting texture-style particles on a layout chart and asking readers to
          infer meaning from motion that does not actually encode anything.
        </p>
        <GuidanceTable
          columns={["Mode", "Readout", "Use it for", "Semiotic starting point"]}
          rows={modeRows.map((row) => ({
            key: row.mode,
            cells: [
              <strong key="mode">{row.mode}</strong>,
              row.readout,
              row.use,
              row.component,
            ],
          }))}
        />
      </section>

      <section>
        <h2>Settled Projection</h2>
        <p>
          The accessible object is the settled or aggregated chart, not the path each
          body took. Motion may teach the process, but the chart still owes readers a
          stable answer: bins, totals, intervals, late counts, sediment, or an explicit
          projection table.
        </p>
        <ul>
          <li>
            <Link to="/examples/stakeholder-journey">Stakeholder Journey</Link> lets
            competing cohorts move through process stages and settle into accessible stage-level
            projections.
          </li>
          <li>
            <Link to="/examples/watermarks">Watermarks, Made Physical</Link>{" "}
            animates event arrivals, then exposes settled window counts and late counts.
          </li>
          <li>
            <Link to="/charts/physics-pile-chart">PhysicsPileChart</Link>{" "}
            treats bodies as unitized value carriers, then reads the piled result by category.
          </li>
          <li>
            <Link to="/charts/collision-swarm-chart">CollisionSwarmChart</Link>{" "}
            uses collisions to separate overlapping dots while preserving their x-axis position.
          </li>
          <li>
            <Link to="/charts/process-flow-chart">ProcessFlowChart</Link>{" "}
            moves work items through capacitated stages and reads stage counts plus feature completion.
          </li>
        </ul>
      </section>

      <section>
        <h2>Displacement Ledger</h2>
        <p>
          A displacement ledger names what moves, why it moves, and what state change
          the movement represents. Write this before building a custom physics scene.
          If you cannot fill in <code>displacement</code>, <code>projection</code>,
          and <code>accessibleReadout</code>, the chart probably does not need physics.
        </p>
        <CodeBlock language="js" code={ledgerCode} />
      </section>

      <section>
        <h2>Motion Budget</h2>
        <p>
          Motion should clarify the state transition once, then get out of the way.
          Budget it the same way you budget labels and annotations: what does it cost,
          and what does the reader learn that the settled chart cannot show alone?
        </p>
        <GuidanceTable
          columns={["Budget item", "Requirement"]}
          rows={budgetRows.map(([key, value]) => ({
            key,
            cells: [<strong key="budget-item">{key}</strong>, value],
          }))}
        />
        <CodeBlock language="jsx" code={budgetCode} />
      </section>

      <section>
        <h2>Choose The HOC</h2>
        <GuidanceTable
          columns={["Component", "Use when", "Settled projection"]}
          rows={hocRows.map((row) => ({
            key: row.name,
            cells: [
              <Link key="component" to={row.path}><strong>{row.name}</strong></Link>,
              row.when,
              row.settled,
            ],
          }))}
        />
        <p>
          Reach for <Link to="/charts/physics-custom-chart">PhysicsCustomChart</Link>{" "}
          only after the HOCs fail on geometry or state. If the custom scene does not
          need colliders, sensors, spawn timing, or sediment, it is probably an ordinary
          custom chart.
        </p>
      </section>

      <section>
        <h2>Do Not Use Physics For</h2>
        <ul>
          <li>Decorating a bar, line, or Sankey chart with particles that do not carry data.</li>
          <li>Replacing a readable axis, legend, or summary with a body path.</li>
          <li>Hiding uncertainty behind randomness without showing the sample or interval.</li>
          <li>Long-running streams that never aggregate, evict, sediment, or pause.</li>
          <li>Any chart where reduced motion would remove the only meaningful readout.</li>
        </ul>
      </section>
    </PageLayout>
  )
}

const styles = {
  lede: {
    maxWidth: 820,
    color: "var(--text-secondary)",
    fontSize: 18,
    lineHeight: 1.6,
  },
  callout: {
    maxWidth: 820,
    margin: "18px 0 28px",
    padding: "14px 16px",
    border: "1px solid var(--surface-3)",
    borderRadius: 8,
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    lineHeight: 1.5,
  },
  tableWrap: {
    overflowX: "auto",
    margin: "16px 0 24px",
    border: "1px solid var(--surface-3)",
    borderRadius: 8,
  },
  table: {
    width: "100%",
    minWidth: 680,
    borderCollapse: "collapse",
  },
  th: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--surface-3)",
    background: "var(--surface-1)",
    color: "var(--text-secondary)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textAlign: "left",
    textTransform: "uppercase",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid var(--surface-3)",
    color: "var(--text-primary)",
    lineHeight: 1.45,
    verticalAlign: "top",
  },
}
