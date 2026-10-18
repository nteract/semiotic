export {
  renderToStaticSVG,
  renderXYToStaticSVG,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG,
  renderGeoToStaticSVG,
  renderChart,
  renderChartWithEvidence,
  renderDashboard,
  serializeSvgPrecision,
} from "./server/renderToStaticSVG"
export type { RenderChartName, RenderChartOptions } from "./server/renderToStaticSVG"
export { exportNetworkViewSVG } from "./server/exportNetworkViewSVG"
export type { ExportNetworkViewSVGOptions } from "./server/exportNetworkViewSVG"

export { generateFrameSVGs, generatePhysicsFrameSVGs, generateFrameSequence } from "./server/animatedGif"

export type { RenderEvidence, SemanticViabilityStatus } from "./server/renderEvidence"

export type {
  DashboardChart,
  DashboardLayout,
  RenderDashboardOptions,
} from "./server/renderToStaticSVG"
export type {
  CategoricalLegendConfig,
  GradientLegendConfig,
  GradientLegendValue,
  LegendGroup,
  LegendItem,
  LegendLayout,
  LegendValue,
} from "./types/legendTypes"
export type {
  AnimatedGifOptions,
  PhysicsGifFrameProps,
  PhysicsGifOptions,
} from "./server/animatedGif"

export { resolveTheme, themeStyles } from "./server/themeResolver"
export type { ThemeInput } from "./server/themeResolver"
