import type { exportChart } from "./exportChart"

/** Browser-only implementation loaded when a chart download is requested. */
export async function exportChartBrowser(
  container: HTMLElement,
  options?: Parameters<typeof exportChart>[1]
): Promise<void> {
  const {
    format = "png",
    filename = "chart",
    scale = 2,
    background = "white"
  } = options || {}

  // Foreground overlays can be decorative inside the frame's accessible image.
  // Keep the role-based fallback for older charts and consumer-owned SVGs.
  const svgElement =
    container.querySelector("svg[data-semiotic-overlay]") ||
    container.querySelector('svg[role="img"]') || container.querySelector("svg")
  if (!svgElement) {
    throw new Error("No SVG element found in the container")
  }

  // Clone the SVG to avoid modifying the original
  const clone = svgElement.cloneNode(true) as SVGSVGElement
  if (clone.getAttribute("role") === "presentation") {
    clone.setAttribute("role", "img")
    const label = svgElement.closest('[role="img"]')?.getAttribute("aria-label")
    if (label) clone.setAttribute("aria-label", label)
  }

  // Ensure the clone has explicit width/height attributes
  const bbox = svgElement.getBoundingClientRect()
  if (!clone.getAttribute("width")) {
    clone.setAttribute("width", String(bbox.width))
  }
  if (!clone.getAttribute("height")) {
    clone.setAttribute("height", String(bbox.height))
  }

  // Add xmlns if missing
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  }

  // Inline computed styles for standalone rendering
  inlineStyles(svgElement, clone)

  if (format === "svg") {
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(clone)
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    downloadBlob(blob, `${filename}.svg`)
  } else {
    // PNG: composite canvas data layer + SVG overlay
    const width = bbox.width * scale
    const height = bbox.height * scale

    const exportCanvas = document.createElement("canvas")
    exportCanvas.width = width
    exportCanvas.height = height
    const ctx = exportCanvas.getContext("2d")!

    // Fill background
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
    ctx.scale(scale, scale)

    // SVG surfaces and grids precede the transparent mark canvas in DOM order.
    // Keep that order in the exported image as well.
    const dataCanvas = container.querySelector("canvas")
    if (dataCanvas) {
      for (const layer of Array.from(dataCanvas.parentElement!.children)) {
        if (layer === dataCanvas) break
        if (layer instanceof SVGSVGElement) {
          const backgroundClone = layer.cloneNode(true) as SVGSVGElement
          backgroundClone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
          const bounds = layer.getBoundingClientRect()
          backgroundClone.setAttribute("width", String(bounds.width))
          backgroundClone.setAttribute("height", String(bounds.height))
          inlineStyles(layer, backgroundClone)
          await drawSVG(ctx, backgroundClone, bounds.x - bbox.x, bounds.y - bbox.y)
        }
      }
      ctx.drawImage(dataCanvas, 0, 0, bbox.width, bbox.height)
    }

    // Draw the SVG overlay (axes, labels, annotations) on top.
    await drawSVG(ctx, clone, 0, 0)

    await new Promise<void>((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, `${filename}.png`)
          resolve()
        } else {
          reject(new Error("Failed to create PNG blob"))
        }
      }, "image/png")
    })
  }
}

async function drawSVG(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  x: number,
  y: number
): Promise<void> {
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
    type: "image/svg+xml;charset=utf-8"
  })
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.width = Number(svg.getAttribute("width"))
    img.height = Number(svg.getAttribute("height"))
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Failed to load SVG image"))
      img.src = url
    })
    ctx.drawImage(img, x, y)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Inline computed styles from source SVG elements into clone elements.
 * This ensures the exported SVG/PNG looks the same as on screen.
 */
function inlineStyles(source: Element, target: Element): void {
  const sourceChildren = source.children
  const targetChildren = target.children

  // Copy computed styles for the element itself
  const computed = window.getComputedStyle(source)
  const important = ["fill", "stroke", "stroke-width", "stroke-dasharray",
    "opacity", "fill-opacity", "stroke-opacity", "font-family",
    "font-size", "font-weight", "text-anchor", "dominant-baseline"]

  for (const prop of important) {
    const value = computed.getPropertyValue(prop)
    if (value && value !== "none" && value !== "") {
      (target as SVGElement | HTMLElement).style?.setProperty(prop, value)
    }
  }

  // Recurse into children
  for (let i = 0; i < Math.min(sourceChildren.length, targetChildren.length); i++) {
    inlineStyles(sourceChildren[i], targetChildren[i])
  }
}

/**
 * Trigger a file download from a blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
