import { expect, test } from "@playwright/test"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { createRequire } from "node:module"
import { seamProps, steepRouteProps } from "./geo-examples/seamProps"
import { expectCanvasPainted, expectTooltipWithinPlot } from "./helpers"
import { compareCurrentPanels } from "./helpers/ssrParity"

for (const projection of ["equirectangular", "equalEarth"] as const) {
  test(`${projection} clips Pacific geometry and preserves polar targets through hydration and resize`, async ({
    page
  }) => {
    const requirePackage = createRequire(__filename)
    const { StreamGeoFrame } = requirePackage("semiotic/geo")
    const { renderGeoToStaticSVG } = requirePackage("semiotic/server")
    const props = seamProps(projection, 520)
    const frameMarkup = renderToString(createElement(StreamGeoFrame, props))
    const staticMarkup = renderGeoToStaticSVG(props)
    await page.route("**/geo-examples/seams", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><style>body{margin:0;background:white}.panel{width:fit-content;height:300px}</style>
        <button>Hydrate or resize</button><div class="panel" id="frame" data-projection="${projection}">${frameMarkup}</div>
        <div class="panel" id="static">${staticMarkup}</div><script type="module" src="/geo-examples/seamClient.tsx"></script>`
      })
    )
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto("/geo-examples/seams")
    const frame = page.locator("#frame")
    const reference = page.locator("#static")
    const routes = 'path[stroke="#bf3c18"]'
    const areas = 'path[fill="#23865a"]'
    const points = 'circle[fill="#2435aa"]'
    const geometry = (nodes: Element[]) =>
      nodes.map((node) =>
        ["d", "cx", "cy", "r"].map((name) => node.getAttribute(name))
      )
    for (const selector of [routes, areas, points]) {
      expect(await frame.locator(selector).evaluateAll(geometry)).toEqual(
        await reference.locator(selector).evaluateAll(geometry)
      )
    }
    const svgComparison = await compareCurrentPanels(page, reference, frame)
    expect(svgComparison.sameSize).toBe(true)
    expect(svgComparison.inkPixels).toBeGreaterThan(500)
    expect(svgComparison.differenceRatio).toBeLessThan(0.02)

    for (const width of [520, 410]) {
      await page.getByRole("button", { name: "Hydrate or resize" }).click()
      if (width === 410) {
        await reference.evaluate(
          (element, svg) => {
            element.innerHTML = svg
          },
          renderGeoToStaticSVG(seamProps(projection, width))
        )
      }
      await expect(frame.locator("canvas").first()).toHaveCSS(
        "width",
        `${width}px`
      )
      await expectCanvasPainted(frame.locator("canvas").first())
      const comparison = await compareCurrentPanels(page, reference, frame)
      expect(comparison.sameSize).toBe(true)
      expect(comparison.differenceRatio).toBeLessThan(0.08)

      const lineTargets = await reference.locator(routes).evaluateAll((nodes) =>
        nodes.map((node) => {
          const path = node as SVGPathElement
          const middle = path.getPointAtLength(path.getTotalLength() / 2)
          return { x: middle.x, y: middle.y, span: path.getBBox().width }
        })
      )
      expect(lineTargets).toHaveLength(2)
      expect(lineTargets.every((target) => target.span < width / 5)).toBe(true)
      expect(Math.min(...lineTargets.map((target) => target.x))).toBeLessThan(
        width / 4
      )
      expect(
        Math.max(...lineTargets.map((target) => target.x))
      ).toBeGreaterThan(width * 0.75)
      const polygon = reference.locator(areas)
      await expect(polygon).toHaveCount(1)
      const land = await polygon.evaluate((node: SVGPathElement, width) => {
        const path = node.getAttribute("d")!
        const box = node.getBBox()
        const y = box.y + box.height / 2
        const hit = (x: number) => node.isPointInFill(new DOMPoint(x, y))
        const span = (start: number, end: number) => {
          const inside = Array.from(
            { length: end - start },
            (_, i) => start + i
          ).filter(hit)
          return { x: inside[Math.floor(inside.length / 2)], y }
        }
        return {
          parts: path.split("M").length - 1,
          center: hit(width / 2),
          targets: [span(0, width / 2), span(width / 2, width)]
        }
      }, width)
      expect(land.parts).toBe(2)
      expect(land.center).toBe(false)
      const stationTargets = await reference
        .locator(points)
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            x: Number(node.getAttribute("cx")),
            y: Number(node.getAttribute("cy"))
          }))
        )
      expect(stationTargets).toHaveLength(2)
      expect(stationTargets[0].y).toBeLessThan(300 / 4)
      expect(stationTargets[1].y).toBeGreaterThan(300 * 0.75)
      const chart = frame.locator(".stream-geo-frame")
      const tip = chart.locator(".stream-frame-tooltip")
      const targets = [
        ...lineTargets.map((point) => ({ point, name: "Pacific crossing" })),
        ...land.targets.map((point) => ({ point, name: "Pacific reserve" })),
        { point: stationTargets[0], name: "North station" },
        { point: stationTargets[1], name: "South station" }
      ]
      for (const { point, name } of targets) {
        await chart.hover({ position: point })
        await expect(tip).toHaveText(name)
        if (name === "Pacific reserve") {
          const x = Number(
            await tip.locator("span[data-x]").getAttribute("data-x")
          )
          expect(Math.abs(x - point.x)).toBeLessThan(2)
        }
        await expectTooltipWithinPlot(chart, {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        })
      }
      for (const y of [lineTargets[0].y, land.targets[0].y]) {
        await chart.hover({ position: { x: width / 2, y } })
        await expect(tip).toHaveCount(0)
      }
      await chart.focus()
      await page.keyboard.press("Home")
      const stops = []
      for (let i = 0; i < 4; i++) {
        if (i) await page.keyboard.press("ArrowRight")
        await expect(tip).toHaveText(
          /^(North station|South station|Pacific reserve|Pacific crossing)$/
        )
        const name = await tip.textContent()
        stops.push(name)
        if (name === "Pacific reserve") {
          const anchor = await tip.locator("span[data-x]").evaluate((node) => ({
            x: Number(node.getAttribute("data-x")),
            y: Number(node.getAttribute("data-y"))
          }))
          expect(
            await polygon.evaluate(
              (path: SVGPathElement, point) =>
                path.isPointInFill(new DOMPoint(point.x, point.y)),
              anchor
            )
          ).toBe(true)
        }
      }
      expect(stops.sort()).toEqual([
        "North station",
        "Pacific crossing",
        "Pacific reserve",
        "South station"
      ])
      await page.keyboard.press("Escape")
      await expect(tip).toHaveCount(0)
      await page.mouse.move(0, 0)
    }
    expect(errors).toEqual([])
  })
}

test("panning a zoomed map keeps keyboard focus on the visible Pacific polygon", async ({ page }) => {
  const requirePackage = createRequire(__filename)
  const { StreamGeoFrame } = requirePackage("semiotic/geo")
  const markup = renderToString(createElement(StreamGeoFrame, { ...seamProps("equirectangular", 520), zoomable: true }))
  await page.route("**/geo-examples/seams", route => route.fulfill({
    contentType: "text/html",
    body: `<style>body{margin:0}</style><button>Hydrate</button><div id="frame" data-view="pan">${markup}</div><script type="module" src="/geo-examples/seamClient.tsx"></script>`
  }))
  await page.goto("/geo-examples/seams")
  await page.getByRole("button", { name: "Hydrate" }).click()
  const frame = page.locator("#frame")
  const chart = frame.locator(".stream-geo-frame")
  const tip = chart.locator(".stream-frame-tooltip")
  await expectCanvasPainted(chart.locator("canvas").first())
  const bounds = (await chart.boundingBox())!
  await page.mouse.move(bounds.x + 260, bounds.y + 150)
  await page.mouse.wheel(0, -100)
  await expect.poll(() => frame.getAttribute("data-camera")).toBeTruthy()
  const camera = await frame.getAttribute("data-camera")
  await page.mouse.down()
  await page.mouse.move(bounds.x + 420, bounds.y + 150, { steps: 6 })
  await page.mouse.up()
  await expect.poll(() => frame.getAttribute("data-camera")).not.toBe(camera)
  await page.mouse.move(0, 0)
  await chart.press("Home")
  for (let i = 0; i < 4 && !(await tip.allTextContents()).includes("Pacific reserve"); i++) {
    await chart.press("ArrowRight")
  }
  await expect(tip).toHaveText("Pacific reserve")
  const anchor = await tip.locator("span").evaluate(node => ({
    x: Number(node.dataset.x), y: Number(node.dataset.y)
  }))
  expect(anchor.x).toBeGreaterThan(0)
  expect(anchor.x).toBeLessThan(bounds.width)
  await page.keyboard.press("Escape")
  await expect(tip).toHaveCount(0)
  await chart.hover({ position: anchor })
  await expect(tip).toHaveText("Pacific reserve")
  await expectTooltipWithinPlot(chart, { top: 0, right: 0, bottom: 0, left: 0 })
  await page.mouse.move(0, 0)
  await expect(tip).toHaveCount(0)
})

for (const view of ["arc", "cartogram"] as const) {
  test(`keeps the steep ${view} route visible and interactive across hydration`, async ({
    page
  }) => {
    const requirePackage = createRequire(__filename)
    const { StreamGeoFrame } = requirePackage("semiotic/geo")
    const { renderGeoToStaticSVG } = requirePackage("semiotic/server")
    const props = steepRouteProps(view, 520)
    const staticMarkup = renderGeoToStaticSVG(props)
    const markup = renderToString(createElement(StreamGeoFrame, props))
    await page.route("**/geo-examples/seams", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<style>body{margin:0}</style><button>Hydrate</button><div id="frame" data-view="${view}">${markup}</div><div id="static">${staticMarkup}</div><script type="module" src="/geo-examples/seamClient.tsx"></script>`
      })
    )
    await page.goto("/geo-examples/seams")
    const routes = 'path[stroke="#bf3c18"]'
    const paths = page.locator(`#static ${routes}`)
    const data = (nodes: Element[]) =>
      nodes.map((node) => node.getAttribute("d"))
    expect(await page.locator(`#frame ${routes}`).evaluateAll(data)).toEqual(
      await paths.evaluateAll(data)
    )
    if (view === "cartogram") await expect(paths).toHaveCount(1)
    const target = await paths.evaluateAll((nodes) => {
      const paths = nodes as SVGPathElement[]
      const longest = paths.reduce((a, b) =>
        a.getTotalLength() > b.getTotalLength() ? a : b
      )
      const middle = longest.getPointAtLength(longest.getTotalLength() / 2)
      return {
        x: middle.x,
        y: middle.y,
        bounds: paths.map((p) => [
          p.getBBox().x,
          p.getBBox().x + p.getBBox().width
        ])
      }
    })
    for (const [left, right] of target.bounds) {
      expect(left).toBeGreaterThanOrEqual(-0.01)
      expect(right).toBeLessThanOrEqual(520.01)
    }
    await page.getByRole("button", { name: "Hydrate" }).click()
    const frame = page.locator("#frame .stream-geo-frame")
    await expectCanvasPainted(frame.locator("canvas").first())
    const tip = frame.locator(".stream-frame-tooltip")
    await frame.hover({ position: { x: target.x, y: target.y } })
    await expect(tip).toHaveText("Steep crossing")
    await expectTooltipWithinPlot(frame, {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    })
    await page.mouse.move(800, 3)
    await expect(tip).toHaveCount(0)
    await frame.focus()
    await page.keyboard.press("Home")
    if (view === "cartogram") await page.keyboard.press("ArrowRight")
    await expect(tip).toHaveText("Steep crossing")
    await expectTooltipWithinPlot(frame, {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    })
    await page.keyboard.press("Escape")
    await expect(tip).toHaveCount(0)
  })
}
