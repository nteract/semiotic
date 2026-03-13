import React from "react"
import {
  LineChart, BarChart, Scatterplot, Treemap,
  ChartGrid, ContextLayout, CategoryColorProvider, LinkedCharts
} from "semiotic"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  { month: 1, revenue: 12, region: "North" },
  { month: 2, revenue: 18, region: "North" },
  { month: 3, revenue: 14, region: "North" },
  { month: 4, revenue: 22, region: "North" },
  { month: 5, revenue: 19, region: "North" },
  { month: 6, revenue: 27, region: "North" },
  { month: 1, revenue: 8, region: "South" },
  { month: 2, revenue: 12, region: "South" },
  { month: 3, revenue: 10, region: "South" },
  { month: 4, revenue: 16, region: "South" },
  { month: 5, revenue: 14, region: "South" },
  { month: 6, revenue: 20, region: "South" },
]

const barData = [
  { region: "North", total: 112 },
  { region: "South", total: 80 },
  { region: "East", total: 95 },
  { region: "West", total: 68 },
]

const scatterData = Array.from({ length: 40 }, (_, i) => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  region: ["North", "South", "East", "West"][i % 4],
}))

const treeData = {
  name: "Sales", region: "Sales",
  children: [
    { name: "North", region: "North", value: 112 },
    { name: "South", region: "South", value: 80 },
    { name: "East", region: "East", children: [
      { name: "E-Online", region: "East", value: 55 },
      { name: "E-Retail", region: "East", value: 40 },
    ]},
    { name: "West", region: "West", value: 68 },
  ]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------


export default function CompositionPage() {
  return (
    <PageLayout
      title="Composition"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Composition", path: "/features/composition" },
      ]}
      prevPage={{ title: "Responsive", path: "/features/responsive" }}
      nextPage={{ title: "Accessibility", path: "/features/accessibility" }}
    >
      <p>
        Semiotic provides layout components for arranging multiple charts into
        dashboards, primary+context views, and coordinated displays. These
        compose naturally with{" "}
        <Link to="/features/small-multiples">LinkedCharts</Link> for
        cross-highlighting and{" "}
        <Link to="/features/responsive">responsiveWidth</Link> for
        fluid sizing.
      </p>

      {/* ================================================================= */}
      {/* ChartGrid */}
      {/* ================================================================= */}
      <h2 id="chart-grid">ChartGrid</h2>

      <p>
        <code>ChartGrid</code> arranges child charts in a responsive CSS Grid
        that reflows based on available space. Set <code>columns</code> for
        a fixed column count, or use <code>"auto"</code> (default) to
        auto-fill based on <code>minCellWidth</code>.
      </p>

      <CategoryColorProvider categories={["North", "South", "East", "West"]}>
      <LinkedCharts>
        <ChartGrid columns={2} gap={16}>
          <LineChart
            data={lineData}
            xAccessor="month"
            yAccessor="revenue"
            lineBy="region"
            colorBy="region"
            linkedHover={{ name: "hl", fields: ["region"] }}
            selection={{ name: "hl" }}

            xLabel="Month"
            yLabel="Revenue"
            responsiveWidth
            height={300}
          />
          <BarChart
            data={barData}
            categoryAccessor="region"
            valueAccessor="total"
            colorBy="region"
            linkedHover={{ name: "hl", fields: ["region"] }}
            selection={{ name: "hl" }}

            responsiveWidth
            height={300}
          />
        </ChartGrid>
        <ChartGrid columns={2} gap={16} style={{ marginTop: 16 }}>
          <Treemap
            data={treeData}
            childrenAccessor="children"
            valueAccessor="value"
            nodeIdAccessor="name"
            colorBy="region"
            linkedHover={{ name: "hl", fields: ["region"] }}
            selection={{ name: "hl" }}

            responsiveWidth
            height={300}
          />
          <Scatterplot
            data={scatterData}
            xAccessor="x"
            yAccessor="y"
            colorBy="region"
            linkedHover={{ name: "hl", fields: ["region"] }}
            selection={{ name: "hl" }}

            responsiveWidth
            height={300}
          />
        </ChartGrid>
      </LinkedCharts>
      </CategoryColorProvider>

      <CodeBlock
        code={`import { LinkedCharts, ChartGrid, LineChart, BarChart, Treemap } from "semiotic"

<LinkedCharts>
  <ChartGrid columns={3} gap={16}>
    <LineChart data={lineData} xAccessor="month" yAccessor="revenue"
      lineBy="region" colorBy="region" responsiveWidth height={250}
      linkedHover={{ name: "hl", fields: ["region"] }}
      selection={{ name: "hl" }} />
    <BarChart data={barData} categoryAccessor="region" valueAccessor="total"
    colorBy="region" responsiveWidth height={250} />
</ChartGrid>

// Auto-fill: reflows to 1 column on narrow screens
<ChartGrid minCellWidth={350} gap={24}>
  <LineChart ... responsiveWidth />
  <BarChart ... responsiveWidth />
  <Scatterplot ... responsiveWidth />
</ChartGrid>`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Emphasis */}
      {/* ================================================================= */}
      <h2 id="emphasis">Visual Hierarchy with Emphasis</h2>

      <p>
        Following Carbon Design guidelines, the most important chart in a dashboard
        should have the highest contrast and occupy the largest area. Set{" "}
        <code>emphasis="primary"</code> on a chart inside a <code>ChartGrid</code>{" "}
        to have it span two columns, creating a natural F-pattern reading layout.
      </p>

      <CategoryColorProvider categories={["North", "South", "East", "West"]}>
        <LinkedCharts>
          <ChartGrid columns={2} gap={16}>
            <LineChart
              data={lineData}
              xAccessor="month"
              yAccessor="revenue"
              lineBy="region"
              colorBy="region"
              emphasis="primary"
              showLegend={false}
              xLabel="Month"
              yLabel="Revenue"
              linkedHover={{ name: "emph", fields: ["region"] }}
              selection={{ name: "emph" }}
              responsiveWidth
              height={300}
            />
            <BarChart
              data={barData}
              categoryAccessor="region"
              valueAccessor="total"
              colorBy="region"
              showLegend={false}
              linkedHover={{ name: "emph", fields: ["region"] }}
              selection={{ name: "emph" }}
              responsiveWidth
              height={250}
            />
            <Scatterplot
              data={scatterData}
              xAccessor="x"
              yAccessor="y"
              colorBy="region"
              showLegend={false}
              linkedHover={{ name: "emph", fields: ["region"] }}
              selection={{ name: "emph" }}
              responsiveWidth
              height={250}
            />
          </ChartGrid>
        </LinkedCharts>
      </CategoryColorProvider>

      <CodeBlock
        code={`import { ChartGrid, LineChart, BarChart, Scatterplot } from "semiotic"

<ChartGrid columns={2}>
  {/* Primary chart spans both columns */}
  <LineChart
    data={timeSeries}
    emphasis="primary"
    responsiveWidth
    height={300}
  />
  {/* Secondary charts fill the second row */}
  <BarChart data={totals} responsiveWidth height={250} />
  <Scatterplot data={scatter} responsiveWidth height={250} />
</ChartGrid>`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* ContextLayout */}
      {/* ================================================================= */}
      <h2 id="context-layout">ContextLayout</h2>

      <p>
        <code>ContextLayout</code> places a primary chart alongside a
        fixed-size context panel. The context chart uses{" "}
        <code>mode="context"</code> for compact rendering (no axes or labels).
        Use this to pair a time series with a structural overview like a treemap
        or network diagram.
      </p>

      <ContextLayout
        context={
          <Treemap
            data={treeData}
            childrenAccessor="children"
            valueAccessor="value"
            nodeIdAccessor="name"
            colorByDepth
            responsiveWidth
            height={250}
            mode="context"
          />
        }
        position="right"
        contextSize={250}
      >
        <LineChart
          data={lineData}
          xAccessor="month"
          yAccessor="revenue"
          lineBy="region"
          colorBy="region"
          xLabel="Month"
          yLabel="Revenue"
          responsiveWidth
          height={250}
        />
      </ContextLayout>

      <CodeBlock
        code={`import { ContextLayout, LineChart, Treemap } from "semiotic"

<ContextLayout
  context={
    <Treemap data={hierarchy} childrenAccessor="children"
      valueAccessor="value" colorByDepth responsiveWidth
      height={250} mode="context" />
  }
  position="right"
  contextSize={250}
>
  <LineChart data={timeSeries} xAccessor="month" yAccessor="revenue"
    lineBy="region" colorBy="region" responsiveWidth height={250} />
</ContextLayout>

// Position options: "right" | "left" | "top" | "bottom"`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* CategoryColorProvider */}
      {/* ================================================================= */}
      <h2 id="shared-colors">CategoryColorProvider</h2>

      <p>
        Wrap charts in a <code>CategoryColorProvider</code> to ensure the
        same category value always gets the same color, regardless of which
        subset of categories each chart displays. Without this, each chart
        computes its own color scale independently, so "North" might be blue
        in one chart and orange in another.
      </p>

      <CategoryColorProvider colors={{
        North: "#e41a1c",
        South: "#377eb8",
        East: "#4daf4a",
        West: "#984ea3",
      }}>
        <LinkedCharts>
          <ChartGrid columns={2} gap={16}>
            <LineChart
              data={lineData}
              xAccessor="month"
              yAccessor="revenue"
              lineBy="region"
              colorBy="region"
              linkedHover={{ name: "hl2", fields: ["region"] }}
              selection={{ name: "hl2" }}
              responsiveWidth
              height={250}
            />
            <BarChart
              data={barData}
              categoryAccessor="region"
              valueAccessor="total"
              colorBy="region"
              linkedHover={{ name: "hl2", fields: ["region"] }}
              selection={{ name: "hl2" }}
              responsiveWidth
              height={250}
            />
          </ChartGrid>
        </LinkedCharts>
      </CategoryColorProvider>

      <CodeBlock
        code={`import { CategoryColorProvider, ChartGrid, LineChart, BarChart } from "semiotic"

// Explicit color assignments
<CategoryColorProvider colors={{
  North: "#e41a1c",
  South: "#377eb8",
  East: "#4daf4a",
  West: "#984ea3",
}}>
  <ChartGrid columns={2}>
    <LineChart data={d1} colorBy="region" responsiveWidth />
    <BarChart data={d2} colorBy="region" responsiveWidth />
  </ChartGrid>
</CategoryColorProvider>

// Or auto-assign from a list + scheme
<CategoryColorProvider
  categories={["North", "South", "East", "West"]}
  colorScheme="tableau10"
>
  ...charts...
</CategoryColorProvider>`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Putting it all together */}
      {/* ================================================================= */}
      <h2 id="full-example">Putting It All Together</h2>

      <p>
        Combine <code>CategoryColorProvider</code>, <code>ChartGrid</code>,
        <code>ContextLayout</code>, and <code>LinkedCharts</code> for a
        coordinated dashboard where colors are consistent and hover
        cross-highlights across all charts:
      </p>

      <CodeBlock
        code={`import {
  CategoryColorProvider, ChartGrid, ContextLayout,
  LinkedCharts, LineChart, BarChart, Treemap
} from "semiotic"

<CategoryColorProvider colors={{ North: "#e41a1c", South: "#377eb8" }}>
  <LinkedCharts>
    <ContextLayout
      context={
        <Treemap data={hierarchy} mode="context" responsiveWidth
          linkedHover={{ name: "hl", fields: ["region"] }}
          selection={{ name: "hl" }} />
      }
    >
      <ChartGrid columns={2}>
        <LineChart data={sales} colorBy="region" responsiveWidth
          linkedHover={{ name: "hl", fields: ["region"] }}
          selection={{ name: "hl" }} />
        <BarChart data={totals} colorBy="region" responsiveWidth
          selection={{ name: "hl" }} />
      </ChartGrid>
    </ContextLayout>
  </LinkedCharts>
</CategoryColorProvider>`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Props Reference */}
      {/* ================================================================= */}
      <h2 id="props">Props Reference</h2>

      <h3>ChartGrid</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3)" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Prop</th>
            <th style={{ textAlign: "left", padding: 8 }}>Type</th>
            <th style={{ textAlign: "left", padding: 8 }}>Default</th>
            <th style={{ textAlign: "left", padding: 8 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["columns", 'number | "auto"', '"auto"', "Fixed column count or auto-fill based on minCellWidth"],
            ["minCellWidth", "number", "300", "Minimum cell width for auto columns (px)"],
            ["gap", "number", "16", "Gap between cells (px)"],
          ].map(([name, type, def, desc]) => (
            <tr key={name} style={{ borderBottom: "1px solid var(--surface-3)" }}>
              <td style={{ padding: 8 }}><code>{name}</code></td>
              <td style={{ padding: 8 }}><code>{type}</code></td>
              <td style={{ padding: 8 }}>{def}</td>
              <td style={{ padding: 8 }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>ContextLayout</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3)" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Prop</th>
            <th style={{ textAlign: "left", padding: 8 }}>Type</th>
            <th style={{ textAlign: "left", padding: 8 }}>Default</th>
            <th style={{ textAlign: "left", padding: 8 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["context", "ReactNode", "required", "Context chart(s) displayed alongside the primary"],
            ["position", '"right" | "left" | "top" | "bottom"', '"right"', "Position of the context panel"],
            ["contextSize", "number", "250", "Size of the context panel (px)"],
            ["gap", "number", "12", "Gap between panels (px)"],
          ].map(([name, type, def, desc]) => (
            <tr key={name} style={{ borderBottom: "1px solid var(--surface-3)" }}>
              <td style={{ padding: 8 }}><code>{name}</code></td>
              <td style={{ padding: 8 }}><code>{type}</code></td>
              <td style={{ padding: 8 }}>{def}</td>
              <td style={{ padding: 8 }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>CategoryColorProvider</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3)" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Prop</th>
            <th style={{ textAlign: "left", padding: 8 }}>Type</th>
            <th style={{ textAlign: "left", padding: 8 }}>Default</th>
            <th style={{ textAlign: "left", padding: 8 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["colors", "Record<string, string>", "—", "Explicit category→color map"],
            ["categories", "string[]", "—", "Category values to auto-assign colors"],
            ["colorScheme", 'string | string[]', '"category10"', "Scheme for auto-assignment"],
          ].map(([name, type, def, desc]) => (
            <tr key={name} style={{ borderBottom: "1px solid var(--surface-3)" }}>
              <td style={{ padding: 8 }}><code>{name}</code></td>
              <td style={{ padding: 8 }}><code>{type}</code></td>
              <td style={{ padding: 8 }}>{def}</td>
              <td style={{ padding: 8 }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================================================================= */}
      {/* Related */}
      {/* ================================================================= */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/responsive">Responsive</Link> — responsiveWidth
          and responsiveHeight props
        </li>
        <li>
          <Link to="/features/small-multiples">Linked Charts</Link> —
          cross-highlighting and coordinated views
        </li>
        <li>
          <Link to="/features/theming">Theming</Link> — ThemeProvider for
          global dark/light mode
        </li>
        <li>
          <Link to="/features/chart-modes">Chart Modes</Link> — primary,
          context, and sparkline rendering modes
        </li>
      </ul>
    </PageLayout>
  )
}
