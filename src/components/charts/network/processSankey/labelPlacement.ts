import type { ProcessSankeyBandSpec } from "./streamingLayout"
import type { SlotByNode } from "./layoutGeometry"

const LABEL_FONT_SIZE = 11
const LABEL_LINE_GAP = 5

function estimatedLabelWidth(label: string): number {
  // Network labels use a semibold 11px sans-serif face. A conservative mean
  // glyph width catches collisions without requiring DOM text measurement,
  // keeping CSR, SSR, and headless scene construction identical.
  return Math.max(18, label.length * LABEL_FONT_SIZE * 0.58)
}

function labelHorizontalBounds(band: ProcessSankeyBandSpec): [number, number] {
  // Vertical labels sit side-by-side across lanes. Use a more conservative
  // width than the horizontal end-label pass because adjacent glyphs on the
  // same stage are much easier to read as one accidental word.
  const width = estimatedLabelWidth(band.labelText) * 1.22 + 4
  if (band.labelAnchor === "start") return [band.labelX, band.labelX + width]
  if (band.labelAnchor === "middle") return [band.labelX - width / 2, band.labelX + width / 2]
  return [band.labelX - width, band.labelX]
}

function horizontallyOverlaps(a: ProcessSankeyBandSpec, b: ProcessSankeyBandSpec): boolean {
  const aLeft = a.labelX - estimatedLabelWidth(a.labelText)
  const bLeft = b.labelX - estimatedLabelWidth(b.labelText)
  return aLeft <= b.labelX + 3 && bLeft <= a.labelX + 3
}

/**
 * Hug placement can bring distinct packed rows closer together than the label
 * line height. A single cluster pass is insufficient: moving one label can
 * create a new collision with the next row. Preserve the original vertical
 * order and alternate bounded forward/backward constraint sweeps until every
 * horizontally intersecting text range has a full line of separation.
 */
function resolveCrossRowCollisions(bands: ProcessSankeyBandSpec[], plotH: number): void {
  const spacing = LABEL_FONT_SIZE + LABEL_LINE_GAP
  const ordered = [...bands].sort((a, b) =>
    a.labelY - b.labelY || a.labelX - b.labelX || a.id.localeCompare(b.id),
  )

  for (let pass = 0; pass < 3; pass += 1) {
    for (let index = 0; index < ordered.length; index += 1) {
      let lowerBound = 8
      for (let previous = 0; previous < index; previous += 1) {
        if (horizontallyOverlaps(ordered[index], ordered[previous])) {
          lowerBound = Math.max(lowerBound, ordered[previous].labelY + spacing)
        }
      }
      ordered[index].labelY = Math.max(ordered[index].labelY, lowerBound)
    }

    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      let upperBound = plotH - 8
      for (let next = index + 1; next < ordered.length; next += 1) {
        if (horizontallyOverlaps(ordered[index], ordered[next])) {
          upperBound = Math.min(upperBound, ordered[next].labelY - spacing)
        }
      }
      ordered[index].labelY = Math.min(ordered[index].labelY, upperBound)
    }
  }
}

/**
 * Reused rows can contain consecutive node bands whose starts are only a few
 * pixels apart. Their end-anchored labels otherwise paint over one another.
 * Stagger only horizontally-overlapping clusters within the same packed row.
 */
export function staggerProcessSankeyLabels(
  bands: readonly ProcessSankeyBandSpec[],
  slotByNode: SlotByNode,
  plotH: number,
): ProcessSankeyBandSpec[] {
  const resolved = bands.map((band) => ({ ...band }))
  const bySlot = new Map<number, ProcessSankeyBandSpec[]>()
  for (const band of resolved) {
    const slot = slotByNode[band.id]
    if (slot == null) continue
    const rows = bySlot.get(slot) ?? []
    rows.push(band)
    bySlot.set(slot, rows)
  }

  const resolveCluster = (cluster: ProcessSankeyBandSpec[]): void => {
    if (cluster.length < 2) return
    const base = cluster.reduce((sum, band) => sum + band.labelY, 0) / cluster.length
    const spacing = LABEL_FONT_SIZE + LABEL_LINE_GAP
    const middle = (cluster.length - 1) / 2
    cluster.forEach((band, index) => {
      band.labelY = Math.max(8, Math.min(plotH - 8, base + (index - middle) * spacing))
    })
  }

  for (const rows of bySlot.values()) {
    rows.sort((a, b) => a.labelX - b.labelX || a.id.localeCompare(b.id))
    let cluster: ProcessSankeyBandSpec[] = []
    let clusterRight = -Infinity
    for (const band of rows) {
      const left = band.labelX - estimatedLabelWidth(band.labelText)
      if (cluster.length > 0 && left > clusterRight + 3) {
        resolveCluster(cluster)
        cluster = []
        clusterRight = -Infinity
      }
      cluster.push(band)
      clusterRight = Math.max(clusterRight, band.labelX)
    }
    resolveCluster(cluster)
  }
  resolveCrossRowCollisions(resolved, plotH)
  return resolved
}

/**
 * A vertical river can have many nodes opening on the same historical stage.
 * Place those labels in compact rows within the preceding inter-stage gap.
 * This is intentionally a label-only pass: it never changes band ordering or
 * geometry, and labels at distinct stages cannot push one another downstream.
 */
export function staggerVerticalProcessSankeyLabels(
  bands: readonly ProcessSankeyBandSpec[],
  plotW: number,
  plotH: number,
): ProcessSankeyBandSpec[] {
  const resolved = bands.map((band) => ({ ...band }))
  for (const band of resolved) {
    const width = estimatedLabelWidth(band.labelText) * 1.22 + 4
    if (width >= plotW - 4) band.labelX = plotW / 2
    else band.labelX = Math.max(width / 2 + 2, Math.min(plotW - width / 2 - 2, band.labelX))
  }
  const groups: ProcessSankeyBandSpec[][] = []
  const ordered = [...resolved].sort((a, b) => a.labelY - b.labelY || a.labelX - b.labelX)
  const spacing = LABEL_FONT_SIZE + 3

  for (const band of ordered) {
    const group = groups[groups.length - 1]
    if (!group || Math.abs(group[0].labelY - band.labelY) > spacing) groups.push([band])
    else group.push(band)
  }

  for (const group of groups) {
    group.sort((a, b) => a.labelX - b.labelX || a.id.localeCompare(b.id))
    const rowRightEdges: number[] = []
    const rowByBand = new Map<ProcessSankeyBandSpec, number>()
    for (const band of group) {
      const [left, right] = labelHorizontalBounds(band)
      let row = rowRightEdges.findIndex((rowRight) => left > rowRight + 8)
      if (row === -1) row = rowRightEdges.length
      rowRightEdges[row] = right
      rowByBand.set(band, row)
    }

    const base = group.reduce((sum, band) => sum + band.labelY, 0) / group.length
    const rows = rowRightEdges.length
    const useDownstreamGap = base < rows * spacing + 8
    for (const band of group) {
      const row = rowByBand.get(band) ?? 0
      band.labelY = useDownstreamGap
        ? Math.min(plotH - 8, 12 + row * spacing)
        : Math.max(8, base - row * spacing)
    }
  }

  return resolved
}

export interface ProcessSankeyLabelDensityOptions {
  /**
   * Explicit author priority per band id (higher keeps first under `"auto"`).
   * When omitted, density falls back to label-width + geometric stand-in.
   */
  priorityById?: ReadonlyMap<string, number>
  /**
   * Optional hard cap on visible labels (after the area-based budget). Useful
   * for compact vertical rivers that should never exceed N stage labels.
   */
  maxLabels?: number
}

/**
 * Density-aware label filter for `showLabels="auto"`. Keeps higher-priority
 * bands until the plot's label budget is exhausted. Shed labels retain their
 * text as `labelFullText` with `labelDeferred: true` so selection/hover can
 * re-surface them without a layout recompute. Deterministic CSR/SSR.
 */
export function applyProcessSankeyLabelDensity(
  bands: readonly ProcessSankeyBandSpec[],
  plotW: number,
  plotH: number,
  mode: boolean | "auto",
  options: ProcessSankeyLabelDensityOptions = {},
): ProcessSankeyBandSpec[] {
  if (mode === false) {
    return bands.map((band) => ({
      ...band,
      labelText: "",
      labelDeferred: false,
      labelFullText: undefined,
    }))
  }
  if (mode === true) {
    return bands.map((band) => ({
      ...band,
      labelDeferred: false,
      labelFullText: undefined,
    }))
  }

  const area = Math.max(1, plotW * plotH)
  // ~one label per 14k px², floor 4, cap at band count.
  let budget = Math.max(4, Math.min(bands.length, Math.floor(area / 14_000)))
  if (Number.isFinite(options.maxLabels) && options.maxLabels! >= 0) {
    budget = Math.min(budget, Math.floor(options.maxLabels!))
  }
  const ranked = bands
    .map((band, index) => {
      const explicit = options.priorityById?.get(band.id)
      const massProxy = Math.abs(band.labelY)
      // Explicit priority dominates; fall back to width + geometry proxy.
      const score = explicit != null && Number.isFinite(explicit)
        ? explicit * 1e6 + estimatedLabelWidth(band.labelText)
        : estimatedLabelWidth(band.labelText) + massProxy * 0.01
      return { band, index, score }
    })
    .filter((entry) => entry.band.labelText.trim().length > 0)
    .sort((a, b) =>
      b.score - a.score || a.index - b.index || a.band.id.localeCompare(b.band.id),
    )

  const keep = new Set(ranked.slice(0, budget).map((entry) => entry.band.id))
  return bands.map((band) => {
    if (keep.has(band.id) || band.labelText.trim().length === 0) {
      return { ...band, labelDeferred: false, labelFullText: undefined }
    }
    return {
      ...band,
      labelFullText: band.labelText,
      labelText: "",
      labelDeferred: true,
    }
  })
}
