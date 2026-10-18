"use client"
import * as React from "react"
import { FocusRing, type FocusRingProps } from "./FocusRing"
import { FlippingTooltip } from "../Tooltip/FlippingTooltip"
import { hasOwnTooltipChrome } from "../Tooltip/tooltipChrome"
import { DefaultNetworkTooltip } from "./networkDefaultTooltip"
import { projectNetworkPoint } from "./networkViewTransform"
import { useNetworkCameraView } from "./useNetworkCamera"
import { AriaLiveTooltip } from "./AccessibleDataTable"
import type { NetworkHoverStore } from "./networkHoverStore"
import type { NavPoint } from "./navigationGraph"
import type { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { StreamNetworkFrameProps } from "./networkTypes"
import type { NetworkViewTransform } from "./networkViewportTypes"

interface HoverSubscription {
  hoverStore: NetworkHoverStore
  kbFocusIndexRef: { current: number }
  focusedNavPointRef: { current: NavPoint | null }
}

function useHover(store: NetworkHoverStore, getSnapshot = store.getSnapshot) {
  return React.useSyncExternalStore(
    store.subscribe,
    getSnapshot,
    store.getServerSnapshot
  )
}

/** Kept outside the atomic role=img subtree, with no pointer-time datum scan. */
export function NetworkFrameLiveHover({
  hoverStore,
  kbFocusIndexRef,
  store
}: Omit<HoverSubscription, "focusedNavPointRef"> & {
  store: NetworkPipelineStore
}) {
  const hover = useHover(hoverStore, () =>
    kbFocusIndexRef.current >= 0 ? hoverStore.getSnapshot() : null
  )
  return (
    <AriaLiveTooltip
      hoverPoint={hover}
      scene={hover?.nodeOrEdge === "edge" ? store.sceneEdges : store.sceneNodes}
    />
  )
}

/** Screen-relative chrome subscribes independently of the retained frame. */
export function NetworkFrameHover({
  viewTransform,
  hoverStore,
  kbFocusIndexRef,
  focusedNavPointRef,
  enableHover,
  tooltipContent,
  margin,
  size,
  adjustedWidth,
  adjustedHeight
}: Pick<FocusRingProps, "margin" | "size"> &
  HoverSubscription & {
    viewTransform?: NetworkViewTransform
    enableHover: boolean
    tooltipContent: StreamNetworkFrameProps["tooltipContent"]
    adjustedWidth: number
    adjustedHeight: number
  }) {
  const hoverData = useHover(hoverStore)
  const active = kbFocusIndexRef.current >= 0
  const point = focusedNavPointRef.current
  const view = useNetworkCameraView(viewTransform, !!hoverData)
  const screenHover = hoverData ? projectNetworkPoint(hoverData, view) : null
  return (
    <>
      <FocusRing
        active={active}
        hoverPoint={screenHover}
        margin={margin}
        size={size}
        shape={point?.shape as FocusRingProps["shape"]}
        width={point?.w == null ? undefined : point.w * view.k}
        height={point?.h == null ? undefined : point.h * view.k}
      />
      {enableHover && (
        <FlippingTooltip
          contentOwnsChrome={hasOwnTooltipChrome(tooltipContent)}
          x={screenHover?.x ?? 0}
          y={screenHover?.y ?? 0}
          containerWidth={adjustedWidth}
          containerHeight={adjustedHeight}
          margin={margin}
          className="stream-network-tooltip"
          zIndex={2}
        >
          {hoverData == null ? null : tooltipContent ? (
            tooltipContent(hoverData)
          ) : (
            <DefaultNetworkTooltip data={hoverData} />
          )}
        </FlippingTooltip>
      )}
    </>
  )
}
