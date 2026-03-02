/**
 * Export a semiotic chart to SVG or PNG from the browser.
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
    format?: "svg" | "png"       // default "svg"
    filename?: string            // default "chart"
    scale?: number               // default 2 (for PNG retina)
    background?: string          // default "white"
  }
): Promise<void> {
  const {
    format = "svg",
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
    // PNG: render SVG to canvas
    const width = bbox.width * scale
    const height = bbox.height * scale

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(clone)
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.width = bbox.width
    img.height = bbox.height

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!

        // Fill background
        ctx.fillStyle = background
        ctx.fillRect(0, 0, width, height)

        // Scale and draw
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0)

        canvas.toBlob((blob) => {
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
