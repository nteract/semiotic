"use client"
import type { Ref, RefObject } from "react"
import { useMemo, useRef } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getSize } from "./colorUtils"
import type { Datum } from "./datumTypes"
import { encodingDomain, type EncodingDomainOptions } from "./useEncodingDomain"
import { useFrameImperativeHandle } from "./useFrameImperativeHandle"

type SizeFrame = Pick<RealtimeFrameHandle, "push" | "pushMany" | "clear">

/** Keep point sizes and the chart's retained-data handle in sync. */
export function useSizeEncoding(
  ref: Ref<RealtimeFrameHandle> | undefined,
  frameRef: RefObject<SizeFrame | null>,
  options: EncodingDomainOptions & { range: [number, number] },
  variant: "xy" | "geo-points" = "xy"
): ((datum: Datum) => number) | undefined {
  const { accessor, data, isPushMode, range } = options
  const pushedDomain = useRef<[number, number] | undefined>(undefined)
  const boundedDomain = useMemo(
    () => encodingDomain(data, accessor),
    [data, accessor]
  )
  // Frames compute the whole retained scene after a push. Update the domain
  // before forwarding so every radius reads the new domain in that paint,
  // without scheduling a second React render for each new extreme.
  const trackPushed = (rows: Parameters<SizeFrame["pushMany"]>[0]) => {
    if (!isPushMode) return
    pushedDomain.current = encodingDomain(rows, accessor, pushedDomain.current)
  }
  useFrameImperativeHandle(ref, {
    variant,
    frameRef,
    overrides: {
      push: (datum) => {
        trackPushed([datum])
        frameRef.current?.push(datum)
      },
      pushMany: (rows) => {
        trackPushed(rows)
        frameRef.current?.pushMany(rows)
      },
      clear: () => {
        pushedDomain.current = undefined
        frameRef.current?.clear()
      }
    }
  })
  return useMemo(
    () =>
      accessor
        ? (datum: Datum) =>
            // Read the live domain at paint time, including after clear().
            // Until finite values arrive, the fallback keeps sizes clamped.
            getSize(
              datum,
              accessor,
              range,
              (isPushMode ? pushedDomain.current : boundedDomain) ?? [0, 1]
            )
        : undefined,
    [accessor, range, isPushMode, boundedDomain]
  )
}
