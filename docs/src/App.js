import React, { useState, useEffect } from "react"
import { Routes, Route, NavLink, Outlet, Link } from "react-router-dom"

// New components
import Sidebar, { SidebarToggle } from "./components/Sidebar"
import Landing from "./Landing"

// Existing page components
import Home from "./Home"
import { GuidesIndex, ExamplesIndex, ApiIndex, RecipesIndex, PlaygroundIndex } from "./IndexPages"
import Accessibility from "./markdown/accessibility.mdx"
import Xyframe from "./markdown/xyframe.mdx"
import Ordinalframe from "./markdown/ordinalframe.mdx"
import Networkframe from "./markdown/networkframe.mdx"
import Responsiveframes from "./markdown/responsiveframes.mdx"
import Sparkframes from "./markdown/sparkframes.mdx"

import LineChart from "./guides/LineChart.mdx"
import AreaChart from "./guides/AreaChart"
import Scatterplot from "./guides/Scatterplot"
import XYSummaries from "./guides/XYSummaries"
import XYBrushes from "./guides/XYBrushes"
import BarChart from "./guides/BarChart"
import PieChart from "./guides/PieChart"
import OrdinalSummaries from "./guides/OrdinalSummaries"
import OrdinalBrushes from "./guides/OrdinalBrushes"
import Sparklines from "./guides/Sparklines.mdx"
import ForceLayout from "./guides/ForceLayout"
import PathDiagram from "./guides/PathDiagram"
import HierarchicalDiagram from "./guides/HierarchicalDiagram"
import SmallMultiples from "./guides/SmallMultiples"
import CrossHighlighting from "./guides/CrossHighlighting"
import Tooltips from "./guides/Tooltips"

import Annotations from "./guides/Annotations.mdx"
import UsingSketchyPatterns from "./guides/UsingSketchyPatterns"
import ForegroundBackgroundSVG from "./guides/ForegroundBackgroundSVG"
import CanvasRendering from "./guides/CanvasRendering"
import AxisSettings from "./guides/AxisSettings"
import XYChartsHOC from "./guides/XYChartsHOC"
import OrdinalChartsHOC from "./guides/OrdinalChartsHOC"
import NetworkChartsHOC from "./guides/NetworkChartsHOC"
import RealtimeChartsHOC from "./guides/RealtimeChartsHOC"

import DividedLine from "./sub-components/DividedLine"

// API pages
import ChartsApiPage from "./pages/api/ChartsApiPage"

// New chart pages
import GettingStartedPage from "./pages/GettingStartedPage"
import LineChartPage from "./pages/charts/LineChartPage"
import AreaChartPage from "./pages/charts/AreaChartPage"
import StackedAreaChartPage from "./pages/charts/StackedAreaChartPage"
import ScatterplotPage from "./pages/charts/ScatterplotPage"
import BubbleChartPage from "./pages/charts/BubbleChartPage"
import HeatmapPage from "./pages/charts/HeatmapPage"
import ScatterplotMatrixPage from "./pages/charts/ScatterplotMatrixPage"
import BarChartPage from "./pages/charts/BarChartPage"
import StackedBarChartPage from "./pages/charts/StackedBarChartPage"
import SwarmPlotPage from "./pages/charts/SwarmPlotPage"
import BoxPlotPage from "./pages/charts/BoxPlotPage"
import HistogramPage from "./pages/charts/HistogramPage"
import ViolinPlotPage from "./pages/charts/ViolinPlotPage"
import DotPlotPage from "./pages/charts/DotPlotPage"
import ForceDirectedGraphPage from "./pages/charts/ForceDirectedGraphPage"
import ChordDiagramPage from "./pages/charts/ChordDiagramPage"
import SankeyDiagramPage from "./pages/charts/SankeyDiagramPage"
import TreeDiagramPage from "./pages/charts/TreeDiagramPage"
import RealtimeLineChartPage from "./pages/charts/RealtimeLineChartPage"
import RealtimeHistogramPage from "./pages/charts/RealtimeHistogramPage"
import RealtimeSwarmChartPage from "./pages/charts/RealtimeSwarmChartPage"
import RealtimeWaterfallChartPage from "./pages/charts/RealtimeWaterfallChartPage"
import RealtimeHeatmapPage from "./pages/charts/RealtimeHeatmapPage"
// RealtimeSankey has been merged into the SankeyDiagram page
import PieChartPage from "./pages/charts/PieChartPage"
import DonutChartPage from "./pages/charts/DonutChartPage"
import GroupedBarChartPage from "./pages/charts/GroupedBarChartPage"
import TreemapPage from "./pages/charts/TreemapPage"
import CirclePackPage from "./pages/charts/CirclePackPage"

// New frame pages
import StreamXYFramePage from "./pages/frames/XYFramePage"
import StreamOrdinalFramePage from "./pages/frames/OrdinalFramePage"
import StreamNetworkFramePage from "./pages/frames/NetworkFramePage"

// New feature pages
import AxesPage from "./pages/features/AxesPage"
import AnnotationsPage from "./pages/features/AnnotationsPage"
import TooltipsPage from "./pages/features/TooltipsPage"
import InteractionPage from "./pages/features/InteractionPage"
import ResponsivePage from "./pages/features/ResponsivePage"
import AccessibilityPage from "./pages/features/AccessibilityPage"
import SparklinesPage from "./pages/features/SparklinesPage"
import SmallMultiplesPage from "./pages/features/SmallMultiplesPage"
import StylingPage from "./pages/features/StylingPage"
import ThemingPage from "./pages/features/ThemingPage"
import LegendsPage from "./pages/features/LegendsPage"
import RealtimeEncodingPage from "./pages/features/RealtimeEncodingPage"
import ChartContainersPage from "./pages/features/ChartContainersPage"
import ChartModesPage from "./pages/features/ChartModesPage"
import ObservationHooksPage from "./pages/features/ObservationHooksPage"
import SerializationPage from "./pages/features/SerializationPage"
import VegaLiteTranslatorPage from "./pages/features/VegaLiteTranslatorPage"

// New cookbook pages
import CandlestickChartPage from "./pages/cookbook/CandlestickChartPage"
import HomerunMapPage from "./pages/cookbook/HomerunMapPage"
import CanvasInteractionPage from "./pages/cookbook/CanvasInteractionPage"
import UncertaintyVisualizationPage from "./pages/cookbook/UncertaintyVisualizationPage"
import MarginalGraphicsPage from "./pages/cookbook/MarginalGraphicsPage"
import BarToParallelPage from "./pages/cookbook/BarToParallelPage"
import SlopeChartPage from "./pages/cookbook/SlopeChartPage"
import MarimekkoChartPage from "./pages/cookbook/MarimekkoChartPage"
import SwarmPlotRecipePage from "./pages/cookbook/SwarmPlotRecipePage"
import RidgelinePlotPage from "./pages/cookbook/RidgelinePlotPage"
import DotPlotRecipePage from "./pages/cookbook/DotPlotRecipePage"
import TimelineCookbookPage from "./pages/cookbook/TimelinePage"
import RadarPlotPage from "./pages/cookbook/RadarPlotPage"
import IsotypeChartPage from "./pages/cookbook/IsotypeChartPage"
// MatrixCookbookPage removed — matrix recipe no longer supported
import KpiCardSparklinePage from "./pages/recipes/KpiCardSparklinePage"
import TimeSeriesBrushPage from "./pages/recipes/TimeSeriesBrushPage"
import NetworkExplorerPage from "./pages/recipes/NetworkExplorerPage"
import UsingSSRPage from "./pages/UsingSSRPage"

// Playground pages
import LineChartPlayground from "./pages/playground/LineChartPlayground"
import BarChartPlayground from "./pages/playground/BarChartPlayground"
import ScatterplotPlayground from "./pages/playground/ScatterplotPlayground"
import ForceDirectedGraphPlayground from "./pages/playground/ForceDirectedGraphPlayground"
import SankeyDiagramPlayground from "./pages/playground/SankeyDiagramPlayground"
import RealtimeLineChartPlayground from "./pages/playground/RealtimeLineChartPlayground"
import RealtimeHistogramPlayground from "./pages/playground/RealtimeHistogramPlayground"
import BubbleChartPlayground from "./pages/playground/BubbleChartPlayground"
import StackedAreaChartPlayground from "./pages/playground/StackedAreaChartPlayground"
import DonutChartPlayground from "./pages/playground/DonutChartPlayground"
import TreemapPlayground from "./pages/playground/TreemapPlayground"
import CirclePackPlayground from "./pages/playground/CirclePackPlayground"
import StatisticalAnnotationsPlayground from "./pages/playground/StatisticalAnnotationsPlayground"

const semioticLogo = new URL("../public/assets/img/semiotic.png", import.meta.url).href
const semioticLogoDark = new URL("../public/assets/img/semiotic-darkmode.png", import.meta.url).href

function NotFoundPage() {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <h1>404 — Page Not Found</h1>
      <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>
        The page you're looking for doesn't exist.
      </p>
      <p style={{ marginTop: "24px" }}>
        <Link to="/" style={{ color: "var(--accent)" }}>Back to home</Link>
      </p>
    </div>
  )
}

import { useScrollRestoration } from "./useScrollRestoration"

// Theme toggle component
function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        background: "none",
        border: "1px solid var(--surface-3)",
        borderRadius: "8px",
        padding: "6px 10px",
        cursor: "pointer",
        fontSize: "16px",
        lineHeight: 1,
        color: "var(--text-primary)",
      }}
    >
      {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </button>
  )
}

// Inject JSON-LD structured data dynamically (avoids Parcel transformer)
function useJsonLd() {
  useEffect(() => {
    const existing = document.querySelector('script[data-jsonld="semiotic"]')
    if (existing) return
    const script = document.createElement("script")
    script.type = "application/ld+json"
    script.setAttribute("data-jsonld", "semiotic")
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Semiotic",
      description: "A data visualization framework for React combining D3 and React for interactive charts, network diagrams, and more.",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      programmingLanguage: "JavaScript",
      url: "https://semiotic3.nteract.io",
      codeRepository: "https://github.com/nteract/semiotic",
      license: "https://opensource.org/licenses/Apache-2.0",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    })
    document.head.appendChild(script)
  }, [])
}

export default function DocsApp() {
  useScrollRestoration()
  useJsonLd()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("semiotic-theme") || "dark"
    }
    return "dark"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("semiotic-theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  return (
    <div className="App">
      <header className="flex">
        <SidebarToggle onClick={() => setSidebarOpen((prev) => !prev)} />
        <div className="logo">
          <Link to="/">
            <img src={theme === "dark" ? semioticLogoDark : semioticLogo} alt="Semiotic" />
          </Link>
        </div>
        <div className="flex space-between">
        {/* We don't need to repeat the name because the logo is the name */}
          <div />
          <div className="flex" style={{ alignItems: "center", gap: "12px" }}>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <div className="github-links">
              <p className="no-margin">
                <a
                  rel="noopener noreferrer"
                  target="_blank"
                  href="https://github.com/nteract/semiotic"
                >
                  GitHub
                </a>
              </p>
            </div>
          </div>
        </div>
      </header>
      <div className="flex body">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="container">
          <Routes>
            {/* New landing page */}
            <Route path="/" element={<Landing />} />

            {/* Keep old Home accessible */}
            <Route path="/home-legacy" element={<Home />} />

            {/* Existing guide routes */}
            <Route path="guides" element={<Outlet />}>
              <Route
                path=""
                element={
                  <>
                    <h1>Guides</h1>
                    <GuidesIndex />
                  </>
                }
              />
              <Route path="line-chart" element={<LineChart />} />
              <Route path="area-chart" element={<AreaChart />} />
              <Route path="scatterplot" element={<Scatterplot />} />
              <Route path="xy-summaries" element={<XYSummaries />} />
              <Route path="xy-brushes" element={<XYBrushes />} />
              <Route path="bar-chart" element={<BarChart />} />
              <Route path="pie-chart" element={<PieChart />} />
              <Route path="ordinal-summaries" element={<OrdinalSummaries />} />
              <Route path="ordinal-brushes" element={<OrdinalBrushes />} />
              <Route path="force-layouts" element={<ForceLayout />} />
              <Route path="path-diagrams" element={<PathDiagram />} />
              <Route path="hierarchical" element={<HierarchicalDiagram />} />
              <Route path="axis" element={<AxisSettings />} />
              <Route path="annotations" element={<Annotations />} />
              <Route path="tooltips" element={<Tooltips />} />
              <Route path="highlighting" element={<CrossHighlighting />} />
              <Route path="accessibility" element={<Accessibility />} />
              <Route path="small-multiples" element={<SmallMultiples />} />
              <Route path="canvas-rendering" element={<CanvasRendering />} />
              <Route path="sparklines" element={<Sparklines />} />
              <Route path="sketchy-patterns" element={<UsingSketchyPatterns />} />
              <Route path="foreground-background-svg" element={<ForegroundBackgroundSVG />} />
              <Route path="xy-charts-hoc" element={<XYChartsHOC />} />
              <Route path="ordinal-charts-hoc" element={<OrdinalChartsHOC />} />
              <Route path="network-charts-hoc" element={<NetworkChartsHOC />} />
              <Route path="realtime-charts-hoc" element={<RealtimeChartsHOC />} />
            </Route>

            {/* Existing API routes */}
            <Route path="api" element={<Outlet />}>
              <Route
                path=""
                element={
                  <>
                    <h1>API</h1>
                    <ApiIndex />
                  </>
                }
              />
              <Route path="charts" element={<ChartsApiPage />} />
              <Route path="xyframe" element={<Xyframe />} />
              <Route path="ordinalframe" element={<Ordinalframe />} />
              <Route path="networkframe" element={<Networkframe />} />
              <Route path="responsiveframe" element={<Responsiveframes />} />
              <Route path="sparkFrame" element={<Sparkframes />} />
              <Route path="dividedline" element={<DividedLine />} />
            </Route>

            {/* Cookbook routes */}
            <Route path="cookbook" element={<Outlet />}>
              <Route
                path=""
                element={
                  <>
                    <h1>Cookbook</h1>
                    <ExamplesIndex />
                  </>
                }
              />
              <Route path="candlestick-chart" element={<CandlestickChartPage />} />
              <Route path="homerun-map" element={<HomerunMapPage />} />
              <Route path="canvas-interaction" element={<CanvasInteractionPage />} />
              <Route path="uncertainty-visualization" element={<UncertaintyVisualizationPage />} />
              <Route path="marginal-graphics" element={<MarginalGraphicsPage />} />
              <Route path="bar-to-parallel-coordinates" element={<BarToParallelPage />} />
              <Route path="slope-chart" element={<SlopeChartPage />} />
              <Route path="marimekko-chart" element={<MarimekkoChartPage />} />
              <Route path="swarm-plot" element={<SwarmPlotRecipePage />} />
              <Route path="ridgeline-plot" element={<RidgelinePlotPage />} />
              <Route path="dot-plot" element={<DotPlotRecipePage />} />
              <Route path="timeline" element={<TimelineCookbookPage />} />
              <Route path="radar-plot" element={<RadarPlotPage />} />
              <Route path="isotype-chart" element={<IsotypeChartPage />} />
            </Route>

            {/* Recipes routes */}
            <Route path="recipes" element={<Outlet />}>
              <Route path="" element={<><h1>Recipes</h1><RecipesIndex /></>} />
              <Route path="kpi-card-sparkline" element={<KpiCardSparklinePage />} />
              <Route path="time-series-brush" element={<TimeSeriesBrushPage />} />
              <Route path="network-explorer" element={<NetworkExplorerPage />} />
            </Route>

            {/* Playground routes */}
            <Route path="playground" element={<Outlet />}>
              <Route path="" element={<><h1>Playground</h1><PlaygroundIndex /></>} />
              <Route path="line-chart" element={<LineChartPlayground />} />
              <Route path="bar-chart" element={<BarChartPlayground />} />
              <Route path="scatterplot" element={<ScatterplotPlayground />} />
              <Route path="force-directed-graph" element={<ForceDirectedGraphPlayground />} />
              <Route path="sankey-diagram" element={<SankeyDiagramPlayground />} />
              <Route path="realtime-line-chart" element={<RealtimeLineChartPlayground />} />
              <Route path="realtime-bar-chart" element={<RealtimeHistogramPlayground />} />
              <Route path="bubble-chart" element={<BubbleChartPlayground />} />
              <Route path="stacked-area-chart" element={<StackedAreaChartPlayground />} />
              <Route path="donut-chart" element={<DonutChartPlayground />} />
              <Route path="treemap" element={<TreemapPlayground />} />
              <Route path="circle-pack" element={<CirclePackPlayground />} />
              <Route path="statistical-annotations" element={<StatisticalAnnotationsPlayground />} />
            </Route>

            {/* Frames routes */}
            <Route path="frames" element={<Outlet />}>
              <Route path="xy-frame" element={<StreamXYFramePage />} />
              <Route path="ordinal-frame" element={<StreamOrdinalFramePage />} />
              <Route path="network-frame" element={<StreamNetworkFramePage />} />
              {/* StreamXYFrame page removed — content merged into chart pages */}
            </Route>

            {/* Features routes */}
            <Route path="features" element={<Outlet />}>
              <Route path="axes" element={<AxesPage />} />
              <Route path="annotations" element={<AnnotationsPage />} />
              <Route path="tooltips" element={<TooltipsPage />} />
              <Route path="interaction" element={<InteractionPage />} />
              <Route path="responsive" element={<ResponsivePage />} />
              <Route path="accessibility" element={<AccessibilityPage />} />
              <Route path="sparklines" element={<SparklinesPage />} />
              <Route path="small-multiples" element={<SmallMultiplesPage />} />
              <Route path="styling" element={<StylingPage />} />
              <Route path="theming" element={<ThemingPage />} />
              <Route path="legends" element={<LegendsPage />} />
              <Route path="realtime-encoding" element={<RealtimeEncodingPage />} />
              <Route path="chart-container" element={<ChartContainersPage />} />
              <Route path="chart-modes" element={<ChartModesPage />} />
              <Route path="observation-hooks" element={<ObservationHooksPage />} />
              <Route path="serialization" element={<SerializationPage />} />
              <Route path="vega-lite" element={<VegaLiteTranslatorPage />} />
            </Route>

            {/* Using Server-Side Rendering */}
            <Route path="using-ssr" element={<UsingSSRPage />} />

            {/* Getting Started */}
            <Route path="getting-started" element={<GettingStartedPage />} />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFoundPage />} />

            {/* New Charts routes */}
            <Route path="charts" element={<Outlet />}>
              {/* XY Charts */}
              <Route path="line-chart" element={<LineChartPage />} />
              <Route path="area-chart" element={<AreaChartPage />} />
              <Route path="stacked-area-chart" element={<StackedAreaChartPage />} />
              <Route path="scatterplot" element={<ScatterplotPage />} />
              <Route path="bubble-chart" element={<BubbleChartPage />} />
              <Route path="heatmap" element={<HeatmapPage />} />
              <Route path="scatterplot-matrix" element={<ScatterplotMatrixPage />} />
              <Route path="realtime-line-chart" element={<RealtimeLineChartPage />} />
              <Route path="realtime-swarm-chart" element={<RealtimeSwarmChartPage />} />
              <Route path="realtime-waterfall-chart" element={<RealtimeWaterfallChartPage />} />
              <Route path="realtime-heatmap" element={<RealtimeHeatmapPage />} />
              {/* Categorical Charts */}
              <Route path="bar-chart" element={<BarChartPage />} />
              <Route path="stacked-bar-chart" element={<StackedBarChartPage />} />
              <Route path="swarm-plot" element={<SwarmPlotPage />} />
              <Route path="box-plot" element={<BoxPlotPage />} />
              <Route path="histogram" element={<HistogramPage />} />
              <Route path="violin-plot" element={<ViolinPlotPage />} />
              <Route path="dot-plot" element={<DotPlotPage />} />
              <Route path="pie-chart" element={<PieChartPage />} />
              <Route path="donut-chart" element={<DonutChartPage />} />
              <Route path="grouped-bar-chart" element={<GroupedBarChartPage />} />
              <Route path="realtime-bar-chart" element={<RealtimeHistogramPage />} />
              {/* Network Charts */}
              <Route path="force-directed-graph" element={<ForceDirectedGraphPage />} />
              <Route path="chord-diagram" element={<ChordDiagramPage />} />
              <Route path="sankey-diagram" element={<SankeyDiagramPage />} />
              <Route path="tree-diagram" element={<TreeDiagramPage />} />
              <Route path="treemap" element={<TreemapPage />} />
              <Route path="circle-pack" element={<CirclePackPage />} />
            </Route>
          </Routes>
        </div>
      </div>
    </div>
  )
}
