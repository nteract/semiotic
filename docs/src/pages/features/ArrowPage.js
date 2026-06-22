import React, { useMemo } from "react"
import { Link } from "react-router-dom"
import { BarChart } from "semiotic"
import { fromArrow } from "semiotic/data"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// A duck-typed, column-oriented "Arrow table" — the same shape apache-arrow's
// Table and DuckDB-Wasm result sets expose (numRows / schema.fields / getChild).
// (In a real app this is the table your query returns; no apache-arrow import is
// needed by Semiotic — the table is duck-typed.)
function mockArrowTable(columns) {
  const names = Object.keys(columns)
  const numRows = names.length ? columns[names[0]].length : 0
  return {
    numRows,
    schema: { fields: names.map((name) => ({ name })) },
    getChild: (name) => (columns[name] ? { get: (i) => columns[name][i] } : null),
  }
}

const TABLE = mockArrowTable({
  region: ["North", "South", "East", "West"],
  revenue: [128, 92, 145, 71],
  // int64 columns come back from Arrow as bigint; fromArrow coerces in-range ones.
  orders: [1240n, 980n, 1510n, 760n],
})

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 10,
  background: "var(--surface-1)",
  padding: 16,
}

const pretty = (v) => JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? `${val}n` : val), 2)

export default function ArrowPage() {
  const rows = useMemo(() => fromArrow(TABLE), [])
  const projected = useMemo(() => fromArrow(TABLE, { fields: ["region", "revenue"] }), [])

  return (
    <PageLayout
      title="Apache Arrow Adapter"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        { label: "Apache Arrow Adapter", path: "/interoperability/arrow" },
      ]}
      prevPage={{ title: "GoFish IR Adapter", path: "/interoperability/gofish" }}
      nextPage={{ title: "Data-Truth Bridge", path: "/interoperability/data-quality-bridge" }}
    >
      <p>
        DuckDB-Wasm is redefining client-side analytics — you can run real SQL over millions of rows
        in the browser. Its results, like Parquet and Arrow IPC, come back as{" "}
        <strong>columnar Apache Arrow tables</strong>, not the row objects a chart reads.{" "}
        <code>fromArrow</code> bridges that gap in one call, so an in-browser query feeds Semiotic
        directly.
      </p>

      <h2>Why this matters</h2>
      <p>
        The honest version first: Semiotic's data path is row-oriented today, so{" "}
        <code>fromArrow</code> v1 <em>materializes</em> rows — but leanly. It reads each requested
        column cell-by-cell into plain objects, skipping Arrow's own <code>toArray()</code>{" "}
        row-proxy machinery, and it supports column projection so you only pay for the fields you
        chart. The genuinely zero-copy columnar path — a typed-array accessor mode and bulk
        ring-buffer ingest — is deliberately <em>not</em> built here. It touches the streaming core,
        so it waits on a real high-throughput consumer and profiling evidence rather than being
        built on spec and marketed on a benchmark that doesn't exist yet.
      </p>

      <h2>An Arrow table in, a chart out</h2>
      <p>
        Below, a column-oriented Arrow-shaped table is read by <code>fromArrow</code> into row
        objects and charted. The <code>orders</code> column is <code>int64</code> (Arrow returns{" "}
        <code>bigint</code>); <code>fromArrow</code> coerces in-range values to <code>number</code>{" "}
        so the scales work.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            fromArrow(table) → rows
          </div>
          <CodeBlock language="json" wrap>
            {pretty(rows)}
          </CodeBlock>
        </div>
        <div style={panelStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Charted directly</div>
          <BarChart
            width={365}
            data={rows}
            categoryAccessor="region"
            valueAccessor="revenue"
            title="Revenue by region"
            height={240}
          />
        </div>
      </div>

      <h2>Wiring it up</h2>
      <CodeBlock language="ts">
        {`import { fromArrow } from "semiotic/data"

// \`table\` is an Arrow Table or a DuckDB-Wasm result set — duck-typed, so
// apache-arrow is never a Semiotic dependency.
const rows = fromArrow(table)
<BarChart data={rows} categoryAccessor="region" valueAccessor="revenue" />

// Project only the columns you chart — you don't pay to read the rest:
const lean = fromArrow(table, { fields: ["region", "revenue"] })`}
      </CodeBlock>

      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        Projecting <code>{`{ fields: ["region", "revenue"] }`}</code> yields{" "}
        <code>{pretty(projected[0])}</code> per row — the <code>orders</code> column isn't read at
        all.
      </p>

      <h2>Where this goes</h2>
      <p>
        Paired with <Link to="/coordinated-views">coordinated views</Link>, an in-browser DuckDB
        plus <code>fromArrow</code> drives cross-filtering over a live query: brush one chart,
        re-run the SQL, re-read the Arrow result. The streaming-kit work (windowing, backpressure)
        is the natural home for the high-throughput guarantees the columnar v2 will eventually need
        — and the discipline is to publish the measured number, whatever it says, before marketing
        it.
      </p>

      <h2>Related</h2>
      <ul>
        <li>
          <Link to="/interoperability">Interoperability overview</Link> — the adapter family and the
          strategy behind it.
        </li>
        <li>
          <Link to="/realtime/overview">Realtime</Link> — the streaming engine an Arrow feed drives.
        </li>
      </ul>
    </PageLayout>
  )
}
