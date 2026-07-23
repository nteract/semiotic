import React, { Suspense, lazy, useState, useEffect } from "react"
import { Routes, Route, Outlet, Link, Navigate, useLocation } from "react-router-dom"

// New components
import Sidebar, { SidebarToggle } from "./components/Sidebar"
import { useScrollRestoration } from "./useScrollRestoration"

// Index page components
import { ExamplesIndex, ApiIndex, RecipesIndex, PlaygroundIndex } from "./IndexPages"

// RealtimeSankey has been merged into the SankeyDiagram page
// MatrixCookbookPage removed — matrix recipe no longer supported

import { useDocsTheme } from "./hooks/useDocsTheme"
import { EXAMPLE_DEFINITIONS } from "./pages/examples/exampleDefinitions"
import ThemeToggle from "./components/ThemeToggle"

const Landing = lazy(() => import("./Landing"))
const ChartsApiPage = lazy(() => import("./pages/api/ChartsApiPage"))
const ApiReferencePage = lazy(() => import("./pages/api/ApiReferencePage"))
const GettingStartedPage = lazy(() => import("./pages/GettingStartedPage"))
const MigrationPage = lazy(() => import("./pages/MigrationPage"))
const ChooseChartPage = lazy(() => import("./pages/ChooseChartPage"))
const LineChartPage = lazy(() => import("./pages/charts/LineChartPage"))
const AreaChartPage = lazy(() => import("./pages/charts/AreaChartPage"))
const DifferenceChartPage = lazy(() => import("./pages/charts/DifferenceChartPage"))
const StackedAreaChartPage = lazy(() => import("./pages/charts/StackedAreaChartPage"))
const ScatterplotPage = lazy(() => import("./pages/charts/ScatterplotPage"))
const ConnectedScatterplotPage = lazy(() => import("./pages/charts/ConnectedScatterplotPage"))
const OrbitDiagramPage = lazy(() => import("./pages/charts/OrbitDiagramPage"))
const BubbleChartPage = lazy(() => import("./pages/charts/BubbleChartPage"))
const HeatmapPage = lazy(() => import("./pages/charts/HeatmapPage"))
const ScatterplotMatrixPage = lazy(() => import("./pages/charts/ScatterplotMatrixPage"))
const BarChartPage = lazy(() => import("./pages/charts/BarChartPage"))
const StackedBarChartPage = lazy(() => import("./pages/charts/StackedBarChartPage"))
const LikertChartPage = lazy(() => import("./pages/charts/LikertChartPage"))
const SwarmPlotPage = lazy(() => import("./pages/charts/SwarmPlotPage"))
const BoxPlotPage = lazy(() => import("./pages/charts/BoxPlotPage"))
const HistogramPage = lazy(() => import("./pages/charts/HistogramPage"))
const ViolinPlotPage = lazy(() => import("./pages/charts/ViolinPlotPage"))
const DotPlotPage = lazy(() => import("./pages/charts/DotPlotPage"))
const ForceDirectedGraphPage = lazy(() => import("./pages/charts/ForceDirectedGraphPage"))
const ChordDiagramPage = lazy(() => import("./pages/charts/ChordDiagramPage"))
const SankeyDiagramPage = lazy(() => import("./pages/charts/SankeyDiagramPage"))
const ProcessSankeyPage = lazy(() => import("./pages/charts/ProcessSankeyPage"))
const TreeDiagramPage = lazy(() => import("./pages/charts/TreeDiagramPage"))
const RealtimeLineChartPage = lazy(() => import("./pages/charts/RealtimeLineChartPage"))
const RealtimeHistogramPage = lazy(() => import("./pages/charts/RealtimeHistogramPage"))
const RealtimeSwarmChartPage = lazy(() => import("./pages/charts/RealtimeSwarmChartPage"))
const RealtimeWaterfallChartPage = lazy(() => import("./pages/charts/RealtimeWaterfallChartPage"))
const RealtimeHeatmapPage = lazy(() => import("./pages/charts/RealtimeHeatmapPage"))
const GaltonBoardChartPage = lazy(() => import("./pages/charts/GaltonBoardChartPage"))
const EventDropChartPage = lazy(() => import("./pages/charts/EventDropChartPage"))
const PhysicsPileChartPage = lazy(() => import("./pages/charts/PhysicsPileChartPage"))
const CollisionSwarmChartPage = lazy(() => import("./pages/charts/CollisionSwarmChartPage"))
const PhysicalFlowChartPage = lazy(() => import("./pages/charts/PhysicalFlowChartPage"))
const ProcessFlowChartPage = lazy(() => import("./pages/charts/ProcessFlowChartPage"))
const GauntletChartPage = lazy(() => import("./pages/charts/GauntletChartPage"))
const CrucibleChartPage = lazy(() => import("./pages/charts/CrucibleChartPage"))
const PhysicsCustomChartPage = lazy(() => import("./pages/charts/PhysicsCustomChartPage"))
const PieChartPage = lazy(() => import("./pages/charts/PieChartPage"))
const DonutChartPage = lazy(() => import("./pages/charts/DonutChartPage"))
const GaugeChartPage = lazy(() => import("./pages/charts/GaugeChartPage"))
const BigNumberPage = lazy(() => import("./pages/charts/BigNumberPage"))
const GroupedBarChartPage = lazy(() => import("./pages/charts/GroupedBarChartPage"))
const FunnelChartPage = lazy(() => import("./pages/charts/FunnelChartPage"))
const SwimlaneChartPage = lazy(() => import("./pages/charts/SwimlaneChartPage"))
const TreemapPage = lazy(() => import("./pages/charts/TreemapPage"))
const CirclePackPage = lazy(() => import("./pages/charts/CirclePackPage"))
const ChoroplethMapPage = lazy(() => import("./pages/charts/ChoroplethMapPage"))
const ProportionalSymbolMapPage = lazy(() => import("./pages/charts/ProportionalSymbolMapPage"))
const FlowMapPage = lazy(() => import("./pages/charts/FlowMapPage"))
const DistanceCartogramPage = lazy(() => import("./pages/charts/DistanceCartogramPage"))
const TileMapPage = lazy(() => import("./pages/charts/TileMapPage"))
const QuadrantChartPage = lazy(() => import("./pages/charts/QuadrantChartPage"))
const MultiAxisLineChartPage = lazy(() => import("./pages/charts/MultiAxisLineChartPage"))
const CandlestickChartPage = lazy(() => import("./pages/charts/CandlestickChartPage"))
const StreamXYFramePage = lazy(() => import("./pages/frames/XYFramePage"))
const StreamOrdinalFramePage = lazy(() => import("./pages/frames/OrdinalFramePage"))
const StreamNetworkFramePage = lazy(() => import("./pages/frames/NetworkFramePage"))
const StreamGeoFramePage = lazy(() => import("./pages/frames/GeoFramePage"))
const StreamPhysicsFramePage = lazy(() => import("./pages/frames/PhysicsFramePage"))
const AxesPage = lazy(() => import("./pages/features/AxesPage"))
const AnnotationsPage = lazy(() => import("./pages/features/AnnotationsPage"))
const AnnotationDesignPage = lazy(() => import("./pages/features/AnnotationDesignPage"))
const AnnotationFlowPage = lazy(() => import("./pages/features/AnnotationFlowPage"))
const AnnotationProvenancePage = lazy(() => import("./pages/features/AnnotationProvenancePage"))
const TooltipsPage = lazy(() => import("./pages/features/TooltipsPage"))
const InteractionPage = lazy(() => import("./pages/features/InteractionPage"))
const VisualizationControlsPage = lazy(() => import("./pages/features/VisualizationControlsPage"))
const ResponsivePage = lazy(() => import("./pages/features/ResponsivePage"))
const CompositionPage = lazy(() => import("./pages/features/CompositionPage"))
const AccessibilityPage = lazy(() => import("./pages/accessibility/AccessibilityPage"))
const AccessibilityAuditPage = lazy(() => import("./pages/accessibility/AccessibilityAuditPage"))
const DescribeChartPage = lazy(() => import("./pages/accessibility/DescribeChartPage"))
const NavigationTreePage = lazy(() => import("./pages/accessibility/NavigationTreePage"))
const AnchoringComplexChartsPage = lazy(
  () => import("./pages/accessibility/AnchoringComplexChartsPage"),
)
const SmallMultiplesPage = lazy(() => import("./pages/features/SmallMultiplesPage"))
const StylingPage = lazy(() => import("./pages/features/StylingPage"))
const ThemingPage = lazy(() => import("./pages/features/ThemingPage"))
const ThemeExplorerPage = lazy(() => import("./pages/theming/ThemeExplorerPage"))
const SemanticColorsPage = lazy(() => import("./pages/theming/SemanticColorsPage"))
const LegendsPage = lazy(() => import("./pages/features/LegendsPage"))
const StyleRulesPage = lazy(() => import("./pages/features/StyleRulesPage"))
const RealtimeEncodingPage = lazy(() => import("./pages/features/RealtimeEncodingPage"))
const MotionEncodingsPage = lazy(() => import("./pages/features/MotionEncodingsPage"))
const PhysicsEncodingPage = lazy(() => import("./pages/features/PhysicsEncodingPage"))
const StreamingAggregationPage = lazy(() => import("./pages/features/StreamingAggregationPage"))
const ChartContainersPage = lazy(() => import("./pages/features/ChartContainersPage"))
const ChartStatesPage = lazy(() => import("./pages/features/ChartStatesPage"))
const ChartModesPage = lazy(() => import("./pages/features/ChartModesPage"))
const MobileVisualizationPage = lazy(() => import("./pages/features/MobileVisualizationPage"))
const MobileControlsPage = lazy(() => import("./pages/features/mobile/MobileControlsPage"))
const MobileRecipesPage = lazy(() => import("./pages/features/mobile/MobileRecipesPage"))
const ObservationHooksPage = lazy(() => import("./pages/features/ObservationHooksPage"))
const SerializationPage = lazy(() => import("./pages/features/SerializationPage"))
const VegaLiteTranslatorPage = lazy(() => import("./pages/features/VegaLiteTranslatorPage"))
const VariantDiscoveryPage = lazy(() => import("./pages/features/VariantDiscoveryPage"))
const CapabilityAuthoringPage = lazy(() => import("./pages/features/CapabilityAuthoringPage"))
const AudienceProfilesPage = lazy(() => import("./pages/features/AudienceProfilesPage"))
const CliMcpPage = lazy(() => import("./pages/features/CliMcpPage"))
const StreamingSystemModelPage = lazy(() => import("./pages/features/StreamingSystemModelPage"))
const PerformancePage = lazy(() => import("./pages/features/PerformancePage"))
const PushApiPage = lazy(() => import("./pages/features/PushApiPage"))
const WhenPhysicsPage = lazy(() => import("./pages/features/WhenPhysicsPage"))
const PhysicsProcessGuidePage = lazy(() => import("./pages/features/PhysicsProcessGuidePage"))
const CustomChartsOverviewPage = lazy(
  () => import("./pages/custom-charts/CustomChartsOverviewPage"),
)
const CustomChartsIntelligencePage = lazy(
  () => import("./pages/custom-charts/CustomChartsIntelligencePage"),
)
const CustomLayoutsPage = lazy(() => import("./pages/custom-charts/CustomLayoutsPage"))
const GlyphMarksPage = lazy(() => import("./pages/custom-charts/GlyphMarksPage"))
const RecipeKitPage = lazy(() => import("./pages/custom-charts/RecipeKitPage"))
const CustomChartsExamplesPage = lazy(
  () => import("./pages/custom-charts/CustomChartsExamplesPage"),
)
const GoFishLayoutsPage = lazy(() => import("./pages/features/GoFishLayoutsPage"))
const CapabilitiesPage = lazy(() => import("./pages/features/CapabilitiesPage"))
const InterrogationPage = lazy(() => import("./pages/features/InterrogationPage"))
const SuggestionsPage = lazy(() => import("./pages/features/SuggestionsPage"))
const ReaderGroundingPage = lazy(() => import("./pages/features/ReaderGroundingPage"))
const DataPitfallsBridgePage = lazy(() => import("./pages/features/DataPitfallsBridgePage"))
const ScaleAwarePage = lazy(() => import("./pages/features/ScaleAwarePage"))
const ConversationArcPage = lazy(() => import("./pages/features/ConversationArcPage"))
const TemporalLifecyclePage = lazy(() => import("./pages/features/TemporalLifecyclePage"))
const PortabilitySpecPage = lazy(() => import("./pages/features/PortabilitySpecPage"))
const DataQualityBridgePage = lazy(() => import("./pages/features/DataQualityBridgePage"))
const GenerativeUIPage = lazy(() => import("./pages/features/GenerativeUIPage"))
const ObservablePlotPage = lazy(() => import("./pages/features/ObservablePlotPage"))
const FlintChartAdapterPage = lazy(() => import("./pages/features/FlintChartAdapterPage"))
const InteroperabilityPage = lazy(() => import("./pages/features/InteroperabilityPage"))
const MermaidPage = lazy(() => import("./pages/features/MermaidPage"))
const ArrowPage = lazy(() => import("./pages/features/ArrowPage"))
const HomerunMapPage = lazy(() => import("./pages/cookbook/HomerunMapPage"))
const CanvasInteractionPage = lazy(() => import("./pages/cookbook/CanvasInteractionPage"))
const UncertaintyVisualizationPage = lazy(
  () => import("./pages/cookbook/UncertaintyVisualizationPage"),
)
const MarginalGraphicsPage = lazy(() => import("./pages/cookbook/MarginalGraphicsPage"))
const SlopeChartPage = lazy(() => import("./pages/cookbook/SlopeChartPage"))
const MarimekkoChartPage = lazy(() => import("./pages/cookbook/MarimekkoChartPage"))
const SwarmPlotRecipePage = lazy(() => import("./pages/cookbook/SwarmPlotRecipePage"))
const RidgelinePlotPage = lazy(() => import("./pages/cookbook/RidgelinePlotPage"))
const DotPlotRecipePage = lazy(() => import("./pages/cookbook/DotPlotRecipePage"))
const TimelineCookbookPage = lazy(() => import("./pages/cookbook/TimelinePage"))
const RadarPlotPage = lazy(() => import("./pages/cookbook/RadarPlotPage"))
const IsotypeChartPage = lazy(() => import("./pages/cookbook/IsotypeChartPage"))
const ExamplesOverviewPage = lazy(() => import("./pages/examples/ExamplesOverviewPage"))
const LivingLedgerExamplePage = lazy(() => import("./pages/examples/LivingLedgerExamplePage"))
const UkraineWarHistoryExamplePage = lazy(
  () => import("./pages/examples/UkraineWarHistoryExamplePage"),
)
const InsightForgeExamplePage = lazy(() => import("./pages/examples/InsightForgeExamplePage"))
const AnalystAdventureExamplePage = lazy(
  () => import("./pages/examples/AnalystAdventureExamplePage"),
)
const SentenceStructureExamplePage = lazy(
  () => import("./pages/examples/SentenceStructureExamplePage"),
)
const DebateConceptCrucibleExamplePage = lazy(
  () => import("./pages/examples/DebateConceptCrucibleExamplePage"),
)
const LDATopicCrucibleExamplePage = lazy(
  () => import("./pages/examples/LDATopicCrucibleExamplePage"),
)
const ClimateAnomalyExamplePage = lazy(() => import("./pages/examples/ClimateAnomalyExamplePage"))
const WatermarksExamplePage = lazy(() => import("./pages/examples/WatermarksExamplePage"))
const StakeholderJourneyExamplePage = lazy(
  () => import("./pages/examples/StakeholderJourneyExamplePage"),
)
const MergePressureExamplePage = lazy(() => import("./pages/examples/MergePressureExamplePage"))
const NimbyExamplePage = lazy(() => import("./pages/examples/NimbyExamplePage"))
const ClimateRadialWeatherExamplePage = lazy(
  () => import("./pages/examples/ClimateRadialWeatherExamplePage"),
)
const LakeTravisIsotypeExamplePage = lazy(
  () => import("./pages/examples/LakeTravisIsotypeExamplePage"),
)
const HotDogContestVariationsExamplePage = lazy(
  () => import("./pages/examples/HotDogContestVariationsExamplePage"),
)
const DataCentersIsotypeExamplePage = lazy(
  () => import("./pages/examples/DataCentersIsotypeExamplePage"),
)
const TheGridExamplePage = lazy(() => import("./pages/examples/TheGridExamplePage"))
const CreativeContoursExamplePage = lazy(
  () => import("./pages/examples/CreativeContoursExamplePage"),
)
const SometimesDiscreteExamplePage = lazy(
  () => import("./pages/examples/SometimesDiscreteExamplePage"),
)
const WhereYouDrawTheLineExamplePage = lazy(
  () => import("./pages/examples/WhereYouDrawTheLineExamplePage"),
)
const ExamplesLayout = lazy(() => import("./pages/examples/ExamplesLayout"))
const USWarTimelineExamplePage = lazy(() => import("./pages/examples/USWarTimelineExamplePage"))
const ArtMovementGenealogyExamplePage = lazy(
  () => import("./pages/examples/ArtMovementGenealogyExamplePage"),
)
const ParisIsometricLandmarksExamplePage = lazy(
  () => import("./pages/examples/ParisIsometricLandmarksExamplePage"),
)
const UrineWheelExamplePage = lazy(() => import("./pages/examples/UrineWheelExamplePage"))
const ErieRailroadOrganizationExamplePage = lazy(
  () => import("./pages/examples/ErieRailroadOrganizationExamplePage"),
)
const WikipediaRealtimeExamplePage = lazy(
  () => import("./pages/examples/WikipediaRealtimeExamplePage"),
)
const LocalGovernmentExplorerExamplePage = lazy(
  () => import("./pages/examples/LocalGovernmentExplorerExamplePage"),
)
const PortCongestionReplayExamplePage = lazy(
  () => import("./pages/examples/PortCongestionReplayExamplePage"),
)
const ScrollYoureTellingExamplePage = lazy(
  () => import("./pages/examples/ScrollYoureTellingExamplePage"),
)
const DatavizPeopleExamplePage = lazy(() => import("./pages/examples/DatavizPeopleExamplePage"))
const DistantReadingExamplePage = lazy(() => import("./pages/examples/DistantReadingExamplePage"))
const WorldOfFunnelsExamplePage = lazy(() => import("./pages/examples/WorldOfFunnelsExamplePage"))
const WhatTheMachineSeesExamplePage = lazy(
  () => import("./pages/examples/WhatTheMachineSeesExamplePage"),
)
const SemioticArchitectureExamplePage = lazy(
  () => import("./pages/examples/SemioticArchitectureExamplePage"),
)
const OctopusMetaphorExamplePage = lazy(() => import("./pages/examples/OctopusMetaphorExamplePage"))
const GestaltPrinciplesExamplePage = lazy(
  () => import("./pages/examples/GestaltPrinciplesExamplePage"),
)
const SemioticStandardExamplePage = lazy(
  () => import("./pages/examples/SemioticStandardExamplePage"),
)
const DataVizForDummiesExamplePage = lazy(
  () => import("./pages/examples/DataVizForDummiesExamplePage"),
)
const DataVizForDummiesTwoExamplePage = lazy(
  () => import("./pages/examples/DataVizForDummiesTwoExamplePage"),
)
const DataVizForDummiesThreeExamplePage = lazy(
  () => import("./pages/examples/DataVizForDummiesThreeExamplePage"),
)
const DataVizForDummiesFourExamplePage = lazy(
  () => import("./pages/examples/DataVizForDummiesFourExamplePage"),
)
const DataVizForDummiesFiveExamplePage = lazy(
  () => import("./pages/examples/DataVizForDummiesFiveExamplePage"),
)
const DataVizForDummiesSixExamplePage = lazy(
  () => import("./pages/examples/DataVizForDummiesSixExamplePage"),
)
const MobileDataVisualizationExamplePage = lazy(
  () => import("./pages/examples/MobileDataVisualizationExamplePage"),
)
const NetworkVizExamplePage = lazy(() => import("./pages/examples/NetworkVizExamplePage"))
const OregonTrailExamplePage = lazy(() => import("./pages/examples/OregonTrailExamplePage"))
const EarthquakesExamplePage = lazy(() => import("./pages/examples/EarthquakesExamplePage"))
const EuropaLanguagesExamplePage = lazy(() => import("./pages/examples/EuropaLanguagesExamplePage"))
const EXAMPLE_PAGE_COMPONENTS_BY_SOURCE_FILE = Object.freeze({
  "LivingLedgerExamplePage.jsx": LivingLedgerExamplePage,
  "UkraineWarHistoryExamplePage.jsx": UkraineWarHistoryExamplePage,
  "InsightForgeExamplePage.jsx": InsightForgeExamplePage,
  "AnalystAdventureExamplePage.jsx": AnalystAdventureExamplePage,
  "SentenceStructureExamplePage.jsx": SentenceStructureExamplePage,
  "DebateConceptCrucibleExamplePage.jsx": DebateConceptCrucibleExamplePage,
  "LDATopicCrucibleExamplePage.jsx": LDATopicCrucibleExamplePage,
  "WatermarksExamplePage.jsx": WatermarksExamplePage,
  "StakeholderJourneyExamplePage.jsx": StakeholderJourneyExamplePage,
  "MergePressureExamplePage.jsx": MergePressureExamplePage,
  "NimbyExamplePage.jsx": NimbyExamplePage,
  "ClimateRadialWeatherExamplePage.jsx": ClimateRadialWeatherExamplePage,
  "LakeTravisIsotypeExamplePage.jsx": LakeTravisIsotypeExamplePage,
  "HotDogContestVariationsExamplePage.jsx": HotDogContestVariationsExamplePage,
  "DataCentersIsotypeExamplePage.jsx": DataCentersIsotypeExamplePage,
  "TheGridExamplePage.jsx": TheGridExamplePage,
  "CreativeContoursExamplePage.jsx": CreativeContoursExamplePage,
  "SometimesDiscreteExamplePage.jsx": SometimesDiscreteExamplePage,
  "WhereYouDrawTheLineExamplePage.jsx": WhereYouDrawTheLineExamplePage,
  "USWarTimelineExamplePage.jsx": USWarTimelineExamplePage,
  "ArtMovementGenealogyExamplePage.jsx": ArtMovementGenealogyExamplePage,
  "ParisIsometricLandmarksExamplePage.jsx": ParisIsometricLandmarksExamplePage,
  "UrineWheelExamplePage.jsx": UrineWheelExamplePage,
  "ErieRailroadOrganizationExamplePage.jsx": ErieRailroadOrganizationExamplePage,
  "WikipediaRealtimeExamplePage.jsx": WikipediaRealtimeExamplePage,
  "LocalGovernmentExplorerExamplePage.jsx": LocalGovernmentExplorerExamplePage,
  "PortCongestionReplayExamplePage.jsx": PortCongestionReplayExamplePage,
  "ScrollYoureTellingExamplePage.jsx": ScrollYoureTellingExamplePage,
  "DatavizPeopleExamplePage.jsx": DatavizPeopleExamplePage,
  "DistantReadingExamplePage.jsx": DistantReadingExamplePage,
  "WorldOfFunnelsExamplePage.jsx": WorldOfFunnelsExamplePage,
  "WhatTheMachineSeesExamplePage.jsx": WhatTheMachineSeesExamplePage,
  "SemioticArchitectureExamplePage.jsx": SemioticArchitectureExamplePage,
  "OctopusMetaphorExamplePage.jsx": OctopusMetaphorExamplePage,
  "ClimateAnomalyExamplePage.jsx": ClimateAnomalyExamplePage,
  "GestaltPrinciplesExamplePage.jsx": GestaltPrinciplesExamplePage,
  "SemioticStandardExamplePage.jsx": SemioticStandardExamplePage,
  "DataVizForDummiesExamplePage.jsx": DataVizForDummiesExamplePage,
  "DataVizForDummiesTwoExamplePage.jsx": DataVizForDummiesTwoExamplePage,
  "DataVizForDummiesThreeExamplePage.jsx": DataVizForDummiesThreeExamplePage,
  "DataVizForDummiesFourExamplePage.jsx": DataVizForDummiesFourExamplePage,
  "DataVizForDummiesFiveExamplePage.jsx": DataVizForDummiesFiveExamplePage,
  "DataVizForDummiesSixExamplePage.jsx": DataVizForDummiesSixExamplePage,
  "MobileDataVisualizationExamplePage.jsx": MobileDataVisualizationExamplePage,
  "NetworkVizExamplePage.jsx": NetworkVizExamplePage,
  "OregonTrailExamplePage.jsx": OregonTrailExamplePage,
  "EarthquakesExamplePage.jsx": EarthquakesExamplePage,
  "EuropaLanguagesExamplePage.jsx": EuropaLanguagesExamplePage,
})

// ExampleDefinition owns route paths and source-file identity. The lazy
// component imports stay explicit so Vite keeps the same code-splitting graph.
const EXAMPLE_ROUTES = EXAMPLE_DEFINITIONS.map((definition) => ({
  path: definition.path.slice(1),
  Component: EXAMPLE_PAGE_COMPONENTS_BY_SOURCE_FILE[definition.sourceFile],
}))
const KpiCardSparklinePage = lazy(() => import("./pages/recipes/KpiCardSparklinePage"))
const TimeSeriesBrushPage = lazy(() => import("./pages/recipes/TimeSeriesBrushPage"))
const NetworkExplorerPage = lazy(() => import("./pages/recipes/NetworkExplorerPage"))
const KstreamsPage = lazy(() => import("./pages/recipes/KstreamsPage"))
const BenchmarkDashboardPage = lazy(() => import("./pages/recipes/BenchmarkDashboardPage"))
const RoslingBubbleChartPage = lazy(() => import("./pages/recipes/RoslingBubbleChartPage"))
const SatellitesInSpacePage = lazy(() => import("./pages/recipes/SatellitesInSpacePage"))
const StreamingMigrationMapPage = lazy(() => import("./pages/recipes/StreamingMigrationMapPage"))
const WordTrailsPage = lazy(() => import("./pages/recipes/WordTrailsPage"))
const NetEnsemblePage = lazy(() => import("./pages/recipes/NetEnsemblePage"))
const BlogIndexPage = lazy(() => import("./blog/BlogIndexPage"))
const BlogEntryPage = lazy(() => import("./blog/BlogEntryPage"))
const UsingSSRPage = lazy(() => import("./pages/UsingSSRPage"))
const SSRGalleryPage = lazy(() => import("./pages/SSRGalleryPage"))
const RenderStudioPage = lazy(() => import("./pages/server/RenderStudioPage"))
const ChartClinicPage = lazy(() => import("./pages/server/ChartClinicPage"))
const ThemeShowcasePage = lazy(() => import("./pages/server/ThemeShowcasePage"))
const DashboardGalleryPage = lazy(() => import("./pages/server/DashboardGalleryPage"))
const EmailPreviewPage = lazy(() => import("./pages/server/EmailPreviewPage"))
const ExportPage = lazy(() => import("./pages/server/ExportPage"))
const LineChartPlayground = lazy(() => import("./pages/playground/LineChartPlayground"))
const BarChartPlayground = lazy(() => import("./pages/playground/BarChartPlayground"))
const ScatterplotPlayground = lazy(() => import("./pages/playground/ScatterplotPlayground"))
const ConnectedScatterplotPlayground = lazy(
  () => import("./pages/playground/ConnectedScatterplotPlayground"),
)
const OrbitDiagramPlayground = lazy(() => import("./pages/playground/OrbitDiagramPlayground"))
const ForceDirectedGraphPlayground = lazy(
  () => import("./pages/playground/ForceDirectedGraphPlayground"),
)
const SankeyDiagramPlayground = lazy(() => import("./pages/playground/SankeyDiagramPlayground"))
const StreamingSankeyPlayground = lazy(() => import("./pages/playground/StreamingSankeyPlayground"))
const RealtimeLineChartPlayground = lazy(
  () => import("./pages/playground/RealtimeLineChartPlayground"),
)
const RealtimeHistogramPlayground = lazy(
  () => import("./pages/playground/RealtimeHistogramPlayground"),
)
const BubbleChartPlayground = lazy(() => import("./pages/playground/BubbleChartPlayground"))
const StackedAreaChartPlayground = lazy(
  () => import("./pages/playground/StackedAreaChartPlayground"),
)
const DonutChartPlayground = lazy(() => import("./pages/playground/DonutChartPlayground"))
const TreemapPlayground = lazy(() => import("./pages/playground/TreemapPlayground"))
const CirclePackPlayground = lazy(() => import("./pages/playground/CirclePackPlayground"))
const StatisticalAnnotationsPlayground = lazy(
  () => import("./pages/playground/StatisticalAnnotationsPlayground"),
)
const ForecastPlayground = lazy(() => import("./pages/playground/ForecastPlayground"))
const ChoroplethMapPlayground = lazy(() => import("./pages/playground/ChoroplethMapPlayground"))
const DistanceCartogramPlayground = lazy(
  () => import("./pages/playground/DistanceCartogramPlayground"),
)
const AnimationPlayground = lazy(() => import("./pages/playground/AnimationPlayground"))
const PhysicsFrameSandboxPage = lazy(() => import("./pages/dev/PhysicsFrameSandboxPage"))

const semioticLogo = new URL("../public/assets/img/semiotic.png", import.meta.url).href
const semioticLogoDark = new URL("../public/assets/img/semiotic-darkmode.png", import.meta.url).href

function NotFoundPage() {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <h1>404 — Page Not Found</h1>
      <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <p style={{ marginTop: "24px" }}>
        <Link to="/" style={{ color: "var(--accent)" }}>
          Back to home
        </Link>
      </p>
    </div>
  )
}

function ExamplesRouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        width: "100%",
        maxWidth: 1180,
        minHeight: "60vh",
        margin: "0 auto",
        padding: "72px 28px",
        boxSizing: "border-box",
        color: "var(--text-secondary)",
      }}
    >
      Loading example...
    </div>
  )
}

// Inject JSON-LD structured data dynamically so the HTML build does not parse it as an asset.
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
  const [theme, toggleTheme] = useDocsTheme()

  // Blog routes opt out of the docs decoration. The blog has its own
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
        <Suspense fallback={null}>
          <Routes>
            <Route path="blog" element={<BlogIndexPage />} />
            <Route path="blog/:slug" element={<BlogEntryPage />} />
          </Routes>
        </Suspense>
      </div>
    )
  }

  if (isExamplesRoute) {
    return (
      <div className="App App--examples">
        <Suspense fallback={null}>
          <ExamplesLayout>
            <Suspense key={location.pathname} fallback={<ExamplesRouteFallback />}>
              <Routes>
                <Route path="examples" element={<ExamplesOverviewPage />} />
                {EXAMPLE_ROUTES.map(({ path, Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}
              </Routes>
            </Suspense>
          </ExamplesLayout>
        </Suspense>
      </div>
    )
  }

  return (
    <div className="App">
      <header className="docs-top-bar flex">
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
          <Suspense fallback={null}>
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
                <Route
                  path="uncertainty-visualization"
                  element={<UncertaintyVisualizationPage />}
                />
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
                <Route path="word-trails" element={<WordTrailsPage />} />
                <Route path="net-ensemble" element={<NetEnsemblePage />} />
                {/* `minards-map` and `process-vs-classic-sankey` graduated to /blog/. */}
                <Route path="minards-map" element={<Navigate to="/blog/minards-march" replace />} />
                <Route
                  path="process-vs-classic-sankey"
                  element={<Navigate to="/blog/process-sankey-vs-classic-sankey" replace />}
                />
              </Route>

              {/* Blog routes are registered in the early-return branch above
                (`isBlogRoute`) so the docs decoration is stripped. */}

              {/* Internal development sandboxes. These are intentionally not in navData. */}
              <Route path="dev/physics-frame" element={<PhysicsFrameSandboxPage />} />

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
                <Route path="physics-frame" element={<StreamPhysicsFramePage />} />
                {/* StreamXYFrame page removed — content merged into chart pages */}
              </Route>

              {/* Features routes */}
              <Route path="features" element={<Outlet />}>
                <Route path="axes" element={<AxesPage />} />
                <Route path="tooltips" element={<TooltipsPage />} />
                <Route path="interaction" element={<InteractionPage />} />
                <Route path="controls" element={<VisualizationControlsPage />} />
                <Route path="responsive" element={<ResponsivePage />} />
                <Route path="composition" element={<CompositionPage />} />
                <Route path="small-multiples" element={<SmallMultiplesPage />} />
                <Route path="linked-charts" element={<SmallMultiplesPage />} />
                <Route path="legends" element={<LegendsPage />} />
                <Route path="style-rules" element={<StyleRulesPage />} />
                <Route path="realtime-encoding" element={<RealtimeEncodingPage />} />
                <Route path="motion-encodings" element={<MotionEncodingsPage />} />
                <Route path="physics-encoding" element={<PhysicsEncodingPage />} />
                <Route path="streaming-aggregation" element={<StreamingAggregationPage />} />
                <Route path="chart-container" element={<ChartContainersPage />} />
                <Route path="chart-states" element={<ChartStatesPage />} />
                <Route path="chart-modes" element={<ChartModesPage />} />
                <Route path="mobile-visualization" element={<MobileVisualizationPage />} />
                <Route path="mobile" element={<Outlet />}>
                  <Route index element={<Navigate to="/features/mobile-visualization" replace />} />
                  <Route path="controls" element={<MobileControlsPage />} />
                  <Route path="recipes" element={<MobileRecipesPage />} />
                </Route>
                <Route path="streaming-system-model" element={<StreamingSystemModelPage />} />
                <Route path="performance" element={<PerformancePage />} />
                <Route path="push-api" element={<PushApiPage />} />
                <Route path="when-physics" element={<WhenPhysicsPage />} />
                <Route path="physics-process-guide" element={<PhysicsProcessGuidePage />} />
                <Route
                  path="gofish-layouts"
                  element={<Navigate to="/interoperability/gofish" replace />}
                />
                <Route
                  path="custom-charts"
                  element={<Navigate to="/custom-charts/overview" replace />}
                />
              </Route>

              {/* Custom Charts — first-class section (the escape-hatch HOCs + recipe
                kit). Moved out of Features; old /features/custom-charts redirects above. */}
              <Route path="custom-charts" element={<Outlet />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<CustomChartsOverviewPage />} />
                <Route path="intelligence" element={<CustomChartsIntelligencePage />} />
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
                <Route path="anchoring-complex-charts" element={<AnchoringComplexChartsPage />} />
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
                <Route
                  path="vega-lite"
                  element={<Navigate to="/interoperability/vega-lite" replace />}
                />
                <Route
                  path="portability-spec"
                  element={<Navigate to="/interoperability/portability-spec" replace />}
                />
                <Route
                  path="observable-plot"
                  element={<Navigate to="/interoperability/observable-plot" replace />}
                />
                <Route
                  path="data-quality-bridge"
                  element={<Navigate to="/interoperability/data-quality-bridge" replace />}
                />
                <Route
                  path="generative-ui"
                  element={<Navigate to="/interoperability/generative-ui" replace />}
                />
              </Route>

              {/* Interoperability — adapters + the portability schema, one coherent home. */}
              <Route path="interoperability" element={<Outlet />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<InteroperabilityPage />} />
                <Route path="portability-spec" element={<PortabilitySpecPage />} />
                <Route path="vega-lite" element={<VegaLiteTranslatorPage />} />
                <Route path="observable-plot" element={<ObservablePlotPage />} />
                <Route path="flint-chart" element={<FlintChartAdapterPage />} />
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
              <Route path="server/chart-clinic" element={<ChartClinicPage />} />
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
                {/* Physics Charts */}
                <Route path="galton-board-chart" element={<GaltonBoardChartPage />} />
                <Route path="event-drop-chart" element={<EventDropChartPage />} />
                <Route path="physics-pile-chart" element={<PhysicsPileChartPage />} />
                <Route path="collision-swarm-chart" element={<CollisionSwarmChartPage />} />
                <Route path="physical-flow-chart" element={<PhysicalFlowChartPage />} />
                <Route path="process-flow-chart" element={<ProcessFlowChartPage />} />
                <Route path="gauntlet-chart" element={<GauntletChartPage />} />
                <Route path="crucible-chart" element={<CrucibleChartPage />} />
                <Route path="physics-custom-chart" element={<PhysicsCustomChartPage />} />
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
          </Suspense>
        </div>
      </div>
    </div>
  )
}
