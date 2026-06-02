import React from "react"
import { buildReaderGrounding, countNodes } from "semiotic/utils"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

const SAMPLES = {
  "Monthly sales (trend)": {
    component: "LineChart",
    props: {
      data: [
        { month: "Jan", sales: 4200 }, { month: "Feb", sales: 5100 },
        { month: "Mar", sales: 6800 }, { month: "Apr", sales: 9100 },
      ],
      xAccessor: "month", yAccessor: "sales",
    },
    capability: { family: "time-series", intentScores: { trend: 5 } },
  },
  "Error rate (alerting)": {
    component: "LineChart",
    props: {
      data: [
        { t: "09:00", errors: 12 }, { t: "10:00", errors: 9 },
        { t: "11:00", errors: 140 }, { t: "12:00", errors: 14 },
      ],
      xAccessor: "t", yAccessor: "errors",
    },
    capability: { family: "time-series", intentScores: { "change-detection": 5, trend: 2 } },
  },
  "Market share (composition)": {
    component: "PieChart",
    props: {
      data: [
        { vendor: "A", share: 45 }, { vendor: "B", share: 30 },
        { vendor: "C", share: 15 }, { vendor: "D", share: 10 },
      ],
      categoryAccessor: "vendor", valueAccessor: "share",
    },
    capability: { family: "categorical", intentScores: { "part-to-whole": 4 } },
  },
}

function GroundingDemo() {
  const [which, setWhich] = React.useState("Monthly sales (trend)")
  const cfg = SAMPLES[which]
  const g = buildReaderGrounding(cfg.component, cfg.props, { capability: cfg.capability })

  const Row = ({ tag, color, children }) => (
    <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "baseline" }}>
      <span style={{ flex: "0 0 92px", fontSize: 11, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>{tag}</span>
      <span style={{ fontSize: 14, lineHeight: 1.5 }}>{children}</span>
    </div>
  )

  return (
    <div style={{ border: "1px solid var(--surface-3)", borderRadius: 8, overflow: "hidden", margin: "20px 0" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 12, background: "var(--surface-1)", borderBottom: "1px solid var(--surface-3)" }}>
        {Object.keys(SAMPLES).map((k) => (
          <button key={k} type="button" onClick={() => setWhich(k)} style={{
            padding: "5px 12px", borderRadius: 6, border: "1px solid var(--surface-3)", cursor: "pointer", fontSize: 13,
            background: which === k ? "var(--accent, #0969da)" : "var(--surface-2)",
            color: which === k ? "#fff" : "var(--text-1)",
          }}>{k}</button>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        <Row tag="description" color="#1a7f37">{g.description.text}</Row>
        {g.intent && (
          <Row tag={`intent · ${g.intent.act}`} color="#8250df">{g.intent.sentence}</Row>
        )}
        <Row tag="structure" color="#0969da">
          {`${countNodes(g.structure)} navigable nodes — chart → ${(g.structure.children || []).map((c) => c.role).filter((r, i, a) => a.indexOf(r) === i).join(" / ")} → datum`}
        </Row>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--surface-3)", fontSize: 13, color: "var(--text-2)" }}>
          <strong>grounding.text</strong> (what an LLM reads):<br />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{g.text}</span>
        </div>
      </div>
    </div>
  )
}

export default function ReaderGroundingPage() {
  return (
    <PageLayout
      title="Agent-Reader Grounding"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence/capabilities" },
        { label: "Agent-Reader Grounding", path: "/intelligence/reader-grounding" },
      ]}
      prevPage={{ title: "Interrogation", path: "/intelligence/interrogation" }}
      nextPage={{ title: "Conversation Arc", path: "/intelligence/conversation-arc" }}
    >
      <p>
        A capability descriptor says how a chart <em>should</em> be used — which
        intents it serves, what data it fits. That's the <strong>author</strong> side.
        The reader side is the inverse question: handed a specific chart, how does
        an agent (or a screen-reader user — they're the same consumer) recover what
        it means without seeing the pixels?{" "}
        <code>buildReaderGrounding()</code> answers that with a single payload.
      </p>

      <p>It composes the three reception artifacts the accessibility layer already builds:</p>
      <ul>
        <li>
          <strong>description</strong> — the{" "}
          <Link to="/accessibility/descriptions">layered L1–L3 description</Link>{" "}
          (encoding, statistics, trend).
        </li>
        <li>
          <strong>intent</strong> — the <strong>L4 communicative act</strong>: what the
          chart is asking the reader to do ("This is an alerting chart; the spike at
          11:00 is the point to investigate"), derived from the chart's capability intent.
        </li>
        <li>
          <strong>structure</strong> — the{" "}
          <Link to="/accessibility/navigation">navigation tree</Link>{" "}
          (chart → axes/series → datum) the agent can traverse node by node.
        </li>
      </ul>

      <h2 id="live">Try it</h2>
      <p>
        Each row is one part of the payload; the bottom line is the combined prose
        an LLM reads. Computed live in your browser.
      </p>
      <GroundingDemo />

      <h2 id="api">Programmatic API</h2>
      <CodeBlock
        code={`import { buildReaderGrounding } from "semiotic/utils"
import { LineChartCapability } from "semiotic/ai" // optional, for precise L4

const grounding = buildReaderGrounding("LineChart", chartProps, {
  capability: LineChartCapability,   // or a resolved { family, intentScores }
  audience: screenReaderAudience,    // optional reception tuning
})

grounding.description.text   // "A line chart of sales by month. sales ranges from …"
grounding.intent.act         // "tracking" | "alerting" | "comparing" | …
grounding.intent.sentence    // "This is a trend chart; read it for the trajectory of sales …"
grounding.structure          // NavTreeNode (chart → axes/series → datum)
grounding.text               // L1–L4 joined — feed this straight to the model

// Token-budget mode: skip the structure
buildReaderGrounding("PieChart", props, { includeStructure: false })`}
        language="jsx"
      />

      <h2 id="capability-precision">Capability context: precise vs best-effort</h2>
      <p>
        The <code>capability</code> input drives the L4 act. Pass a full capability
        descriptor (from <code>semiotic/ai</code>) or a resolved{" "}
        <code>{`{ family, intentScores }`}</code> — a{" "}
        <Link to="/intelligence/suggestions">suggestion</Link>'s already-resolved
        scores are the most precise source. Without any capability, the act is
        inferred from the component's family (a line chart reads as "tracking"),
        best-effort. A chart whose primary intents are computed at suggestion time
        (a line's <code>trend</code> scorer is a function) falls back to the family
        rather than mislabeling from leftover static scores.
      </p>

      <h2 id="why">Why a single payload</h2>
      <p>
        The thesis is that the non-visual reader and the AI reader face the same
        problem — meaning has to survive without the rendering — so they deserve the
        same evidence. Standardizing on one grounding payload means an agent that
        reads a chart faithfully and a screen reader that announces it are reading
        the <em>same</em> structured account, and an evaluator can check an agent's
        interpretation against it. It's the reader-side complement to the{" "}
        <Link to="/intelligence/capabilities">capability descriptor</Link> and partial
        "render evidence" for tool-using models.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/accessibility/descriptions">Chart Descriptions</Link> — the L1–L3 + L4 layers</li>
        <li><Link to="/accessibility/navigation">Structured Navigation</Link> — the structure half</li>
        <li><Link to="/intelligence/capabilities">Capability Matrix</Link> — the author-side descriptor</li>
        <li><Link to="/intelligence/interrogation">Interrogation</Link> — the LLM-backed Q&amp;A path</li>
      </ul>
    </PageLayout>
  )
}
