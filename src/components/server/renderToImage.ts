import type { Datum } from "../charts/shared/datumTypes"
import type { escapeXmlAttribute as Escape, insertSvgRootContent as Insert } from "../shared/svgRoot"
import type { renderChart as Chart, renderToStaticSVG as Frame, RenderChartName, RenderToImageOptions } from "./renderToStaticSVG"
import type { FrameType, StaticFrameProps } from "./staticSVGChrome"
import type { renderedSvgDimensions as Dimensions } from "./svgSizing"
import type { resolveTheme as Theme } from "./themeResolver"
import { rasterizeSVG } from "./rasterizeSVG"

// Receive SVG helpers from the caller to keep this raster-only module from
// splitting synchronous SVG renderers into extra shared chunks.
export async function renderImage(
  frameTypeOrComponent: FrameType | RenderChartName,
  props: Datum,
  options: RenderToImageOptions,
  renderToStaticSVG: typeof Frame,
  renderChart: typeof Chart,
  resolveTheme: typeof Theme,
  renderedSvgDimensions: typeof Dimensions,
  insertSvgRootContent: typeof Insert,
  escapeXmlAttribute: typeof Escape
): Promise<Buffer> {
  const { background } = options
  const imageTheme = background ? resolveTheme(props.theme) : undefined
  const imageProps = imageTheme ? {
    ...props,
    background,
    theme: { ...imageTheme, colors: { ...imageTheme.colors, background } }
  } : props

  let svg: string
  const frameTypes = ["xy", "ordinal", "network", "geo", "physics"]
  if (frameTypes.includes(frameTypeOrComponent)) {
    svg = renderToStaticSVG(
      frameTypeOrComponent as FrameType,
      imageProps as StaticFrameProps
    )
  } else {
    svg = renderChart(frameTypeOrComponent, imageProps)
  }

  // A real backdrop also covers composite and value renderers, whose CSS
  // backgrounds are not painted by SVG rasterizers.
  if (background) {
    svg = insertSvgRootContent(svg, `<rect width="100%" height="100%" fill="${escapeXmlAttribute(background)}"/>`)
  }

  const requestedDimensions = {
    width: props.width || props.size?.[0] || 600,
    height: props.height || props.size?.[1] || 400
  }
  const { width, height } = renderedSvgDimensions(svg, requestedDimensions)

  return rasterizeSVG(svg, width, height, options)
}
