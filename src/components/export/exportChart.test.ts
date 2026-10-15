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
