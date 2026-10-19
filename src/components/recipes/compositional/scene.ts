import type {
  NetworkCustomLayout,
  NetworkLayoutResult
} from "../../stream/networkCustomLayout"
import type {
  PreparedCompositionalGraph,
  SolvedCompositionalLayout
} from "./types"
import { fail } from "./identity"
import { compositionalPath } from "./routing"

export interface CompositionalSceneConfig {
  prepared: PreparedCompositionalGraph
  solved: SolvedCompositionalLayout
  showParts?: boolean
  nodeFill?: string
  partFill?: string
  edgeStroke?: string
}

/** Synchronous scene emission only: never measures, lays out, or starts a worker. */
export function emitCompositionalScene(
  config: CompositionalSceneConfig
): NetworkLayoutResult {
  const { prepared, solved } = config
  if (
    solved.status === "infeasible" ||
    solved.semanticHash !== prepared.semanticHash ||
    solved.graphRevision !== prepared.graph.revision
  )
    fail(
      "REVISION_SCENE",
      "Scene needs a feasible solution matching the semantic revision."
    )
  const nodeById = new Map(prepared.graph.nodes.map((n) => [n.id, n])),
    edgeById = new Map(prepared.graph.edges.map((e) => [e.id, e]))
  return {
    sceneNodes: solved.nodes.flatMap((n) => {
      const owner = nodeById.get(n.semantic.nodeId)!
      const whole = n.semantic.endpoint.kind === "node"
      const main = {
        type: "rect" as const,
        id: n.id,
        x: n.rect.x,
        y: n.rect.y,
        w: n.rect.width,
        h: n.rect.height,
        label: owner.label ?? owner.id,
        datum: { ...owner, semantic: n.semantic },
        style: {
          fill: whole
            ? (config.nodeFill ?? "#edf2f7")
            : (config.partFill ?? "#c9dce8"),
          stroke: "#556779",
          strokeWidth: 1
        }
      }
      if (!config.showParts || !whole) return [main]
      return [
        main,
        ...(n.parts ?? [])
          .filter((p) => !p.clipped)
          .map((p) => ({
            type: "rect" as const,
            id: JSON.stringify(["part-hit", n.id, p.partId]),
            x: n.rect.x + p.rect.x,
            y: n.rect.y + p.rect.y,
            w: p.rect.width,
            h: p.rect.height,
            label:
              owner.parts?.find((part) => part.id === p.partId)?.label ??
              p.partId,
            datum: { id: p.partId, ownerId: owner.id, semantic: p.semantic },
            style: { fill: config.partFill ?? "#c9dce8" }
          }))
      ]
    }),
    sceneEdges: solved.edges.map((e) => ({
      type: "curved" as const,
      id: e.edgeId,
      pathD: e.sections.map(compositionalPath).join(" "),
      datum: {
        ...edgeById.get(e.edgeId)!,
        sourceTerminal: e.source,
        targetTerminal: e.target
      },
      label: e.edgeId,
      style: {
        fill: "none",
        stroke: config.edgeStroke ?? "#467895",
        strokeWidth: 1.5
      }
    }))
  }
}

export const compositionalDagLayout: NetworkCustomLayout<
  CompositionalSceneConfig
> = (context) => emitCompositionalScene(context.config)
