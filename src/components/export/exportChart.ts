/**
 * Export a semiotic chart to PNG (default) or SVG from the browser.
 *
 * PNG export composites SVG backgrounds, the canvas data layer, and the SVG overlay,
 * producing a complete image. SVG export captures only the SVG overlay
 * (axes, labels, annotations) since canvas content cannot be represented
 * as SVG. The browser download implementation loads on the first call.
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null)
 * // ... render chart inside ref ...
 * <button onClick={() => exportChart(ref.current!)}>Download</button>
 * ```
 */
export async function exportChart(
  container: HTMLElement,
  options?: {
    format?: "svg" | "png"       // default "png"
    filename?: string            // default "chart"
    scale?: number               // default 2 (for PNG retina)
    background?: string          // default "white"
  }
): Promise<void> {
  const { exportChartBrowser } = await import("./exportChartBrowser")
  return exportChartBrowser(container, options)
}
