import React from "react"
import { BarChart } from "semiotic/ordinal"

import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import pilot from "../../data/hra-wpp-kidney-v1.6-pilot.json"

const chartRows = pilot.chartRows.map((row) => ({
  ...row,
  reviewStatus:
    row.temporaryCellTypeCount > 0
      ? "Contains provisional cell type"
      : "No provisional cell type",
}))

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 10,
  background: "var(--surface-1)",
  padding: 16,
  margin: "20px 0",
}

const warningStyle = {
  ...panelStyle,
  borderLeft: "4px solid var(--warning, #b26a00)",
}

const tableCellStyle = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--surface-3)",
  textAlign: "left",
  whiteSpace: "nowrap",
}

const sourceCode = `import { BarChart } from "semiotic/ordinal"

const chartRows = kidneyDirectChildren.map(row => ({
  ...row,
  reviewStatus:
    row.temporaryCellTypeCount > 0
      ? "Contains provisional cell type"
      : "No provisional cell type",
}))

<BarChart
  data={chartRows}
  categoryAccessor="displayLabel"
  valueAccessor="cellTypeCount"
  colorBy="reviewStatus"
  orientation="horizontal"
  sort={false}
  categoryLabel="Anatomical structure · ontology ID"
  valueLabel="Distinct cell types"
  description="Distinct cell-type coverage for observed direct children of kidney in HRA ASCT+B kidney v1.6. Counts are set memberships and are not additive."
/>`

function ExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  )
}

export default function HraWppPilotPage() {
  return (
    <PageLayout
      title="HRA/WPP Typology Pilot"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        {
          label: "HRA/WPP Typology Pilot",
          path: "/interoperability/hra-wpp",
        },
      ]}
      prevPage={{ title: "VACP Bridge", path: "/interoperability/vacp" }}
      nextPage={{ title: "Vega-Lite", path: "/interoperability/vega-lite" }}
    >
      <p>
        This pre-workshop artifact tests whether Semiotic&apos;s portable IDID
        metadata can carry an expert biomedical typology without flattening it.
        It is generated from the versioned{" "}
        <ExternalLink href={pilot.source.purl}>
          HRA kidney ASCT+B {pilot.source.version} digital object
        </ExternalLink>
        , not illustrative rows.
      </p>

      <div style={panelStyle}>
        <strong>Evidence snapshot</strong>
        <p style={{ marginBottom: 0 }}>
          {pilot.summary.recordCount} ASCT+B records;{" "}
          {pilot.summary.observedAnatomicalStructureCount} observed anatomical
          structures; {pilot.summary.observedCellTypeCount} observed cell
          types. The chart uses the {pilot.chartRows.length} observed direct
          children of <code>kidney (UBERON:0002113)</code>. Source created{" "}
          {pilot.source.creationDate} by {pilot.source.publisher}.
        </p>
      </div>

      <h2 id="actual-query-result">Actual query result</h2>

      <BarChart
        data={chartRows}
        categoryAccessor="displayLabel"
        valueAccessor="cellTypeCount"
        colorBy="reviewStatus"
        colorScheme={{
          "Contains provisional cell type": "var(--warning, #b26a00)",
          "No provisional cell type": "var(--accent, #4c78a8)",
        }}
        orientation="horizontal"
        sort={false}
        width={900}
        responsiveWidth
        height={430}
        margin={{ left: 285, top: 30, right: 35, bottom: 65 }}
        categoryLabel="Anatomical structure · ontology ID"
        valueLabel="Distinct cell types"
        title="Cell-type coverage for observed direct children of kidney"
        description="Distinct cell-type coverage for observed direct children of kidney in HRA ASCT+B kidney v1.6. Orange bars include at least one provisional cell-type term. Counts are set memberships and are not additive."
      />

      <div style={warningStyle}>
        <strong>Review signal</strong>
        <p style={{ marginBottom: 0 }}>
          Interstitium, renal collecting system, and kidney capsule each include
          one provisional cell-type term. That status is an editorial claim
          derived from <code>ccf_is_provisional</code>, separate from the
          measured bar height.
        </p>
      </div>

      <div style={{ overflowX: "auto", margin: "20px 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={tableCellStyle}>Anatomical structure</th>
              <th style={tableCellStyle}>Ontology ID</th>
              <th style={tableCellStyle}>Cell types</th>
              <th style={tableCellStyle}>Records</th>
              <th style={tableCellStyle}>Provisional cell types</th>
            </tr>
          </thead>
          <tbody>
            {pilot.chartRows.map((row) => (
              <tr key={row.anatomicalStructureId}>
                <td style={tableCellStyle}>
                  {row.anatomicalStructureLabel}
                </td>
                <td style={tableCellStyle}>
                  <code>{row.anatomicalStructureId}</code>
                </td>
                <td style={tableCellStyle}>{row.cellTypeCount}</td>
                <td style={tableCellStyle}>{row.recordCount}</td>
                <td style={tableCellStyle}>
                  {row.temporaryCellTypeCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="failure-found">A real failure found before the workshop</h2>

      <p>
        The first candidate ranked every anatomical-structure path by its
        display label. The real data shows why that is unsafe: a parent count
        includes cell types associated with descendant records, and distinct
        ontology identifiers can share the same label. The kidney root would
        dominate simply because it is the root, while a label-keyed chart would
        merge different concepts.
      </p>

      <ul>
        {pilot.findings.observedLabelCollisions.map((collision) => (
          <li key={collision.label}>
            <strong>{collision.label}</strong>:{" "}
            {collision.ids.map((id) => (
              <code key={id} style={{ marginRight: 8 }}>
                {id}
              </code>
            ))}
          </li>
        ))}
      </ul>

      <p>
        The corrected artifact uses ontology IDs as semantic keys, renders IDs
        beside labels, and compares one explicit sibling scope. It still does
        not claim the sibling counts are additive: a record can participate in
        more than one hierarchy path.
      </p>

      <CodeBlock code={sourceCode} />

      <h2 id="workshop-question">Workshop question</h2>

      <blockquote>
        Where does this typology mapping break for WPP? In particular, which
        facts must be typed and acted on across tools rather than merely
        preserved as ontology-linked extension metadata?
      </blockquote>

      <p>
        The remaining human validation is deliberately narrow: review the
        role/domain-literacy terms, identify one case where the corrected chart
        or reader-grounding envelope still miscommunicates the task, and decide
        whether that case justifies a typed <code>ContextProfile</code>. Until
        then, context remains namespaced <code>x-hra</code> metadata.
      </p>

      <p>
        Rebuild the pinned fixture with{" "}
        <code>npm run generate:hra-wpp-pilot</code>; the aggregator and its
        ontology-identity regression test live in <code>scripts/</code>.
      </p>
    </PageLayout>
  )
}
