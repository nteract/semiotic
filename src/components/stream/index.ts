export { default as StreamXYFrame } from "./StreamXYFrame"
export { SVGOverlay } from "./SVGOverlay"
export { DataSourceAdapter } from "./DataSourceAdapter"
export { PipelineStore } from "./PipelineStore"
export { findNearestNode, findNearestIndex } from "./CanvasHitTester"

// Renderers
export { lineCanvasRenderer } from "./renderers/lineCanvasRenderer"
export { areaCanvasRenderer } from "./renderers/areaCanvasRenderer"
export { pointCanvasRenderer } from "./renderers/pointCanvasRenderer"
export { barCanvasRenderer } from "./renderers/barCanvasRenderer"
export { swarmCanvasRenderer } from "./renderers/swarmCanvasRenderer"
export { waterfallCanvasRenderer } from "./renderers/waterfallCanvasRenderer"
export { heatmapCanvasRenderer } from "./renderers/heatmapCanvasRenderer"

// Types
export type {
  StreamXYFrameProps,
  StreamXYFrameHandle,
  StreamChartType,
  RuntimeMode,
  SceneNode,
  LineSceneNode,
  AreaSceneNode,
  PointSceneNode,
  RectSceneNode,
  HeatcellSceneNode,
  Changeset,
  StreamScales,
  StreamLayout,
  CurveType,
  CanvasRendererFn,
  Style
} from "./types"

export type { StreamRendererFn } from "./renderers/types"
export type { HitResult } from "./CanvasHitTester"
export type { PipelineConfig } from "./PipelineStore"
