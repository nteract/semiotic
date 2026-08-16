import * as React from "react"

import type { Datum } from "./datumTypes"
import {
  resolveFrameTextAttributes,
  type FrameTextStyleDefaults
} from "./frameTextAnnotation"

const LIVE_FRAME_TEXT_DEFAULTS: FrameTextStyleDefaults = {
  fill: "var(--semiotic-text, #333)",
  fontSize: 11,
  fontFamily: "inherit"
}

/** SVG-only renderer shared by live annotation rules and static rendering. */
export function FrameTextAnnotationSVG({
  annotation,
  width,
  height,
  defaults = LIVE_FRAME_TEXT_DEFAULTS
}: {
  annotation: Datum
  width: number
  height: number
  defaults?: FrameTextStyleDefaults
}) {
  const text = annotation.label ?? annotation.text
  if (text == null) return null
  return (
    <text {...resolveFrameTextAttributes(annotation, width, height, defaults)}>
      {text}
    </text>
  )
}
