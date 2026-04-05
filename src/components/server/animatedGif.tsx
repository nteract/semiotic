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
import { PipelineStore, type PipelineConfig } from "../stream/PipelineStore"
import { OrdinalPipelineStore } from "../stream/OrdinalPipelineStore"
import type { OrdinalPipelineConfig } from "../stream/ordinalTypes"
import { xySceneNodeToSVG, ordinalSceneNodeToSVG } from "../stream/SceneToSVG"
import type { SceneNode } from "../stream/types"
import type { OrdinalSceneNode } from "../stream/ordinalTypes"
import { resolveTheme, themeStyles } from "./themeResolver"
import type { SemioticTheme } from "../store/ThemeStore"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactDOMServer = require("react-dom/server") as { renderToStaticMarkup: (el: React.ReactElement) => string }

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
  /** Transition frames between data steps (0 = no easing, default 4) */
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

// ── Frame generation ─────────────────────────────────────────────────

/**
 * Generate SVG strings for each animation frame.
 * This is the core logic shared between GIF export and client-side preview.
 */
export function generateFrameSVGs(
  chartType: string,
  data: Record<string, any>[],
  props: Record<string, any>,
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

  const isOrdinal = ["bar", "pie", "donut", "clusterbar", "swarm", "point",
    "boxplot", "violin", "histogram", "timeline", "swimlane", "ridgeline"].includes(chartType)

  const svgFrames: string[] = []

  if (isOrdinal) {
    // Ordinal chart animation
    for (let fi = 0; fi < dataFrames.length; fi++) {
      const endIdx = dataFrames[fi]
      const startIdx = windowSize ? Math.max(0, endIdx - windowSize) : 0
      const frameData = data.slice(startIdx, endIdx)

      const config: OrdinalPipelineConfig = {
        chartType: chartType as any,
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
      store.computeScene({ width: width - 60, height: height - 50 })

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
        chartType: chartType as any,
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
      store.computeScene({ width: width - 60, height: height - 50 })

      if (store.scene.length === 0) continue

      // Phase 1: Base frame (no transition)
      svgFrames.push(renderXYFrameSVG(store.scene, width, height, theme, frameProps))

      // Phase 2: Transition easing frames between data steps
      if (transitionFrames > 0 && fi > 0 && store.activeTransition) {
        const duration = transitionFrames * (1000 / fps)
        for (let tf = 1; tf <= transitionFrames; tf++) {
          const t = tf / transitionFrames
          const fakeNow = store.activeTransition.startTime + t * duration
          store.advanceTransition(fakeNow)
          svgFrames.push(renderXYFrameSVG(store.scene, width, height, theme, frameProps))
        }
      }

    }
  }

  return svgFrames
}

// ── SVG frame renderers ──────────────────────────────────────────────

/** Render y-threshold annotations using the store's scales or yExtent fallback */
function renderFrameAnnotations(
  annotations: Record<string, any>[] | undefined,
  innerWidth: number,
  innerHeight: number,
  theme: SemioticTheme,
  yExtent?: [number, number]
): React.ReactNode {
  if (!annotations || annotations.length === 0) return null
  const s = themeStyles(theme)
  const elements: React.ReactNode[] = []

  for (let i = 0; i < annotations.length; i++) {
    const ann = annotations[i]
    if (ann.type === "y-threshold" && ann.value != null && yExtent) {
      const [yMin, yMax] = yExtent
      const py = innerHeight - ((ann.value - yMin) / (yMax - yMin)) * innerHeight
      const color = ann.color || s.primary
      elements.push(
        <g key={`ann-${i}`}>
          <line x1={0} y1={py} x2={innerWidth} y2={py}
            stroke={color} strokeWidth={1.5} strokeDasharray="6,4" />
          {ann.label && (
            <text x={innerWidth - 4} y={py - 5} textAnchor="end"
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
  props: Record<string, any>
): string {
  const s = themeStyles(theme)
  const margin = { top: 20, right: 20, bottom: 30, left: 40, ...props.margin }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  const dataMarks = scene.map((node, i) => xySceneNodeToSVG(node, i)).filter(Boolean)
  const annots = renderFrameAnnotations(props.annotations, innerW, innerH, theme, props.yExtent)

  const svgEl = (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height}
      style={{ fontFamily: s.fontFamily, background: props.background || s.background }}>
      {props.background && props.background !== "transparent" && (
        <rect x={0} y={0} width={width} height={height} fill={props.background} />
      )}
      <g transform={`translate(${margin.left},${margin.top})`}>
        {annots}
        {dataMarks}
      </g>
      {props.title && typeof props.title === "string" && (
        <text x={width / 2} y={16} textAnchor="middle" fontSize={s.titleSize}
          fontWeight="bold" fill={s.text} fontFamily={s.fontFamily}>
          {props.title}
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
  props: Record<string, any>
): string {
  const s = themeStyles(theme)
  const margin = { top: 20, right: 20, bottom: 30, left: 40, ...props.margin }
  const isRadial = props.projection === "radial"
  const tx = isRadial ? margin.left + (width - margin.left - margin.right) / 2 : margin.left
  const ty = isRadial ? margin.top + (height - margin.top - margin.bottom) / 2 : margin.top

  const dataMarks = scene.map((node, i) => ordinalSceneNodeToSVG(node, i)).filter(Boolean)

  const svgEl = (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height}
      style={{ fontFamily: s.fontFamily, background: props.background || s.background }}>
      {props.background && props.background !== "transparent" && (
        <rect x={0} y={0} width={width} height={height} fill={props.background} />
      )}
      <g transform={`translate(${tx},${ty})`}>
        {dataMarks}
      </g>
      {props.title && typeof props.title === "string" && (
        <text x={width / 2} y={16} textAnchor="middle" fontSize={s.titleSize}
          fontWeight="bold" fill={s.text} fontFamily={s.fontFamily}>
          {props.title}
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
  data: Record<string, any>[],
  props: Record<string, any>,
  options: AnimatedGifOptions = {}
): Promise<Buffer> {
  const { fps = 12, loop = true, scale = 1, background } = options
  const width = props.width || 600
  const height = props.height || 400
  const scaledW = Math.round(width * scale)
  const scaledH = Math.round(height * scale)

  // Generate SVG frames
  const svgFrames = generateFrameSVGs(chartType, data, props, options)
  if (svgFrames.length === 0) {
    throw new Error("No frames generated — check that data is not empty")
  }

  // Load sharp
  let sharp: any
  try {
    const _require = typeof globalThis !== "undefined" && typeof (globalThis as any).process !== "undefined"
      ? module.require || require : null
    if (!_require) throw new Error("not in Node")
    sharp = _require("sharp")
  } catch {
    throw new Error(
      `Animated GIF export requires "sharp". Install it:\n  npm install sharp`
    )
  }

  // Load gifenc
  let GIFEncoder: any, quantize: any, applyPalette: any
  try {
    const _require = typeof globalThis !== "undefined" && typeof (globalThis as any).process !== "undefined"
      ? module.require || require : null
    if (!_require) throw new Error("not in Node")
    const gifenc = _require("gifenc")
    GIFEncoder = gifenc.GIFEncoder
    quantize = gifenc.quantize
    applyPalette = gifenc.applyPalette
  } catch {
    throw new Error(
      `Animated GIF export requires "gifenc". Install it:\n  npm install gifenc`
    )
  }

  // Rasterize each SVG frame to raw RGBA pixels
  const delay = Math.round(1000 / fps)
  const encoder = GIFEncoder()

  for (let i = 0; i < svgFrames.length; i++) {
    let svgStr = svgFrames[i]
    if (background) {
      // Merge into existing style attribute if present, otherwise add new one
      if (svgStr.includes('style="')) {
        svgStr = svgStr.replace(/style="/, `style="background:${background};`)
      } else {
        svgStr = svgStr.replace(/<svg /, `<svg style="background:${background}" `)
      }
    }

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
