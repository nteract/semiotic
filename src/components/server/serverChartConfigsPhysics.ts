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
import { type ChartConfig } from "./serverChartConfigShared"
import { LIGHT_THEME, resolveThemeSemanticColors } from "../store/ThemeStore"
import type { PhysicsQueuedSpawn } from "../stream/physics/PhysicsPipelineTypes"

// ── Physics Charts ─────────────────────────────────────────────────────

function allAtOnce(spawns: PhysicsQueuedSpawn[]): PhysicsQueuedSpawn[] {
  return spawns.map((spawn) => ({ ...spawn, spawnAt: undefined }))
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
      : Array.isArray(data) ? data : []
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
        colorBy || rest.colorBy || (isMechanical ? "side" : undefined)
      )
    }
  },
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
      bodyStyle: styleFromColorAccessor(colorBy || rest.colorBy)
    }
  },
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
      : Array.isArray(data) ? data : []
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
        colorBy || rest.colorBy || (isMechanical ? "category" : undefined)
      )
    }
  },
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
        colorBy || rest.colorBy || rest.groupAccessor
      )
    }
  },
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
    const metadata = layout.metadata as { regionEffects?: unknown[] } | undefined
    return {
      ...common,
      config: layout.config,
      initialSpawns: allAtOnce(layout.initialSpawns),
      projectionRows: layout.projectionRows,
      regionEffects: metadata?.regionEffects,
      bodyStyle: styleFromColorAccessor(
        colorBy || rest.colorBy || rest.groupBy
      )
    }
  },
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
  },
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
  },
}
