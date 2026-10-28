import { validateCompositionalSolution } from "./acceptance"
import type {
  AsyncLayoutEngine,
  Diagnostic,
  LayoutRequest,
  SolvedCompositionalLayout
} from "./types"
import { canonical, fail, freeze } from "./identity"
import { compositionalLayoutOptions, routeCompositionalGraph } from "./solve"

/** Dependency-free adapter. Worker engines can implement the same portable request. */
export const compositionalDagEngine: AsyncLayoutEngine = {
  id: "semiotic-compositional",
  version: "0.1.0",
  capabilities: {
    fixedPositions: true,
    fixedPortPositions: true,
    constrainedPartOrder: true,
    multiedges: true,
    compoundCrossHierarchy: false,
    orthogonalRouting: true,
    terminalRouting: true,
    bumpRouting: true,
    deterministicSeed: true
  },
  async layout(request, signal) {
    if (signal?.aborted) throw new Error("REVISION_CANCELLED")
    return routeCompositionalGraph(request)
  }
}

/** Solve outside scene emission; refuse a mismatched engine response. */
export async function layoutCompositionalGraph(
  request: LayoutRequest,
  engine: AsyncLayoutEngine,
  signal?: AbortSignal
): Promise<SolvedCompositionalLayout> {
  const normalized = {
    ...request,
    options: compositionalLayoutOptions(request.options)
  }
  if (signal?.aborted)
    fail("REVISION_CANCELLED", "Layout request was cancelled.")
  const capabilities = engine.capabilities
  const requirements: Array<[boolean, boolean, string]> = [
    [
      normalized.options.mode === "route-only" ||
        !!request.view.constraints?.some((c) => !!c.pin),
      capabilities.fixedPositions,
      "fixed positions"
    ],
    [
      !!request.view.anchors?.length,
      capabilities.fixedPortPositions,
      "exact anchors"
    ],
    [
      !!request.view.nodes.some((n) => n.partLayout?.kind === "rows"),
      capabilities.constrainedPartOrder,
      "part order"
    ],
    [
      request.prepared.graph.edges.length >
        new Set(
          request.prepared.graph.edges.map((e) =>
            JSON.stringify([e.source, e.target])
          )
        ).size,
      capabilities.multiedges,
      "multiedges"
    ],
    [
      normalized.options.routing === "orthogonal",
      capabilities.orthogonalRouting,
      "orthogonal routing"
    ],
    [
      normalized.options.routing === "terminals",
      !!capabilities.terminalRouting,
      "terminal routing"
    ],
    [
      normalized.options.routing === "bump",
      !!capabilities.bumpRouting,
      "bump routing"
    ]
  ]
  for (const [needed, supported, label] of requirements)
    if (needed && !supported)
      fail("CAPABILITY_ENGINE", `Engine does not support ${label}.`)
  const result = await engine.layout(normalized, signal)
  if (signal?.aborted)
    fail("REVISION_CANCELLED", "Layout request was cancelled.")
  if (
    result.requestId !== request.requestId ||
    result.semanticHash !== request.prepared.semanticHash ||
    result.graphRevision !== request.prepared.graph.revision ||
    result.viewRevision !== request.view.revision ||
    result.geometryRevision !== request.geometry.revision ||
    result.optionsHash !== canonical(normalized.options) ||
    result.engineId !== engine.id ||
    result.engineVersion !== engine.version
  )
    fail(
      "REVISION_RESPONSE",
      "Engine response does not match the requested revision tuple."
    )
  validateCompositionalSolution(normalized, result)
  return freeze(result)
}

/** One accepted scene transaction; stale success/failure cannot replace newer work. */
export class CompositionalLayoutController {
  private generation = 0
  private abort: AbortController | undefined
  private accepted: SolvedCompositionalLayout | undefined
  private currentDiagnostics: readonly Diagnostic[] = []
  get solution(): SolvedCompositionalLayout | undefined {
    return this.accepted
  }
  get diagnostics(): readonly Diagnostic[] {
    return this.currentDiagnostics
  }
  updating = false

  async solve(
    request: LayoutRequest,
    engine: AsyncLayoutEngine = compositionalDagEngine
  ): Promise<boolean> {
    this.abort?.abort()
    const abort = new AbortController(),
      generation = ++this.generation
    this.abort = abort
    this.updating = true
    try {
      const result = await layoutCompositionalGraph(
        request,
        engine,
        abort.signal
      )
      if (generation !== this.generation) return false
      this.currentDiagnostics = result.diagnostics
      if (result.status === "infeasible") return false
      this.accepted = result
      return true
    } catch (error) {
      if (generation === this.generation)
        this.currentDiagnostics = [
          {
            code: "REVISION_SOLVE_FAILED",
            severity: "error",
            message: error instanceof Error ? error.message : "Layout failed."
          }
        ]
      return false
    } finally {
      if (generation === this.generation) this.updating = false
    }
  }
  cancel(): void {
    this.generation++
    this.abort?.abort()
    this.updating = false
  }
  dispose(): void {
    this.cancel()
    this.accepted = undefined
    this.currentDiagnostics = []
  }
}
