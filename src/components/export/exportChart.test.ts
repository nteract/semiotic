import { afterEach, expect, it, vi } from "vitest"
import { exportChart } from "./exportChart"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it.each(["marked", "legacy", "plain"])("exports the %s foreground SVG instead of a grid", async (mode) => {
  const container = document.createElement("div")
  container.innerHTML = mode === "plain"
    ? '<svg><text>Endpoint labels</text></svg>'
    : `<div role="img" aria-label="Product trends">
        <svg role="presentation"><text>Grid</text></svg>
        <svg ${mode === "marked" ? 'data-semiotic-overlay="" role="presentation"' : 'role="img"'}>
          <desc>Series endpoints</desc><text>Endpoint labels</text>
        </svg>
      </div>`
  let downloaded!: Blob
  vi.stubGlobal("URL", {
    createObjectURL: (blob: Blob) => { downloaded = blob; return "blob:chart" },
    revokeObjectURL: vi.fn()
  })
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  await exportChart(container, { format: "svg" })
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsText(downloaded)
  })
  expect(text).toContain("Endpoint labels")
  expect(text).not.toContain(">Grid<")
  if (mode === "marked") {
    expect(text).toContain('role="img"')
    expect(text).toContain('aria-label="Product trends"')
    expect(container.querySelector("svg[data-semiotic-overlay]")).toHaveAttribute("role", "presentation")
  }
})

it("composites SVG background and grid before canvas marks and foreground labels in PNG", async () => {
  const container = document.createElement("div")
  container.innerHTML = `<div role="img">
    <svg><rect fill="#112233" width="100" height="100" /></svg>
    <svg><path stroke="#abcdef" d="M0 50H100" /></svg>
    <canvas></canvas>
    <svg data-semiotic-overlay=""><text>Endpoint labels</text></svg>
  </div>`
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, width: 100, height: 100
  } as DOMRect)
  const blobs: Blob[] = []
  const revoked: string[] = []
  vi.stubGlobal("URL", {
    createObjectURL: (blob: Blob) => { blobs.push(blob); return `blob:${blobs.length}` },
    revokeObjectURL: (url: string) => { revoked.push(url) }
  })
  vi.stubGlobal("Image", class {
    onload?: () => void
    url = ""
    set src(url: string) { this.url = url; this.onload?.() }
  })
  const layers: unknown[] = []
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(), scale: vi.fn(),
    drawImage: (layer: HTMLCanvasElement | { url: string }) => {
      layers.push(layer instanceof HTMLCanvasElement ? layer : layer.url)
    }
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(callback => {
    callback(new Blob(["png"], { type: "image/png" }))
  })
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  await exportChart(container)
  expect(layers).toEqual(["blob:1", "blob:2", container.querySelector("canvas"), "blob:3"])
  const contents = await Promise.all(blobs.slice(0, 3).map(blob => new Promise<string>(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(blob)
  })))
  expect(contents[0]).toContain("#112233")
  expect(contents[1]).toContain("#abcdef")
  expect(contents[2]).toContain("Endpoint labels")
  expect(revoked).toEqual(["blob:1", "blob:2", "blob:3", "blob:4"])
})
