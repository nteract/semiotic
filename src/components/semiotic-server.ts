export {
  renderToStaticSVG,
  renderXYToStaticSVG,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG,
  renderGeoToStaticSVG,
  renderChart,
  renderChartWithEvidence,
  renderToImage,
  renderDashboard,
} from "./server/renderToStaticSVG"

export type { RenderEvidence } from "./server/renderEvidence"

export type {
  RenderToImageOptions,
  DashboardChart,
  DashboardLayout,
  RenderDashboardOptions,
} from "./server/renderToStaticSVG"
export type { LegendLayout } from "./types/legendTypes"

export { renderToAnimatedGif, generateFrameSVGs, generateFrameSequence } from "./server/animatedGif"
export type { AnimatedGifOptions } from "./server/animatedGif"

export { resolveTheme, themeStyles } from "./server/themeResolver"
export type { ThemeInput } from "./server/themeResolver"
