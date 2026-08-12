import type {
  PointSceneNode,
  RectSceneNode,
  SceneDatum,
  SceneNode,
  Style
} from "../types"
import type { PhysicsSettledProjectionRow } from "./PhysicsAccessibility"
import {
  buildPhysicsSettledEvidence,
  type PhysicsSettledEvidence
} from "./PhysicsEvidence"
import type { PhysicsBodyState } from "./PhysicsKernel"
import type {
  PhysicsPipelineSnapshot,
  PhysicsPipelineStore
} from "./PhysicsPipelineStore"

export interface PhysicsSettledSceneOptions {
  maxSteps?: number
  projectionRows?: PhysicsSettledProjectionRow[]
  bodyStyle?:
    | Style
    | ((
        body: PhysicsBodyState,
        context: PhysicsSettledBodyStyleContext
      ) => Style)
  getBodyLabel?: (body: PhysicsBodyState) => string | undefined
  /**
   * Total bodies the chart claims entered. Enables the settled ledger check
   * (see {@link PhysicsSettledEvidence.ledger}); omitted means no ledger.
   */
  charge?: number
}

export interface PhysicsSettledBodyStyleContext {
  index: number
  simulationState: PhysicsPipelineSnapshot["simulationState"]
}

export interface PhysicsSettledScene {
  snapshot: PhysicsPipelineSnapshot
  bodies: PhysicsBodyState[]
  sceneNodes: SceneNode[]
  evidence: PhysicsSettledEvidence
  stepsRun: number
}

const DEFAULT_BODY_STYLE: Style = {
  fill: "#4e79a7",
  stroke: "#172033",
  strokeWidth: 1,
  opacity: 0.85
}

function bodyDatum(body: PhysicsBodyState): SceneDatum {
  return body.datum && typeof body.datum === "object"
    ? (body.datum as SceneDatum)
    : null
}

function bodyLabel(body: PhysicsBodyState): string {
  const datum = body.datum
  if (datum && typeof datum === "object") {
    const record = datum as Record<string, unknown>
    const label = record.label ?? record.name ?? record.id
    if (label != null && label !== "") return String(label)
  }
  return body.id
}

function resolveBodyStyle(
  body: PhysicsBodyState,
  style: PhysicsSettledSceneOptions["bodyStyle"],
  context: PhysicsSettledBodyStyleContext
): Style {
  const nextStyle = typeof style === "function" ? style(body, context) : style
  return { ...DEFAULT_BODY_STYLE, ...(nextStyle ?? {}) }
}

export function physicsBodyToXYSceneNode(
  body: PhysicsBodyState,
  options: Pick<PhysicsSettledSceneOptions, "bodyStyle" | "getBodyLabel"> = {},
  context: PhysicsSettledBodyStyleContext = {
    index: 0,
    simulationState: "settled"
  }
): SceneNode {
  const datum = bodyDatum(body)
  const accessibility = {
    label: options.getBodyLabel?.(body) ?? bodyLabel(body)
  }
  const common = {
    style: resolveBodyStyle(body, options.bodyStyle, context),
    datum,
    accessibleDatum: datum,
    accessibility,
    _transitionKey: body.id
  }

  if (body.shape.type === "aabb") {
    return {
      type: "rect",
      x: body.x - body.shape.width / 2,
      y: body.y - body.shape.height / 2,
      w: body.shape.width,
      h: body.shape.height,
      ...common
    } satisfies RectSceneNode
  }

  return {
    type: "point",
    x: body.x,
    y: body.y,
    r: body.shape.radius,
    pointId: body.id,
    ...common
  } satisfies PointSceneNode
}

export function physicsBodiesToXYSceneNodes(
  bodies: PhysicsBodyState[],
  options: Pick<PhysicsSettledSceneOptions, "bodyStyle" | "getBodyLabel"> = {},
  simulationState: PhysicsPipelineSnapshot["simulationState"] = "settled"
): SceneNode[] {
  return bodies.map((body, index) =>
    physicsBodyToXYSceneNode(body, options, { index, simulationState })
  )
}

export function buildPhysicsSettledScene(
  store: PhysicsPipelineStore,
  options: PhysicsSettledSceneOptions = {}
): PhysicsSettledScene {
  const stepsRun = store.settle(options.maxSteps)
  const bodies = store.readBodies()
  const snapshot = store.snapshot()
  const sceneNodes = physicsBodiesToXYSceneNodes(
    bodies,
    options,
    snapshot.simulationState
  )
  const evidence = buildPhysicsSettledEvidence(snapshot, {
    bodies,
    projectionRows: options.projectionRows,
    stepsRun,
    charge: options.charge
  })

  return {
    snapshot,
    bodies,
    sceneNodes,
    evidence,
    stepsRun
  }
}
