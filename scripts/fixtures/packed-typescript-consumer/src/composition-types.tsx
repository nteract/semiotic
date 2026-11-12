import type { AnnotationContext, HoverData } from "semiotic"
import type {
  FrameGraphicsContext,
  FrameGraphicsProp,
  InteractiveGraphicsContext,
  InteractiveGraphicsProp,
  StreamXYFrameProps
} from "semiotic/xy"
import type {
  FrameGraphicsContext as OrdinalGraphicsContext,
  FrameGraphicsProp as OrdinalGraphicsProp,
  InteractiveGraphicsContext as OrdinalInteractiveContext,
  InteractiveGraphicsProp as OrdinalInteractiveProp,
  OrdinalScales,
  StreamOrdinalFrameProps
} from "semiotic/ordinal"
import type {
  FrameGraphicsContext as NetworkGraphicsContext,
  FrameGraphicsProp as NetworkGraphicsProp,
  NetworkCustomLayout,
  NetworkLayoutContext,
  NetworkLayoutResult,
  NetworkSceneNode,
  NetworkSceneEdge,
  StreamNetworkFrameProps
} from "semiotic/network"
import type {
  FrameGraphicsContext as GeoGraphicsContext,
  FrameGraphicsProp as GeoGraphicsProp,
  GeoScales,
  StreamGeoFrameProps
} from "semiotic/geo"
import type {
  FrameGraphicsProp as PhysicsGraphicsProp,
  StreamPhysicsFrameProps
} from "semiotic/physics"
import {
  transitDiagramLayout,
  type TransitDiagramConfig,
  type TransitDiagramStationRenderInfo
} from "semiotic/recipes/core"
import type { TransitDiagramConfig as RecipeTransitConfig } from "semiotic/recipes"

// Reusable callbacks can name their contexts without deep imports or copied
// interfaces. Null scales before the first layout are part of the contract.
export const xyGraphics: FrameGraphicsProp = (ctx: FrameGraphicsContext) => (
  <text x={ctx.scales?.x(1) ?? 0} y={ctx.scales?.y(2) ?? 0}>
    XY
  </text>
)
export const ordinalGraphics: OrdinalGraphicsProp<OrdinalScales> = (
  ctx: OrdinalGraphicsContext<OrdinalScales>
) => (
  <text x={ctx.scales?.o("A") ?? 0} y={ctx.scales?.r(2) ?? 0}>
    Ordinal
  </text>
)
export const networkGraphics: NetworkGraphicsProp<null> = (
  ctx: NetworkGraphicsContext<null>
) => (
  <text x={ctx.size[0] / 2} y={ctx.margin.top}>
    Network
  </text>
)
export const geoGraphics: GeoGraphicsProp<GeoScales> = (
  ctx: GeoGraphicsContext<GeoScales>
) => <text x={ctx.scales?.projection([0, 0])?.[0] ?? 0}>Map</text>
export const physicsGraphics: PhysicsGraphicsProp = ({ size, margin }) => (
  <text x={size[0] - margin.right}>Physics</text>
)

export const interactive: InteractiveGraphicsProp = (
  ctx: InteractiveGraphicsContext
) => (
  <circle
    r={5}
    onPointerMove={(event) => {
      const point = ctx.pointerToPlot(event)
      if (point) ctx.scales?.x.invert(point.x)
    }}
  />
)
export const ordinalInteractive: OrdinalInteractiveProp<OrdinalScales> = (
  ctx: OrdinalInteractiveContext<OrdinalScales>
) => (
  <circle
    r={5}
    onPointerMove={(event) => {
      const point = ctx.pointerToPlot(event)
      if (point) ctx.scales?.r.invert(point.y)
    }}
  />
)

export const xyCallbacks = {
  foregroundGraphics: xyGraphics,
  interactiveGraphics: interactive,
  tooltipContent: (hover: HoverData) => <span>{hover.x}</span>,
  svgAnnotationRules: (_annotation, _index, context: AnnotationContext) => (
    <text x={context.scales?.x?.(1) ?? 0}>Annotation</text>
  )
} satisfies Partial<StreamXYFrameProps>
export const ordinalCallbacks = {
  foregroundGraphics: ordinalGraphics,
  interactiveGraphics: ordinalInteractive
} satisfies Partial<StreamOrdinalFrameProps>
export const networkCallbacks = {
  foregroundGraphics: networkGraphics
} satisfies Partial<StreamNetworkFrameProps>
export const geoCallbacks = {
  backgroundGraphics: geoGraphics
} satisfies Partial<StreamGeoFrameProps>
export const physicsCallbacks = {
  foregroundGraphics: physicsGraphics
} satisfies Partial<StreamPhysicsFrameProps>

type Config = { radius: number }
// Normalized store inputs remain inferable through the public context; callers
// need not import their internal transition/cache declarations.
type LayoutNode = NetworkLayoutContext<Config>["nodes"][number]
const nodeId = (node: LayoutNode): string => node.id
export const layout: NetworkCustomLayout<Config> = (
  context: NetworkLayoutContext<Config>
): NetworkLayoutResult => {
  const sceneNodes: NetworkSceneNode[] = context.nodes.map((node, i) => ({
    type: "circle",
    id: nodeId(node),
    cx: i * 20,
    cy: 20,
    r: context.config.radius,
    style: { fill: context.resolveColor(node.id) },
    datum: node
  }))
  const sceneEdges: NetworkSceneEdge[] = []
  return { sceneNodes, sceneEdges }
}

const station = (info: TransitDiagramStationRenderInfo) => (
  <circle cx={info.x} cy={info.y} r={info.radius} />
)
export const transitConfig: TransitDiagramConfig = {
  mode: "compact",
  renderStation: station
}
export const sameRecipeConfig: RecipeTransitConfig = transitConfig
export const transit: NetworkCustomLayout<TransitDiagramConfig> =
  transitDiagramLayout

// These would become unused directives if the public shapes degraded to any.
function rejectInvalidInputs(
  ctx: InteractiveGraphicsContext,
  ordinal: OrdinalGraphicsContext<OrdinalScales>
) {
  // @ts-expect-error pointerToPlot requires both client coordinates
  ctx.pointerToPlot({ clientX: 1 })
  // @ts-expect-error the ordinal category scale accepts strings
  ordinal.scales?.o(42)
}
void rejectInvalidInputs
