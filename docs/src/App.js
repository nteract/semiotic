import React, { useState, useEffect } from "react"
import { Routes, Route, Outlet, Link, Navigate } from "react-router-dom"

// New components
import Sidebar, { SidebarToggle } from "./components/Sidebar"
import Landing from "./Landing"

// Index page components
import { ExamplesIndex, ApiIndex, RecipesIndex, PlaygroundIndex } from "./IndexPages"

// API pages
import ChartsApiPage from "./pages/api/ChartsApiPage"
import ApiReferencePage from "./pages/api/ApiReferencePage"

// New chart pages
import GettingStartedPage from "./pages/GettingStartedPage"
import LineChartPage from "./pages/charts/LineChartPage"
import AreaChartPage from "./pages/charts/AreaChartPage"
import StackedAreaChartPage from "./pages/charts/StackedAreaChartPage"
import ScatterplotPage from "./pages/charts/ScatterplotPage"
import ConnectedScatterplotPage from "./pages/charts/ConnectedScatterplotPage"
import OrbitDiagramPage from "./pages/charts/OrbitDiagramPage"
import BubbleChartPage from "./pages/charts/BubbleChartPage"
import HeatmapPage from "./pages/charts/HeatmapPage"
import ScatterplotMatrixPage from "./pages/charts/ScatterplotMatrixPage"
import BarChartPage from "./pages/charts/BarChartPage"
import StackedBarChartPage from "./pages/charts/StackedBarChartPage"
import LikertChartPage from "./pages/charts/LikertChartPage"
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
import GaugeChartPage from "./pages/charts/GaugeChartPage"
import GroupedBarChartPage from "./pages/charts/GroupedBarChartPage"
import FunnelChartPage from "./pages/charts/FunnelChartPage"
import SwimlaneChartPage from "./pages/charts/SwimlaneChartPage"
import TreemapPage from "./pages/charts/TreemapPage"
import CirclePackPage from "./pages/charts/CirclePackPage"
import ChoroplethMapPage from "./pages/charts/ChoroplethMapPage"
import ProportionalSymbolMapPage from "./pages/charts/ProportionalSymbolMapPage"
import FlowMapPage from "./pages/charts/FlowMapPage"
import DistanceCartogramPage from "./pages/charts/DistanceCartogramPage"
import TileMapPage from "./pages/charts/TileMapPage"
import QuadrantChartPage from "./pages/charts/QuadrantChartPage"
import MultiAxisLineChartPage from "./pages/charts/MultiAxisLineChartPage"

// New frame pages
import StreamXYFramePage from "./pages/frames/XYFramePage"
import StreamOrdinalFramePage from "./pages/frames/OrdinalFramePage"
import StreamNetworkFramePage from "./pages/frames/NetworkFramePage"
import StreamGeoFramePage from "./pages/frames/GeoFramePage"

// New feature pages
import AxesPage from "./pages/features/AxesPage"
import AnnotationsPage from "./pages/features/AnnotationsPage"
import AnnotationFlowPage from "./pages/features/AnnotationFlowPage"
import TooltipsPage from "./pages/features/TooltipsPage"
import InteractionPage from "./pages/features/InteractionPage"
import ResponsivePage from "./pages/features/ResponsivePage"
import CompositionPage from "./pages/features/CompositionPage"
import AccessibilityPage from "./pages/features/AccessibilityPage"
import SmallMultiplesPage from "./pages/features/SmallMultiplesPage"
import StylingPage from "./pages/features/StylingPage"
import ThemingPage from "./pages/features/ThemingPage"
import ThemeExplorerPage from "./pages/theming/ThemeExplorerPage"
import LegendsPage from "./pages/features/LegendsPage"
import RealtimeEncodingPage from "./pages/features/RealtimeEncodingPage"
import ChartContainersPage from "./pages/features/ChartContainersPage"
import ChartStatesPage from "./pages/features/ChartStatesPage"
import ChartModesPage from "./pages/features/ChartModesPage"
import ObservationHooksPage from "./pages/features/ObservationHooksPage"
import SerializationPage from "./pages/features/SerializationPage"
import VegaLiteTranslatorPage from "./pages/features/VegaLiteTranslatorPage"
import StreamingSystemModelPage from "./pages/features/StreamingSystemModelPage"
import PerformancePage from "./pages/features/PerformancePage"

// New cookbook pages
import CandlestickChartPage from "./pages/cookbook/CandlestickChartPage"
import HomerunMapPage from "./pages/cookbook/HomerunMapPage"
import CanvasInteractionPage from "./pages/cookbook/CanvasInteractionPage"
import UncertaintyVisualizationPage from "./pages/cookbook/UncertaintyVisualizationPage"
import MarginalGraphicsPage from "./pages/cookbook/MarginalGraphicsPage"
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
import BenchmarkDashboardPage from "./pages/recipes/BenchmarkDashboardPage"
import MinardsMarchPage from "./pages/recipes/MinardsMarchPage"
import RoslingBubbleChartPage from "./pages/recipes/RoslingBubbleChartPage"
import StreamingMigrationMapPage from "./pages/recipes/StreamingMigrationMapPage"
import UsingSSRPage from "./pages/UsingSSRPage"
import SSRGalleryPage from "./pages/SSRGalleryPage"

// Playground pages
import LineChartPlayground from "./pages/playground/LineChartPlayground"
import BarChartPlayground from "./pages/playground/BarChartPlayground"
import ScatterplotPlayground from "./pages/playground/ScatterplotPlayground"
import ConnectedScatterplotPlayground from "./pages/playground/ConnectedScatterplotPlayground"
import OrbitDiagramPlayground from "./pages/playground/OrbitDiagramPlayground"
import ForceDirectedGraphPlayground from "./pages/playground/ForceDirectedGraphPlayground"
import SankeyDiagramPlayground from "./pages/playground/SankeyDiagramPlayground"
import StreamingSankeyPlayground from "./pages/playground/StreamingSankeyPlayground"
import RealtimeLineChartPlayground from "./pages/playground/RealtimeLineChartPlayground"
import RealtimeHistogramPlayground from "./pages/playground/RealtimeHistogramPlayground"
import BubbleChartPlayground from "./pages/playground/BubbleChartPlayground"
import StackedAreaChartPlayground from "./pages/playground/StackedAreaChartPlayground"
import DonutChartPlayground from "./pages/playground/DonutChartPlayground"
import TreemapPlayground from "./pages/playground/TreemapPlayground"
import CirclePackPlayground from "./pages/playground/CirclePackPlayground"
import StatisticalAnnotationsPlayground from "./pages/playground/StatisticalAnnotationsPlayground"
import ForecastPlayground from "./pages/playground/ForecastPlayground"
import ChoroplethMapPlayground from "./pages/playground/ChoroplethMapPlayground"
import DistanceCartogramPlayground from "./pages/playground/DistanceCartogramPlayground"

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

            {/* API routes */}
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
              <Route path="typedoc" element={<ApiReferencePage />} />
            </Route>

            {/* Theming routes */}
            <Route path="theming" element={<Outlet />}>
              <Route path="styling" element={<StylingPage />} />
              <Route path="theme-provider" element={<ThemingPage />} />
              <Route path="theme-explorer" element={<ThemeExplorerPage />} />
            </Route>

            {/* Redirects for old feature paths */}
            <Route path="features/styling" element={<Navigate to="/theming/styling" replace />} />
            <Route path="features/theming" element={<Navigate to="/theming/theme-provider" replace />} />

            {/* Redirects for legacy v1/v2 API routes (SEO: prevent stale search results) */}
            <Route path="api/xyframe" element={<Navigate to="/frames/xy-frame" replace />} />
            <Route path="api/ordinalframe" element={<Navigate to="/frames/ordinal-frame" replace />} />
            <Route path="api/networkframe" element={<Navigate to="/frames/network-frame" replace />} />
            <Route path="api/mark" element={<Navigate to="/api/charts" replace />} />

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
              <Route path="benchmark-dashboard" element={<BenchmarkDashboardPage />} />
              <Route path="minards-map" element={<MinardsMarchPage />} />
              <Route path="streaming-migration-map" element={<StreamingMigrationMapPage />} />
              <Route path="rosling-bubble-chart" element={<RoslingBubbleChartPage />} />
            </Route>

            {/* Playground routes */}
            <Route path="playground" element={<Outlet />}>
              <Route path="" element={<><h1>Playground</h1><PlaygroundIndex /></>} />
              <Route path="line-chart" element={<LineChartPlayground />} />
              <Route path="bar-chart" element={<BarChartPlayground />} />
              <Route path="scatterplot" element={<ScatterplotPlayground />} />
              <Route path="connected-scatterplot" element={<ConnectedScatterplotPlayground />} />
              <Route path="force-directed-graph" element={<ForceDirectedGraphPlayground />} />
              <Route path="sankey-diagram" element={<SankeyDiagramPlayground />} />
              <Route path="streaming-sankey" element={<StreamingSankeyPlayground />} />
              <Route path="realtime-line-chart" element={<RealtimeLineChartPlayground />} />
              <Route path="realtime-bar-chart" element={<RealtimeHistogramPlayground />} />
              <Route path="bubble-chart" element={<BubbleChartPlayground />} />
              <Route path="stacked-area-chart" element={<StackedAreaChartPlayground />} />
              <Route path="donut-chart" element={<DonutChartPlayground />} />
              <Route path="treemap" element={<TreemapPlayground />} />
              <Route path="circle-pack" element={<CirclePackPlayground />} />
              <Route path="orbit-diagram" element={<OrbitDiagramPlayground />} />
              <Route path="statistical-annotations" element={<StatisticalAnnotationsPlayground />} />
              <Route path="forecast" element={<ForecastPlayground />} />
              <Route path="choropleth-map" element={<ChoroplethMapPlayground />} />
              <Route path="distance-cartogram" element={<DistanceCartogramPlayground />} />
            </Route>

            {/* Frames routes */}
            <Route path="frames" element={<Outlet />}>
              <Route path="xy-frame" element={<StreamXYFramePage />} />
              <Route path="ordinal-frame" element={<StreamOrdinalFramePage />} />
              <Route path="network-frame" element={<StreamNetworkFramePage />} />
              <Route path="geo-frame" element={<StreamGeoFramePage />} />
              {/* StreamXYFrame page removed — content merged into chart pages */}
            </Route>

            {/* Features routes */}
            <Route path="features" element={<Outlet />}>
              <Route path="axes" element={<AxesPage />} />
              <Route path="annotations" element={<AnnotationsPage />} />
              <Route path="advanced-annotations" element={<AnnotationFlowPage />} />
              <Route path="tooltips" element={<TooltipsPage />} />
              <Route path="interaction" element={<InteractionPage />} />
              <Route path="responsive" element={<ResponsivePage />} />
              <Route path="composition" element={<CompositionPage />} />
              <Route path="accessibility" element={<AccessibilityPage />} />
              <Route path="small-multiples" element={<SmallMultiplesPage />} />
              <Route path="linked-charts" element={<SmallMultiplesPage />} />
              <Route path="legends" element={<LegendsPage />} />
              <Route path="realtime-encoding" element={<RealtimeEncodingPage />} />
              <Route path="chart-container" element={<ChartContainersPage />} />
              <Route path="chart-states" element={<ChartStatesPage />} />
              <Route path="chart-modes" element={<ChartModesPage />} />
              <Route path="observation-hooks" element={<ObservationHooksPage />} />
              <Route path="serialization" element={<SerializationPage />} />
              <Route path="vega-lite" element={<VegaLiteTranslatorPage />} />
              <Route path="streaming-system-model" element={<StreamingSystemModelPage />} />
              <Route path="performance" element={<PerformancePage />} />
            </Route>

            {/* Using Server-Side Rendering */}
            <Route path="using-ssr" element={<UsingSSRPage />} />
            <Route path="ssr-gallery" element={<SSRGalleryPage />} />

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
              <Route path="connected-scatterplot" element={<ConnectedScatterplotPage />} />
              <Route path="bubble-chart" element={<BubbleChartPage />} />
              <Route path="heatmap" element={<HeatmapPage />} />
              <Route path="scatterplot-matrix" element={<ScatterplotMatrixPage />} />
              <Route path="quadrant-chart" element={<QuadrantChartPage />} />
              <Route path="multi-axis-line-chart" element={<MultiAxisLineChartPage />} />
              <Route path="realtime-line-chart" element={<RealtimeLineChartPage />} />
              <Route path="realtime-swarm-chart" element={<RealtimeSwarmChartPage />} />
              <Route path="realtime-waterfall-chart" element={<RealtimeWaterfallChartPage />} />
              <Route path="realtime-heatmap" element={<RealtimeHeatmapPage />} />
              {/* Categorical Charts */}
              <Route path="bar-chart" element={<BarChartPage />} />
              <Route path="stacked-bar-chart" element={<StackedBarChartPage />} />
              <Route path="likert-chart" element={<LikertChartPage />} />
              <Route path="swarm-plot" element={<SwarmPlotPage />} />
              <Route path="box-plot" element={<BoxPlotPage />} />
              <Route path="histogram" element={<HistogramPage />} />
              <Route path="violin-plot" element={<ViolinPlotPage />} />
              <Route path="dot-plot" element={<DotPlotPage />} />
              <Route path="pie-chart" element={<PieChartPage />} />
              <Route path="donut-chart" element={<DonutChartPage />} />
              <Route path="gauge-chart" element={<GaugeChartPage />} />
              <Route path="grouped-bar-chart" element={<GroupedBarChartPage />} />
              <Route path="funnel-chart" element={<FunnelChartPage />} />
              <Route path="swimlane-chart" element={<SwimlaneChartPage />} />
              <Route path="realtime-bar-chart" element={<RealtimeHistogramPage />} />
              {/* Network Charts */}
              <Route path="force-directed-graph" element={<ForceDirectedGraphPage />} />
              <Route path="chord-diagram" element={<ChordDiagramPage />} />
              <Route path="sankey-diagram" element={<SankeyDiagramPage />} />
              <Route path="tree-diagram" element={<TreeDiagramPage />} />
              <Route path="treemap" element={<TreemapPage />} />
              <Route path="circle-pack" element={<CirclePackPage />} />
              <Route path="orbit-diagram" element={<OrbitDiagramPage />} />
              {/* Geo Charts */}
              <Route path="choropleth-map" element={<ChoroplethMapPage />} />
              <Route path="proportional-symbol-map" element={<ProportionalSymbolMapPage />} />
              <Route path="flow-map" element={<FlowMapPage />} />
              <Route path="distance-cartogram" element={<DistanceCartogramPage />} />
              <Route path="tile-map" element={<TileMapPage />} />
            </Route>
          </Routes>
        </div>
      </div>
    </div>
  )
}
