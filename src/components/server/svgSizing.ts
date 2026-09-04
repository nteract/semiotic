import {
  findSvgRoot,
  setSvgRootAttributes,
  svgRootAttribute
} from "../shared/svgRoot"

export interface SVGDimensions {
  width: number
  height: number
}

export function renderedSvgDimensions(
  svg: string,
  fallback: SVGDimensions
): SVGDimensions {
  const root = findSvgRoot(svg)
  if (!root) return fallback
  const dimension = (name: "width" | "height") => {
    const raw = svgRootAttribute(root, name)
    const value = raw && /^[0-9]+(?:\.[0-9]+)?$/.test(raw) ? Number(raw) : NaN
    return Number.isFinite(value) && value > 0 ? value : fallback[name]
  }
  return { width: dimension("width"), height: dimension("height") }
}

export function fitSvgToBox(svg: string, dimensions: SVGDimensions): string {
  const root = findSvgRoot(svg)
  if (!root) return svg
  return setSvgRootAttributes(svg, {
    width: "100%",
    height: "100%",
    ...(svgRootAttribute(root, "viewBox") === undefined
      ? { viewBox: `0 0 ${dimensions.width} ${dimensions.height}` }
      : {}),
    ...(svgRootAttribute(root, "preserveAspectRatio") === undefined
      ? { preserveAspectRatio: "xMidYMid meet" }
      : {})
  })
}
