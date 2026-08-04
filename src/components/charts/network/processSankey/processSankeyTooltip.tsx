"use client"
import * as React from "react"
import { useCallback, useMemo } from "react"
import type { Datum } from "../../shared/datumTypes"
import type { ChartAccessor } from "../../shared/types"
import type { HoverData } from "../../../realtime/types"
import type { ProcessSankeyLayout } from "./processSankeyTypes"
import { massHistoryRows, pickMassQuantiles } from "./tooltipUtils"
import { isProcessSankeyScenePayload } from "./streamingLayout"
import { normalizeTooltip, type TooltipProp } from "../../../Tooltip/Tooltip"
import { readChartAccessor } from "./accessors"
import {
  toProcessSankeyTime,
  type ProcessSankeyTimeLike,
} from "./time"

type TimeLike = ProcessSankeyTimeLike

export interface UseProcessSankeyTooltipOptions<
  _TNode extends Datum,
  TEdge extends Datum,
> {
  tooltip: TooltipProp | undefined
  enableHover: boolean
  layout: ProcessSankeyLayout | null
  timeFormat?: (d: number | Date) => string | React.ReactNode
  valueFormat?: (d: number) => string | React.ReactNode
  sourceAccessor: ChartAccessor<TEdge, string>
  targetAccessor: ChartAccessor<TEdge, string>
  valueAccessor: ChartAccessor<TEdge, number>
  startTimeAccessor: ChartAccessor<TEdge, TimeLike>
  endTimeAccessor: ChartAccessor<TEdge, TimeLike>
}

/**
 * Default band/ribbon tooltip content for ProcessSankey. Custom `tooltip`
 * fully overrides; false disables.
 */
export function useProcessSankeyTooltipContent<
  _TNode extends Datum = Datum,
  TEdge extends Datum = Datum,
>(
  options: UseProcessSankeyTooltipOptions<_TNode, TEdge>,
): (d: HoverData) => React.ReactNode {
  const {
    tooltip,
    enableHover,
    layout,
    timeFormat,
    valueFormat,
    sourceAccessor,
    targetAccessor,
    valueAccessor,
    startTimeAccessor,
    endTimeAccessor,
  } = options

  const customTooltipFn = useMemo(() => {
    if (tooltip === false || !enableHover) return null
    if (tooltip === undefined || tooltip === true) return null
    return normalizeTooltip(tooltip) || null
  }, [tooltip, enableHover])

  const formatTime = useCallback((t: number): React.ReactNode => {
    if (timeFormat) return timeFormat(new Date(t))
    // Real timestamps (ms since epoch) sit above ~1e10; small integers are
    // tick numbers and must print as-is (not as 1970-01-01).
    if (!Number.isFinite(t)) return ""
    if (Math.abs(t) < 1e10) {
      return Number.isInteger(t) ? String(t) : t.toFixed(2)
    }
    return new Date(t).toISOString().slice(0, 10)
  }, [timeFormat])

  const formatValue = useCallback((v: number): React.ReactNode => {
    if (valueFormat) return valueFormat(v)
    return String(v)
  }, [valueFormat])

  return useCallback((d: HoverData): React.ReactNode => {
    if (!d || !d.data) return null
    const payload = d.data
    if (!isProcessSankeyScenePayload(payload)) return null
    const userDatum = payload.data
    if (customTooltipFn) return customTooltipFn(userDatum)

    if (payload.__kind === "band") {
      const nodeId = payload.id
      const rows = layout ? massHistoryRows(layout.nodeData[nodeId]) : []
      const MAX = 5
      const truncated = rows.length > MAX ? rows.length : null
      const display = pickMassQuantiles(rows, MAX)
      return (
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{nodeId}</div>
          {display.length > 0 && (
            <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
              <thead>
                <tr style={{ opacity: 0.6 }}>
                  <th style={{ textAlign: "left", fontWeight: 500, paddingRight: 8 }}>Time</th>
                  <th style={{ textAlign: "right", fontWeight: 500 }}>Mass</th>
                  {truncated != null && <th />}
                </tr>
              </thead>
              <tbody>
                {display.map((r, i) => (
                  <tr key={i}>
                    <td style={{ paddingRight: 8 }}>{formatTime(r.t)}</td>
                    <td style={{ textAlign: "right" }}>{formatValue(r.total)}</td>
                    {truncated != null && (
                      <td style={{ textAlign: "right", paddingLeft: 8, opacity: 0.55 }}>{r.mark}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {truncated != null && (
            <div style={{ marginTop: 4, fontSize: 10, opacity: 0.55 }}>
              showing {display.length} of {truncated} samples
            </div>
          )}
        </div>
      )
    }

    const e = userDatum as TEdge
    const src = readChartAccessor(sourceAccessor as ChartAccessor<TEdge, string>, e)
    const tgt = readChartAccessor(targetAccessor as ChartAccessor<TEdge, string>, e)
    const val = readChartAccessor(valueAccessor as ChartAccessor<TEdge, number>, e)
    const start = readChartAccessor(startTimeAccessor as ChartAccessor<TEdge, TimeLike>, e)
    const end = readChartAccessor(endTimeAccessor as ChartAccessor<TEdge, TimeLike>, e)
    return (
      <div style={{ minWidth: 160 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {String(src)} → {String(tgt)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 8, fontSize: 11 }}>
          {val != null && (<><span style={{ opacity: 0.6 }}>value</span>
            <span style={{ textAlign: "right" }}>{formatValue(Number(val))}</span></>)}
          {start != null && (<><span style={{ opacity: 0.6 }}>start</span>
            <span style={{ textAlign: "right" }}>{formatTime(toProcessSankeyTime(start as TimeLike))}</span></>)}
          {end != null && (<><span style={{ opacity: 0.6 }}>end</span>
            <span style={{ textAlign: "right" }}>{formatTime(toProcessSankeyTime(end as TimeLike))}</span></>)}
        </div>
      </div>
    )
  }, [
    layout, customTooltipFn, formatTime, formatValue,
    sourceAccessor, targetAccessor, valueAccessor, startTimeAccessor, endTimeAccessor,
  ])
}
