import type { PhysicsSemanticItem } from "../../stream/physics/StreamPhysicsTypes"
import type {
  CircuitEdition,
  CircuitGeometry,
  CircuitModule,
  CircuitReading,
  FlowCircuitProjection
} from "./flowCircuitTypes"

/** Canonical identity and current tape values shared by pointer and keyboard readers. */
export function circuitModuleDatum(
  circuit: FlowCircuitProjection,
  edition: CircuitEdition,
  reading: CircuitReading,
  module: CircuitModule
) {
  return {
    id: module.nodeId,
    nodeId: module.nodeId,
    kind: "circuit-module",
    moduleKind: module.kind,
    label: module.semantics.label,
    unit: module.semantics.unit,
    sourceRevision: edition.sourceRevision,
    analysisRevision: circuit.atlas.analysisRevision,
    relationScopeId: "directed-admitted",
    editionId: edition.id,
    editionKind: edition.kind,
    synthetic: edition.synthetic,
    mode: reading.mode,
    observedAt: reading.observedAt,
    ...reading.entry.nodes[module.nodeId]
  }
}

const measured = (value: number | null) =>
  value === null ? "unmeasured" : String(value)

/** Exact readings and original pipes remain available beyond decorative SVG chrome. */
export function circuitSemanticItems(
  circuit: FlowCircuitProjection,
  geometry: CircuitGeometry,
  edition: CircuitEdition,
  reading: CircuitReading
): PhysicsSemanticItem[] {
  return [
    ...geometry.modules.map((region) => {
      const datum = circuitModuleDatum(circuit, edition, reading, region.module)
      return {
        id: datum.id,
        bodyId: datum.id,
        datum,
        x: region.x + region.width / 2,
        y: region.y + region.height / 2,
        width: region.width,
        height: region.height,
        shape: "rect" as const,
        label: `${datum.label}: ${datum.moduleKind}`,
        description: `${datum.label}. ${edition.kind} at ${reading.observedAt}s. Arrivals ${measured(datum.arrivals)} ${datum.unit}/s; completions ${measured(datum.completions)} ${datum.unit}/s; installed capacity ${measured(datum.capacity)} ${datum.unit}/s; queue ${measured(datum.queued)} ${datum.unit}. Measurement status: ${datum.status}. Individual timings unavailable.`,
        group: "circuit modules"
      }
    }),
    ...geometry.routes.map((route) => {
      const flow = reading.entry.flows.find(
        (item) => item.edgeId === route.edgeId
      )!
      const point = route.points[Math.floor(route.points.length / 2)]
      return {
        id: `pipe:${route.edgeId}`,
        x: point.x,
        y: point.y,
        shape: "path" as const,
        pathData: route.pathD,
        label: `${route.source} → ${route.target}: ${measured(flow.perSecond)} ${flow.unit}/s`,
        description: `Original edge ${route.edgeId}. ${route.residual ? "Residual link" : "Display backbone"}. ${edition.kind} at ${reading.observedAt}s; transferred volume ${measured(flow.perSecond)} ${flow.unit}/s.`,
        group: "original pipes",
        datum: {
          id: route.edgeId,
          kind: "circuit-pipe",
          source: route.source,
          target: route.target,
          analysisRevision: circuit.atlas.analysisRevision,
          sourceRevision: edition.sourceRevision,
          relationScopeId: "directed-admitted",
          editionId: edition.id,
          editionKind: edition.kind,
          observedAt: reading.observedAt,
          ...flow
        }
      }
    })
  ]
}
