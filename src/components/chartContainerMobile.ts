import type { ReactElement } from "react"
import type {
  MobileStandardControlRequest,
  MobileStandardControlsProps
} from "./MobileStandardControls"
import type { MobileInteractionProp } from "./charts/shared/types"

export function canReceiveChartProps(
  child: ReactElement
): boolean {
  const childType = child.type
  return (
    typeof childType === "function" ||
    (typeof childType === "object" && childType !== null)
  )
}

export function isMobileStandardControlsProps(
  value: MobileStandardControlRequest | MobileStandardControlsProps | undefined
): value is MobileStandardControlsProps {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function standardControlsFromInteraction(
  mobileInteraction: MobileInteractionProp | undefined
): MobileStandardControlRequest | undefined {
  return mobileInteraction && typeof mobileInteraction === "object"
    ? mobileInteraction.standardControls
    : undefined
}

export function targetSizeFromInteraction(
  mobileInteraction: MobileInteractionProp | undefined
): number | undefined {
  return mobileInteraction &&
    typeof mobileInteraction === "object" &&
    typeof mobileInteraction.targetSize === "number"
    ? mobileInteraction.targetSize
    : undefined
}

export function hasStandardControlsRequest(
  request: MobileStandardControlRequest | undefined
): request is MobileStandardControlRequest {
  return Array.isArray(request) ? request.length > 0 : !!request
}

export function withStandardControls(
  source: MobileInteractionProp | undefined,
  controls: MobileStandardControlRequest | undefined
): MobileInteractionProp | undefined {
  if (!hasStandardControlsRequest(controls)) return source
  if (source && typeof source === "object") {
    return { ...source, standardControls: controls }
  }
  if (source === false || source == null) return source
  return { standardControls: controls }
}
