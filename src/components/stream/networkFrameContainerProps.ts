import type { HTMLAttributes } from "react"
import type { StreamNetworkFrameProps } from "./networkTypes"

/** Keep the server wrapper and live canvas container consistent during handoff. */
export function networkFrameContainerProps(
  props: StreamNetworkFrameProps,
  frameId: string,
  size: [number, number],
  layoutPending?: boolean,
  overflow?: "visible"
): HTMLAttributes<HTMLDivElement> {
  return {
    id: frameId,
    className: `stream-network-frame${props.className ? ` ${props.className}` : ""}`,
    role: "group",
    "aria-busy": layoutPending || undefined,
    "aria-label":
      props.description ||
      (typeof props.title === "string" ? props.title : "Network chart"),
    style: {
      position: "relative",
      fontFamily: "var(--semiotic-font-family, sans-serif)",
      width: props.responsiveWidth ? "100%" : size[0],
      height: props.responsiveHeight ? "100%" : size[1],
      overflow: props.viewTransform ? "clip" : overflow
    }
  }
}
