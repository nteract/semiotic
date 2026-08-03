import type { BezierCache } from "../../../stream/networkTypes"
import type {
  BandGradientStub,
  ProcessSankeyBandSpec,
  ProcessSankeyRibbonSpec,
} from "./streamingLayout"

export type ProcessSankeyOrientation = "horizontal" | "vertical"

// ProcessSankey emits only absolute M/L/C coordinates, always as comma-
// separated pairs. Swapping every pair is therefore equivalent to projecting
// logical (time, lane) coordinates into screen (lane, time) coordinates. Keep
// this at the scene boundary so layout, ordering, and conservation stay
// orientation-independent.
const COORDINATE_PAIR = /(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?),(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/gi

export function transposeProcessSankeyPath(pathD: string): string {
  return pathD.replace(COORDINATE_PAIR, (_match, x: string, y: string) => `${y},${x}`)
}

function transposeBezier(bezier: BezierCache | undefined): BezierCache | undefined {
  if (!bezier) return undefined
  const transposePoint = (point: { x: number; y: number }) => ({ x: point.y, y: point.x })
  return {
    ...bezier,
    ...(bezier.points && {
      points: bezier.points.map(transposePoint) as NonNullable<BezierCache["points"]>,
    }),
    ...(bezier.segments && {
      segments: bezier.segments.map((segment) =>
        segment.map(transposePoint) as NonNullable<BezierCache["segments"]>[number],
      ),
    }),
  }
}

function transposeGradientStub(stub: BandGradientStub): BandGradientStub {
  return {
    ...stub,
    pathD: transposeProcessSankeyPath(stub.pathD),
    y0: stub.x0,
    y1: stub.x1,
    x0: 0,
    x1: 0,
  }
}

export function orientProcessSankeyBand(
  band: ProcessSankeyBandSpec,
  orientation: ProcessSankeyOrientation,
): ProcessSankeyBandSpec {
  if (orientation === "horizontal") return band
  return {
    ...band,
    pathD: transposeProcessSankeyPath(band.pathD),
    gradientStubs: band.gradientStubs?.map(transposeGradientStub),
    labelX: band.labelY,
    labelY: band.labelX,
    labelAnchor: "middle",
    labelBaseline: "auto",
  }
}

export function orientProcessSankeyRibbon(
  ribbon: ProcessSankeyRibbonSpec,
  orientation: ProcessSankeyOrientation,
): ProcessSankeyRibbonSpec {
  if (orientation === "horizontal") return ribbon
  return {
    ...ribbon,
    pathD: transposeProcessSankeyPath(ribbon.pathD),
    bezier: transposeBezier(ribbon.bezier),
  }
}
