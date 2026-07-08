"use client"

import * as React from "react"
import {
  SafeRender,
  renderEmptyState,
  renderLoadingState
} from "../shared/withChartWrapper"
import type { FrameGraphicsProp } from "../../stream/useFrame"
import type {
  PhysicsSemanticItem,
  StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps } from "../shared/types"

export function resolvePhysicsChartSize(
  size: [number, number] | undefined,
  width: number | undefined,
  height: number | undefined,
  fallback: [number, number]
): [number, number] {
  return size ?? [width ?? fallback[0], height ?? fallback[1]]
}

export function renderPhysicsChartState<TDatum extends Datum>(options: {
  data?: TDatum[] | null
  emptyContent?: BaseChartProps["emptyContent"]
  loading?: BaseChartProps["loading"]
  loadingContent?: BaseChartProps["loadingContent"]
  size: [number, number]
}): React.ReactElement | null {
  const [width, height] = options.size
  const loadingEl = renderLoadingState(
    options.loading,
    width,
    height,
    options.loadingContent
  )
  if (loadingEl) return loadingEl
  return renderEmptyState(options.data, width, height, options.emptyContent)
}

export function renderPhysicsFrame(
  componentName: string,
  size: [number, number],
  children: React.ReactNode
): React.ReactElement {
  return (
    <SafeRender componentName={componentName} width={size[0]} height={size[1]}>
      {children}
    </SafeRender>
  )
}

export function composePhysicsFrameGraphics(
  first: FrameGraphicsProp | undefined,
  second: FrameGraphicsProp | undefined
): FrameGraphicsProp | undefined {
  if (!first) return second
  if (!second) return first
  return (ctx) => (
    <>
      {typeof first === "function" ? first(ctx) : first}
      {typeof second === "function" ? second(ctx) : second}
    </>
  )
}

export function resolvePhysicsTooltipProps(
  tooltip: TooltipProp | undefined,
  frameProps?: Partial<StreamPhysicsFrameProps>
): Pick<StreamPhysicsFrameProps, "enableHover" | "tooltipContent"> {
  if (tooltip === false) {
    return { enableHover: false }
  }
  return {
    enableHover: frameProps?.enableHover,
    tooltipContent:
      (normalizeTooltip(tooltip) as
        | StreamPhysicsFrameProps["tooltipContent"]
        | false) ||
      frameProps?.tooltipContent
  }
}

export function resolvePhysicsFrameSharedProps(
  props: Pick<
    BaseChartProps,
    "accessibleTable" | "description" | "hoverRadius" | "summary"
  >,
  frameProps: Partial<StreamPhysicsFrameProps> | undefined,
  semanticItems?: PhysicsSemanticItem[]
): Pick<
  StreamPhysicsFrameProps,
  "accessibleTable" | "description" | "hoverRadius" | "semanticItems" | "summary"
> {
  return {
    accessibleTable: props.accessibleTable ?? frameProps?.accessibleTable,
    description: props.description ?? frameProps?.description,
    hoverRadius: props.hoverRadius ?? frameProps?.hoverRadius,
    semanticItems: frameProps?.semanticItems ?? semanticItems,
    summary: props.summary ?? frameProps?.summary
  }
}

export type { TooltipProp }
