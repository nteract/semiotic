import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ChartContainer,
  LineChart,
  MobileStandardControls,
  useMobileRangeControls,
} from "semiotic"
import PageLayout from "../../../components/PageLayout"
import CodeBlock from "../../../components/CodeBlock"

const seriesData = [
  {
    id: "Search",
    coordinates: [
      { week: 1, value: 3.2 },
      { week: 2, value: 3.5 },
      { week: 3, value: 3.3 },
      { week: 4, value: 3.8 },
      { week: 5, value: 4.2 },
      { week: 6, value: 4.4 },
      { week: 7, value: 4.7 },
      { week: 8, value: 4.9 },
    ],
  },
  {
    id: "Email",
    coordinates: [
      { week: 1, value: 4.1 },
      { week: 2, value: 4.4 },
      { week: 3, value: 4.0 },
      { week: 4, value: 4.7 },
      { week: 5, value: 5.0 },
      { week: 6, value: 5.3 },
      { week: 7, value: 5.6 },
      { week: 8, value: 5.8 },
    ],
  },
  {
    id: "Social",
    coordinates: [
      { week: 1, value: 2.8 },
      { week: 2, value: 3.0 },
      { week: 3, value: 2.7 },
      { week: 4, value: 3.1 },
      { week: 5, value: 3.0 },
      { week: 6, value: 3.4 },
      { week: 7, value: 3.2 },
      { week: 8, value: 3.6 },
    ],
  },
]

const seriesColors = {
  Search: "#2f6f9f",
  Email: "#f28e2b",
  Social: "#59a14f",
}

const controlsCode = `const rangeControls = useMobileRangeControls({
  domain: [1, 8],
  initialValue: [2, 7],
  step: 1,
})

<ChartContainer
  mobile={{
    breakpoint: 9999,
    chartMode: "mobile",
    standardControls: {
      controls: ["brush", "zoom", "legend"],
      brush: rangeControls.brush,
      zoom: rangeControls.zoom,
      legend: { items, onToggle },
    },
  }}
>
  <LineChart
    data={visibleSeries}
    lineBy="id"
    xAccessor="week"
    yAccessor="value"
    xExtent={rangeControls.xExtent}
  />
</ChartContainer>`

export default function MobileControlsPage() {
  const rangeControls = useMobileRangeControls({
    domain: [1, 8],
    initialValue: [2, 7],
    step: 1,
    minSpan: 1,
    label: "Weeks shown",
  })
  const [activeSeries, setActiveSeries] = useState({
    Search: true,
    Email: true,
    Social: false,
  })

  const visibleSeries = useMemo(
    () => seriesData.filter((series) => activeSeries[series.id]),
    [activeSeries]
  )

  const legendItems = seriesData.map((series) => ({
    id: series.id,
    label: series.id,
    color: seriesColors[series.id],
    active: activeSeries[series.id],
  }))

  const standardControls = {
    controls: ["brush", "zoom", "legend"],
    targetSize: 44,
    brush: {
      ...rangeControls.brush,
    },
    zoom: {
      label: "Window zoom",
      ...rangeControls.zoom,
    },
    legend: {
      label: "Channels",
      items: legendItems,
      onToggle: (id, active) =>
        setActiveSeries((current) => ({ ...current, [id]: active })),
      onShowAll: () => setActiveSeries({ Search: true, Email: true, Social: true }),
      onHideAll: () => setActiveSeries({ Search: false, Email: false, Social: false }),
    },
  }

  return (
    <PageLayout
      title="Mobile Standard Controls"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Mobile", path: "/features/mobile-visualization" },
        { label: "Standard Controls", path: "/features/mobile/controls" },
      ]}
      prevPage={{ title: "Mobile Visualization", path: "/features/mobile-visualization" }}
      nextPage={{ title: "Mobile Recipes", path: "/features/mobile/recipes" }}
    >
      <p>
        <code>MobileStandardControls</code> is the rendered counterpart to
        <code>mobileInteraction.standardControls</code>. It gives brush, zoom,
        and legend interactions a native form-control path for touch, keyboard,
        and screen-reader users.
      </p>
      <p>
        The controls are intentionally state-driven. Semiotic does not guess how
        your brush or legend should mutate data; you wire the callbacks to chart
        props such as <code>xExtent</code>, filtered data, visible categories, or
        a geo frame ref. That keeps custom charts and built-in charts on the
        same path.
      </p>

      <div style={styles.demoGrid}>
        <div>
          <ChartContainer
            title="Campaign conversion"
            subtitle="The mobile controls below drive real chart state."
            mobile={{
              breakpoint: 9999,
              chartMode: "mobile",
              mobileInteraction: {
                targetSize: 44,
                standardControls: ["brush", "zoom", "legend"],
              },
              standardControls,
              summary: `Weeks ${rangeControls.value[0]}-${rangeControls.value[1]}; visible series: ${visibleSeries.map((d) => d.id).join(", ") || "none"}.`,
            }}
            mobileAudit={{ visible: true }}
            chartConfig={{
              component: "LineChart",
              props: {
                data: visibleSeries,
                lineBy: "id",
                xAccessor: "week",
                yAccessor: "value",
                xExtent: rangeControls.xExtent,
                mobileInteraction: { standardControls: ["brush", "zoom", "legend"] },
              },
            }}
            height={340}
          >
            <LineChart
              data={visibleSeries}
              lineBy="id"
              lineDataAccessor="coordinates"
              xAccessor="week"
              yAccessor="value"
              xExtent={rangeControls.xExtent}
              width={420}
              height={300}
              showLegend={false}
              directLabel
              color={(d) => seriesColors[d.id] || seriesColors[d.parentLine?.id] || "#2f6f9f"}
            />
          </ChartContainer>
        </div>
        <aside style={styles.sidePanel}>
          <h2>Standalone placement</h2>
          <p>
            You can also render the same controls outside <code>ChartContainer</code>
            when a dashboard has a custom mobile control rail.
          </p>
          <MobileStandardControls {...standardControls} compact />
        </aside>
      </div>

      <h2>Pattern</h2>
      <CodeBlock code={controlsCode} language="jsx" />

      <h2>What remains frame-specific</h2>
      <p>
        Fully automatic two-way brush/zoom synchronization requires each frame
        family to expose the same controlled state contract. Today the reliable
        pattern is explicit: controls update your state, and that state flows
        into chart props like <code>xExtent</code>, filtered rows, visible
        series, or imperative geo zoom methods. See <Link to="/features/mobile/recipes">Mobile Recipes</Link>
        for reusable starting points.
      </p>
    </PageLayout>
  )
}

const styles = {
  demoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18,
    alignItems: "start",
  },
  sidePanel: {
    padding: 16,
    border: "1px solid var(--border, #d8dee4)",
    borderRadius: 16,
    background: "var(--surface-2, #f6f8fa)",
  },
}
