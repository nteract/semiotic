export {
  renderToStaticSVG,
  renderXYToStaticSVG,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG,
  renderGeoToStaticSVG,
  renderChart,
  renderChartWithEvidence,
  renderDashboard,
} from "./server/renderToStaticSVG"

export { generateFrameSVGs, generatePhysicsFrameSVGs, generateFrameSequence } from "./server/animatedGif"

export type { RenderEvidence } from "./server/renderEvidence"

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
