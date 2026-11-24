import { expect, test } from "@playwright/test"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { createRequire } from "node:module"
import { curveMargin, curveProps } from "./process-sankey-examples/curveProps"
import { expectCanvasPainted, expectTooltipWithinPlot } from "./helpers"

for (const renderer of ["canvas", "svg"] as const) {
  test(`ProcessSankey hydrates smooth bands into ${renderer} and preserves the inventory interaction`, async ({
    page
  }) => {
    const requirePackage = createRequire(__filename)
    const { ProcessSankey } = requirePackage("semiotic/network")
    const { renderChart } = requirePackage("semiotic/server")
    const props = curveProps(500, renderer, "smooth")
    const markup = renderToString(createElement(ProcessSankey, props))
    const staticSVG = (width: number, curves: "straight" | "smooth") =>
      renderChart("ProcessSankey", curveProps(width, renderer, curves))
    await page.route("**/process-sankey-examples/curves", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><style>body{margin:0}</style><button id="hydrate">Hydrate</button>
        <button id="resize">Resize</button><button id="straight">Straight</button><output></output>
        <div id="frame" data-renderer="${renderer}">${markup}</div><div id="reference">${staticSVG(500, "smooth")}</div>
        <script type="module" src="/process-sankey-examples/curveClient.tsx"></script>`
      })
    )
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto("/process-sankey-examples/curves")
    const frame = page.locator("#frame .stream-network-frame").first()
    const selector = 'path[stroke="#237752"]'
    const reference = page.locator("#reference")
    const queuePath = reference.locator(selector)
    const original = await queuePath.getAttribute("d")
    expect(original).toContain("C")
    await expect(frame.locator(selector)).toHaveAttribute("d", original!)
    const summary = frame.getByRole("button", { name: /View data summary/ })
    await expect(summary).toHaveText("View data summary (3 nodes, 8 edges)")
    let initialRows: string[] | undefined
    const tooltip = frame.locator(
      ".stream-network-tooltip, .stream-frame-tooltip"
    )
    for (const [action, width, curves] of [
      ["Hydrate", 500, "smooth"],
      ["Resize", 420, "smooth"],
      ["Straight", 420, "straight"]
    ] as const) {
      await page.getByRole("button", { name: action }).click()
      await reference.evaluate(
        (el, svg) => {
          el.innerHTML = svg
        },
        staticSVG(width, curves)
      )
      const expected = await queuePath.getAttribute("d")
      expect(expected!.includes("C")).toBe(curves === "smooth")
      await expect(frame.locator("canvas").first()).toHaveCSS(
        "width",
        `${width}px`
      )
      if (renderer === "svg") {
        await expect(
          frame.locator(`svg[data-network-scene] ${selector}`)
        ).toHaveAttribute("d", expected!)
      } else {
        await expectCanvasPainted(frame.locator("canvas").first())
      }
      // The upper shoulder lies outside the straight inventory contour. Move to its interior after switching.
      const point = {
        x: Math.round(width * 0.375),
        y: curves === "smooth" ? 197 : 243
      }
      expect(
        await queuePath.evaluate(
          (path: SVGPathElement, p) =>
            path.isPointInFill(new DOMPoint(p.x, p.y)),
          point
        )
      ).toBe(true)
      const surfaces = renderer === "svg" ? [reference, frame.locator("svg[data-network-scene]")] : [reference]
      for (const surface of surfaces) {
        const fills = surface.locator('path[fill^="url("]')
        expect(await fills.evaluateAll((paths, p) => paths.some(path => {
          const id = path.getAttribute("fill")!.slice(5, -1)
          const gradient = (path as SVGPathElement).ownerSVGElement?.getElementById(id)
          return gradient?.tagName === "linearGradient" &&
            (path as SVGPathElement).isPointInFill(new DOMPoint(p.x, p.y))
        }), point)).toBe(true)
      }
      if (renderer === "canvas") {
        await expect
          .poll(() =>
            frame
              .locator("canvas")
              .first()
              .evaluate((canvas: HTMLCanvasElement, p) => {
                const x = Math.round((p.x * canvas.width) / canvas.clientWidth)
                const y = Math.round(
                  (p.y * canvas.height) / canvas.clientHeight
                )
                const [r, g, b] = canvas
                  .getContext("2d")!
                  .getImageData(x, y, 1, 1).data
                return g > r + 35 && g > b + 15
              }, point)
          )
          .toBe(true)
      }
      // After both arrivals and before the exit, the queue is unobstructed by ribbons.
      const inventoryPoint = await queuePath.evaluate((path: SVGPathElement, x) => {
        const bounds = path.getBBox()
        const inside: number[] = []
        for (let y = Math.ceil(bounds.y); y < bounds.y + bounds.height; y++) {
          if (path.isPointInFill(new DOMPoint(x, y))) inside.push(y)
        }
        if (!inside.length) throw new Error("Expected visible inventory between transfers")
        return { x, y: inside[Math.floor(inside.length / 2)] }
      }, Math.round(width * 0.52))
      await frame.hover({ position: inventoryPoint })
      await expect(tooltip).toContainText("Queue")
      await expect(tooltip).toContainText("Mass")
      await expectTooltipWithinPlot(frame, curveMargin)
      await frame.click({ position: inventoryPoint })
      await expect(page.locator("output")).toHaveText("Queue")
      await page.mouse.move(800, 1)
      await expect(tooltip).toHaveCount(0)
      await summary.press("Enter")
      const tables = frame.getByRole("table")
      await expect(tables.first()).toBeVisible()
      const rows = await tables.allTextContents()
      expect(rows.join(" ")).toContain("Queue")
      if (initialRows) expect(rows).toEqual(initialRows)
      initialRows = rows
      await frame.getByRole("button", { name: "Close data summary" }).click()
    }
    expect(errors).toEqual([])
  })
}
