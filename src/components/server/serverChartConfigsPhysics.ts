import * as React from "react"
import {
  buildCollisionSwarmPhysics,
  buildEventDropPhysics,
  buildGaltonBoardPhysics,
  buildPhysicalFlowPhysics,
  buildPhysicsPile,
  buildProcessFlowPhysics,
  generateGaltonMechanicalSamples,
  generatePhysicsPileMechanicalSamples,
  styleFromColorAccessor
} from "../charts/physics/physicsChartUtils"
import { resolveCustomLayout } from "../charts/physics/physicsCustomLayout"
import { buildGauntletPhysics } from "../charts/physics/gauntletPhysics"
import {
  buildCrucibleStateSpawns,
  compileCruciblePlan,
  replayCruciblePlan,
  resolveCrucibleSnapshotAt
} from "../charts/physics/cruciblePhysics"
import { buildCrucibleProjection } from "../charts/physics/crucibleEffects"
import {
  CrucibleChrome,
  CrucibleProjectionOverlay
} from "../charts/physics/crucibleChrome"
import type {
  CrucibleBodyDatum,
  CrucibleProjectionSpec,
  CrucibleRunState
} from "../charts/physics/crucibleTypes"
import type { Datum } from "../charts/shared/datumTypes"
import type { FrameGraphicsProp } from "../stream/useFrame"
import type { PhysicsBodyState } from "../stream/physics/PhysicsKernel"
import { buildPhysicsSettledProjection } from "../stream/physics/PhysicsAccessibility"
import { type ChartConfig } from "./serverChartConfigShared"
import { LIGHT_THEME, resolveThemeSemanticColors } from "../store/ThemeStore"
import type { PhysicsQueuedSpawn } from "../stream/physics/PhysicsPipelineTypes"

// ── Physics Charts ─────────────────────────────────────────────────────

function allAtOnce(spawns: PhysicsQueuedSpawn[]): PhysicsQueuedSpawn[] {
  return spawns.map((spawn) => ({ ...spawn, spawnAt: undefined }))
}

function composePhysicsGraphics(
  owned: React.ReactNode,
  supplied: FrameGraphicsProp | undefined
): FrameGraphicsProp | undefined {
  if (!owned) return supplied
  if (!supplied) return owned
  return (context) =>
    React.createElement(
      React.Fragment,
      null,
      owned,
      typeof supplied === "function" ? supplied(context) : supplied
    )
}

const CRUCIBLE_PALETTE = [
  "#356b63",
  "#a34b43",
  "#c08b38",
  "#3e5f83",
  "#785b7c",
  "#6e7740",
  "#8f5c3a",
  "#41717b"
]

function crucibleColor(key: string): string {
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return CRUCIBLE_PALETTE[(hash >>> 0) % CRUCIBLE_PALETTE.length]
}

function crucibleBodyStyle(
  body: PhysicsBodyState,
  state: CrucibleRunState,
  colorBy: unknown,
  rest: Datum
) {
  const wrapped = body.datum as CrucibleBodyDatum | undefined
  const base = {
    stroke:
      rest.stroke ?? (wrapped?.kind === "product" ? "#fffaf0" : "#26323a"),
    strokeWidth: rest.strokeWidth ?? (wrapped?.kind === "product" ? 1.8 : 1.1),
    opacity: rest.opacity ?? 0.96
  }
  if (!wrapped?.__crucible) {
    return { ...base, fill: rest.color ?? "#b8792d" }
  }
  if (wrapped.kind === "product") {
    const product = state.products[wrapped.semanticId]
    return {
      ...base,
      fill:
        rest.color ??
        product?.color ??
        crucibleColor(product?.id ?? wrapped.semanticId)
    }
  }
  const component = state.components[wrapped.semanticId]
  if (!component) return { ...base, fill: rest.color ?? "#356b63" }
  let key: string
  if (colorBy === "status") key = component.status
  else if (colorBy === "outlet") key = component.outletId ?? "in chamber"
  else if (colorBy === "product") key = component.productIds[0] ?? "unalloyed"
  else if (colorBy === "category" || colorBy == null) key = component.category
  else if (typeof colorBy === "function") {
    key = String(colorBy(component.datum) ?? "unassigned")
  } else {
    key = String(component.datum[String(colorBy)] ?? "unassigned")
  }
  return { ...base, fill: rest.color ?? crucibleColor(key) }
}

function crucibleBodyLabel(
  body: PhysicsBodyState,
  state: CrucibleRunState
): string | undefined {
  const wrapped = body.datum as CrucibleBodyDatum | undefined
  if (!wrapped?.__crucible) return undefined
  return wrapped.kind === "product"
    ? state.products[wrapped.semanticId]?.label
    : state.components[wrapped.semanticId]?.label
}

export const galtonBoardChart: ChartConfig = {
  frameType: "physics",
  buildProps: (data, colorBy, _colorScheme, common, rest) => {
    const size = (common.size as [number, number]) ?? [600, 400]
    const bins = rest.bins ?? 21
    const seed = rest.seed ?? 1
    const pegRows = Math.max(1, Math.round(rest.pegRows ?? bins - 1))
    const isMechanical = rest.mode === "mechanical"
    const rows = isMechanical
      ? generateGaltonMechanicalSamples({
          bins,
          branchProbability: rest.branchProbability,
          count: rest.mechanicalCount,
          pegRows,
          seed
        })
      : Array.isArray(data)
        ? data
        : []
    const layout = buildGaltonBoardPhysics({
      data: rows,
      valueAccessor: rest.valueAccessor || "value",
      bins,
      ballRadius: rest.ballRadius ?? 4,
      seed,
      size,
      valueExtent: isMechanical ? [0, pegRows] : undefined
    })
    return {
      ...common,
      config: layout.config,
      initialSpawns: allAtOnce(layout.initialSpawns),
      projectionRows: layout.projectionRows,
      bodyStyle: styleFromColorAccessor(
        colorBy || rest.colorBy || (isMechanical ? "side" : undefined),
        "#4e79a7",
        {
          styleRules: rest.styleRules,
          valueAccessor: rest.valueAccessor || "value"
        }
      )
    }
  }
}

export const eventDropChart: ChartConfig = {
  frameType: "physics",
  buildProps: (data, colorBy, _colorScheme, common, rest) => {
    const size = (common.size as [number, number]) ?? [600, 400]
    const layout = buildEventDropPhysics({
      data: Array.isArray(data) ? data : [],
      timeAccessor: rest.timeAccessor || "time",
      arrivalAccessor: rest.arrivalAccessor || "arrivalTime",
      windows: rest.windows || { size: 10 },
      watermark: rest.watermark,
      ballRadius: rest.ballRadius ?? 5,
      seed: rest.seed ?? 1,
      size,
      timeExtent: rest.timeExtent,
      timeScale: rest.timeScale ?? 1
    })
    return {
      ...common,
      config: layout.config,
      initialSpawns: allAtOnce(layout.initialSpawns),
      projectionRows: layout.projectionRows,
      bodyStyle: styleFromColorAccessor(colorBy || rest.colorBy, "#4e79a7", {
        styleRules: rest.styleRules,
        valueAccessor: rest.valueAccessor || rest.timeAccessor || "time"
      })
    }
  }
}

export const physicsPileChart: ChartConfig = {
  frameType: "physics",
  buildProps: (data, colorBy, _colorScheme, common, rest) => {
    const size = (common.size as [number, number]) ?? [600, 400]
    const isMechanical = rest.mode === "mechanical"
    const rows = isMechanical
      ? generatePhysicsPileMechanicalSamples({
          categories: rest.mechanicalCategories,
          count: rest.mechanicalCount,
          seed: rest.seed ?? 1,
          unitValue: rest.unitValue ?? 1
        })
      : Array.isArray(data)
        ? data
        : []
    const layout = buildPhysicsPile({
      data: rows,
      categoryAccessor: rest.categoryAccessor || "category",
      valueAccessor: rest.valueAccessor || (isMechanical ? "value" : undefined),
      unitValue: rest.unitValue ?? 1,
      ballRadius: rest.ballRadius ?? 5,
      seed: rest.seed ?? 1,
      size
    })
    return {
      ...common,
      config: layout.config,
      initialSpawns: allAtOnce(layout.initialSpawns),
      projectionRows: layout.projectionRows,
      bodyStyle: styleFromColorAccessor(
        colorBy || rest.colorBy || (isMechanical ? "category" : undefined),
        "#4e79a7",
        {
          styleRules: rest.styleRules,
          valueAccessor: rest.valueAccessor || "value"
        }
      )
    }
  }
}

export const collisionSwarmChart: ChartConfig = {
  frameType: "physics",
  buildProps: (data, colorBy, _colorScheme, common, rest) => {
    const size = (common.size as [number, number]) ?? [600, 360]
    const layout = buildCollisionSwarmPhysics({
      data: Array.isArray(data) ? data : [],
      xAccessor: rest.xAccessor || "x",
      groupAccessor: rest.groupAccessor,
      radiusAccessor: rest.radiusAccessor,
      pointRadius: rest.pointRadius ?? 5,
      seed: rest.seed ?? 1,
      size,
      xExtent: rest.xExtent,
      collisionIterations: rest.collisionIterations,
      settle: rest.settle
    })
    return {
      ...common,
      config: layout.config,
      initialSpawns: allAtOnce(layout.initialSpawns),
      projectionRows: layout.projectionRows,
      bodyStyle: styleFromColorAccessor(
        colorBy || rest.colorBy || rest.groupAccessor,
        "#4e79a7",
        { styleRules: rest.styleRules, valueAccessor: rest.xAccessor || "x" }
      )
    }
  }
}

export const processFlowChart: ChartConfig = {
  frameType: "physics",
  buildProps: (data, colorBy, _colorScheme, common, rest) => {
    const size = (common.size as [number, number]) ?? [900, 420]
    const stages = Array.isArray(rest.stages) ? rest.stages : []
    const layout = buildProcessFlowPhysics({
      data: Array.isArray(data) ? data : [],
      stages,
      size,
      idAccessor: rest.idAccessor,
      stageAccessor: rest.stageAccessor || "stage",
      groupBy: rest.groupBy,
      groupLabelAccessor: rest.groupLabelAccessor,
      workAccessor: rest.workAccessor,
      radiusAccessor: rest.radiusAccessor,
      ballRadius: rest.ballRadius ?? 6,
      seed: rest.seed ?? 1,
      groupCompletion: rest.groupCompletion,
      groupAnchorAlong: rest.groupAnchorAlong,
      settle: rest.settle ?? true,
      gravityX: rest.gravityX,
      gravityY: rest.gravityY
    })
    const metadata = layout.metadata as
      { regionEffects?: unknown[] } | undefined
    return {
      ...common,
      config: layout.config,
      initialSpawns: allAtOnce(layout.initialSpawns),
      projectionRows: layout.projectionRows,
      regionEffects: metadata?.regionEffects,
      bodyStyle: styleFromColorAccessor(
        colorBy || rest.colorBy || rest.groupBy,
        "#4e79a7",
        {
          styleRules: rest.styleRules,
          valueAccessor: rest.workAccessor || rest.stageAccessor || "stage"
        }
      )
    }
  }
}

export const gauntletChart: ChartConfig = {
  frameType: "physics",
  buildProps: (data, colorBy, _colorScheme, common, rest) => {
    const size = (common.size as [number, number]) ?? [900, 520]
    const built = buildGauntletPhysics({
      data: Array.isArray(data) ? data : [],
      size,
      gates: rest.gates,
      positiveProperties: rest.positiveProperties,
      negativeProperties: rest.negativeProperties,
      crashOffset: rest.crashOffset,
      idAccessor: rest.idAccessor,
      positiveAccessor: rest.positiveAccessor,
      negativeAccessor: rest.negativeAccessor,
      metricsAccessor: rest.metricsAccessor,
      initialViability: rest.initialViability,
      projectPlacement: rest.projectPlacement,
      coreBody: rest.coreBody,
      viability: rest.viability
    })
    return {
      ...common,
      config: built.config,
      initialSpawns: allAtOnce(built.initialSpawns),
      projectionRows: [],
      bodyStyle: styleFromColorAccessor(colorBy || rest.colorBy)
    }
  }
}

/**
 * Static CrucibleChart renders the same deterministic ledger used by the
 * client HOC. A replay request settles at the terminal state for SSR (the
 * client also hydrates from that reduced-motion snapshot); snapshot mode is
 * the one deliberate way to request an authored intermediate instant.
 * `paused`, `playbackRate`, and `rerunMS` govern wall-clock replay only and
 * therefore cannot alter this static semantic state.
 */
export const crucibleChart: ChartConfig = {
  frameType: "physics",
  buildProps: (data, colorBy, _colorScheme, common, rest) => {
    const size = (common.size as [number, number]) ?? [900, 520]
    const plan = compileCruciblePlan({
      data: Array.isArray(data) ? data : [],
      phases: Array.isArray(rest.phases) ? rest.phases : [],
      products: Array.isArray(rest.products) ? rest.products : undefined,
      outlets: Array.isArray(rest.outlets) ? rest.outlets : undefined,
      events: Array.isArray(rest.events) ? rest.events : undefined,
      idAccessor: rest.idAccessor,
      labelAccessor: rest.labelAccessor,
      categoryAccessor: rest.categoryAccessor,
      amountAccessor: rest.amountAccessor,
      metricsAccessor: rest.metricsAccessor,
      initialStateAccessor: rest.initialStateAccessor,
      metrics: rest.metrics,
      size,
      seed: rest.seed,
      bodyRadius:
        typeof rest.bodyRadius === "number" ? rest.bodyRadius : undefined,
      radiusRange: rest.radiusRange
    })
    const throughTime =
      rest.playback === "snapshot"
        ? resolveCrucibleSnapshotAt(plan, rest.snapshotAt)
        : plan.duration
    const replay = replayCruciblePlan(plan, throughTime)
    const state = replay.state
    const projection: CrucibleProjectionSpec =
      rest.projection && typeof rest.projection === "object"
        ? rest.projection
        : { groupBy: "outlet", measure: "count" }
    const rows = buildCrucibleProjection(state, projection)
    const measure = projection.measure ?? "count"
    const projectionRows = buildPhysicsSettledProjection(
      rows.map((row) => ({
        id: row.key,
        label: row.label,
        count: row.count,
        secondary:
          measure === "count"
            ? row.amount
            : measure === "amount"
              ? row.amount
              : Number(row.metrics[measure] ?? 0),
        secondaryLabel:
          measure === "count"
            ? (rest.amountLabel ?? "amount")
            : measure === "amount"
              ? (rest.amountLabel ?? "amount")
              : measure,
        metadata: {
          amount: row.amount,
          metrics: row.metrics,
          status: row.status,
          outletId: row.outletId,
          category: row.category,
          productId: row.productId
        }
      }))
    )
    const spawnOptions = {
      seed: rest.seed,
      bodyRadius:
        typeof rest.bodyRadius === "number" ? rest.bodyRadius : undefined,
      radiusRange: rest.radiusRange
    }
    const selectedColorBy = colorBy ?? rest.colorBy ?? "category"
    const chrome =
      rest.showChrome === false
        ? null
        : React.createElement(CrucibleChrome, {
            layout: plan.layout,
            phases: plan.phases,
            state,
            compact: size[0] < 520 || size[1] < 360
          })
    const projectionOverlay =
      rest.showProjection === false
        ? null
        : React.createElement(CrucibleProjectionOverlay, {
            rows,
            layout: plan.layout,
            projection,
            amountLabel: rest.amountLabel
          })
    return {
      ...common,
      config: plan.config,
      initialSpawns: allAtOnce(
        buildCrucibleStateSpawns(state, plan.layout, spawnOptions)
      ),
      projectionRows,
      bodyStyle: (body: PhysicsBodyState) =>
        crucibleBodyStyle(body, state, selectedColorBy, rest),
      getBodyLabel: (body: PhysicsBodyState) => crucibleBodyLabel(body, state),
      backgroundGraphics: composePhysicsGraphics(
        chrome,
        common.backgroundGraphics as FrameGraphicsProp | undefined
      ),
      foregroundGraphics: composePhysicsGraphics(
        projectionOverlay,
        common.foregroundGraphics as FrameGraphicsProp | undefined
      )
    }
  }
}

export const physicalFlowChart: ChartConfig = {
  frameType: "physics",
  buildProps: (data, colorBy, _colorScheme, common, rest) => {
    const size = (common.size as [number, number]) ?? [760, 420]
    const layout = buildPhysicalFlowPhysics({
      nodes: Array.isArray(rest.nodes) ? rest.nodes : [],
      links: Array.isArray(rest.links)
        ? rest.links
        : Array.isArray(rest.edges)
          ? rest.edges
          : Array.isArray(data)
            ? data
            : [],
      nodeIdAccessor: rest.nodeIdAccessor || "id",
      nodeXAccessor: rest.nodeXAccessor || "x",
      nodeYAccessor: rest.nodeYAccessor || "y",
      sourceAccessor: rest.sourceAccessor || "source",
      targetAccessor: rest.targetAccessor || "target",
      throughputAccessor: rest.throughputAccessor || "value",
      pathAccessor: rest.pathAccessor || "path",
      coordinateMode: rest.coordinateMode || "auto",
      particleRate: rest.particleRate ?? 0.16,
      maxParticles: rest.maxParticles ?? 180,
      particleRadius: rest.particleRadius ?? 4,
      flowSpeed: rest.flowSpeed ?? 90,
      pathConstraint: rest.pathConstraint || "path",
      reducedMotion: true,
      seed: rest.seed ?? 1,
      size
    })
    return {
      ...common,
      config: layout.config,
      initialSpawns: allAtOnce(layout.initialSpawns),
      projectionRows: layout.projectionRows,
      bodyStyle: styleFromColorAccessor(colorBy || rest.colorBy || "source")
    }
  }
}

// PhysicsCustomChart's `layout(ctx)` is a pure function of a synchronous
// context (same contract the XY/ordinal/network/geo customLayout escape
// hatches use), so it can run once here exactly like the client HOC does via
// the shared `resolveCustomLayout`. There is no live theme in static
// rendering, so the context falls back to `LIGHT_THEME` — the same default
// the component uses before a ThemeProvider resolves. Note this bridges only
// bodies/colliders/config through the settled-scene renderer; unlike the
// SceneNode-based custom charts, `renderPhysicsSettledSVG` has no overlay
// slot yet, so a layout's `overlays`/`backgroundOverlays` render on canvas
// but are silently absent from SSR output.
export const physicsCustomChart: ChartConfig = {
  frameType: "physics",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const size = (common.size as [number, number]) ?? [700, 380]
    const resolved = resolveCustomLayout({
      chartId: rest.chartId,
      colorScheme,
      config: rest.config,
      data: Array.isArray(data) ? data : [],
      layout: rest.layout,
      layoutConfig: rest.layoutConfig,
      semantic: resolveThemeSemanticColors(LIGHT_THEME) ?? {},
      size,
      themeCategorical: LIGHT_THEME.colors.categorical,
      xExtent: rest.xExtent,
      yExtent: rest.yExtent
    })
    return {
      ...common,
      config: resolved.config,
      initialSpawns: allAtOnce(resolved.initialSpawns),
      projectionRows: [],
      bodyStyle:
        resolved.result.bodyStyle ??
        styleFromColorAccessor(colorBy || rest.colorBy)
    }
  }
}
