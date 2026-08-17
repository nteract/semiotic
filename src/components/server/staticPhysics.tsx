import {
  PhysicsPipelineStore,
  type PhysicsQueuedSpawn
} from "../stream/physics/PhysicsPipelineStore"
import {
  renderPhysicsSettledSVG,
  type PhysicsSettledSVGOptions
} from "../stream/physics/PhysicsSettledSVG"
import { buildEvidence, type EvidenceSink } from "./renderEvidence"
import { themeToCSSVariables } from "../store/themeCSSVariables"
import { resolveTheme } from "./themeResolver"
import { resolvePhysicsFramePipelineConfig } from "../stream/physics/physicsFramePipelineConfig"
import { reserveFrameChromeMargin } from "../stream/titleLayout"
import { clampLegendReservation, reserveLegendMargin } from "../legendLayout"
import type { LegendValue } from "../types/legendTypes"
import {
  renderStaticPhysicsChrome,
  type StaticPhysicsChromeProps
} from "./staticPhysicsChrome"
import type { StaticAnnotationRenderResult } from "./staticAnnotations"
import type { StreamPhysicsFrameProps } from "../stream/physics/StreamPhysicsTypes"

export type StaticPhysicsFrameProps = PhysicsSettledSVGOptions & {
  config?: ConstructorParameters<typeof PhysicsPipelineStore>[0]
  initialSpawns?: PhysicsQueuedSpawn[]
  projectionRows?: PhysicsSettledSVGOptions["projectionRows"]
  size?: [number, number]
  theme?: Parameters<typeof resolveTheme>[0]
  _idPrefix?: string
} & StaticPhysicsChromeProps &
  Pick<StreamPhysicsFrameProps, "regionEffects" | "seed">

const DEFAULT_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }

export function renderPhysicsFrame(
  props: StaticPhysicsFrameProps,
  sink?: EvidenceSink
): string {
  const size = props.size ?? [props.width ?? 600, props.height ?? 400]
  const theme = resolveTheme(props.theme)
  const themeVariables =
    props.theme === undefined ? {} : themeToCSSVariables(theme)
  const authoredBodyStyle = props.bodyStyle
  // Physics chrome overlays titles by design. Reserve only the legend's plot
  // box here; title placement remains owned by the physics-specific chrome.
  const hasTitle = false
  const legendPosition = props.legendPosition ?? "right"
  const margin = reserveFrameChromeMargin(
    { ...DEFAULT_MARGIN, ...props.margin },
    hasTitle,
    Boolean(props.legend) && legendPosition === "top"
  )
  if (props.legend) {
    const baseline = { ...margin }
    reserveLegendMargin(margin, {
      legend: props.legend as LegendValue,
      position: legendPosition,
      size,
      hasTitle,
      legendLayout: props.legendLayout
    })
    clampLegendReservation(margin, baseline, size, legendPosition)
  }
  const plotSize: [number, number] = [
    Math.max(1, size[0] - margin.left - margin.right),
    Math.max(1, size[1] - margin.top - margin.bottom)
  ]
  let annotationRender: StaticAnnotationRenderResult | undefined
  const config = resolvePhysicsFramePipelineConfig({
    annotations: props.annotations,
    chartId: props.chartId,
    chartType: "StreamPhysicsFrame",
    config: props.config,
    onRegionObservation: () => {},
    regionEffects: props.regionEffects ?? [],
    seed: props.seed,
    size: plotSize
  })
  const store = new PhysicsPipelineStore(config)
  if (Array.isArray(props.initialSpawns) && props.initialSpawns.length > 0) {
    store.enqueue(
      props.initialSpawns.map((spawn) => ({ ...spawn, spawnAt: undefined }))
    )
  }
  const result = renderPhysicsSettledSVG(store, {
    ...props,
    width: size[0],
    height: size[1],
    background: props.background ?? theme.colors.background,
    bodyStyle: (body, context) => ({
      fill: theme.colors.primary,
      stroke: theme.colors.text,
      strokeWidth: 1,
      opacity: 0.9,
      ...(typeof authoredBodyStyle === "function"
        ? authoredBodyStyle(body, context)
        : authoredBodyStyle)
    }),
    style: {
      ...themeVariables,
      fontFamily: theme.typography.fontFamily,
      ...props.style
    },
    // A spawn can be decorative or expand into several semantic bodies. Only
    // an explicit charge can state the ledger claim being checked.
    charge: props.charge,
    idPrefix: props.idPrefix ?? props._idPrefix ?? "physics",
    margin,
    renderChrome: (scene) => {
      const chrome = renderStaticPhysicsChrome(
        scene,
        props,
        size,
        margin,
        theme
      )
      annotationRender = chrome.annotationRender
      return chrome.node
    }
  })
  if (sink) {
    sink.evidence = buildEvidence({
      frameType: "physics",
      width: size[0],
      height: size[1],
      marks: result.scene.sceneNodes,
      title: props.title,
      description: props.description,
      annotations: props.annotations,
      annotationRender,
      extraWarnings: [
        ...(result.scene.sceneNodes.length === 0
          ? ["PHYSICS_EMPTY_SCENE"]
          : []),
        ...result.scene.evidence.warnings
      ]
    })
  }
  return result.svg
}

// ── Public API ──────────────────────────────────────────────────────────
