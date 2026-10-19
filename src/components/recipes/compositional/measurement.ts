import type {
  GeometrySnapshot,
  LayoutRequest,
  SolvedCompositionalLayout
} from "./types"
import { canonical, freeze } from "./identity"
import { validateGeometry } from "./geometry"
import { routeCompositionalGraph } from "./solve"

/** At most two corrections; measurement is supplied by the host after rendering. */
export class CompositionalMeasurementTransaction {
  private passes = 0
  constructor(
    private current: LayoutRequest,
    private accepted: SolvedCompositionalLayout
  ) {}
  get solution(): SolvedCompositionalLayout {
    return this.accepted
  }
  update(snapshot: GeometrySnapshot): SolvedCompositionalLayout {
    validateGeometry(snapshot)
    if (canonical(snapshot.nodes) === canonical(this.current.geometry.nodes))
      return this.accepted
    if (this.passes >= 2)
      return freeze({
        ...this.accepted,
        status: "degraded",
        diagnostics: [
          ...this.accepted.diagnostics,
          {
            code: "GEOMETRY_UNSTABLE_MEASUREMENT",
            severity: "warning",
            message:
              "Measurement did not converge after two corrections; retaining the last valid scene."
          }
        ]
      })
    if (snapshot.revision === this.current.geometry.revision)
      return freeze({
        ...this.accepted,
        status: "degraded",
        diagnostics: [
          ...this.accepted.diagnostics,
          {
            code: "REVISION_GEOMETRY",
            severity: "warning",
            message:
              "Changed geometry requires a new revision; retaining the last valid scene."
          }
        ]
      })
    this.passes++
    const request = {
      ...this.current,
      requestId: `${this.current.requestId}:measure:${this.passes}`,
      geometry: snapshot,
      previous: this.accepted
    }
    const solved = routeCompositionalGraph(request)
    if (solved.status !== "infeasible") {
      this.accepted = solved
      this.current = request
    }
    return solved.status === "infeasible"
      ? freeze({
          ...this.accepted,
          status: "degraded",
          diagnostics: [...this.accepted.diagnostics, ...solved.diagnostics]
        })
      : this.accepted
  }
}
