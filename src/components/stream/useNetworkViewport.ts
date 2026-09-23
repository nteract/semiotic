"use client"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { RefObject } from "react"
import type { NetworkHtmlMark } from "./networkCustomLayout"
import type {
  NetworkViewportProps,
  NetworkViewportRect,
  NetworkViewportSnapshot
} from "./networkViewportTypes"
import {
  intersectNetworkRects,
  measureNetworkViewport,
  networkRectIntersects,
  networkViewportClips,
  resolveNetworkScrollContainer
} from "./networkViewportGeometry"
import { shallowEqualTwoLevel } from "./shallowEqual"

const EMPTY_MARKS: NetworkHtmlMark[] = []

interface Options extends NetworkViewportProps {
  containerRef: RefObject<HTMLDivElement | null>
  marks: NetworkHtmlMark[] | undefined
  width?: number
  height?: number
  margin: { left: number; top: number }
  focusedId: string | null
}

/** One frame-local measurement owner for culling and viewport subscribers. */
export function useNetworkViewport({
  containerRef,
  marks: suppliedMarks,
  width,
  height,
  margin,
  focusedId,
  viewport,
  htmlMarkCulling,
  onViewportChange
}: Options) {
  const marks = suppliedMarks ?? EMPTY_MARKS
  const [windowRect, setWindowRect] = useState<NetworkViewportRect | null>(null)
  const binding = useRef<{
    layer: HTMLElement
    root: HTMLElement | null
    clips: ReturnType<typeof networkViewportClips>
    schedule: () => void
    dispose: () => void
  } | null>(null)
  // Schedule geometry changes on an existing binding. A new/replaced binding
  // measures immediately in the effect below and cancels any old queued work.
  useLayoutEffect(() => {
    binding.current?.schedule()
  }, [marks, width, height, margin.left, margin.top])

  // Resolve refs after every commit: changing ref.current does not change the
  // ref object's identity. Rebind only if the actual DOM/clip targets changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve ref targets after each commit; equal geometry preserves state and subscriptions
  useLayoutEffect(() => {
    const layer = containerRef.current
    const root = layer ? resolveNetworkScrollContainer(layer, viewport) : null
    const clips = layer && root ? networkViewportClips(layer, root) : []
    const previous = binding.current
    const same =
      previous?.layer === layer &&
      previous?.root === root &&
      previous.clips.length === clips.length &&
      clips.every((clip, i) => shallowEqualTwoLevel(clip, previous.clips[i]))
    if (!same) {
      previous?.dispose()
      binding.current = null
      if (!layer || !root) {
        setWindowRect(null)
      } else {
        const win = layer.ownerDocument.defaultView!
        let pending: number | null = null
        const measure = () => {
          pending = null
          const next = measureNetworkViewport(layer, root, clips)
          setWindowRect((old) => (shallowEqualTwoLevel(old, next) ? old : next))
        }
        const schedule = () => {
          if (pending === null) pending = win.requestAnimationFrame(measure)
        }
        // A capture listener also sees non-bubbling nested and outer scrolls.
        // All consumers share this subscription and measurement pass.
        layer.ownerDocument.addEventListener("scroll", schedule, {
          passive: true,
          capture: true
        })
        win.addEventListener("resize", schedule, { passive: true })
        const observer = new ResizeObserver(schedule)
        const observed = new Set([
          root,
          layer.parentElement!,
          ...clips.map((clip) => clip.element)
        ])
        for (const element of observed) observer.observe(element)
        const dispose = () => {
          if (pending !== null) win.cancelAnimationFrame(pending)
          observer.disconnect()
          layer.ownerDocument.removeEventListener("scroll", schedule, true)
          win.removeEventListener("resize", schedule)
        }
        binding.current = { layer, root, clips, schedule, dispose }
        // First measurement in a commit avoids flashing off-screen cards.
        measure()
      }
    }
  })

  useLayoutEffect(
    () => () => {
      binding.current?.dispose()
      binding.current = null
    },
    []
  )

  const overscan =
    Number.isFinite(htmlMarkCulling?.overscan) &&
    htmlMarkCulling!.overscan! >= 0
      ? htmlMarkCulling!.overscan!
      : 400
  const result = useMemo(() => {
    const plot =
      width != null && height != null ? { x: 0, y: 0, width, height } : null
    const visibleRect =
      windowRect && plot ? intersectNetworkRects(windowRect, plot) : windowRect
    const padded = windowRect
      ? {
          x: windowRect.x - overscan,
          y: windowRect.y - overscan,
          width: windowRect.width + 2 * overscan,
          height: windowRect.height + 2 * overscan
        }
      : null
    const renderRect =
      padded && plot ? intersectNetworkRects(padded, plot) : padded
    const pins = new Set(htmlMarkCulling?.pinnedIds)
    if (focusedId !== null) pins.add(focusedId)
    const mounted =
      htmlMarkCulling?.enabled === false || !renderRect
        ? marks
        : marks.filter(
            (mark) =>
              pins.has(mark.id) || networkRectIntersects(renderRect, mark)
          )
    const snapshot: NetworkViewportSnapshot = {
      visibleRect,
      renderRect,
      visibleMarkIds: visibleRect
        ? marks
            .filter((mark) => networkRectIntersects(visibleRect, mark))
            .map((mark) => mark.id)
        : null,
      mountedMarkIds: mounted.map((mark) => mark.id)
    }
    return { mounted, snapshot }
  }, [
    marks,
    windowRect,
    width,
    height,
    overscan,
    htmlMarkCulling?.enabled,
    htmlMarkCulling?.pinnedIds,
    focusedId
  ])

  const notified = useRef<NetworkViewportSnapshot | undefined>(undefined)
  useEffect(() => {
    if (!onViewportChange) {
      notified.current = undefined
      return
    }
    if (!shallowEqualTwoLevel(notified.current, result.snapshot)) {
      notified.current = result.snapshot
      onViewportChange(result.snapshot)
    }
  }, [onViewportChange, result.snapshot])
  return result.mounted
}
