import React, { useState, useEffect } from "react"
import { Routes, Route, NavLink, Outlet, Link } from "react-router-dom"

// New components
import Sidebar, { SidebarToggle } from "./components/Sidebar"
import Landing from "./Landing"

// Existing page components
import Home from "./Home"
import { GuidesIndex, ExamplesIndex, ApiIndex } from "./IndexPages"
import Accessibility from "./markdown/accessibility.mdx"
import Xyframe from "./markdown/xyframe.mdx"
import Ordinalframe from "./markdown/ordinalframe.mdx"
import Networkframe from "./markdown/networkframe.mdx"
import Realtimeframe from "./markdown/realtimeframe.mdx"
import Responsiveframes from "./markdown/responsiveframes.mdx"
import Sparkframes from "./markdown/sparkframes.mdx"
import Facetcontroller from "./markdown/facetcontroller.mdx"

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
import RealtimeFrameGuide from "./guides/RealtimeFrame"
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
import BarChartPage from "./pages/charts/BarChartPage"
import StackedBarChartPage from "./pages/charts/StackedBarChartPage"
import SwarmPlotPage from "./pages/charts/SwarmPlotPage"
import BoxPlotPage from "./pages/charts/BoxPlotPage"
import DotPlotPage from "./pages/charts/DotPlotPage"
import ForceDirectedGraphPage from "./pages/charts/ForceDirectedGraphPage"
import ChordDiagramPage from "./pages/charts/ChordDiagramPage"
import SankeyDiagramPage from "./pages/charts/SankeyDiagramPage"
import TreeDiagramPage from "./pages/charts/TreeDiagramPage"
import RealtimeLineChartPage from "./pages/charts/RealtimeLineChartPage"
import RealtimeBarChartPage from "./pages/charts/RealtimeBarChartPage"
import RealtimeSwarmChartPage from "./pages/charts/RealtimeSwarmChartPage"
import RealtimeWaterfallChartPage from "./pages/charts/RealtimeWaterfallChartPage"
import PieChartPage from "./pages/charts/PieChartPage"
import DonutChartPage from "./pages/charts/DonutChartPage"
import GroupedBarChartPage from "./pages/charts/GroupedBarChartPage"
import TreemapPage from "./pages/charts/TreemapPage"
import CirclePackPage from "./pages/charts/CirclePackPage"

// New frame pages
import XYFramePage from "./pages/frames/XYFramePage"
import OrdinalFramePage from "./pages/frames/OrdinalFramePage"
import NetworkFramePage from "./pages/frames/NetworkFramePage"
import RealtimeFramePage from "./pages/frames/RealtimeFramePage"

// New feature pages
import AxesPage from "./pages/features/AxesPage"
import AnnotationsPage from "./pages/features/AnnotationsPage"
import TooltipsPage from "./pages/features/TooltipsPage"
import InteractionPage from "./pages/features/InteractionPage"
import ResponsivePage from "./pages/features/ResponsivePage"
import AccessibilityPage from "./pages/features/AccessibilityPage"
import CanvasRenderingPage from "./pages/features/CanvasRenderingPage"
import SparklinesPage from "./pages/features/SparklinesPage"
import SmallMultiplesPage from "./pages/features/SmallMultiplesPage"
import StylingPage from "./pages/features/StylingPage"
import LegendsPage from "./pages/features/LegendsPage"

// New cookbook pages
import CandlestickChartPage from "./pages/cookbook/CandlestickChartPage"
import HomerunMapPage from "./pages/cookbook/HomerunMapPage"
import CanvasInteractionPage from "./pages/cookbook/CanvasInteractionPage"
import UncertaintyVisualizationPage from "./pages/cookbook/UncertaintyVisualizationPage"
import MarginalGraphicsPage from "./pages/cookbook/MarginalGraphicsPage"
import BarLineChartPage from "./pages/cookbook/BarLineChartPage"
import BarToParallelPage from "./pages/cookbook/BarToParallelPage"
import WaterfallChartPage from "./pages/cookbook/WaterfallChartPage"
import SlopeChartPage from "./pages/cookbook/SlopeChartPage"
import MarimekkoChartPage from "./pages/cookbook/MarimekkoChartPage"
import SwarmPlotRecipePage from "./pages/cookbook/SwarmPlotRecipePage"
import RidgelinePlotPage from "./pages/cookbook/RidgelinePlotPage"
import DotPlotRecipePage from "./pages/cookbook/DotPlotRecipePage"
import TimelineCookbookPage from "./pages/cookbook/TimelinePage"
import RadarPlotPage from "./pages/cookbook/RadarPlotPage"
import IsotypeChartPage from "./pages/cookbook/IsotypeChartPage"
import MatrixCookbookPage from "./pages/cookbook/MatrixPage"

import semioticLogo from "../public/assets/img/semiotic.png"

import { useScrollRestoration } from "./useScrollRestoration"

// Theme toggle component
function ThemeToggle() {
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
    <button
      onClick={toggleTheme}
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
      url: "https://semiotic.nteract.io",
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

  return (
    <div className="App">
      <header className="flex">
        <SidebarToggle onClick={() => setSidebarOpen((prev) => !prev)} />
        <div className="logo">
          <Link to="/">
            <img src={semioticLogo} alt="Semiotic" />
          </Link>
        </div>
        <div className="flex space-between">
          <h1>
            <Link to="/" style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}>
              Semiotic
            </Link>
          </h1>

          <div className="flex" style={{ alignItems: "center", gap: "12px" }}>
            <ThemeToggle />
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
              <Route path="realtime-frame" element={<RealtimeFrameGuide />} />
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
              <Route path="realtime-frame" element={<Realtimeframe />} />
              <Route path="responsiveframe" element={<Responsiveframes />} />
              <Route path="sparkFrame" element={<Sparkframes />} />
              <Route path="facetcontroller" element={<Facetcontroller />} />
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
              <Route path="bar-line-chart" element={<BarLineChartPage />} />
              <Route path="bar-to-parallel-coordinates" element={<BarToParallelPage />} />
              <Route path="waterfall-chart" element={<WaterfallChartPage />} />
              <Route path="slope-chart" element={<SlopeChartPage />} />
              <Route path="marimekko-chart" element={<MarimekkoChartPage />} />
              <Route path="swarm-plot" element={<SwarmPlotRecipePage />} />
              <Route path="ridgeline-plot" element={<RidgelinePlotPage />} />
              <Route path="dot-plot" element={<DotPlotRecipePage />} />
              <Route path="timeline" element={<TimelineCookbookPage />} />
              <Route path="radar-plot" element={<RadarPlotPage />} />
              <Route path="isotype-chart" element={<IsotypeChartPage />} />
              <Route path="matrix" element={<MatrixCookbookPage />} />
            </Route>

            {/* Frames routes */}
            <Route path="frames" element={<Outlet />}>
              <Route path="xy-frame" element={<XYFramePage />} />
              <Route path="ordinal-frame" element={<OrdinalFramePage />} />
              <Route path="network-frame" element={<NetworkFramePage />} />
              <Route path="realtime-frame" element={<RealtimeFramePage />} />
            </Route>

            {/* Features routes */}
            <Route path="features" element={<Outlet />}>
              <Route path="axes" element={<AxesPage />} />
              <Route path="annotations" element={<AnnotationsPage />} />
              <Route path="tooltips" element={<TooltipsPage />} />
              <Route path="interaction" element={<InteractionPage />} />
              <Route path="responsive" element={<ResponsivePage />} />
              <Route path="accessibility" element={<AccessibilityPage />} />
              <Route path="canvas-rendering" element={<CanvasRenderingPage />} />
              <Route path="sparklines" element={<SparklinesPage />} />
              <Route path="small-multiples" element={<SmallMultiplesPage />} />
              <Route path="styling" element={<StylingPage />} />
              <Route path="legends" element={<LegendsPage />} />
            </Route>

            {/* Getting Started */}
            <Route path="getting-started" element={<GettingStartedPage />} />

            {/* New Charts routes */}
            <Route path="charts" element={<Outlet />}>
              {/* XY Charts */}
              <Route path="line-chart" element={<LineChartPage />} />
              <Route path="area-chart" element={<AreaChartPage />} />
              <Route path="stacked-area-chart" element={<StackedAreaChartPage />} />
              <Route path="scatterplot" element={<ScatterplotPage />} />
              <Route path="bubble-chart" element={<BubbleChartPage />} />
              <Route path="heatmap" element={<HeatmapPage />} />
              {/* Categorical Charts */}
              <Route path="bar-chart" element={<BarChartPage />} />
              <Route path="stacked-bar-chart" element={<StackedBarChartPage />} />
              <Route path="swarm-plot" element={<SwarmPlotPage />} />
              <Route path="box-plot" element={<BoxPlotPage />} />
              <Route path="dot-plot" element={<DotPlotPage />} />
              <Route path="pie-chart" element={<PieChartPage />} />
              <Route path="donut-chart" element={<DonutChartPage />} />
              <Route path="grouped-bar-chart" element={<GroupedBarChartPage />} />
              {/* Network Charts */}
              <Route path="force-directed-graph" element={<ForceDirectedGraphPage />} />
              <Route path="chord-diagram" element={<ChordDiagramPage />} />
              <Route path="sankey-diagram" element={<SankeyDiagramPage />} />
              <Route path="tree-diagram" element={<TreeDiagramPage />} />
              <Route path="treemap" element={<TreemapPage />} />
              <Route path="circle-pack" element={<CirclePackPage />} />
              {/* Realtime Charts */}
              <Route path="realtime-line-chart" element={<RealtimeLineChartPage />} />
              <Route path="realtime-bar-chart" element={<RealtimeBarChartPage />} />
              <Route path="realtime-swarm-chart" element={<RealtimeSwarmChartPage />} />
              <Route path="realtime-waterfall-chart" element={<RealtimeWaterfallChartPage />} />
            </Route>
          </Routes>
        </div>
      </div>
    </div>
  )
}
