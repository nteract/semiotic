import type { Datum } from "../charts/shared/datumTypes"
/**
 * Animated GIF generation from semiotic chart data.
 *
 * Renders a sequence of chart frames by progressively feeding data into
 * PipelineStore, optionally applying transition easing and decay effects,
 * then encoding all frames as an animated GIF.
 *
 * Phases:
 *   1. Sliding window — slice data into progressive windows, render each
 *   2. Transition easing — interpolate enter/update between data windows
 *   3. Decay/pulse — apply age-based opacity fading per frame
 *
 * Requires: sharp (SVG→PNG rasterization), gifenc (GIF encoding)
 * Both are optional dependencies of semiotic.
 */

import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { PipelineStore, type PipelineConfig } from "../stream/PipelineStore"
import { OrdinalPipelineStore } from "../stream/OrdinalPipelineStore"
import type { OrdinalPipelineConfig } from "../stream/ordinalTypes"
import { xySceneNodeToSVG, ordinalSceneNodeToSVG } from "../stream/SceneToSVG"
import type { SceneNode } from "../stream/types"
import type { OrdinalSceneNode } from "../stream/ordinalTypes"
import { resolveTheme, themeStyles } from "./themeResolver"
import type { SemioticTheme } from "../store/ThemeStore"
import { renderChart } from "./renderToStaticSVG"
import {
  PhysicsPipelineStore,
  type PhysicsPipelineConfig,
  type PhysicsQueuedSpawn,
  type PhysicsSpawnPacingOptions
} from "../stream/physics/PhysicsPipelineStore"
import {
  physicsBodiesToXYSceneNodes,
  type PhysicsSettledSceneOptions
} from "../stream/physics/PhysicsSettledScene"

 
// ReactDOMServer imported at top of file via ESM

// ── Types ────────────────────────────────────────────────────────────

export interface AnimatedGifOptions {
  /** Frames per second (default 12) */
  fps?: number
  /** Number of data points to advance per frame (default: auto-calculated) */
  stepSize?: number
  /** Data points visible per frame (default: all data up to current step) */
  windowSize?: number
  /** Total number of frames (default: auto from data length / stepSize) */
  frameCount?: number
  /** Lock X axis domain to prevent shifting (default: auto from full data) */
  xExtent?: [number, number]
  /** Lock Y axis domain (default: auto from full data) */
  yExtent?: [number, number]
  /** Transition frames between data steps (0 = no easing, default 4). XY charts only — ordinal charts use instant transitions. */
  transitionFrames?: number
  /** Easing for transitions (default "ease-out") */
  easing?: "linear" | "ease-out"
  /** Apply decay (age-based fade) to older data points */
  decay?: { type: "linear" | "exponential" | "step"; minOpacity?: number; halfLife?: number }
  /** Loop the GIF (default true) */
  loop?: boolean
  /** Scale factor for resolution (default 1) */
  scale?: number
  /** Background color */
  background?: string
}

export interface AnimatedGifFrameConfig {
  /** Chart width */
  width: number
  /** Chart height */
  height: number
  /** Theme for styling */
  theme: SemioticTheme
}

export interface PhysicsGifFrameProps
  extends Pick<PhysicsSettledSceneOptions, "bodyStyle" | "getBodyLabel"> {
  config?: PhysicsPipelineConfig
  initialSpawns?: PhysicsQueuedSpawn[]
  initialSpawnPacing?: PhysicsSpawnPacingOptions
  width?: number
  height?: number
  size?: [number, number]
  theme?: SemioticTheme | string
  title?: string
  description?: string
  background?: string
  className?: string
  idPrefix?: string
}

export interface PhysicsGifOptions
  extends Pick<AnimatedGifOptions, "fps" | "frameCount" | "loop" | "scale" | "background"> {
  /** Total simulated seconds to render. Used when `frameCount` is omitted. */
  durationSeconds?: number
  /** Fixed simulation steps advanced between rendered frames. Defaults to about `1 / fps`. */
  stepsPerFrame?: number
  /** Fixed timestep used for each simulation step. Defaults to `config.fixedDt` or 1/120. */
  stepDt?: number
  /** Include a frame after spawning at t=0 before advancing the simulation. */
  includeInitialFrame?: boolean
}

// ── Frame generation ─────────────────────────────────────────────────

/**
 * Generate SVG strings for each animation frame.
 * This is the core logic shared between GIF export and client-side preview.
 */
export function generateFrameSVGs(
  chartType: string,
  data: Datum[],
  props: Datum,
  options: AnimatedGifOptions = {}
): string[] {
  const {
    stepSize: stepSizeProp,
    windowSize,
    frameCount: frameCountProp,
    xExtent,
    yExtent,
    transitionFrames = 4,
    fps = 12,
    easing = "ease-out",
    decay,
  } = options

  const width = props.width || 600
  const height = props.height || 400
  const theme = resolveTheme(props.theme)

  // Merge extent locks into props so frame renderers can use them for annotations
  const frameProps = { ...props, ...(xExtent && { xExtent }), ...(yExtent && { yExtent }) }

  if (!data || data.length === 0) return []

  // Compute frame parameters
  const targetFrames = frameCountProp || Math.min(60, Math.max(10, data.length))
  const stepSize = stepSizeProp || Math.max(1, Math.ceil(data.length / targetFrames))
  const dataFrames: number[] = []
  for (let i = stepSize; i <= data.length; i += stepSize) {
    dataFrames.push(i)
  }
  if (dataFrames[dataFrames.length - 1] !== data.length) {
    dataFrames.push(data.length)
  }

  const ORDINAL_TYPES = new Set([
    "bar", "pie", "donut", "clusterbar", "swarm", "point",
    "boxplot", "violin", "histogram", "timeline", "swimlane",
    "ridgeline", "funnel", "bar-funnel",
  ])
  const isOrdinal = ORDINAL_TYPES.has(chartType)

  // Compute inner dimensions from merged margin — same as frame renderers use
  const margin = { top: 20, right: 20, bottom: 30, left: 40, ...props.margin }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  const svgFrames: string[] = []

  if (isOrdinal) {
    // Ordinal chart animation
    for (let fi = 0; fi < dataFrames.length; fi++) {
      const endIdx = dataFrames[fi]
      const startIdx = windowSize ? Math.max(0, endIdx - windowSize) : 0
      const frameData = data.slice(startIdx, endIdx)

      const config: OrdinalPipelineConfig = {
        chartType: chartType as OrdinalPipelineConfig["chartType"],
        windowSize: 10000,
        windowMode: "sliding",
        extentPadding: 0.05,
        projection: props.projection || "vertical",
        oAccessor: props.oAccessor || props.categoryAccessor || "category",
        rAccessor: props.rAccessor || props.valueAccessor || "value",
        colorAccessor: props.colorAccessor || props.colorBy,
        stackBy: props.stackBy,
        groupBy: props.groupBy,
        barPadding: props.barPadding,
        innerRadius: props.innerRadius,
        normalize: props.normalize,
        bins: props.bins,
        colorScheme: props.colorScheme || theme.colors.categorical,
        ...(decay && { decay }),
      }

      const store = new OrdinalPipelineStore(config)
      store.ingest({ inserts: frameData, bounded: true })
      store.computeScene({ width: innerW, height: innerH })

      if (store.scene.length > 0) {
        svgFrames.push(renderOrdinalFrameSVG(store.scene as OrdinalSceneNode[], width, height, theme, frameProps))
      }
    }
  } else {
    // XY chart animation

    for (let fi = 0; fi < dataFrames.length; fi++) {
      const endIdx = dataFrames[fi]
      const startIdx = windowSize ? Math.max(0, endIdx - windowSize) : 0
      const frameData = data.slice(startIdx, endIdx)

      const config: PipelineConfig = {
        chartType: chartType as PipelineConfig["chartType"],
        windowSize: frameData.length + 10,
        windowMode: "sliding",
        arrowOfTime: "right",
        extentPadding: 0.1,
        xAccessor: props.xAccessor || "x",
        yAccessor: props.yAccessor || "y",
        colorAccessor: props.colorAccessor || props.colorBy,
        groupAccessor: props.groupAccessor || props.lineBy,
        lineDataAccessor: props.lineDataAccessor,
        xExtent: xExtent,
        yExtent: yExtent,
        colorScheme: props.colorScheme || theme.colors.categorical,
        lineStyle: props.lineStyle,
        pointStyle: props.pointStyle,
        areaStyle: props.areaStyle,
        sizeAccessor: props.sizeAccessor || props.sizeBy,
        sizeRange: props.sizeRange,
        ...(decay && { decay }),
        ...(transitionFrames > 0 && {
          transition: { duration: transitionFrames * (1000 / fps), easing }
        }),
      }

      const store = new PipelineStore(config)
      store.ingest({ inserts: frameData, bounded: true })
      store.computeScene({ width: innerW, height: innerH })

      if (store.scene.length === 0) continue

      // Phase 1: Base frame (no transition)
      const scales = store.scales ? { y: store.scales.y } : undefined
      svgFrames.push(renderXYFrameSVG(store.scene, width, height, theme, frameProps, scales))

      // Phase 2: Transition easing frames between data steps (XY only)
      if (transitionFrames > 0 && fi > 0 && store.activeTransition) {
        const duration = transitionFrames * (1000 / fps)
        for (let tf = 1; tf <= transitionFrames; tf++) {
          const t = tf / transitionFrames
          const fakeNow = store.activeTransition.startTime + t * duration
          store.advanceTransition(fakeNow)
          svgFrames.push(renderXYFrameSVG(store.scene, width, height, theme, frameProps, scales))
        }
      }

    }
  }

  return svgFrames
}

// ── Frame sequence from snapshots ────────────────────────────────────

/**
 * Generate SVG strings from an array of data snapshots.
 *
 * Unlike `generateFrameSVGs` which slices a single array progressively,
 * this accepts pre-built snapshots — each entry is the complete props
 * for one frame. Use for scenarios where data changes non-monotonically
 * (edge deletion, network splits, failover paths).
 *
 * Each snapshot is passed directly to `renderChart()`.
 */
export function generateFrameSequence(
  component: string,
  snapshots: Datum[],
  baseProps: Datum = {}
): string[] {
  return snapshots.map(snapshot => {
    try {
      return renderChart(component as Parameters<typeof renderChart>[0], { ...baseProps, ...snapshot })
    } catch {
      const w = baseProps.width || snapshot.width || 600
      const h = baseProps.height || snapshot.height || 400
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"></svg>`
    }
  })
}

function renderPhysicsFrameSVG(
  store: PhysicsPipelineStore,
  props: PhysicsGifFrameProps,
  frameIndex: number
): string {
  const size = props.size ?? [props.width ?? 600, props.height ?? 400]
  const theme = resolveTheme(props.theme)
  const s = themeStyles(theme)
  const bg = props.background || theme.colors.background
  const idPrefix = props.idPrefix ?? "physics-gif"
  const titleId = props.title ? `${idPrefix}-title-${frameIndex}` : undefined
  const descId = props.description ? `${idPrefix}-desc-${frameIndex}` : undefined
  const labelledBy = [titleId, descId].filter(Boolean).join(" ") || undefined
  const sceneNodes = physicsBodiesToXYSceneNodes(store.readBodies(), {
    bodyStyle: props.bodyStyle,
    getBodyLabel: props.getBodyLabel
  })

  const svgEl = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={props.className ?? "stream-physics-frame"}
      width={size[0]}
      height={size[1]}
      viewBox={`0 0 ${size[0]} ${size[1]}`}
      role="img"
      aria-labelledby={labelledBy}
      style={{ fontFamily: s.fontFamily }}
    >
      {props.title && <title id={titleId}>{props.title}</title>}
      {props.description && <desc id={descId}>{props.description}</desc>}
      {bg && bg !== "transparent" ? (
        <rect x={0} y={0} width={size[0]} height={size[1]} fill={bg} />
      ) : null}
      <g id={`${idPrefix}-frame-${frameIndex}`}>
        {sceneNodes.map((node, index) =>
          xySceneNodeToSVG(node, index, `${idPrefix}-${frameIndex}`)
        )}
      </g>
    </svg>
  )

  return ReactDOMServer.renderToStaticMarkup(svgEl)
}

/**
 * Generate SVG frames by stepping a `PhysicsPipelineStore`.
 *
 * Unlike `generateFrameSVGs`, this does not slice data. It enqueues the supplied
 * physics bodies once, advances the deterministic fixed-step simulation, and
 * serializes each live snapshot. Use this for Galton boards, event-drop replay,
 * piles, and custom physics scenes where sim time is the animation axis.
 */
export function generatePhysicsFrameSVGs(
  props: PhysicsGifFrameProps,
  options: PhysicsGifOptions = {}
): string[] {
  const {
    fps = 12,
    frameCount: frameCountProp,
    durationSeconds = 2,
    includeInitialFrame = true,
    stepDt: stepDtProp,
    stepsPerFrame: stepsPerFrameProp,
    background
  } = options
  const fixedDt = Math.max(1 / 1000, stepDtProp ?? props.config?.fixedDt ?? 1 / 120)
  const stepsPerFrame =
    stepsPerFrameProp ??
    Math.max(1, Math.round((1 / Math.max(1, fps)) / fixedDt))
  const frameCount =
    frameCountProp ?? Math.max(1, Math.ceil(durationSeconds * Math.max(1, fps)))
  const frameProps = background ? { ...props, background } : props
  const store = new PhysicsPipelineStore(props.config)

  if (props.initialSpawns?.length) {
    store.enqueue(props.initialSpawns, props.initialSpawnPacing)
  }

  const frames: string[] = []
  if (includeInitialFrame) {
    store.tick(0)
    frames.push(renderPhysicsFrameSVG(store, frameProps, 0))
  }

  while (frames.length < frameCount) {
    for (let step = 0; step < stepsPerFrame; step += 1) {
      store.tick(fixedDt)
    }
    frames.push(renderPhysicsFrameSVG(store, frameProps, frames.length))
  }

  return frames
}

// ── SVG frame renderers ──────────────────────────────────────────────

/** Resolve the effective background color — always concrete, never CSS vars */
function resolveBackground(props: Datum, theme: SemioticTheme): string | null {
  const bg = props.background || theme.colors.background
  return bg && bg !== "transparent" ? bg : null
}

/** Render y-threshold annotations using yExtent or scale for coordinate mapping */
function renderFrameAnnotations(
  annotations: Datum[] | undefined,
  innerWidth: number,
  innerHeight: number,
  theme: SemioticTheme,
  yExtent?: [number, number],
  yScale?: (v: number) => number
): React.ReactNode {
  if (!annotations || annotations.length === 0) return null
  const s = themeStyles(theme)
  const elements: React.ReactNode[] = []

  for (let i = 0; i < annotations.length; i++) {
    const ann = annotations[i]
    if (ann.type === "y-threshold" && ann.value != null) {
      let py: number | null = null

      if (yScale) {
        // Use the store's computed scale — most accurate
        py = yScale(ann.value)
      } else if (yExtent) {
        // Fall back to manual extent mapping
        const [yMin, yMax] = yExtent
        const span = yMax - yMin
        if (span === 0) continue // degenerate extent — skip to avoid NaN
        py = innerHeight - ((ann.value - yMin) / span) * innerHeight
      }

      if (py == null) continue
      const color = ann.color || s.primary
      const dasharray = ann.strokeDasharray || "6,4"
      const lineWidth = ann.strokeWidth ?? 1.5
      const labelPos = ann.labelPosition || "right"
      elements.push(
        <g key={`ann-${i}`}>
          <line x1={0} y1={py} x2={innerWidth} y2={py}
            stroke={color} strokeWidth={lineWidth} strokeDasharray={dasharray} />
          {ann.label && (
            <text
              x={labelPos === "left" ? 4 : labelPos === "center" ? innerWidth / 2 : innerWidth - 4}
              y={py - 5}
              textAnchor={labelPos === "left" ? "start" : labelPos === "center" ? "middle" : "end"}
              fontSize={s.tickSize} fill={color} fontFamily={s.fontFamily}>
              {ann.label}
            </text>
          )}
        </g>
      )
    }
  }

  return elements.length > 0 ? <>{elements}</> : null
}

function renderXYFrameSVG(
  scene: SceneNode[],
  width: number,
  height: number,
  theme: SemioticTheme,
  props: Datum,
  storeScales?: { y?: (v: number) => number }
): string {
  const s = themeStyles(theme)
  const margin = { top: 20, right: 20, bottom: 30, left: 40, ...props.margin }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom
  const bg = resolveBackground(props, theme)

  const dataMarks = scene.map((node, i) => xySceneNodeToSVG(node, i)).filter(Boolean)
  // Use explicit yExtent for annotation mapping, falling back to store scales
  const annots = renderFrameAnnotations(props.annotations, innerW, innerH, theme, props.yExtent, storeScales?.y)

  const titleText = typeof props.title === "string" ? props.title : undefined
  const descText = typeof props.description === "string" ? props.description : undefined
  const titleId = titleText ? "semiotic-title" : undefined
  const descId = descText ? "semiotic-desc" : undefined
  const labelledBy = [titleId, descId].filter(Boolean).join(" ") || undefined

  const svgEl = (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height}
      role="img" aria-labelledby={labelledBy}
      style={{ fontFamily: s.fontFamily }}>
      {titleText && <title id={titleId}>{titleText}</title>}
      {descText && <desc id={descId}>{descText}</desc>}
      {bg && <rect x={0} y={0} width={width} height={height} fill={bg} />}
      <g transform={`translate(${margin.left},${margin.top})`}>
        {annots}
        {dataMarks}
      </g>
      {titleText && (
        <text x={width / 2} y={16} textAnchor="middle" fontSize={s.titleSize}
          fontWeight="bold" fill={s.text} fontFamily={s.fontFamily}>
          {titleText}
        </text>
      )}
    </svg>
  )

  return ReactDOMServer.renderToStaticMarkup(svgEl)
}

function renderOrdinalFrameSVG(
  scene: OrdinalSceneNode[],
  width: number,
  height: number,
  theme: SemioticTheme,
  props: Datum
): string {
  const s = themeStyles(theme)
  const margin = { top: 20, right: 20, bottom: 30, left: 40, ...props.margin }
  const isRadial = props.projection === "radial"
  const tx = isRadial ? margin.left + (width - margin.left - margin.right) / 2 : margin.left
  const ty = isRadial ? margin.top + (height - margin.top - margin.bottom) / 2 : margin.top
  const bg = resolveBackground(props, theme)

  const dataMarks = scene.map((node, i) => ordinalSceneNodeToSVG(node, i)).filter(Boolean)
  const titleText = typeof props.title === "string" ? props.title : undefined
  const descText = typeof props.description === "string" ? props.description : undefined
  const titleId = titleText ? "semiotic-title" : undefined
  const descId = descText ? "semiotic-desc" : undefined
  const labelledBy = [titleId, descId].filter(Boolean).join(" ") || undefined

  const svgEl = (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height}
      role="img" aria-labelledby={labelledBy}
      style={{ fontFamily: s.fontFamily }}>
      {titleText && <title id={titleId}>{titleText}</title>}
      {descText && <desc id={descId}>{descText}</desc>}
      {bg && <rect x={0} y={0} width={width} height={height} fill={bg} />}
      <g transform={`translate(${tx},${ty})`}>
        {dataMarks}
      </g>
      {titleText && (
        <text x={width / 2} y={16} textAnchor="middle" fontSize={s.titleSize}
          fontWeight="bold" fill={s.text} fontFamily={s.fontFamily}>
          {titleText}
        </text>
      )}
    </svg>
  )

  return ReactDOMServer.renderToStaticMarkup(svgEl)
}

// ── GIF encoding ─────────────────────────────────────────────────────

/**
 * Render a chart as an animated GIF.
 *
 * Requires `sharp` (SVG→PNG) and `gifenc` (GIF encoding) as optional dependencies.
 *
 * @returns Buffer containing the animated GIF
 */
export async function renderToAnimatedGif(
  chartType: string,
  data: Datum[],
  props: Datum,
  options: AnimatedGifOptions = {}
): Promise<Buffer> {
  const { fps = 12, loop = true, scale = 1, background } = options
  const width = props.width || 600
  const height = props.height || 400

  // Pass background through to frame renderers so it's a real <rect>, not CSS
  const propsWithBg = background ? { ...props, background } : props

  // Generate SVG frames
  const svgFrames = generateFrameSVGs(chartType, data, propsWithBg, options)
  if (svgFrames.length === 0) {
    throw new Error("No frames generated — check that data is not empty")
  }

  return encodeSvgFramesToGif(svgFrames, width, height, { fps, loop, scale })
}

export async function renderPhysicsToAnimatedGif(
  props: PhysicsGifFrameProps,
  options: PhysicsGifOptions = {}
): Promise<Buffer> {
  const { fps = 12, loop = true, scale = 1 } = options
  const size = props.size ?? [props.width ?? 600, props.height ?? 400]
  const svgFrames = generatePhysicsFrameSVGs(props, options)
  if (svgFrames.length === 0) {
    throw new Error("No physics frames generated")
  }

  return encodeSvgFramesToGif(svgFrames, size[0], size[1], { fps, loop, scale })
}

async function encodeSvgFramesToGif(
  svgFrames: string[],
  width: number,
  height: number,
  options: Pick<AnimatedGifOptions, "fps" | "loop" | "scale"> = {}
): Promise<Buffer> {
  const { fps = 12, loop = true, scale = 1 } = options
  const scaledW = Math.round(width * scale)
  const scaledH = Math.round(height * scale)

  // Load optional deps dynamically at call time. The variable specifiers
  // defeat static bundler resolution so these Node-only raster/encoding
  // packages stay out of edge/browser-oriented bundles until GIF export runs.
  let sharp: any
  try {
    const sharpName = "sharp"
    const sharpModule = await import(sharpName)
    sharp = sharpModule.default ?? sharpModule
  } catch {
    throw new Error(
      `Animated GIF export requires "sharp". Install it:\n  npm install sharp`
    )
  }

  let GIFEncoder: any, quantize: any, applyPalette: any
  try {
    const gifencName = "gifenc"
    const gifencModule = await import(gifencName)
    GIFEncoder = gifencModule.GIFEncoder
      ?? gifencModule.default?.GIFEncoder
      ?? gifencModule.default?.default?.GIFEncoder
    quantize = gifencModule.quantize
      ?? gifencModule.default?.quantize
      ?? gifencModule.default?.default?.quantize
    applyPalette = gifencModule.applyPalette
      ?? gifencModule.default?.applyPalette
      ?? gifencModule.default?.default?.applyPalette
  } catch {
    throw new Error(
      `Animated GIF export requires "gifenc". Install it:\n  npm install gifenc`
    )
  }

  // Rasterize each SVG frame to raw RGBA pixels
  const delay = Math.round(1000 / fps)
  const encoder = GIFEncoder()

  for (let i = 0; i < svgFrames.length; i++) {
    const svgStr = svgFrames[i]

    const pngBuffer = await sharp(Buffer.from(svgStr), { density: 72 * scale })
      .resize(scaledW, scaledH)
      .ensureAlpha()
      .raw()
      .toBuffer()

    // Convert to Uint8Array for gifenc
    const pixels = new Uint8Array(pngBuffer)
    const palette = quantize(pixels, 256)
    const indexed = applyPalette(pixels, palette)

    encoder.writeFrame(indexed, scaledW, scaledH, {
      palette,
      delay,
      repeat: loop ? 0 : -1,
    })
  }

  encoder.finish()
  return Buffer.from(encoder.bytes())
}
