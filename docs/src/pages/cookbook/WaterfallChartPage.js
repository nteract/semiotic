import React from "react"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

export default function WaterfallChartPage() {
  return (
    <PageLayout
      title="Waterfall Chart"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Waterfall Chart", path: "/cookbook/waterfall-chart" },
      ]}
      prevPage={{
        title: "Bar to Parallel",
        path: "/cookbook/bar-to-parallel",
      }}
      nextPage={{ title: "Slope Chart", path: "/cookbook/slope-chart" }}
    >
      <p>
        Waterfall charts are now built with StreamXYFrame's{" "}
        <code>chartType="waterfall"</code>. See the{" "}
        <Link to="/charts/realtime-waterfall-chart">
          RealtimeWaterfallChart
        </Link>{" "}
        page for examples.
      </p>
    </PageLayout>
  )
}
