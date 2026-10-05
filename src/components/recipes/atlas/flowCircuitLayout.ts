import * as React from "react"
import type { Datum } from "../../charts/shared/datumTypes"
import type { PhysicsCustomLayout, PhysicsCustomLayoutContext, PhysicsCustomLayoutResult } from "../../charts/physics/PhysicsCustomChart"
import type { NetworkCustomLayout, NetworkLayoutResult } from "../../stream/networkCustomLayout"
import type { NetworkSceneEdge } from "../../stream/networkTypes"
import { NetworkPerspectiveGround } from "../../stream/networkPerspectivePlacement"
import { processLaneWalls } from "../processPhysics"
import { mulberry32 as seededRandom } from "../random"
import { layoutFlowCircuit, circuitRoutePoint } from "./flowCircuitGeometry"
import {
  resolveCircuitColors,
  type CircuitColors,
  circuitNumber,
  circuitModuleChrome,
  circuitHistoryChrome
} from "./flowCircuitChrome"
import type {
  FlowCircuitProjection,
  CircuitEdition,
  CircuitReading,
  CircuitSelection
} from "./flowCircuitTypes"
import {
  circuitModuleDatum,
  circuitSemanticItems
} from "./flowCircuitSemantics"
import type { CustomLayoutSelection } from "../../stream/customLayoutSelection"

export interface FlowCircuitLayoutConfig {
  layoutSelection?: CustomLayoutSelection | null
  colors?: Partial<CircuitColors>
  circuit: FlowCircuitProjection
  edition: CircuitEdition
  reading: CircuitReading
  selection?: CircuitSelection
  particleBudget?: number
  placementSeed?: number
  reducedMotion?: boolean
  highlightedEdgeIds?: string[]
}

const h = React.createElement

/** Fixed apparatus and source-backed chrome over the existing physics frame. */
export const flowCircuitLayout: PhysicsCustomLayout<
  { id: string },
  FlowCircuitLayoutConfig
> = (ctx) => buildCircuit(ctx, false)

/** The same fixed apparatus through the network projection and hit-test stage. */
export const flowCircuitNetworkLayout: NetworkCustomLayout<FlowCircuitLayoutConfig> = (ctx) => buildCircuit(ctx, true)

type CircuitContext = Pick<PhysicsCustomLayoutContext<{ id: string }, FlowCircuitLayoutConfig>, "config" | "dimensions" | "theme">
function buildCircuit(ctx: CircuitContext, network: true): NetworkLayoutResult
function buildCircuit(ctx: CircuitContext, network: false): PhysicsCustomLayoutResult
function buildCircuit(ctx: CircuitContext, network: boolean): NetworkLayoutResult | PhysicsCustomLayoutResult {
  const { circuit, edition, reading, selection } = ctx.config
  if (
    reading.editionId !== edition.id ||
    edition.analysisRevision !== circuit.atlas.analysisRevision
  )
    throw new Error(
      "Circuit render inputs must share an edition and analysis revision"
    )
  const geometry = layoutFlowCircuit(
    circuit,
    ctx.dimensions.width,
    ctx.dimensions.height
  )
  const text = ctx.theme.semantic.text ?? "#273442"
  const surface = ctx.theme.semantic.surface ?? "#fff"
  const circuitColors = resolveCircuitColors(
    ctx.theme.semantic,
    ctx.config.colors
  )
  const color =
    edition.kind === "modeled" ? circuitColors.modeled : circuitColors.observed
  // Physics graphics occupy an HTML layer; each overlay owns its SVG shell.
  const overlayProps = {
    width: geometry.width,
    height: geometry.height,
    viewBox: `0 0 ${geometry.width} ${geometry.height}`,
    style: {
      position: "absolute" as const,
      inset: 0,
      pointerEvents: "none" as const
    },
    "aria-hidden": true
  }
  const selected =
    selection?.analysisRevision === circuit.atlas.analysisRevision &&
    selection.relationScopeId === "directed-admitted"
      ? selection.nodeId
      : undefined
  const maxFlow =
    reading.entry.flows.reduce(
      (max, flow) => Math.max(max, flow.perSecond ?? 0),
      0
    ) || 1
  const flows = new Map(reading.entry.flows.map((flow) => [flow.edgeId, flow]))
  const moduleData = new Map(
    circuit.modules.map((module) => [
      module.nodeId,
      circuitModuleDatum(circuit, edition, reading, module)
    ])
  )
  const nodeOpacity = (id: string) =>
    ctx.config.layoutSelection?.isActive &&
    !ctx.config.layoutSelection.predicate(moduleData.get(id)!)
      ? 0.2
      : 1
  const budget = Math.max(
    0,
    Math.min(200, Math.floor(ctx.config.particleBudget ?? 24))
  )
  const random = seededRandom(ctx.config.placementSeed ?? 1)
  const activeRoutes = geometry.routes.filter(
    (route) => (flows.get(route.edgeId)?.perSecond ?? 0) > 0
  )
  const particles = ctx.config.reducedMotion
    ? []
    : Array.from({ length: activeRoutes.length ? budget : 0 }, (_, index) => {
        const route = activeRoutes[index % activeRoutes.length]
        const point = circuitRoutePoint(
          route.points,
          (random() + reading.requestedTime / 10) % 1
        )
        return h("circle", {
          key: `cue:${index}`,
          cx: point.x,
          cy: point.y,
          r: 2.3,
          fill: text,
          opacity: Math.max(
            nodeOpacity(route.source),
            nodeOpacity(route.target)
          ),
          "data-circuit-particle": route.edgeId
        })
      })
  const bodies = geometry.modules.map((region) => ({
    id: region.module.nodeId,
    x: region.x + region.width / 2,
    y: region.y + region.height / 2,
    fixedPosition: {
      x: region.x + region.width / 2,
      y: region.y + region.height / 2
    },
    shape: {
      type: "aabb" as const,
      width: region.width,
      height: region.height
    },
    bodyCollisions: false,
    datum: circuitModuleDatum(circuit, edition, reading, region.module)
  }))
  const sceneEdges: NetworkSceneEdge[] = []
  const semanticItems = circuitSemanticItems(circuit, geometry, edition, reading)
  const semanticById = network ? new Map(semanticItems.map((item) => [item.id, item])) : null
  const result: PhysicsCustomLayoutResult = {
    bodies,
    config: {
      kernel: {
        gravity: { x: 0, y: 0 },
        seed: ctx.config.placementSeed ?? 1,
        sleepAfter: 0.01
      },
      bodyBudget: false,
      bodyLimit: bodies.length,
      eviction: false,
      sediment: false,
      settleStepLimit: 4
    },
    bodyStyle: (body) => ({
      fill: surface,
      stroke: circuitColors.muted,
      strokeWidth: 1,
      opacity: nodeOpacity(body.id)
    }),
    colliders: geometry.modules.flatMap((region) =>
      processLaneWalls({
        idPrefix: `queue:${region.module.nodeId}`,
        left: region.queue.x,
        right: region.queue.x + region.queue.width,
        top: region.queue.y,
        bottom: region.queue.y + region.queue.height,
        thickness: 1,
        openEnds: true
      })
    ),
    sensors: geometry.modules.map((region) => ({
      id: `sensor:${region.module.nodeId}`,
      shape: {
        type: "aabb" as const,
        x: region.sensor.x + region.sensor.width / 2,
        y: region.sensor.y + region.sensor.height / 2,
        width: region.sensor.width,
        height: region.sensor.height
      }
    })),
    semanticItems,
    backgroundOverlays: h(
      "svg",
      overlayProps,
      ...geometry.routes.map((route) => {
        const flow = flows.get(route.edgeId)!
        const end = route.points[route.points.length - 1]
        const previous = route.points[route.points.length - 2]
        // Label the less crowded endpoint (e.g. each partition's outlet,
        // rather than eight labels stacked at the shared output manifold).
        const source = geometry.modules.find(
          (region) => region.module.nodeId === route.source
        )!
        const target = geometry.modules.find(
          (region) => region.module.nodeId === route.target
        )!
        const labelAtSource =
          source.module.ports.filter((port) => port.direction === "out")
            .length <
          target.module.ports.filter((port) => port.direction === "in").length
        const labelPoint = labelAtSource ? route.points[0] : end
        const labelOnRight = labelAtSource
          ? labelPoint.x >= source.x + source.width
          : labelPoint.x > target.x
        const angle =
          (Math.atan2(end.y - previous.y, end.x - previous.x) * 180) / Math.PI
        const highlighted = ctx.config.highlightedEdgeIds?.includes(
          route.edgeId
        )
        const stroke = highlighted
          ? text
          : route.residual
            ? circuitColors.residual
            : color
        const unit =
          flow.unit === "records"
            ? "rec"
            : flow.unit === "attempts"
              ? "att"
              : "roots"
        if (network) {
          const semantic = semanticById!.get(`pipe:${route.edgeId}`)!
          sceneEdges.push({
            type: "curved", pathD: route.pathD, datum: semantic.datum as Datum,
            id: route.edgeId, label: semantic.label,
            accessibility: { label: `${semantic.label}. ${semantic.description}` },
            style: {
              stroke,
              strokeWidth: flow.perSecond === null ? 1.5 : 1 + (flow.perSecond / maxFlow) * 7,
              strokeDasharray: flow.perSecond === null ? "4 3" : undefined,
              fill: "none",
              opacity: (flow.perSecond === 0 ? 0.35 : 0.75) * Math.max(nodeOpacity(route.source), nodeOpacity(route.target))
            }
          })
        }
        return h(
          "g",
          {
            key: route.edgeId,
            "data-circuit-edge": route.edgeId,
            opacity: Math.max(
              nodeOpacity(route.source),
              nodeOpacity(route.target)
            ),
            "data-source": route.source,
            "data-target": route.target,
            "data-flow": flow.perSecond ?? "unmeasured",
            "data-highlighted": highlighted || undefined,
            "data-unit": `${flow.unit}/s`
          },
          h(
            "title",
            null,
            `${route.edgeId}: ${route.source} → ${route.target}; ${flow.perSecond ?? "unmeasured"} ${flow.unit}/s`
          ),
          !network && h("path", {
            d: route.pathD,
            stroke,
            strokeWidth:
              flow.perSecond === null
                ? 1.5
                : 1 + (flow.perSecond / maxFlow) * 7,
            strokeDasharray: flow.perSecond === null ? "4 3" : undefined,
            strokeLinejoin: "round",
            fill: "none",
            opacity: flow.perSecond === 0 ? 0.35 : 0.75
          }),
          h("path", {
            d: "M-5,-3 L0,0 L-5,3",
            transform: `translate(${end.x},${end.y}) rotate(${angle})`,
            fill: "none",
            stroke
          }),
          h(
            "text",
            {
              x: labelPoint.x + (labelOnRight ? 5 : -5),
              y: labelPoint.y - 7,
              textAnchor: labelOnRight ? "start" : "end",
              fontSize: 8,
              fill: text
            },
            `${flow.perSecond === null ? "?" : circuitNumber(flow.perSecond)} ${unit}/s`
          )
        )
      })
    ),
    overlays: h(
      "svg",
      {
        ...overlayProps,
        "data-circuit-edition": edition.kind,
        "data-circuit-time": reading.observedAt
      },
      ...geometry.sections.map((section) =>
        h(
          "text",
          {
            key: section.id,
            x: section.x,
            y: 43,
            textAnchor: "middle",
            fontSize: 11,
            fill: text
          },
          section.id
        )
      ),
      ...circuitModuleChrome(
        geometry,
        reading,
        color,
        text,
        selected,
        circuitColors,
        nodeOpacity
      ),
      ...particles,
      circuitHistoryChrome(geometry, edition, reading, color, text, selected),
      h(
        "text",
        {
          x: geometry.width / 2,
          y: geometry.height - 8,
          textAnchor: "middle",
          fontSize: 9,
          fill: text
        },
        `${edition.kind === "modeled" ? "Modeled" : "Observed"} · ${reading.observedAt}s · pipe width = transferred volume/s · individual timings unavailable`
      )
    )
  }
  if (!network) return result
  // Physics overlays own SVG shells; the network host already owns its SVG.
  const contents = (node: React.ReactNode) => (node as React.ReactElement<{ children: React.ReactNode }>).props.children
  return {
    sceneNodes: bodies.map((body) => {
      const semantic = semanticById!.get(body.id)!
      return {
        type: "rect", id: body.id, x: body.x - body.shape.width / 2, y: body.y - body.shape.height / 2,
        w: body.shape.width, h: body.shape.height, datum: body.datum,
        label: semantic.label, accessibility: { label: `${semantic.label}. ${semantic.description}` },
        style: { fill: surface, stroke: circuitColors.muted, strokeWidth: 1, opacity: nodeOpacity(body.id) }
      }
    }),
    sceneEdges,
    overlays: h(NetworkPerspectiveGround, { z: "top" }, contents(result.backgroundOverlays), contents(result.overlays)),
    perspective: "manual",
    perspectiveBounds: [{ x: 0, y: 0, width: geometry.width, height: geometry.height, z: "top" }]
  }
}
