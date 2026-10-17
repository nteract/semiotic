"use client"
import * as React from "react"
import { FocusRing, type FocusRingProps } from "./FocusRing"
import { FlippingTooltip } from "../Tooltip/FlippingTooltip"
import { hasOwnTooltipChrome } from "../Tooltip/tooltipChrome"
import { DefaultNetworkTooltip } from "./networkDefaultTooltip"
import { projectNetworkPoint } from "./networkViewTransform"
import { useNetworkCameraView } from "./useNetworkCamera"
import type { HoverData } from "../realtime/types"
import type { StreamNetworkFrameProps } from "./networkTypes"
import type { NetworkViewTransform } from "./networkViewportTypes"

/** Screen-relative chrome subscribes independently of the retained frame. */
export function NetworkFrameHover({
  viewTransform,
  hoverData,
  enableHover,
  tooltipContent,
  active,
  shape,
  width,
  height,
  margin,
  size,
  adjustedWidth,
  adjustedHeight
}: Omit<FocusRingProps, "hoverPoint"> & {
  viewTransform?: NetworkViewTransform
  hoverData: HoverData | null
  enableHover: boolean
  tooltipContent: StreamNetworkFrameProps["tooltipContent"]
  adjustedWidth: number
  adjustedHeight: number
}) {
  const view = useNetworkCameraView(viewTransform, !!hoverData)
  const screenHover = hoverData ? projectNetworkPoint(hoverData, view) : null
  return (
    <>
      <FocusRing
        active={active}
        hoverPoint={screenHover}
        margin={margin}
        size={size}
        shape={shape}
        width={width == null ? undefined : width * view.k}
        height={height == null ? undefined : height * view.k}
      />
      {enableHover && hoverData && (
        <FlippingTooltip
          contentOwnsChrome={hasOwnTooltipChrome(tooltipContent)}
          x={screenHover!.x}
          y={screenHover!.y}
          containerWidth={adjustedWidth}
          containerHeight={adjustedHeight}
          margin={margin}
          className="stream-network-tooltip"
          zIndex={2}
        >
          {tooltipContent ? (
            tooltipContent(hoverData)
          ) : (
            <DefaultNetworkTooltip data={hoverData} />
          )}
        </FlippingTooltip>
      )}
    </>
  )
}
