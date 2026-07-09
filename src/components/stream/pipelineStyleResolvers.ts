/**
 * Pure style / color-map resolution helpers for PipelineStore.
 * Accept a small context object so the store methods stay thin wrappers.
 */
import type { Datum } from "../charts/shared/datumTypes"
import { STREAMING_PALETTE } from "../charts/shared/colorUtils"
import type { PipelineConfig } from "./pipelineConfig"
import type { Style } from "./types"

export interface PipelineColorMapCache {
  key: string
  map: Map<string, string>
  version: number
}

export interface PipelineGroupDataCache {
  version: number
  group: ((d: Datum) => string) | undefined
  data: Datum[]
  result: { key: string; data: Datum[] }[]
}

export function groupPipelineData(
  data: Datum[],
  getGroup: ((d: Datum) => string) | undefined,
  ingestVersion: number,
  cache: PipelineGroupDataCache | null
): { result: { key: string; data: Datum[] }[]; cache: PipelineGroupDataCache } {
  if (
    cache &&
    cache.version === ingestVersion &&
    cache.group === getGroup &&
    cache.data === data
  ) {
    return { result: cache.result, cache }
  }

  let result: { key: string; data: Datum[] }[]
  if (!getGroup) {
    result = [{ key: "_default", data }]
  } else {
    const groups = new Map<string, Datum[]>()
    for (const d of data) {
      const key = getGroup(d)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(d)
    }
    result = Array.from(groups.entries()).map(([key, rows]) => ({
      key,
      data: rows
    }))
  }

  return {
    result,
    cache: { version: ingestVersion, group: getGroup, data, result }
  }
}

export function resolvePipelineColorMap(
  data: Datum[],
  getColor: ((d: Datum) => string) | undefined,
  config: Pick<PipelineConfig, "colorScheme" | "themeCategorical">,
  ingestVersion: number,
  cache: PipelineColorMapCache | null
): { map: Map<string, string>; cache: PipelineColorMapCache } {
  if (cache && cache.version === ingestVersion) {
    return { map: cache.map, cache }
  }

  const categories = new Set<string>()
  if (getColor) {
    for (const d of data) {
      const c = getColor(d)
      if (c) categories.add(c)
    }
  }
  const sorted = Array.from(categories).sort()
  const cacheKey = sorted.join("\0")

  if (cache && cache.key === cacheKey) {
    const refreshed = { ...cache, version: ingestVersion }
    return { map: refreshed.map, cache: refreshed }
  }

  const palette = Array.isArray(config.colorScheme)
    ? config.colorScheme
    : config.themeCategorical || STREAMING_PALETTE
  const colorMap = new Map<string, string>()
  for (let ci = 0; ci < sorted.length; ci++) {
    colorMap.set(sorted[ci], palette[ci % palette.length])
  }
  const next = { key: cacheKey, map: colorMap, version: ingestVersion }
  return { map: colorMap, cache: next }
}

export function resolvePipelineGroupColor(options: {
  group: string
  colorMapCache: PipelineColorMapCache | null
  groupColorMap: Map<string, string>
  groupColorCounter: number
  groupColorMapCap: number
  config: Pick<PipelineConfig, "colorScheme" | "themeCategorical">
}): { color: string | null; groupColorCounter: number } {
  const { group, colorMapCache, groupColorMap, groupColorMapCap, config } =
    options
  let { groupColorCounter } = options

  if (colorMapCache) {
    const c = colorMapCache.map.get(group)
    if (c) return { color: c, groupColorCounter }
  }
  const existing = groupColorMap.get(group)
  if (existing) return { color: existing, groupColorCounter }

  const userScheme =
    Array.isArray(config.colorScheme) && config.colorScheme.length > 0
      ? config.colorScheme
      : null
  const themePalette =
    Array.isArray(config.themeCategorical) &&
    config.themeCategorical.length > 0
      ? config.themeCategorical
      : null
  const palette = userScheme || themePalette || STREAMING_PALETTE
  if (palette.length === 0) return { color: null, groupColorCounter }

  const color = palette[groupColorCounter % palette.length]
  groupColorCounter++
  groupColorMap.set(group, color)

  if (groupColorMap.size > groupColorMapCap) {
    const oldestKey = groupColorMap.keys().next().value
    if (oldestKey !== undefined) groupColorMap.delete(oldestKey)
  }
  return { color, groupColorCounter }
}

export function resolvePipelineLineStyle(
  config: PipelineConfig,
  group: string,
  sampleDatum: Datum | undefined,
  resolveGroupColor: (group: string) => string | null
): Style {
  const ls = config.lineStyle
  if (typeof ls === "function") {
    const style = ls(sampleDatum || {}, group)
    if (style && !style.stroke && group) {
      const color = resolveGroupColor(group)
      if (color) return { ...style, stroke: color }
    }
    return style
  }
  const themePrimary = config.themeSemantic?.primary
  if (ls && typeof ls === "object") {
    return {
      stroke: ls.stroke || themePrimary || "#007bff",
      strokeWidth: ls.strokeWidth || 2,
      strokeDasharray: ls.strokeDasharray,
      fill: ls.fill,
      fillOpacity: ls.fillOpacity,
      opacity: ls.opacity
    }
  }
  const color = resolveGroupColor(group) || themePrimary || "#007bff"
  return { stroke: color, strokeWidth: 2 }
}

export function resolvePipelineAreaStyle(
  config: PipelineConfig,
  group: string,
  sampleDatum: Datum | undefined,
  resolveGroupColor: (group: string) => string | null
): Style {
  if (config.areaStyle) {
    const style = config.areaStyle(sampleDatum || {})
    if (style && !style.fill && group) {
      const color = resolveGroupColor(group)
      if (color)
        return { ...style, fill: color, stroke: style.stroke || color }
    }
    return style
  }
  const ls = config.lineStyle
  if (typeof ls === "function") {
    const style = ls(sampleDatum || {}, group)
    if (style && !style.fill && group) {
      const color = resolveGroupColor(group)
      if (color)
        return { ...style, fill: color, stroke: style.stroke || color }
    }
    return style
  }
  const themePrimary = config.themeSemantic?.primary
  if (ls && typeof ls === "object") {
    return {
      fill: ls.fill || ls.stroke || themePrimary || "#4e79a7",
      fillOpacity: ls.fillOpacity ?? 0.7,
      stroke: ls.stroke || themePrimary || "#4e79a7",
      strokeWidth: ls.strokeWidth || 2
    }
  }
  const color = resolveGroupColor(group) || themePrimary || "#4e79a7"
  return { fill: color, fillOpacity: 0.7, stroke: color, strokeWidth: 2 }
}

export function resolvePipelineBoundsStyle(
  config: PipelineConfig,
  group: string,
  sampleDatum: Datum | undefined,
  resolveLineStyle: (group: string, sampleDatum?: Datum) => Style
): Style {
  const bs = config.boundsStyle
  if (typeof bs === "function") {
    return bs(sampleDatum || {}, group)
  }
  if (bs && typeof bs === "object") {
    return bs
  }
  const lineStyle = resolveLineStyle(group, sampleDatum)
  return {
    fill: lineStyle.stroke || config.themeSemantic?.primary || "#4e79a7",
    fillOpacity: 0.2,
    stroke: "none"
  }
}
