/**
 * Export a semiotic chart to PNG (default) or SVG from the browser.
 *
 * PNG export composites the canvas data layer underneath the SVG overlay,
 * producing a complete image. SVG export captures only the SVG overlay
 * (axes, labels, annotations) since canvas content cannot be represented
 * as SVG.
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
  const {
    format = "png",
    filename = "chart",
    scale = 2,
    background = "white"
  } = options || {}

  // Find the SVG element inside the container
  const svgElement = container.querySelector("svg")
  if (!svgElement) {
    throw new Error("No SVG element found in the container")
  }

  // Clone the SVG to avoid modifying the original
  const clone = svgElement.cloneNode(true) as SVGSVGElement

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

    // Layer 1: Draw the data canvas (contains all rendered marks)
    const dataCanvas = container.querySelector("canvas")
    if (dataCanvas) {
      ctx.drawImage(dataCanvas, 0, 0, bbox.width, bbox.height)
    }

    // Layer 2: Draw the SVG overlay (axes, labels, annotations) on top
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(clone)
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.width = bbox.width
    img.height = bbox.height

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0)

        exportCanvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, `${filename}.png`)
            resolve()
          } else {
            reject(new Error("Failed to create PNG blob"))
          }
        }, "image/png")

        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to load SVG image"))
      }
      img.src = url
    })
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
      ;(target as SVGElement | HTMLElement).style?.setProperty(prop, value)
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
