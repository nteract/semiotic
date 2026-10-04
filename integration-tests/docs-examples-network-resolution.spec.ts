import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"
import { reserveTitleMargin } from "../src/components/stream/titleLayout"
import AxeBuilder from "@axe-core/playwright"
import { flagship } from "../scripts/network-resolution/fixtures"
import { resolutionChartProps } from "../src/components/recipes/atlas/resolution/chartProps"
import { defaultResolutionView } from "../src/components/recipes/atlas/resolution/project"

const resolution = flagship()

async function hoverMark(
  page: Page,
  mode: "resolution-atlas" | "boundary-loom",
  edgeId = "e17"
) {
  const reader = page.getByTestId("resolution-reader")
  const width = Number(await reader.getAttribute("data-reader-width"))
  const ordinal = Number(await reader.getAttribute("data-page-ordinal"))
  const zoomed = (await reader.getAttribute("data-zoomed")) === "true"
  const camera = zoomed ? { x: -80, y: -20, k: 1.08 } : { x: 0, y: 0, k: 1 }
  const props = resolutionChartProps(
    {
      resolution,
      width,
      height: 660,
      view: {
        ...defaultResolutionView(resolution, mode),
        pageIds: resolution.pages.slice(0, ordinal + 1).map((p) => p.id)
      }
    },
    mode
  )
  const margin = reserveTitleMargin(props.margin, props.title)
  const scene = props.layout({
    nodes: [],
    edges: [],
    dimensions: {
      width,
      height: 660,
      plot: {
        x: margin.left,
        y: margin.top,
        width: width - margin.left - margin.right,
        height: 660 - margin.top - margin.bottom
      }
    },
    config: props.layoutConfig,
    theme: { semantic: {}, categorical: [] },
    resolveColor: () => "#176b87"
  })
  let x: number, y: number
  if (mode === "resolution-atlas") {
    const node = scene.sceneNodes!.find(
      (n) =>
        n.type === "rect" &&
        n.datum.kind === "group" &&
        n.datum.nodeIds.length > 1
    )!
    if (node.type !== "rect") throw new Error("Missing group capsule")
    x = node.x + node.w / 2
    y = node.y + node.h / 2
  } else {
    const edge = scene.sceneEdges!.find(
      (e) =>
        e.type === "curved" &&
        e.datum.edgeIds?.[0] === edgeId &&
        /^M[^ ]+ V/.test(e.pathD)
    )!
    if (edge.type !== "curved") throw new Error(`Missing ${edgeId} column`)
    const coordinates = edge.pathD.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    x = coordinates[0]
    y = (coordinates[1] + coordinates[2]) / 2
  }
  x = margin.left + camera.x + camera.k * x
  y = margin.top + camera.y + camera.k * y
  const canvas = reader.locator("canvas").first()
  await canvas.scrollIntoViewIfNeeded()
  await reader.evaluate((el, x) => {
    el.scrollLeft = Math.max(0, x - 240)
  }, x)
  const bounds = await canvas.boundingBox()
  if (!bounds) throw new Error("Missing drawing canvas")
  const point = { x: bounds.x + x, y: bounds.y + y }
  await page.mouse.move(point.x, point.y)
  return point
}

for (const [mode, title, route, ordinal] of [
  [
    "resolution-atlas",
    "Resolution Atlas",
    "/charts/resolution-atlas-chart",
    "3"
  ],
  ["boundary-loom", "Boundary Loom", "/charts/boundary-loom-chart", "4"]
] as const) {
  test(`${title} is discoverable and retains evidence through display changes`, async ({
    page
  }, info) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })
    await page.setViewportSize({ width: 1440, height: 1100 })
    await page.goto(route)
    try {
      await expect(
        page.getByRole("heading", { name: title, exact: true }).first()
      ).toBeVisible()
    } catch (failure) {
      throw new Error(`${failure}\nBrowser errors: ${errors.join("\n")}`)
    }
    await expect(
      page
        .getByRole("navigation", { name: "Documentation sidebar" })
        .getByRole("link", { name: title, exact: true })
    ).toBeVisible()
    const demo = page.getByTestId("network-resolution-demo")
    const account = demo.getByTestId("resolution-account")
    await expect(account).toContainText("5 groups")
    await expect(account).toContainText("Total cycle rank: 5")
    await demo.getByLabel("Representation", { exact: true }).selectOption("0")
    await expect(account).toContainText("14 groups")
    await demo
      .getByLabel("Representation", { exact: true })
      .selectOption(ordinal)
    const revision = await demo
      .locator("[data-resolution-revision]")
      .getAttribute("data-resolution-revision")
    for (const action of [null, "Compact layout", "Zoom and pan"]) {
      if (action) await demo.getByLabel(action, { exact: true }).check()
      const point = await hoverMark(page, mode)
      const tooltip = demo
        .getByTestId("resolution-reader")
        .locator(".stream-network-tooltip")
      await expect(tooltip).toContainText(
        mode === "resolution-atlas" ? "original nodes" : "Edge e17"
      )
      await expect(tooltip).toHaveAttribute("data-placement", "placed")
      const box = await tooltip.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(Math.abs(box!.x - point.x)).toBeLessThan(700)
      expect(Math.abs(box!.y - point.y)).toBeLessThan(220)
      await page.mouse.move(2, 2)
      await expect(tooltip).toHaveCount(0)
      await expect(demo.locator("[data-resolution-revision]")).toHaveAttribute(
        "data-resolution-revision",
        revision!
      )
      await expect(account).toContainText("Total cycle rank: 5")
    }
    await demo
      .getByText("Source ownership and edge history table", { exact: true })
      .click()
    await demo.getByRole("button", { name: "Inspect e17", exact: true }).click()
    await expect(demo.getByLabel("Edge witness")).toContainText(
      "Alternative structural path"
    )
    await page.getByLabel("Cutaway example").selectOption("single")
    const cutaway = demo.getByTestId("resolution-cutaway")
    await expect(cutaway.getByRole("table")).toContainText("no")
    await cutaway
      .getByRole("button", { name: "Inspect no", exact: true })
      .click()
    await expect(cutaway.getByRole("status")).toContainText(
      "All internal connections were searched"
    )
    const packetDownload = page.waitForEvent("download")
    await demo
      .getByRole("button", { name: "Export analysis JSON", exact: true })
      .click()
    const packet = JSON.parse(
      readFileSync((await (await packetDownload).path())!, "utf8")
    )
    expect(packet.resolution.analysisRevision).toBe(revision)
    expect(packet.resolution.source.edges).toHaveLength(18)
    const svgDownload = page.waitForEvent("download")
    await demo
      .getByRole("button", { name: "Export static SVG", exact: true })
      .click()
    const svg = readFileSync((await (await svgDownload).path())!, "utf8")
    expect(svg).toContain("<svg")
    expect(svg).toContain(title)
    expect(svg).toContain(
      mode === "resolution-atlas" ? "14 nodes · 18 edges" : "e17"
    )
    expect((svg.match(/<path /g) ?? []).length).toBeGreaterThan(18)
    await expect(demo.getByRole("alert")).toHaveCount(0)
    expect(errors).toEqual([])
    await page.screenshot({
      path: info.outputPath(`${mode}.png`),
      fullPage: true
    })
  })
}

test("both phone readers retain controls, evidence tables, and contained drawings", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of [
    "/charts/resolution-atlas-chart",
    "/charts/boundary-loom-chart"
  ]) {
    await page.goto(route)
    const demo = page.getByTestId("network-resolution-demo")
    await expect(
      demo.getByLabel("Representation", { exact: true })
    ).toBeVisible()
    await demo
      .getByText("Source ownership and edge history table", { exact: true })
      .click()
    await demo.getByRole("button", { name: "Inspect e17", exact: true }).click()
    await expect(demo.getByLabel("Edge witness")).toContainText(
      "Alternative structural path"
    )
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true)
    const audit = await new AxeBuilder({ page })
      .include('[data-testid="network-resolution-demo"]')
      .analyze()
    expect(audit.violations).toEqual([])
  }
})

test("Atlas highlights source membership across generations and follows palette and theme changes", async ({
  page
}, info) => {
  await page.setViewportSize({ width: 1500, height: 1200 })
  await page.goto("/charts/resolution-atlas-chart")
  const reader = page.getByTestId("resolution-reader")
  const canvas = reader.locator("canvas").first()
  await expect(canvas).toBeVisible()
  const width = Number(await reader.getAttribute("data-reader-width"))
  const props = resolutionChartProps(
    {
      resolution,
      width,
      height: 660,
      view: {
        ...defaultResolutionView(resolution, "resolution-atlas"),
        pageIds: resolution.pages.slice(0, 4).map((p) => p.id)
      }
    },
    "resolution-atlas"
  )
  const margin = reserveTitleMargin(props.margin, props.title)
  const layout = props.layout({
    nodes: [],
    edges: [],
    dimensions: {
      width,
      height: 660,
      plot: {
        x: margin.left,
        y: margin.top,
        width: width - margin.left - margin.right,
        height: 660 - margin.top - margin.bottom
      }
    },
    config: props.layoutConfig,
    theme: { semantic: {}, categorical: [] },
    resolveColor: () => "unused"
  })
  const components = layout.sceneNodes!.filter(
    (n) => n.type === "rect" && n.datum.resolutionRole === "component"
  )
  function component(generation: number, id: string) {
    const node = components.find(
      (n) => n.datum.generation === generation && n.datum.nodeIds.includes(id)
    )!
    if (node.type !== "rect") throw new Error("Missing component rectangle")
    return node
  }
  async function hover(generation: number) {
    const node = component(generation, "a1")
    await canvas.scrollIntoViewIfNeeded()
    const box = (await canvas.boundingBox())!
    await page.mouse.move(
      box.x + margin.left + node.x + node.w / 2,
      box.y + margin.top + node.y + node.h / 2
    )
    await expect(reader.locator(".stream-network-tooltip")).toContainText(
      "original nodes"
    )
  }
  async function pixel(generation: number, id: string) {
    const node = component(generation, id)
    // Sample inside the fill, away from text, borders, and endpoint marks.
    return canvas.evaluate(
      (element, point) => {
        const canvas = element as HTMLCanvasElement
        const ratio = canvas.width / canvas.getBoundingClientRect().width
        return [
          ...canvas
            .getContext("2d")!
            .getImageData(
              Math.round(point.x * ratio),
              Math.round(point.y * ratio),
              1,
              1
            ).data
        ].slice(0, 3)
      },
      { x: margin.left + node.x + 7, y: margin.top + node.y + node.h - 5 }
    )
  }
  const toRGB = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const { getSequentialInterpolator } =
    await import("../src/components/charts/shared/colorPalettes")
  for (const mode of ["light", "dark"] as const) {
    if (
      await page.getByRole("button", { name: `Switch to ${mode} mode` }).count()
    )
      await page.getByRole("button", { name: `Switch to ${mode} mode` }).click()
    const surface = mode === "dark" ? "#252540" : "#ffffff"
    for (const scheme of ["blues", "purples"]) {
      await page
        .getByLabel("Generation colors", { exact: true })
        .selectOption(scheme === "blues" ? "theme" : scheme)
      const color = getSequentialInterpolator(scheme)
      await hover(0)
      await expect.poll(() => pixel(3, "a1")).toEqual(toRGB(color(3 / 4)))
      await expect.poll(() => pixel(0, "f")).toEqual(toRGB(surface))
      await expect.poll(() => pixel(0, "a3")).toEqual(toRGB(surface))
      await hover(1)
      await expect.poll(() => pixel(0, "a3")).toEqual(toRGB(color(0)))
      await expect.poll(() => pixel(3, "a1")).toEqual(toRGB(color(3 / 4)))
      await hover(3)
      await expect.poll(() => pixel(0, "f")).toEqual(toRGB(color(0)))
      if (mode === "dark" && scheme === "blues")
        await reader.screenshot({
          path: info.outputPath("atlas-generation-highlight.png")
        })
      await page.mouse.move(2, 2)
      await expect(reader.locator(".stream-network-tooltip")).toHaveCount(0)
      await expect.poll(() => pixel(0, "f")).toEqual(toRGB(surface))
      await expect.poll(() => pixel(3, "a1")).toEqual(toRGB(surface))
    }
  }
})

test("Boundary Loom colors intra-group and inter-group edges for the selected page", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto("/charts/boundary-loom-chart")
  const reader = page.getByTestId("resolution-reader")
  const canvas = reader.locator("canvas").first()
  await expect(canvas).toBeVisible()
  const { LIGHT_THEME, DARK_THEME } =
    await import("../src/components/store/themeCore")
  for (const theme of [LIGHT_THEME, DARK_THEME]) {
    const toggle = page.getByRole("button", {
      name: `Switch to ${theme.mode} mode`
    })
    if (await toggle.count()) await toggle.click()
    for (const ordinal of [0, 1, 4]) {
      await page
        .getByLabel("Representation", { exact: true })
        .selectOption(String(ordinal))
      await expect(page.getByTestId("resolution-account")).toContainText(
        `Page ${ordinal}:`
      )
      await expect(
        reader.locator("svg text").filter({ hasText: /^Intra-group$/ })
      ).toBeVisible()
      await expect(
        reader.locator("svg text").filter({ hasText: /^Inter-group$/ })
      ).toBeVisible()
      const width = Number(await reader.getAttribute("data-reader-width"))
      const props = resolutionChartProps(
        {
          resolution,
          width,
          height: 660,
          view: {
            ...defaultResolutionView(resolution, "boundary-loom"),
            pageIds: resolution.pages.slice(0, ordinal + 1).map((p) => p.id)
          }
        },
        "boundary-loom"
      )
      const margin = reserveTitleMargin(props.margin, props.title)
      const scene = props.layout({
        nodes: [],
        edges: [],
        dimensions: {
          width,
          height: 660,
          plot: {
            x: margin.left,
            y: margin.top,
            width: width - margin.left - margin.right,
            height: 660 - margin.top - margin.bottom
          }
        },
        config: props.layoutConfig,
        theme: { semantic: {}, categorical: [] },
        resolveColor: () => "unused"
      })
      await page.mouse.move(2, 2)
      for (const edgeId of ["e02", "e08"]) {
        const source = scene.sceneNodes!.find(
          (n) => n.type === "circle" && n.datum.edgeIds[0] === edgeId
        )!
        if (source.type !== "circle") throw new Error("Missing source endpoint")
        const color =
          edgeId === "e02" && ordinal > 0
            ? theme.colors.secondary!
            : theme.colors.primary
        const rgb = color.startsWith("#")
          ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
          : []
        await expect
          .poll(() =>
            canvas.evaluate(
              (el, point) => {
                const canvas = el as HTMLCanvasElement
                const ratio =
                  canvas.width / canvas.getBoundingClientRect().width
                return [
                  ...canvas
                    .getContext("2d")!
                    .getImageData(
                      Math.round(point.x * ratio),
                      Math.round(point.y * ratio),
                      1,
                      1
                    ).data
                ].slice(0, 3)
              },
              { x: margin.left + source.cx, y: margin.top + source.cy }
            )
          )
          .toEqual(rgb)
      }
      await hoverMark(page, "boundary-loom", "e02")
      const tooltip = reader.locator(".stream-network-tooltip")
      await expect(tooltip).toContainText(
        ordinal > 0 ? "intra-group (internal)" : "inter-group (boundary)"
      )
      await page.mouse.move(2, 2)
      await expect(tooltip).toHaveCount(0)
    }
  }
})
