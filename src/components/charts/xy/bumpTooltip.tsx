import * as React from "react"
import { useCallback, useMemo } from "react"
import {
  TooltipRoot,
  isMultiTooltip,
  isMultiTooltipConfig,
  normalizeTooltip,
  type TooltipProp,
} from "../../Tooltip/Tooltip"
import type { Datum } from "../shared/datumTypes"
import type { AxisConfig } from "../shared/types"
import type { RankedBumpDatum } from "./BumpChart"

interface BumpTooltipOptions {
  tooltip?: TooltipProp
  xValues: unknown[]
  xFormat?: AxisConfig["xFormat"]
  yFormat?: AxisConfig["yFormat"]
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
  formatX: (value: number | Date | string, index?: number) => React.ReactNode
} {
  const formatX = useCallback((value: number | Date | string, index?: number) => {
    if (xValues.length === 0) return ""
    const numericIndex = Math.max(0, Math.min(xValues.length - 1, Math.round(Number(value))))
    const raw = xValues[numericIndex] as number | Date | string
    return xFormat
      ? xFormat(raw, index)
      : String(raw instanceof Date ? raw.toLocaleDateString() : raw)
  }, [xFormat, xValues])

  const formatValue = useCallback((value: number) => {
    return yFormat ? yFormat(value) : value.toLocaleString()
  }, [yFormat])

  const multiTooltip = isMultiTooltip(tooltip)
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
      xValue: internal?.__bumpXValue ?? hover.xValue,
      allSeries: mappedHits,
    }

    if (isMultiTooltipConfig(tooltip) && typeof tooltip.content === "function") {
      return tooltip.content(mappedHover)
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
  }, [formatValue, formatX, tooltip])

  const resolvedTooltip = useMemo<TooltipProp>(() => {
    if (tooltip === false) return false
    return multiTooltip
      ? { mode: "multi", content: multiTooltipContent }
      : singleTooltipContent
  }, [multiTooltip, multiTooltipContent, singleTooltipContent, tooltip])

  return { tooltip: resolvedTooltip, formatX }
}
