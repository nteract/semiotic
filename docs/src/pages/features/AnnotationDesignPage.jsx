import React from "react"
import { LineChart } from "semiotic"
import { Link } from "react-router-dom"

import LiveExample from "../../components/LiveExample"
import PageLayout from "../../components/PageLayout"

const data = [
  { week: 1, incidents: 12 },
  { week: 2, incidents: 15 },
  { week: 3, incidents: 14 },
  { week: 4, incidents: 31 },
  { week: 5, incidents: 22 },
  { week: 6, incidents: 18 },
  { week: 7, incidents: 27 },
  { week: 8, incidents: 20 },
]

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  borderBottom: "1px solid var(--surface-3)",
  fontWeight: 600,
}

const tdStyle = {
  padding: "8px 16px",
  borderBottom: "1px solid var(--surface-3)",
  verticalAlign: "top",
}

export default function AnnotationDesignPage() {
  return (
    <PageLayout
      title="Annotation Design Guidance"
      breadcrumbs={[
        { label: "Annotations", path: "/annotations" },
        { label: "Design Guidance", path: "/annotations/design-guidance" },
      ]}
      prevPage={{ title: "Overview", path: "/annotations/overview" }}
      nextPage={{ title: "Advanced Annotations", path: "/annotations/advanced" }}
    >
      <p>
        A useful annotation is not just text placed on a chart. It establishes
        a reading order, stays tied to its target, survives the space available,
        and carries enough context to remain honest when the chart travels.
        Semiotic&apos;s annotation APIs map directly to those design decisions.
      </p>

      <LiveExample
        frameProps={{
          data,
          xAccessor: "week",
          yAccessor: "incidents",
          xLabel: "Week",
          yLabel: "Incidents",
          showPoints: true,
          autoPlaceAnnotations: {
            density: { maxAnnotations: 3 },
            progressiveDisclosure: true,
            redundantCues: true,
            cohesion: "layer",
          },
          annotations: [
            {
              type: "callout-circle",
              x: 4,
              y: 31,
              label: "Primary spike to investigate",
              radius: 7,
              emphasis: "primary",
              color: "#d7263d",
            },
            {
              type: "text",
              x: 7,
              y: 27,
              label: "Secondary recurrence",
              emphasis: "secondary",
              color: "#d7263d",
            },
            {
              type: "y-threshold",
              value: 25,
              label: "Escalation threshold",
              color: "#b45309",
            },
            {
              type: "callout",
              x: 1,
              y: 12,
              label: "Data excludes planned maintenance",
              defensive: true,
              provenance: { source: "user", confidence: 1 },
            },
          ],
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { week: 1, incidents: 12 }, { week: 2, incidents: 15 },
  { week: 3, incidents: 14 }, { week: 4, incidents: 31 },
  { week: 5, incidents: 22 }, { week: 6, incidents: 18 },
  { week: 7, incidents: 27 }, { week: 8, incidents: 20 }
]`,
          autoPlaceAnnotations: `{
  density: { maxAnnotations: 3 },
  progressiveDisclosure: true,
  redundantCues: true,
  cohesion: "layer"
}`,
          annotations: `[
  { type: "callout-circle", x: 4, y: 31, label: "Primary spike to investigate",
    radius: 7, emphasis: "primary", color: "#d7263d" },
  { type: "text", x: 7, y: 27, label: "Secondary recurrence",
    emphasis: "secondary", color: "#d7263d" },
  { type: "y-threshold", value: 25, label: "Escalation threshold", color: "#b45309" },
  { type: "callout", x: 1, y: 12, label: "Data excludes planned maintenance",
    defensive: true, provenance: { source: "user", confidence: 1 } }
]`,
        }}
        hiddenProps={{}}
      />

      <h2 id="six-considerations">Six Design Considerations</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            <th style={thStyle}>Consideration</th>
            <th style={thStyle}>Question</th>
            <th style={thStyle}>Semiotic support</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Audience", "What does this reader know, and will the chart travel?", <><code>audience</code>, <code>defensive</code>, visible provenance</>],
            ["Hierarchy", "What should be read first?", <><code>emphasis</code>, confidence-derived reading order</>],
            ["Placement", "Can the note sit adjacent to its target?", <><code>autoPlaceAnnotations</code>, manual offsets, curved connectors</>],
            ["Association", "Can the reader identify the target without color?", <><code>redundantCues</code>, connectors, enclosures, accessibility audit</>],
            ["Cohesion", "Should notes blend with the chart or read as an editorial layer?", <><code>cohesion: "blended" | "layer"</code></>],
            ["Amount", "How many notes can the available space carry?", <><code>density</code>, <code>responsive</code>, progressive disclosure</>],
          ].map(([name, question, support], i) => (
            <tr key={name} style={{ background: i % 2 ? "var(--surface-1)" : "transparent" }}>
              <td style={tdStyle}><strong>{name}</strong></td>
              <td style={tdStyle}>{question}</td>
              <td style={tdStyle}>{support}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="defensive-annotations">Defensive Annotations</h2>

      <p>
        Use <code>defensive: true</code> for caveats or context that must survive
        screenshots, exports, and redistribution. Defensive notes are never shed
        by density or responsive annotation passes. Add <code>provenance</code>
        when the note&apos;s origin or confidence matters after it leaves the
        original application.
      </p>

      <h2 id="use-another-approach">Use Another Approach When...</h2>

      <ul>
        <li>The reader needs exact values for many points: use a table or accessible data view.</li>
        <li>The note is application chrome or a workflow action: use a panel, tooltip, or <Link to="/annotations/advanced">widget annotation</Link>.</li>
        <li>Every point needs a label: reconsider the encoding, direct-label a smaller set, or split the chart.</li>
        <li>The annotation cannot be tied to a stable data target: keep it outside the plot and explain the limitation.</li>
      </ul>

      <h2 id="related">Related</h2>

      <ul>
        <li><Link to="/annotations/overview">Annotations Overview</Link> - types, placement, density, and live examples.</li>
        <li><Link to="/annotations/provenance-lifecycle">Provenance &amp; Lifecycle</Link> - who wrote a note, how it ages, and whether it is still believed.</li>
        <li><Link to="/accessibility/audit">Chartability Audit</Link> - checks annotation association and other receivability risks.</li>
      </ul>
    </PageLayout>
  )
}
