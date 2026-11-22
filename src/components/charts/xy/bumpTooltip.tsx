import { buildLineNode } from "../../stream/SceneGraph"
import { cacheMultiHoverScene } from "../../stream/xyMultiHover"
import * as React from "react"
import { useCallback, useMemo } from "react"
import {
  TooltipRoot,
  hasOwnTooltipChrome,
  isMultiTooltipConfig,
  markTooltipChrome,
  normalizeTooltip,
  type TooltipProp,
} from "../../Tooltip/Tooltip"
import type { Datum } from "../shared/datumTypes"
import type { AxisConfig } from "../shared/types"
import type { RankedBumpDatum } from "./BumpChart"
import { createBumpXFormatter } from "./bumpData"

interface BumpTooltipOptions {
  tooltip?: TooltipProp
  xValues: unknown[]
  xFormat?: AxisConfig["xFormat"]
  yFormat?: AxisConfig["yFormat"]
}

export function createBumpHoverScene() {
  return cacheMultiHoverScene((scene, scales) => scene.flatMap(node => {
    if (node.type !== "area" || !node.datum) return []
    const rows = Array.from(new Set(node.datum))
    const stroke = typeof node.style.fill === "string" ? node.style.fill : node.style.stroke
    return [buildLineNode(rows, scales, d => d.x, d => d.y, { stroke }, node.group)]
  }))
}

/**
 * Keep BumpChart's internal rank/value projection out of its public tooltip
 * contract. Single callbacks receive the authored row; multi callbacks receive
 * authored rows plus source values/ranks for every trajectory at the cursor.
 */
export function useBumpTooltip<TDatum extends Datum>({
  tooltip,
  xValues,
  xFormat,
  yFormat,
}: BumpTooltipOptions): {
  tooltip: TooltipProp
  formatX: NonNullable<AxisConfig["xFormat"]>
} {
  const formatX = useMemo(() => createBumpXFormatter(xValues, xFormat), [xFormat, xValues])

  const formatValue = useCallback((value: number) => {
    return yFormat ? yFormat(value) : value.toLocaleString()
  }, [yFormat])

  const config = isMultiTooltipConfig(tooltip) ? tooltip : undefined
  const multiTooltip = tooltip === "multi" || !!config
  const normalizedTooltip = useMemo(
    () => multiTooltip ? undefined : normalizeTooltip(tooltip),
    [multiTooltip, tooltip],
  )
  const singleTooltipContent = useCallback((hover: Datum) => {
    const internal = (hover?.data ?? hover) as RankedBumpDatum<TDatum> | undefined
    if (!internal || tooltip === false) return null
    if (normalizedTooltip) {
      return normalizedTooltip({
        ...hover,
        data: internal.__bumpRaw,
        __semioticHoverData: true,
      })
    }
    return (
      <TooltipRoot>
        <div style={{ fontWeight: 700 }}>{internal.__bumpSeries}</div>
        <div>{formatX(internal.x)} · Rank {internal.__bumpRank}</div>
        <div>Value: {formatValue(internal.__bumpValue)}</div>
      </TooltipRoot>
    )
  }, [formatValue, formatX, normalizedTooltip, tooltip])

  const multiTooltipContent = useCallback((hover: Datum) => {
    const hits = Array.isArray(hover.allSeries)
      ? hover.allSeries as Array<{
          group: string
          value: number
          color: string
          datum?: Datum
        }>
      : []
    const mappedHits = hits.map((hit) => {
      const internal = hit.datum as RankedBumpDatum<TDatum> | undefined
      return {
        ...hit,
        value: internal?.__bumpValue ?? hit.value,
        rank: internal?.__bumpRank,
        datum: internal?.__bumpRaw ?? hit.datum,
      }
    })
    const internal = (hover?.data ?? hover) as RankedBumpDatum<TDatum> | undefined
    const mappedHover: Datum = {
      ...(internal?.__bumpRaw ?? {}),
      xValue: hits[0]?.datum?.__bumpXValue ?? internal?.__bumpXValue ?? hover.xValue,
      allSeries: mappedHits,
    }

    if (typeof config?.content === "function") {
      return config.content(mappedHover)
    }

    const xIndex = hover.xValue ?? internal?.x
    return (
      <TooltipRoot>
        {xIndex != null && (
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{formatX(xIndex as number)}</div>
        )}
        {mappedHits.map((hit, index) => (
          <div key={`${hit.group}-${index}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: hit.color, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{hit.group}</span>
            <span>
              {hit.rank != null ? `Rank ${hit.rank} · ` : ""}
              {formatValue(hit.value)}
            </span>
          </div>
        ))}
      </TooltipRoot>
    )
  }, [config, formatValue, formatX])

  const resolvedTooltip = useMemo<TooltipProp>(() => {
    if (tooltip === false) return false
    // XYCustomChart normalizes these adapters again. Preserve ownership from
    // the consumer renderer even when its returned component is unmarked.
    const content = multiTooltip ? multiTooltipContent : singleTooltipContent
    const ownsChrome = multiTooltip
      ? hasOwnTooltipChrome(config?.content)
      : hasOwnTooltipChrome(normalizedTooltip)
    const adaptedContent = ownsChrome ? markTooltipChrome(content) : content
    return multiTooltip
      ? { ...config, mode: "multi", content: adaptedContent }
      : adaptedContent
  }, [config, multiTooltip, multiTooltipContent, normalizedTooltip, singleTooltipContent, tooltip])

  return { tooltip: resolvedTooltip, formatX }
}
