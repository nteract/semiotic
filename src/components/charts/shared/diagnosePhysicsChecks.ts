import { PHYSICS_DIAGNOSTIC_CHARTS } from "./chartFamilySets"
import type { Datum } from "./datumTypes"
import type { Diagnosis } from "./diagnoseTypes"

function finiteNumber(value: unknown): number | null {
  const number = value instanceof Date ? value.getTime() : Number(value)
  return Number.isFinite(number) ? number : null
}

function readField(datum: Datum, accessor: unknown, fallback: string): unknown {
  if (typeof accessor === "function") return accessor(datum)
  const key = typeof accessor === "string" ? accessor : fallback
  return datum?.[key]
}

export function checkPhysicsConfig(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (!PHYSICS_DIAGNOSTIC_CHARTS.has(component)) return

  if (component === "GaltonBoardChart") {
    const bins = props.bins
    if (typeof bins === "number" && bins < 2) {
      out.push({
        severity: "error",
        code: "PHYSICS_BAD_BINS",
        message: `bins=${bins} leaves no meaningful settled projection for a Galton board.`,
        fix: `Use at least two bins; 8-24 bins is a practical range for physics distributions.`,
      })
    }
    const branchProbability = finiteNumber(props.branchProbability)
    if (
      props.branchProbability != null &&
      (branchProbability == null || branchProbability < 0 || branchProbability > 1)
    ) {
      out.push({
        severity: "error",
        code: "PHYSICS_BAD_BRANCH_PROBABILITY",
        message: `branchProbability=${String(props.branchProbability)} must be between 0 and 1.`,
        fix: `Use branchProbability={0.5} for a balanced Galton board, or bias it within the [0, 1] range.`,
      })
    }
    const mechanicalCount = finiteNumber(props.mechanicalCount)
    if (props.mechanicalCount != null && (mechanicalCount == null || mechanicalCount <= 0)) {
      out.push({
        severity: "error",
        code: "PHYSICS_BAD_MECHANICAL_COUNT",
        message: `mechanicalCount=${String(props.mechanicalCount)} cannot generate a mechanical Galton board.`,
        fix: `Use a positive mechanicalCount, for example 96.`,
      })
    }
  }

  if (component === "EventDropChart") {
    const windows = props.windows
    const windowSize =
      windows && typeof windows === "object" ? finiteNumber((windows as Datum).size) : null
    if (windowSize != null && windowSize <= 0) {
      out.push({
        severity: "error",
        code: "PHYSICS_BAD_WINDOW_SIZE",
        message: `windows.size=${windowSize} cannot form event-time barriers.`,
        fix: `Set windows={{ size: positiveNumber }} so each event can settle into a real time window.`,
      })
    }
    if (typeof props.timeScale === "number" && props.timeScale <= 0) {
      out.push({
        severity: "error",
        code: "PHYSICS_BAD_TIME_SCALE",
        message: `timeScale=${props.timeScale} prevents arrival replay from advancing.`,
        fix: `Use a positive timeScale, or omit it for the default pace.`,
      })
    }

    const data = Array.isArray(props.data) ? props.data : []
    if (data.length > 0) {
      const timeAccessor = props.timeAccessor || "time"
      const arrivalAccessor = props.arrivalAccessor || "arrivalTime"
      const hasDistinctArrival = data.some((datum: Datum) => {
        const eventTime = finiteNumber(readField(datum, timeAccessor, "time"))
        const arrivalTime = finiteNumber(readField(datum, arrivalAccessor, "arrivalTime"))
        return eventTime != null && arrivalTime != null && eventTime !== arrivalTime
      })
      if (!hasDistinctArrival) {
        out.push({
          severity: "warning",
          code: "PHYSICS_EVENTDROP_NO_ARRIVAL_SPREAD",
          message: `EventDropChart data does not show distinct arrival times, so the physics replay collapses to event order.`,
          fix: `Provide an arrivalAccessor field with event-arrival times when demonstrating lateness, watermarks, or out-of-order streams.`,
        })
      }
    }
  }

  if (component === "PhysicsPileChart") {
    const mechanicalCount = finiteNumber(props.mechanicalCount)
    if (props.mechanicalCount != null && (mechanicalCount == null || mechanicalCount <= 0)) {
      out.push({
        severity: "error",
        code: "PHYSICS_BAD_MECHANICAL_COUNT",
        message: `mechanicalCount=${String(props.mechanicalCount)} cannot generate a mechanical pile chart.`,
        fix: `Use a positive mechanicalCount, for example 80.`,
      })
    }
    if (
      props.mode === "mechanical" &&
      Array.isArray(props.mechanicalCategories) &&
      props.mechanicalCategories.length === 0
    ) {
      out.push({
        severity: "error",
        code: "PHYSICS_EMPTY_MECHANICAL_CATEGORIES",
        message: `mechanicalCategories=[] leaves no containers for the generated unit pile.`,
        fix: `Provide at least one category label, or omit mechanicalCategories for the default set.`,
      })
    }

    const unitValue = finiteNumber(props.unitValue ?? 1) ?? 1
    if (unitValue <= 0) {
      out.push({
        severity: "error",
        code: "PHYSICS_BAD_UNIT_VALUE",
        message: `unitValue=${props.unitValue} cannot unitize values into physical bodies.`,
        fix: `Set unitValue to a positive number represented by one body.`,
      })
      return
    }

    const data = Array.isArray(props.data) ? props.data : []
    const valueAccessor = props.valueAccessor || "value"
    const bodyEstimate = data.reduce((sum: number, datum: Datum) => {
      const value = finiteNumber(readField(datum, valueAccessor, "value")) ?? 0
      return sum + Math.max(0, Math.round(value / unitValue))
    }, 0)
    if (bodyEstimate > 1500) {
      out.push({
        severity: "warning",
        code: "PHYSICS_BODY_BUDGET",
        message: `PhysicsPileChart would create about ${bodyEstimate} live bodies; motion may dominate the chart and stress the frame budget.`,
        fix: `Increase unitValue, cap visible units, or aggregate before rendering so the settled projection remains readable.`,
      })
    }
  }

  if (component === "CollisionSwarmChart") {
    const pointRadius = finiteNumber(props.pointRadius ?? 5) ?? 5
    if (pointRadius <= 0) {
      out.push({
        severity: "error",
        code: "PHYSICS_BAD_POINT_RADIUS",
        message: `pointRadius=${props.pointRadius} cannot produce collision bodies.`,
        fix: `Use a positive pointRadius, for example 5.`,
      })
    }
    const collisionIterations = finiteNumber(props.collisionIterations ?? 6) ?? 6
    if (collisionIterations <= 0) {
      out.push({
        severity: "error",
        code: "PHYSICS_BAD_COLLISION_ITERATIONS",
        message: `collisionIterations=${props.collisionIterations} disables collision relaxation.`,
        fix: `Use at least one collision iteration; 4-8 is a practical range for swarms.`,
      })
    }
    if (props.xExtent != null) {
      const extent = Array.isArray(props.xExtent) ? props.xExtent : []
      const min = finiteNumber(extent[0])
      const max = finiteNumber(extent[1])
      if (extent.length < 2 || min == null || max == null) {
        out.push({
          severity: "error",
          code: "PHYSICS_BAD_X_EXTENT",
          message: `xExtent must be a numeric [min, max] pair for CollisionSwarmChart.`,
          fix: `Pass xExtent={[min, max]} or omit it so the chart infers the domain from data.`,
        })
      }
    }

    const data = Array.isArray(props.data) ? props.data : []
    if (data.length > 1200) {
      out.push({
        severity: "warning",
        code: "PHYSICS_BODY_BUDGET",
        message: `CollisionSwarmChart would create ${data.length} live bodies; collision relaxation may dominate the frame budget.`,
        fix: `Sample, aggregate, reduce point radius, or move to a static SwarmPlot when every row does not need a physical body.`,
      })
    }
    const groupAccessor = props.groupAccessor
    if (data.length > 0 && groupAccessor) {
      const groups = new Set<unknown>()
      for (const datum of data) {
        const value = readField(datum, groupAccessor, "group")
        if (value != null) groups.add(value)
      }
      if (groups.size > 12) {
        out.push({
          severity: "warning",
          code: "PHYSICS_TOO_MANY_SWARM_LANES",
          message: `CollisionSwarmChart has ${groups.size} group lanes, which leaves little vertical room for collision separation.`,
          fix: `Facet or filter groups, or use an ordinary SwarmPlot/BoxPlot for dense grouped comparison.`,
        })
      }
    }
  }

  // Process / frame physics honesty rules (pre-release DX gate).
  if (
    component === "GaltonBoardChart" ||
    component === "PhysicsPileChart" ||
    component === "CollisionSwarmChart" ||
    component === "ProcessFlowChart" ||
    component === "EventDropChart"
  ) {
    const massEncoded =
      props.massBy != null ||
      props.massAccessor != null ||
      (props.frameProps &&
        typeof props.frameProps === "object" &&
        (props.frameProps as Datum).bodyMassBy != null)
    if (massEncoded) {
      out.push({
        severity: "warning",
        code: "PHYSICS_DATA_IN_DYNAMICS",
        message: `${component} appears to map a data field to mass/dynamics. Mass is not a readable quantitative channel.`,
        fix: `Encode quantities in spawn position, bin, size, color, or glyph — keep mass/friction/restitution as process texture. Use showProjection for the truth layer.`,
      })
    }
  }

  if (
    (component === "PhysicsPileChart" ||
      component === "GaltonBoardChart" ||
      component === "CollisionSwarmChart" ||
      component === "ProcessFlowChart") &&
    props.showProjection === false
  ) {
    out.push({
      severity: "warning",
      code: "PHYSICS_NO_PROJECTION",
      message: `${component} has showProjection={false}. Without a settled projection, motion is easy to over-read as data.`,
      fix: `Keep showProjection enabled (default) so the chart collapses to a legible static reading, or document why the process alone is the claim.`,
    })
  }

  if (component === "ProcessFlowChart") {
    const stages = Array.isArray(props.stages) ? props.stages : []
    if (stages.length === 0) {
      out.push({
        severity: "error",
        code: "PROCESS_FLOW_MISSING_STAGES",
        message: `ProcessFlowChart requires a non-empty stages array.`,
        fix: `Provide stages={[{ id: "coding", force: 12 }, { id: "merged", absorb: true }]}.`,
      })
    } else {
      const missingId = stages.some(
        (stage: Datum) => !stage || stage.id == null || String(stage.id).trim() === ""
      )
      if (missingId) {
        out.push({
          severity: "error",
          code: "PROCESS_FLOW_BAD_STAGE",
          message: `Every ProcessFlowChart stage needs a stable id.`,
          fix: `Use stages like { id: "review", label: "Review", capacity: { unitsPerSecond: 4 } }.`,
        })
      }
      const absorbCount = stages.filter((stage: Datum) => stage?.absorb).length
      if (props.groupBy && absorbCount === 0) {
        out.push({
          severity: "warning",
          code: "PROCESS_FLOW_GROUP_NO_ABSORB",
          message: `groupBy is set but no stage has absorb: true, so all-members completion cannot resolve.`,
          fix: `Mark a terminal stage with absorb: true (e.g. merged), or set groupCompletion="none".`,
        })
      }
    }
  }

  if (component === "GauntletChart") {
    if (!Array.isArray(props.negativeProperties)) {
      out.push({
        severity: "warning",
        code: "GAUNTLET_MISSING_NEGATIVE_PROPERTIES",
        message: `GauntletChart usually needs negativeProperties for drag/cost bodies (empty array is ok if intentional).`,
        fix: `Provide negativeProperties={[{ id: "cost", label: "Cost", load: 1 }]} or explicitly pass [].`,
      })
    }
  }

  // Live body budget heuristic for value-encoding physics charts.
  if (
    component === "PhysicsPileChart" ||
    component === "GaltonBoardChart" ||
    component === "CollisionSwarmChart" ||
    component === "ProcessFlowChart" ||
    component === "EventDropChart"
  ) {
    const data = Array.isArray(props.data) ? props.data : []
    const mechanicalCount = finiteNumber(props.mechanicalCount) ?? 0
    const estimated =
      data.length > 0
        ? data.length *
          (component === "PhysicsPileChart"
            ? Math.max(1, finiteNumber(props.unitValue) ? 1 : 1)
            : 1)
        : mechanicalCount
    if (estimated > 2500) {
      out.push({
        severity: "warning",
        code: "PHYSICS_BODY_BUDGET",
        message: `${component} may spawn ~${Math.round(estimated)} live bodies, which can overwhelm the simulation loop.`,
        fix: `Lower mechanicalCount / unitize with a larger unitValue, enable sediment/windowSize, or sample the data before spawn.`,
      })
    }
  }
}
