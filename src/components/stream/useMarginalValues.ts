"use client"
import { useCallback, useEffect, useState, type RefObject } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { MarginalGraphicsConfig } from "./types"
import { collectMarginalValues } from "./MarginalGraphicsLazy"

type MarginalStore = { getData(): readonly Datum[] }

/** Keep React-owned marginal SVG values synchronized with the retained store. */
export function useMarginalValues(
  storeRef: RefObject<MarginalStore | null>,
  marginalGraphics: MarginalGraphicsConfig | undefined,
  data: readonly Datum[],
  xAccessor: unknown,
  yAccessor: unknown,
): {
  marginalXValues: number[]
  marginalYValues: number[]
  refreshMarginalValues: (data?: readonly Datum[]) => void
} {
  const [marginalXValues, setMarginalXValues] = useState<number[]>([])
  const [marginalYValues, setMarginalYValues] = useState<number[]>([])
  const hasMarginalGraphics = marginalGraphics != null
  const marginalConfigKey = hasMarginalGraphics
    ? [marginalGraphics.top, marginalGraphics.bottom, marginalGraphics.left, marginalGraphics.right].join("|")
    : ""

  const refreshMarginalValues = useCallback((nextData = storeRef.current?.getData() ?? []) => {
    const next = collectMarginalValues(nextData, xAccessor, yAccessor)
    setMarginalXValues(next.xValues)
    setMarginalYValues(next.yValues)
  }, [storeRef, xAccessor, yAccessor])

  useEffect(() => {
    if (!hasMarginalGraphics) {
      setMarginalXValues([])
      setMarginalYValues([])
      return
    }
    refreshMarginalValues()
  }, [data, hasMarginalGraphics, marginalConfigKey, refreshMarginalValues])

  return { marginalXValues, marginalYValues, refreshMarginalValues }
}
