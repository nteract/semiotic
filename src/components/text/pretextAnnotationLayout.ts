import {
  clearCache,
  prepareWithSegments,
  layoutWithLines
} from "@chenglou/pretext"
import type {
  AnnotationNoteLayout,
  AnnotationNoteText
} from "./annotationTextLayout"

/** Typography for opt-in, browser-measured SVG annotation notes. */
export interface PretextAnnotationOptions {
  /** Turn measurement off while preserving the annotations. Default true. */
  enabled?: boolean
  /** Use a named font for consistent canvas/SVG metrics. Default "Arial, sans-serif". */
  fontFamily?: string
  /** Note text size in CSS pixels. Default 12. */
  fontSize?: number
  /** Baseline spacing in CSS pixels. Default max(16, fontSize * 1.35). */
  lineHeight?: number
  /** Body weight. Default 400. */
  fontWeight?: string | number
  /** Title weight, measured separately from the body. Default 700. */
  titleFontWeight?: string | number
}

export function resolvePretextOptions(options: PretextAnnotationOptions) {
  const fontSize =
    Number.isFinite(options.fontSize) && options.fontSize! > 0
      ? options.fontSize!
      : 12
  return {
    fontFamily: options.fontFamily || "Arial, sans-serif",
    fontSize,
    lineHeight:
      Number.isFinite(options.lineHeight) && options.lineHeight! > 0
        ? options.lineHeight!
        : Math.max(16, fontSize * 1.35),
    fontWeight: options.fontWeight ?? 400,
    titleFontWeight: options.titleFontWeight ?? 700
  }
}

type Typography = ReturnType<typeof resolvePretextOptions>
export function pretextFonts(options: Typography): [string, string] {
  return [options.fontWeight, options.titleFontWeight].map(
    (weight) => `${weight} ${options.fontSize}px ${options.fontFamily}`
  ) as [string, string]
}

// Bound our retained handles and periodically release Pretext's shared segment
// cache too. Clearing it does not mutate existing prepared handles.
const CACHE_LIMIT = 128
let preparations = 0
function retain<K, V>(cache: Map<K, V>, key: K, value: V): V {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
  cache.set(key, value)
  return value
}

/** Reacquire fonts after loading, including WebKit's retained canvas font state. */
export function resetPretextFonts(): void {
  clearCache()
  // Changing the font forces WebKit to discard a stale resolved font. Pretext
  // currently retains its canvas even after clearCache(). Use a nonempty probe.
  prepareWithSegments("M", "1px serif")
  prepareWithSegments("M", "2px serif")
  preparations = 0
}

export function createPretextNoteMeasurer(
  options: Typography
): NonNullable<AnnotationNoteText["_noteLayout"]> | undefined {
  if (typeof document === "undefined" || typeof Intl.Segmenter !== "function")
    return undefined
  const ctx = document.createElement("canvas").getContext("2d")
  if (!ctx) return undefined
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
  const prepared = new Map<string, ReturnType<typeof prepareWithSegments>>()
  const layouts = new Map<string, AnnotationNoteLayout>()
  const [bodyFont, titleFont] = pretextFonts(options)
  const textProps = {
    "data-text-layout": "pretext",
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    fontWeight: options.fontWeight,
    fontStyle: "normal" as const
  }

  function linesFor(text: string, font: string, width: number): string[] {
    if (!text) return []
    const key = JSON.stringify([font, text])
    let handle = prepared.get(key)
    if (!handle) {
      if (++preparations >= CACHE_LIMIT) {
        clearCache()
        preparations = 0
      }
      handle = retain(prepared, key, prepareWithSegments(text, font))
    }
    const lines = layoutWithLines(handle, width, options.lineHeight).lines
    ctx!.font = font
    const fitted: string[] = []
    for (const line of lines) {
      // Validate whole painted runs, since shaping across a soft hyphen or an
      // OffscreenCanvas font discrepancy can make Pretext's advances too small.
      if (ctx!.measureText(line.text).width <= width + 0.25) {
        fitted.push(line.text)
        continue
      }
      const graphemes = Array.from(
        segmenter.segment(line.text),
        (g) => g.segment
      )
      let start = 0
      while (start < graphemes.length) {
        let low = 1
        let high = graphemes.length - start
        while (low < high) {
          const mid = Math.ceil((low + high) / 2)
          if (
            ctx!.measureText(graphemes.slice(start, start + mid).join(""))
              .width <= width
          )
            low = mid
          else high = mid - 1
        }
        const candidate = graphemes.slice(start, start + low)
        const space = candidate.lastIndexOf(" ")
        if (space > 0 && start + low < graphemes.length) low = space
        fitted.push(graphemes.slice(start, start + low).join(""))
        start += low
        while (graphemes[start] === " ") start++
      }
    }
    return fitted
  }

  return (note) => {
    const label = typeof note.label === "string" ? note.label : ""
    const title = typeof note.title === "string" ? note.title : ""
    const width = note.noWrap
      ? Infinity
      : Number.isFinite(note.wrap) && note.wrap! > 0
        ? note.wrap!
        : 120
    const key = JSON.stringify([label, title, width, !!note.noWrap])
    const cached = layouts.get(key)
    if (cached) return cached
    const labelLines = linesFor(label, bodyFont, width)
    const titleLines = linesFor(title, titleFont, width)
    let measuredWidth = 0
    for (const [lines, font] of [
      [labelLines, bodyFont],
      [titleLines, titleFont]
    ] as const) {
      ctx.font = font
      for (const line of lines)
        measuredWidth = Math.max(measuredWidth, ctx.measureText(line).width)
    }
    return retain(layouts, key, {
      textProps,
      lineHeight: options.lineHeight,
      titleFontWeight: options.titleFontWeight,
      labelLines,
      titleLines,
      width: measuredWidth,
      height:
        (labelLines.length + titleLines.length) * options.lineHeight +
        (labelLines.length && titleLines.length ? 2 : 0)
    })
  }
}
