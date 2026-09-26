import type { CSSProperties } from "react"

/** Visually hidden content remains available to assistive technology. */
export const SR_ONLY_STYLE: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0
}
