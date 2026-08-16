import type { Datum } from "./datumTypes"
import { resolveAnnotationGradient, resolveSvgFill } from "./hatchFill"

/** Resolve the solid/gradient paint contract shared by browser and static bands. */
export function resolveAnnotationBandFill(
  annotation: Datum,
  idBase: string,
  direction: "horizontal" | "vertical",
  fallback: string,
) {
  const solidFill = resolveSvgFill(annotation.fill ?? annotation.color, idBase, fallback)
  const gradientFallback = typeof annotation.fill === "string" && annotation.fill
    ? annotation.fill
    : typeof annotation.color === "string" && annotation.color
      ? annotation.color
      : fallback
  return resolveAnnotationGradient(
    annotation.gradient,
    idBase,
    direction,
    gradientFallback,
  ) ?? solidFill
}
