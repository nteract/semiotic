import React, { useState, useEffect } from "react"
import { Routes, Route, Outlet, Link, Navigate, useLocation } from "react-router-dom"

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
import MigrationPage from "./pages/MigrationPage"
import ChooseChartPage from "./pages/ChooseChartPage"
import LineChartPage from "./pages/charts/LineChartPage"
import AreaChartPage from "./pages/charts/AreaChartPage"
import DifferenceChartPage from "./pages/charts/DifferenceChartPage"
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
import ProcessSankeyPage from "./pages/charts/ProcessSankeyPage"
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
import BigNumberPage from "./pages/charts/BigNumberPage"
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
import CandlestickChartPage from "./pages/charts/CandlestickChartPage"

// New frame pages
import StreamXYFramePage from "./pages/frames/XYFramePage"
import StreamOrdinalFramePage from "./pages/frames/OrdinalFramePage"
import StreamNetworkFramePage from "./pages/frames/NetworkFramePage"
import StreamGeoFramePage from "./pages/frames/GeoFramePage"

// New feature pages
import AxesPage from "./pages/features/AxesPage"
import AnnotationsPage from "./pages/features/AnnotationsPage"
import AnnotationDesignPage from "./pages/features/AnnotationDesignPage"
import AnnotationFlowPage from "./pages/features/AnnotationFlowPage"
import AnnotationProvenancePage from "./pages/features/AnnotationProvenancePage"
import TooltipsPage from "./pages/features/TooltipsPage"
import InteractionPage from "./pages/features/InteractionPage"
import ResponsivePage from "./pages/features/ResponsivePage"
import CompositionPage from "./pages/features/CompositionPage"
import AccessibilityPage from "./pages/accessibility/AccessibilityPage"
import AccessibilityAuditPage from "./pages/accessibility/AccessibilityAuditPage"
import DescribeChartPage from "./pages/accessibility/DescribeChartPage"
import NavigationTreePage from "./pages/accessibility/NavigationTreePage"
import SmallMultiplesPage from "./pages/features/SmallMultiplesPage"
import StylingPage from "./pages/features/StylingPage"
import ThemingPage from "./pages/features/ThemingPage"
import ThemeExplorerPage from "./pages/theming/ThemeExplorerPage"
import SemanticColorsPage from "./pages/theming/SemanticColorsPage"
import LegendsPage from "./pages/features/LegendsPage"
import RealtimeEncodingPage from "./pages/features/RealtimeEncodingPage"
import StreamingAggregationPage from "./pages/features/StreamingAggregationPage"
import ChartContainersPage from "./pages/features/ChartContainersPage"
import ChartStatesPage from "./pages/features/ChartStatesPage"
import ChartModesPage from "./pages/features/ChartModesPage"
import ObservationHooksPage from "./pages/features/ObservationHooksPage"
import SerializationPage from "./pages/features/SerializationPage"
import VegaLiteTranslatorPage from "./pages/features/VegaLiteTranslatorPage"
import VariantDiscoveryPage from "./pages/features/VariantDiscoveryPage"
import CapabilityAuthoringPage from "./pages/features/CapabilityAuthoringPage"
import AudienceProfilesPage from "./pages/features/AudienceProfilesPage"
import CliMcpPage from "./pages/features/CliMcpPage"
import StreamingSystemModelPage from "./pages/features/StreamingSystemModelPage"
import PerformancePage from "./pages/features/PerformancePage"
import PushApiPage from "./pages/features/PushApiPage"
import CustomChartsOverviewPage from "./pages/custom-charts/CustomChartsOverviewPage"
import CustomLayoutsPage from "./pages/custom-charts/CustomLayoutsPage"
import GlyphMarksPage from "./pages/custom-charts/GlyphMarksPage"
import RecipeKitPage from "./pages/custom-charts/RecipeKitPage"
import CustomChartsExamplesPage from "./pages/custom-charts/CustomChartsExamplesPage"
import GoFishLayoutsPage from "./pages/features/GoFishLayoutsPage"
import CapabilitiesPage from "./pages/features/CapabilitiesPage"
import InterrogationPage from "./pages/features/InterrogationPage"
import SuggestionsPage from "./pages/features/SuggestionsPage"
import ReaderGroundingPage from "./pages/features/ReaderGroundingPage"
import DataPitfallsBridgePage from "./pages/features/DataPitfallsBridgePage"
import ScaleAwarePage from "./pages/features/ScaleAwarePage"
import ConversationArcPage from "./pages/features/ConversationArcPage"
import TemporalLifecyclePage from "./pages/features/TemporalLifecyclePage"
import PortabilitySpecPage from "./pages/features/PortabilitySpecPage"
import DataQualityBridgePage from "./pages/features/DataQualityBridgePage"
import GenerativeUIPage from "./pages/features/GenerativeUIPage"
import ObservablePlotPage from "./pages/features/ObservablePlotPage"
import InteroperabilityPage from "./pages/features/InteroperabilityPage"
import MermaidPage from "./pages/features/MermaidPage"
import ArrowPage from "./pages/features/ArrowPage"

// New cookbook pages
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
import ExamplesOverviewPage from "./pages/examples/ExamplesOverviewPage"
import ClimateAnomalyExamplePage from "./pages/examples/ClimateAnomalyExamplePage"
import ClimateRadialWeatherExamplePage from "./pages/examples/ClimateRadialWeatherExamplePage"
import ExamplesLayout from "./pages/examples/ExamplesLayout"
import USWarTimelineExamplePage from "./pages/examples/USWarTimelineExamplePage"
import ArtMovementGenealogyExamplePage from "./pages/examples/ArtMovementGenealogyExamplePage"
import ParisIsometricLandmarksExamplePage from "./pages/examples/ParisIsometricLandmarksExamplePage"
import UrineWheelExamplePage from "./pages/examples/UrineWheelExamplePage"
import ErieRailroadOrganizationExamplePage from "./pages/examples/ErieRailroadOrganizationExamplePage"
import WikipediaRealtimeExamplePage from "./pages/examples/WikipediaRealtimeExamplePage"
import LocalGovernmentExplorerExamplePage from "./pages/examples/LocalGovernmentExplorerExamplePage"
import PortCongestionReplayExamplePage from "./pages/examples/PortCongestionReplayExamplePage"
import ScrollYoureTellingExamplePage from "./pages/examples/ScrollYoureTellingExamplePage"
import WhatTheMachineSeesExamplePage from "./pages/examples/WhatTheMachineSeesExamplePage"
import SemioticArchitectureExamplePage from "./pages/examples/SemioticArchitectureExamplePage"
import GestaltPrinciplesExamplePage from "./pages/examples/GestaltPrinciplesExamplePage"
import NetworkVizExamplePage from "./pages/examples/NetworkVizExamplePage"
import OregonTrailExamplePage from "./pages/examples/OregonTrailExamplePage"
import ChartClinicExamplePage from "./pages/examples/ChartClinicExamplePage"
import KpiCardSparklinePage from "./pages/recipes/KpiCardSparklinePage"
import TimeSeriesBrushPage from "./pages/recipes/TimeSeriesBrushPage"
import NetworkExplorerPage from "./pages/recipes/NetworkExplorerPage"
import KstreamsPage from "./pages/recipes/KstreamsPage"
import BenchmarkDashboardPage from "./pages/recipes/BenchmarkDashboardPage"
import RoslingBubbleChartPage from "./pages/recipes/RoslingBubbleChartPage"
import SatellitesInSpacePage from "./pages/recipes/SatellitesInSpacePage"
import StreamingMigrationMapPage from "./pages/recipes/StreamingMigrationMapPage"
import BlogIndexPage from "./blog/BlogIndexPage"
import { useDocsTheme } from "./hooks/useDocsTheme"
import ThemeToggle from "./components/ThemeToggle"
import BlogEntryPage from "./blog/BlogEntryPage"
import UsingSSRPage from "./pages/UsingSSRPage"
import SSRGalleryPage from "./pages/SSRGalleryPage"
import RenderStudioPage from "./pages/server/RenderStudioPage"
import ThemeShowcasePage from "./pages/server/ThemeShowcasePage"
import DashboardGalleryPage from "./pages/server/DashboardGalleryPage"
import EmailPreviewPage from "./pages/server/EmailPreviewPage"
import ExportPage from "./pages/server/ExportPage"

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
import AnimationPlayground from "./pages/playground/AnimationPlayground"

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
        <Link to="/" style={{ color: "var(--accent)" }}>
          Back to home
        </Link>
      </p>
    </div>
  )
}

import { useScrollRestoration } from "./useScrollRestoration"

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
      description:
        "A data visualization framework for React combining D3 and React for interactive charts, network diagrams, and more.",
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
  const [theme, toggleTheme] = useDocsTheme()

  // Blog routes opt out of the docs chrome. The blog has its own
  // typographic identity (full-bleed article, no sidebar, minimal
  // top strip) so the docs header + sidebar would just compete with
  // the article. Pathname inspection is sufficient — react-router's
  // route-level layouts would require a deeper restructure we don't
  // need.
  const location = useLocation()
  const isBlogRoute = location.pathname === "/blog" || location.pathname.startsWith("/blog/")
  const isExamplesRoute =
    location.pathname === "/examples" || location.pathname.startsWith("/examples/")

  if (isBlogRoute) {
    return (
      <div className="App App--blog">
        <Routes>
          <Route path="blog" element={<BlogIndexPage />} />
          <Route path="blog/:slug" element={<BlogEntryPage />} />
        </Routes>
      </div>
    )
  }

  if (isExamplesRoute) {
    return (
      <div className="App App--examples">
        <ExamplesLayout>
          <Routes>
            <Route path="examples" element={<ExamplesOverviewPage />} />
            <Route path="examples/climate-anomaly" element={<ClimateAnomalyExamplePage />} />
            <Route path="examples/climate-radial-weather" element={<ClimateRadialWeatherExamplePage />} />
            <Route path="examples/us-war-timeline" element={<USWarTimelineExamplePage />} />
            <Route path="examples/art-movement-genealogy" element={<ArtMovementGenealogyExamplePage />} />
            <Route path="examples/paris-isometric-landmarks" element={<ParisIsometricLandmarksExamplePage />} />
            <Route path="examples/urine-wheel" element={<UrineWheelExamplePage />} />
            <Route path="examples/erie-railroad-organization" element={<ErieRailroadOrganizationExamplePage />} />
            <Route path="examples/wikipedia-realtime" element={<WikipediaRealtimeExamplePage />} />
            <Route path="examples/local-government-explorer" element={<LocalGovernmentExplorerExamplePage />} />
            <Route path="examples/port-congestion-replay" element={<PortCongestionReplayExamplePage />} />
            <Route path="examples/scroll-youre-telling" element={<ScrollYoureTellingExamplePage />} />
            <Route path="examples/what-the-machine-sees" element={<WhatTheMachineSeesExamplePage />} />
            <Route path="examples/semiotic-architecture" element={<SemioticArchitectureExamplePage />} />
            <Route path="examples/gestalt-principles" element={<GestaltPrinciplesExamplePage />} />
            <Route path="examples/network-visualization" element={<NetworkVizExamplePage />} />
            <Route path="examples/oregon-trail" element={<OregonTrailExamplePage />} />
            <Route path="examples/chart-clinic" element={<ChartClinicExamplePage />} />
          </Routes>
        </ExamplesLayout>
      </div>
    )
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
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
              <Route path="semantic-colors" element={<SemanticColorsPage />} />
              <Route path="theme-explorer" element={<ThemeExplorerPage />} />
            </Route>

            {/* Redirects for old feature paths */}
            <Route path="features/styling" element={<Navigate to="/theming/styling" replace />} />
            <Route
              path="features/theming"
              element={<Navigate to="/theming/theme-provider" replace />}
            />

            {/* Example routes use the early-return branch above so they render
                without the documentation sidebar or right-side table of contents. */}

            {/* Redirects for legacy v1/v2 API routes (SEO: prevent stale search results) */}
            <Route path="api/xyframe" element={<Navigate to="/frames/xy-frame" replace />} />
            <Route
              path="api/ordinalframe"
              element={<Navigate to="/frames/ordinal-frame" replace />}
            />
            <Route
              path="api/networkframe"
              element={<Navigate to="/frames/network-frame" replace />}
            />
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
              <Route
                path=""
                element={
                  <>
                    <h1>Recipes</h1>
                    <RecipesIndex />
                  </>
                }
              />
              <Route path="kpi-card-sparkline" element={<KpiCardSparklinePage />} />
              <Route path="time-series-brush" element={<TimeSeriesBrushPage />} />
              <Route path="network-explorer" element={<NetworkExplorerPage />} />
              <Route path="kstreams" element={<KstreamsPage />} />
              <Route path="benchmark-dashboard" element={<BenchmarkDashboardPage />} />
              <Route path="streaming-migration-map" element={<StreamingMigrationMapPage />} />
              <Route path="rosling-bubble-chart" element={<RoslingBubbleChartPage />} />
              <Route path="satellites-in-space" element={<SatellitesInSpacePage />} />
              {/* `minards-map` and `process-vs-classic-sankey` graduated to /blog/. */}
              <Route path="minards-map" element={<Navigate to="/blog/minards-march" replace />} />
              <Route
                path="process-vs-classic-sankey"
                element={<Navigate to="/blog/process-sankey-vs-classic-sankey" replace />}
              />
            </Route>

            {/* Blog routes are registered in the early-return branch above
                (`isBlogRoute`) so the docs chrome is stripped. */}

            {/* Playground routes */}
            <Route path="playground" element={<Outlet />}>
              <Route
                path=""
                element={
                  <>
                    <h1>Playground</h1>
                    <PlaygroundIndex />
                  </>
                }
              />
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
              <Route
                path="statistical-annotations"
                element={<StatisticalAnnotationsPlayground />}
              />
              <Route path="forecast" element={<ForecastPlayground />} />
              <Route path="choropleth-map" element={<ChoroplethMapPlayground />} />
              <Route path="distance-cartogram" element={<DistanceCartogramPlayground />} />
              <Route path="animation" element={<AnimationPlayground />} />
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
              <Route path="tooltips" element={<TooltipsPage />} />
              <Route path="interaction" element={<InteractionPage />} />
              <Route path="responsive" element={<ResponsivePage />} />
              <Route path="composition" element={<CompositionPage />} />
              <Route path="small-multiples" element={<SmallMultiplesPage />} />
              <Route path="linked-charts" element={<SmallMultiplesPage />} />
              <Route path="legends" element={<LegendsPage />} />
              <Route path="realtime-encoding" element={<RealtimeEncodingPage />} />
              <Route path="streaming-aggregation" element={<StreamingAggregationPage />} />
              <Route path="chart-container" element={<ChartContainersPage />} />
              <Route path="chart-states" element={<ChartStatesPage />} />
              <Route path="chart-modes" element={<ChartModesPage />} />
              <Route path="streaming-system-model" element={<StreamingSystemModelPage />} />
              <Route path="performance" element={<PerformancePage />} />
              <Route path="push-api" element={<PushApiPage />} />
              <Route path="gofish-layouts" element={<Navigate to="/interoperability/gofish" replace />} />
              <Route path="custom-charts" element={<Navigate to="/custom-charts/overview" replace />} />
            </Route>

            {/* Custom Charts — first-class section (the escape-hatch HOCs + recipe
                kit). Moved out of Features; old /features/custom-charts redirects above. */}
            <Route path="custom-charts" element={<Outlet />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<CustomChartsOverviewPage />} />
              <Route path="custom-layouts" element={<CustomLayoutsPage />} />
              <Route path="glyph-marks" element={<GlyphMarksPage />} />
              <Route path="recipe-kit" element={<RecipeKitPage />} />
              <Route path="examples" element={<CustomChartsExamplesPage />} />
            </Route>

            {/* Accessibility — first-class category (before Intelligence).
                Old /features/accessibility redirects to /accessibility/overview below. */}
            <Route path="accessibility" element={<Outlet />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AccessibilityPage />} />
              <Route path="audit" element={<AccessibilityAuditPage />} />
              <Route path="descriptions" element={<DescribeChartPage />} />
              <Route path="navigation" element={<NavigationTreePage />} />
            </Route>

            {/* Annotations routes — own section (moved out of Features) */}
            <Route path="annotations" element={<Outlet />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AnnotationsPage />} />
              <Route path="design-guidance" element={<AnnotationDesignPage />} />
              <Route path="advanced" element={<AnnotationFlowPage />} />
              <Route path="provenance-lifecycle" element={<AnnotationProvenancePage />} />
            </Route>

            {/* Intelligence — AI/recommendation surface, separated from generic Features
                Old /features/<slug> paths redirect to /intelligence/<slug>
                via dedicated routes below. */}
            <Route path="intelligence" element={<Outlet />}>
              <Route path="observation-hooks" element={<ObservationHooksPage />} />
              <Route path="capabilities" element={<CapabilitiesPage />} />
              <Route path="suggestions" element={<SuggestionsPage />} />
              <Route path="scale" element={<ScaleAwarePage />} />
              <Route path="interrogation" element={<InterrogationPage />} />
              <Route path="reader-grounding" element={<ReaderGroundingPage />} />
              <Route path="data-pitfalls" element={<DataPitfallsBridgePage />} />
              <Route path="conversation-arc" element={<ConversationArcPage />} />
              <Route path="temporal-lifecycle" element={<TemporalLifecyclePage />} />
              <Route path="serialization" element={<SerializationPage />} />
              <Route path="variant-discovery" element={<VariantDiscoveryPage />} />
              <Route path="capability-authoring" element={<CapabilityAuthoringPage />} />
              <Route path="audience-profiles" element={<AudienceProfilesPage />} />
              <Route path="cli-mcp" element={<CliMcpPage />} />
              {/* Adapter/interop pages moved to /interoperability — redirects preserve old links. */}
              <Route path="vega-lite" element={<Navigate to="/interoperability/vega-lite" replace />} />
              <Route path="portability-spec" element={<Navigate to="/interoperability/portability-spec" replace />} />
              <Route path="observable-plot" element={<Navigate to="/interoperability/observable-plot" replace />} />
              <Route path="data-quality-bridge" element={<Navigate to="/interoperability/data-quality-bridge" replace />} />
              <Route path="generative-ui" element={<Navigate to="/interoperability/generative-ui" replace />} />
            </Route>

            {/* Interoperability — adapters + the portability schema, one coherent home. */}
            <Route path="interoperability" element={<Outlet />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<InteroperabilityPage />} />
              <Route path="portability-spec" element={<PortabilitySpecPage />} />
              <Route path="vega-lite" element={<VegaLiteTranslatorPage />} />
              <Route path="observable-plot" element={<ObservablePlotPage />} />
              <Route path="mermaid" element={<MermaidPage />} />
              <Route path="gofish" element={<GoFishLayoutsPage />} />
              <Route path="arrow" element={<ArrowPage />} />
              <Route path="data-quality-bridge" element={<DataQualityBridgePage />} />
              <Route path="generative-ui" element={<GenerativeUIPage />} />
            </Route>

            {/* Redirects from old /features/<slug> paths */}
            <Route
              path="features/accessibility"
              element={<Navigate to="/accessibility/overview" replace />}
            />
            <Route
              path="features/observation-hooks"
              element={<Navigate to="/intelligence/observation-hooks" replace />}
            />
            <Route
              path="features/capabilities"
              element={<Navigate to="/intelligence/capabilities" replace />}
            />
            <Route
              path="features/suggestions"
              element={<Navigate to="/intelligence/suggestions" replace />}
            />
            <Route
              path="features/interrogation"
              element={<Navigate to="/intelligence/interrogation" replace />}
            />
            <Route
              path="features/serialization"
              element={<Navigate to="/intelligence/serialization" replace />}
            />
            <Route
              path="features/vega-lite"
              element={<Navigate to="/interoperability/vega-lite" replace />}
            />

            {/* Using Server-Side Rendering */}
            <Route path="using-ssr" element={<UsingSSRPage />} />
            <Route path="ssr-gallery" element={<SSRGalleryPage />} />
            <Route path="server/studio" element={<RenderStudioPage />} />
            <Route path="server/themes" element={<ThemeShowcasePage />} />
            <Route path="server/dashboards" element={<DashboardGalleryPage />} />
            <Route path="server/email" element={<EmailPreviewPage />} />
            <Route path="server/export" element={<ExportPage />} />

            {/* Getting Started */}
            <Route path="getting-started" element={<GettingStartedPage />} />
            <Route path="migration" element={<MigrationPage />} />
            <Route path="choose" element={<ChooseChartPage />} />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFoundPage />} />

            {/* New Charts routes */}
            <Route path="charts" element={<Outlet />}>
              {/* XY Charts */}
              <Route path="line-chart" element={<LineChartPage />} />
              <Route path="area-chart" element={<AreaChartPage />} />
              <Route path="difference-chart" element={<DifferenceChartPage />} />
              <Route path="stacked-area-chart" element={<StackedAreaChartPage />} />
              <Route path="scatterplot" element={<ScatterplotPage />} />
              <Route path="connected-scatterplot" element={<ConnectedScatterplotPage />} />
              <Route path="bubble-chart" element={<BubbleChartPage />} />
              <Route path="heatmap" element={<HeatmapPage />} />
              <Route path="scatterplot-matrix" element={<ScatterplotMatrixPage />} />
              <Route path="quadrant-chart" element={<QuadrantChartPage />} />
              <Route path="multi-axis-line-chart" element={<MultiAxisLineChartPage />} />
              <Route path="candlestick-chart" element={<CandlestickChartPage />} />
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
              <Route path="realtime-histogram" element={<RealtimeHistogramPage />} />
              {/* Network Charts */}
              <Route path="force-directed-graph" element={<ForceDirectedGraphPage />} />
              <Route path="chord-diagram" element={<ChordDiagramPage />} />
              <Route path="sankey-diagram" element={<SankeyDiagramPage />} />
              <Route path="process-sankey" element={<ProcessSankeyPage />} />
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
              {/* Value Charts */}
              <Route path="big-number" element={<BigNumberPage />} />
            </Route>
          </Routes>
        </div>
      </div>
    </div>
  )
}
