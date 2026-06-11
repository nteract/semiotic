/**
 * Render evidence — a structured readout of what a server-rendered chart
 * actually drew, so agents can verify a render produced data marks without
 * parsing SVG themselves.
 *
 * Pure string analysis with no React/DOM dependency: this module is shared
 * between `semiotic/server` (`renderChartWithEvidence`) and the bundled MCP
 * server, and must stay free of chart-family imports.
 *
 * Handles both server output dialects:
 *  - HOC SSR markup: a wrapper `<div role="img" aria-label="…">` holding a
 *    data-mark `<svg>` plus an overlay `<svg role="img">` with
 *    `semiotic-axis` groups and `semiotic-axis-tick` text labels.
 *  - Standalone `renderChart` SVG: a single `<svg role="img">` with stable
 *    group ids (`data-area`, `axes`, `grid`, `annotations`, `legend`).
 */

export interface AxisEvidence {
  /** "bottom" | "left" | "right" | "top" for overlay axes; "axes" when the dialect doesn't carry orientation */
  orient: string
  /** Resolved tick labels in render order */
  tickLabels: string[]
  /** First and last tick label — the resolved domain ends as drawn */
  domain: [string, string] | null
}

export interface RenderEvidence {
  /** True when the chart drew no geometric data marks */
  empty: boolean
  /** Data-mark element counts keyed by SVG tag (rect, circle, path, line, text, …) */
  markCounts: Record<string, number>
  /** Total geometric data marks (text labels excluded) */
  totalMarks: number
  /** Resolved axis tick labels and domains, one entry per rendered axis */
  axes: AxisEvidence[]
  /** Number of annotations the caller passed in props */
  annotationCount: number
  /** aria-label / <title> the chart exposes to assistive tech */
  accessibleName: string | null
  title: string | null
  description: string | null
}

const GEOMETRIC_TAGS = ["rect", "circle", "ellipse", "line", "path", "polygon", "polyline"]
const MARK_TAGS = [...GEOMETRIC_TAGS, "text"]

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x?\d+;?/g, (m) => {
      const code = m.startsWith("&#x") ? parseInt(m.slice(3), 16) : parseInt(m.slice(2), 10)
      return Number.isFinite(code) ? String.fromCharCode(code) : m
    })
    .replace(/&amp;/g, "&")
}

interface GroupRegion {
  openTag: string
  inner: string
  start: number
  end: number
}

/** Find balanced <g>…</g> regions whose opening tag satisfies the predicate. */
function findGroups(markup: string, predicate: (openTag: string) => boolean): GroupRegion[] {
  const regions: GroupRegion[] = []
  const tagPattern = /<g\b[^>]*>|<\/g>/g
  const stack: Array<{ openTag: string; matched: boolean; start: number; contentStart: number }> = []
  let match: RegExpExecArray | null
  while ((match = tagPattern.exec(markup)) !== null) {
    const token = match[0]
    if (token.startsWith("</")) {
      const top = stack.pop()
      if (top && top.matched) {
        regions.push({
          openTag: top.openTag,
          inner: markup.slice(top.contentStart, match.index),
          start: top.start,
          end: match.index + token.length,
        })
      }
    } else if (!token.endsWith("/>")) {
      stack.push({
        openTag: token,
        matched: predicate(token),
        start: match.index,
        contentStart: match.index + token.length,
      })
    }
  }
  return regions
}

/** Drop regions fully contained inside another region in the same list. */
function outermostOnly(regions: GroupRegion[]): GroupRegion[] {
  return regions.filter(
    (region) => !regions.some((other) => other !== region && other.start < region.start && region.end <= other.end)
  )
}

function countTags(markup: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const tag of MARK_TAGS) {
    const pattern = new RegExp(`<${tag}\\b`, "g")
    const found = markup.match(pattern)
    if (found && found.length > 0) counts[tag] = found.length
  }
  return counts
}

function subtractCounts(base: Record<string, number>, removed: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [tag, count] of Object.entries(base)) {
    const remaining = count - (removed[tag] ?? 0)
    if (remaining > 0) result[tag] = remaining
  }
  return result
}

function mergeCounts(target: Record<string, number>, source: Record<string, number>): void {
  for (const [tag, count] of Object.entries(source)) {
    target[tag] = (target[tag] ?? 0) + count
  }
}

function attrValue(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`))
  return match ? decodeEntities(match[1]) : null
}

const NON_DATA_GROUP = /\b(?:id="[^"]*(?:axes|grid|annotations|legend)"|class="[^"]*(?:semiotic-axis|semiotic-grid|stream-axes|ordinal-axes)[^"]*")/

/** Split the markup into top-level <svg>…</svg> regions. */
function svgRegions(markup: string): Array<{ openTag: string; full: string }> {
  const regions: Array<{ openTag: string; full: string }> = []
  const pattern = /<svg\b[^>]*>[\s\S]*?<\/svg>/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(markup)) !== null) {
    const openEnd = match[0].indexOf(">")
    regions.push({ openTag: match[0].slice(0, openEnd + 1), full: match[0] })
  }
  return regions
}

function extractMarkCounts(svg: string): Record<string, number> {
  const dataAreaGroups = outermostOnly(findGroups(svg, (tag) => /id="[^"]*data-area"/.test(tag)))
  if (dataAreaGroups.length > 0) {
    // Standalone server SVG: marks live in data-area, minus nested chrome groups.
    const counts: Record<string, number> = {}
    for (const area of dataAreaGroups) {
      const chrome = outermostOnly(findGroups(area.inner, (tag) => NON_DATA_GROUP.test(tag)))
      const removed: Record<string, number> = {}
      for (const group of chrome) mergeCounts(removed, countTags(group.inner))
      mergeCounts(counts, subtractCounts(countTags(area.inner), removed))
    }
    return counts
  }

  // HOC SSR markup: data marks render in <svg> layers without role="img";
  // axes, annotations, legend, and title live in the role="img" overlay.
  const layers = svgRegions(svg)
  const dataLayers = layers.filter((layer) => !/\brole="img"/.test(layer.openTag))
  if (dataLayers.length > 0) {
    const counts: Record<string, number> = {}
    for (const layer of dataLayers) mergeCounts(counts, countTags(layer.full))
    return counts
  }

  // Single-svg fallback: count everything outside recognizable chrome groups.
  const chrome = outermostOnly(findGroups(svg, (tag) => NON_DATA_GROUP.test(tag)))
  const removed: Record<string, number> = {}
  for (const group of chrome) mergeCounts(removed, countTags(group.inner))
  return subtractCounts(countTags(svg), removed)
}

function extractAxes(svg: string): AxisEvidence[] {
  const axes: AxisEvidence[] = []
  const overlayAxes = outermostOnly(findGroups(svg, (tag) => /class="[^"]*\bsemiotic-axis\b/.test(tag)))
  if (overlayAxes.length > 0) {
    for (const group of overlayAxes) {
      const orient =
        attrValue(group.openTag, "data-orient") ??
        group.openTag.match(/semiotic-axis-(\w+)/)?.[1] ??
        "axes"
      const tickLabels: string[] = []
      const tickPattern = /<text\b[^>]*class="[^"]*semiotic-axis-tick[^"]*"[^>]*>([\s\S]*?)<\/text>/g
      let tick: RegExpExecArray | null
      while ((tick = tickPattern.exec(group.inner)) !== null) {
        tickLabels.push(decodeEntities(tick[1].replace(/<[^>]*>/g, "")))
      }
      axes.push({
        orient,
        tickLabels,
        domain: tickLabels.length > 0 ? [tickLabels[0], tickLabels[tickLabels.length - 1]] : null,
      })
    }
    return axes
  }

  // Standalone dialect: a single id$="axes" group with untagged tick text.
  const standaloneAxes = outermostOnly(findGroups(svg, (tag) => /id="[^"]*axes"/.test(tag)))
  for (const group of standaloneAxes) {
    const tickLabels: string[] = []
    const textPattern = /<text\b[^>]*>([\s\S]*?)<\/text>/g
    let text: RegExpExecArray | null
    while ((text = textPattern.exec(group.inner)) !== null) {
      tickLabels.push(decodeEntities(text[1].replace(/<[^>]*>/g, "")))
    }
    axes.push({
      orient: "axes",
      tickLabels,
      domain: tickLabels.length > 0 ? [tickLabels[0], tickLabels[tickLabels.length - 1]] : null,
    })
  }
  return axes
}

export function extractRenderEvidence(
  svg: string,
  options?: { annotations?: unknown }
): RenderEvidence {
  const annotations = options?.annotations
  const markCounts = extractMarkCounts(svg)
  const totalMarks = GEOMETRIC_TAGS.reduce((sum, tag) => sum + (markCounts[tag] ?? 0), 0)

  const ariaLabel = svg.match(/\baria-label="([^"]*)"/)
  const title = svg.match(/<title\b[^>]*>([\s\S]*?)<\/title>/)
  const description = svg.match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/)

  return {
    empty: totalMarks === 0,
    markCounts,
    totalMarks,
    axes: extractAxes(svg),
    annotationCount: Array.isArray(annotations) ? annotations.length : 0,
    accessibleName: ariaLabel ? decodeEntities(ariaLabel[1]) : title ? decodeEntities(title[1]) : null,
    title: title ? decodeEntities(title[1]) : null,
    description: description ? decodeEntities(description[1]) : null,
  }
}
