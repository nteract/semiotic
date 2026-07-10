import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ProcessFlowChart, GauntletChart } from "semiotic/physics"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

const processCode = `import { ProcessFlowChart } from "semiotic/physics"

// Many work items · capacitated stages · feature all-members completion
<ProcessFlowChart
  data={prs}
  stageAccessor="stage"
  groupBy="featureId"
  workAccessor="reviewWork"
  bodyMark="halo"           // or datum.__physicsMark
  liveCapacity              // FIFO queue at unitsPerSecond
  bodyLimit={400}           // soft stream budget (evict oldest)
  onCapacityChange={setStats}
  stages={[
    { id: "coding", label: "Coding", force: 14 },
    { id: "review", label: "Review",
      capacity: { unitsPerSecond: 4, unitAccessor: "reviewWork" } },
    { id: "revision", portal: { targetStageId: "coding" } },
    { id: "merged", absorb: true },
  ]}
/>`

const gauntletCode = `import { GauntletChart } from "semiotic/physics"

// One compound plan · tethered properties · timed gate effects
<GauntletChart
  data={projects}
  positiveProperties={lift}
  negativeProperties={drag}
  gates={gates}
  events={events}
  showProjection   // viability / outcome strip
  showChrome
/>`

const customCode = `import {
  PhysicsCustomChart,
  processStageLayout,
  capacitatedRegion,
  createCapacityQueueController,
  processChrome,
} from "semiotic/physics"

layout={(ctx) => {
  const volume = processStageLayout({
    width: ctx.dimensions.width,
    height: ctx.dimensions.height,
    stages: STAGE_DEFS,
    shape: "lane",
  })
  return {
    bodies: spawnsFromData(ctx.data, volume),
    regionEffects: [
      capacitatedRegion({ id: "review", ...volume.stages[1], capacity: 4 }),
    ],
    controllers: [
      createCapacityQueueController({
        regionId: "review",
        unitsPerSecond: 4,
      }),
    ],
    // layoutConfig changes restyle without re-enqueueing bodies
    overlays: processChrome({ ...volume, stages: chromeStages }),
  }
}}
layoutConfig={{ highlightId }}`

const decisionRows = [
  {
    choose: "ProcessFlowChart",
    when: "Many independent work items move through ordered stages with capacity, rework, and optional feature groups that complete only when every member is absorbed.",
    examples: "Hospital triage, moderation queues, ETL backlog",
  },
  {
    choose: "GauntletChart",
    when: "One compound plan (a project core) carries tethered positive/negative properties through timed gate effects that pop lift or add drag.",
    examples: "Merge Pressure, Not in MY Backyard, legislation, product roadmap risk",
  },
  {
    choose: "EventDropChart",
    when: "Event time vs arrival time, watermarks, lateness gutters — streaming time semantics.",
    examples: "Watermarks, Made Physical",
  },
  {
    choose: "GaltonBoardChart",
    when: "Uncertainty as sampling process; settled quantile / histogram.",
    examples: "Plinko Quantile Dotplot",
  },
  {
    choose: "PhysicsCustomChart + kit",
    when: "Bowtie volumes, bespoke regions, or essay layouts that still need Semiotic a11y and push.",
    examples: "Stakeholder Journey (processStageLayout)",
  },
]

const checklist = [
  "Use a named HOC or recipe — don't re-derive colliders in the example",
  "Chrome encodes the claim (stages, capacity, late gutter, sockets)",
  "Settled projection still tells the story when motion is paused",
  "Domain setup for the chart itself stays under ~150 lines",
  "Tooltips own chrome (inline background) or rely on FlippingTooltip auto-chrome",
  "Corridor integrity: bodies spawn and settle inside walls",
  "If capacity matters, show queue depth / processed counts (onCapacityChange or chrome badges)",
]

export default function PhysicsProcessGuidePage() {
  const [capacityNote, setCapacityNote] = useState("—")
  const prs = useMemo(
    () => [
      { id: "a1", stage: "coding", featureId: "auth", featureLabel: "Auth", reviewWork: 1.2, authorType: "human", mark: "circle" },
      { id: "a2", stage: "review", featureId: "auth", featureLabel: "Auth", reviewWork: 1.5, authorType: "human_ai_assisted", __physicsMark: "halo" },
      { id: "b1", stage: "review", featureId: "billing", featureLabel: "Billing", reviewWork: 2, authorType: "ai_agent", __physicsMark: "faceted" },
      { id: "b2", stage: "merged", featureId: "billing", featureLabel: "Billing", reviewWork: 1, authorType: "human", mark: "pill" },
      { id: "c1", stage: "revision", featureId: "search", featureLabel: "Search", reviewWork: 1.8, authorType: "ai_agent", __physicsMark: "diamond" },
    ],
    [],
  )
  const stages = useMemo(
    () => [
      { id: "coding", label: "Coding", force: 14, share: 1.1 },
      {
        id: "review",
        label: "Review",
        capacity: { unitsPerSecond: 3, unitAccessor: "reviewWork" },
        force: 12,
        share: 1.3,
      },
      { id: "revision", label: "Revision", portal: { targetStageId: "coding" }, share: 0.9 },
      { id: "merged", label: "Merged", absorb: true, force: 22, share: 1 },
    ],
    [],
  )

  return (
    <PageLayout
      title="Physics process guide"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "When Physics?", path: "/features/when-physics" },
        { label: "Process guide", path: "/features/physics-process-guide" },
      ]}
      prevPage={{ title: "When Physics?", path: "/features/when-physics" }}
      nextPage={{ title: "ProcessFlowChart", path: "/charts/process-flow-chart" }}
    >
      <p style={{ fontSize: "1.1rem", lineHeight: 1.55, maxWidth: 720 }}>
        How to pick a physics HOC, keep process chrome readable, measure capacity,
        and ship examples that stay honest when the balls stop moving.
      </p>

      <h2>Decision table</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={th}>Choose</th>
              <th style={th}>When</th>
              <th style={th}>Examples</th>
            </tr>
          </thead>
          <tbody>
            {decisionRows.map((row) => (
              <tr key={row.choose}>
                <td style={td}>
                  <strong>{row.choose}</strong>
                </td>
                <td style={td}>{row.when}</td>
                <td style={td}>{row.examples}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Gauntlet vs ProcessFlow</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>GauntletChart</h3>
          <p>One core + tethered properties + timed gates.</p>
          <CodeBlock language="jsx" code={gauntletCode} />
          <GauntletChart
            data={[
              {
                id: "plan",
                positives: ["homes", "trees"],
                negatives: ["cost"],
                viability: 80,
              },
            ]}
            positiveProperties={[
              { id: "homes", label: "Homes", color: "#22c55e", buoyancy: 2, radius: 9 },
              { id: "trees", label: "Trees", color: "#06b6d4", buoyancy: 1.4, radius: 8 },
            ]}
            negativeProperties={[{ id: "cost", label: "Cost", color: "#ef4444", load: 1, radius: 7 }]}
            gates={[{ id: "review", label: "Review" }]}
            size={[420, 220]}
            showProjection
          />
        </div>
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>ProcessFlowChart</h3>
          <p>
            Many PRs · live capacity · feature sockets. Capacity readout:{" "}
            <strong>{capacityNote}</strong>
          </p>
          <ProcessFlowChart
            data={prs}
            stages={stages}
            idAccessor="id"
            stageAccessor="stage"
            groupBy="featureId"
            groupLabelAccessor="featureLabel"
            workAccessor="reviewWork"
            colorBy="authorType"
            liveCapacity
            size={[420, 260]}
            settle={false}
            onCapacityChange={(stats) => {
              const review = stats.find((s) => s.regionId.includes("review"))
              if (review) {
                setCapacityNote(
                  `review q=${review.queueDepth} processed=${review.processedCount}`,
                )
              }
            }}
          />
        </div>
      </div>

      <h2>Authoring kit</h2>
      <p>
        Custom process essays should import the kit rather than inventing colliders:{" "}
        <code>processStageLayout</code>, region factories,{" "}
        <code>createCapacityQueueController</code>, <code>processChrome</code>.{" "}
        <code>layoutConfig</code> is the interaction hot path — re-style without re-enqueueing.
      </p>
      <CodeBlock language="jsx" code={customCode} />

      <h2>ProcessFlow props that matter</h2>
      <CodeBlock language="jsx" code={processCode} />
      <ul>
        <li>
          <strong>liveCapacity</strong> — FIFO queue at <code>unitsPerSecond</code>, not just drag
        </li>
        <li>
          <strong>onCapacityChange</strong> — queue depth + processed counts for readouts
        </li>
        <li>
          <strong>bodyMark / __physicsMark</strong> — circle, halo, faceted, pill, diamond, square
        </li>
        <li>
          <strong>bodyLimit</strong> — soft stream budget (evict oldest) for long runs
        </li>
        <li>
          <strong>selection</strong> — restyle without relayout
        </li>
      </ul>

      <h2>Example quality checklist</h2>
      <ol>
        {checklist.map((item) => (
          <li key={item} style={{ marginBottom: 6 }}>
            {item}
          </li>
        ))}
      </ol>
      <p>
        Flagship demos:{" "}
        <Link to="/examples/watermarks">Watermarks</Link>,{" "}
        <Link to="/examples/plinko-quantile-dotplot">Plinko</Link>,{" "}
        <Link to="/examples/merge-pressure">Merge Pressure</Link>,{" "}
        <Link to="/examples/not-in-my-backyard">NIMBY</Link>,{" "}
        <Link to="/examples/stakeholder-journey">Stakeholder Journey</Link>.
      </p>

      <h2>Contracts we test</h2>
      <p>
        Corridor integrity, tooltip chrome (never class-only transparent), settled projection
        overlays by default, capacity metrics, and seeded builder determinism live in{" "}
        <code>PhysicsContracts.test.ts</code>.
      </p>
    </PageLayout>
  )
}

const th = {
  textAlign: "left",
  borderBottom: "1px solid var(--surface-3)",
  padding: "8px 10px",
  color: "var(--text-secondary)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}
const td = {
  borderBottom: "1px solid var(--surface-3)",
  padding: "10px",
  verticalAlign: "top",
  lineHeight: 1.45,
}
const card = {
  border: "1px solid var(--surface-3)",
  borderRadius: 12,
  padding: 14,
  background: "var(--surface-1)",
}
