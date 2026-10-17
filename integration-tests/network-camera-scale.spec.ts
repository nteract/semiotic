import { test, expect } from "@playwright/test"
import type { Page } from "@playwright/test"
import type {} from "./network-custom-layout-examples/cameraScaleFixture"
import { writeFile } from "node:fs/promises"
import { cpus, platform, arch } from "node:os"

const fixture = "/network-custom-layout-examples/camera-scale.html"

async function ready(page: Page, query: string) {
  await page.goto(`${fixture}?${query}`)
  await expect
    .poll(() =>
      page.evaluate(() => !!window.cameraScale?.handle?.getCustomLayout?.())
    )
    .toBe(true)
}

async function settled(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.cameraScale.phase))
    .toBe("idle")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
}

async function setScale(page: Page, k: number | "fit") {
  const previous = await page.evaluate(() => window.cameraScale.movingFrames)
  await page.evaluate((scale) => {
    if (scale === "fit") window.cameraScale.handle!.fitToContent()
    else window.cameraScale.handle!.zoomTo({ x: 20, y: 300, k: scale }, 0)
  }, k)
  await expect
    .poll(() => page.evaluate(() => window.cameraScale.movingFrames))
    .toBeGreaterThan(previous)
  await settled(page)
}

for (const scenario of [
  { nodes: 300, cards: "compact", edgeHits: false },
  { nodes: 1000, cards: "compact", edgeHits: false },
  { nodes: 3000, cards: "compact", edgeHits: false },
  { nodes: 1000, cards: "pipeline", edgeHits: false },
  { nodes: 3000, cards: "compact", edgeHits: true }
]) {
  test(`measure ${scenario.nodes} ${scenario.cards} cards, edge hits ${scenario.edgeHits}, at 4x CPU`, async ({
    page,
    browserName
  }, testInfo) => {
    expect(browserName).toBe("chromium")
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
    await cdp.send("Performance.enable")
    await ready(
      page,
      `nodes=${scenario.nodes}&cards=${scenario.cards}${scenario.edgeHits ? "&edge-hits" : ""}`
    )
    const rows = []
    for (const scale of ["fit", 0.5, 1, 2] as const) {
      await setScale(page, scale)
      const before = await page.evaluate(() => {
        window.cameraScale.reset()
        return {
          layoutCalls: window.cameraScale.layoutCalls,
          profiling: window.cameraScale.profiling,
          zoom: window.cameraScale.handle!.getZoom(),
          mounted: document.querySelectorAll(".semiotic-network-html-mark")
            .length,
          dots: document.querySelectorAll("[data-lod='0']").length
        }
      })
      const metricsBefore = await cdp.send("Performance.getMetrics")
      const samples = await page.evaluate(async () => {
        const canvas = document.querySelector("canvas")!
        const box = canvas.getBoundingClientRect()
        const intervals: number[] = []
        let last = performance.now()
        for (let i = 0; i < 50; i++) {
          // Each dispatch schedules a camera rAF before our sampling rAF.
          // Tiny alternating deltas preserve k and culling membership.
          canvas.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              clientX: box.x + 400,
              clientY: box.y + 300,
              deltaY: i % 2 ? -1 : 1
            })
          )
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
          )
          intervals.push(performance.now() - last)
          last = performance.now()
        }
        return intervals
      })
      const metricsAfter = await cdp.send("Performance.getMetrics")
      const after = await page.evaluate(() => ({
        layoutCalls: window.cameraScale.layoutCalls,
        frames: window.cameraScale.movingFrames,
        renders: window.cameraScale.renders,
        paints: window.cameraScale.paints,
        zoom: window.cameraScale.handle!.getZoom(),
        mounted: document.querySelectorAll(".semiotic-network-html-mark").length
      }))
      const delta = (name: string) =>
        ((metricsAfter.metrics.find((metric) => metric.name === name)!.value -
          metricsBefore.metrics.find((metric) => metric.name === name)!.value) *
          1000) /
        after.frames
      const mean = (values: number[]) =>
        values.reduce((a, b) => a + b, 0) / values.length
      const row = {
        ...scenario,
        scale,
        k: before.zoom.k,
        mounted: before.mounted,
        dots: before.dots,
        layoutRuns: after.layoutCalls - before.layoutCalls,
        frames: after.frames,
        scriptMs: delta("ScriptDuration"),
        layoutMs: delta("LayoutDuration"),
        frameIntervalMeanMs: mean(samples),
        frameIntervalP95Ms: [...samples].sort((a, b) => a - b)[47],
        cameraPaintMs: mean(after.paints),
        cameraPaints: after.paints.length,
        layers: before.profiling
          ? Object.fromEntries(
              ["NetworkHtmlMarksLayer", "NetworkSVGOverlay"].map((id) => {
                const renders = after.renders.filter(
                  (sample) => sample.id === id
                )
                return [
                  id,
                  {
                    commits: renders.length,
                    renderMsPerFrame:
                      renders.reduce((a, b) => a + b.duration, 0) / after.frames
                  }
                ]
              })
            )
          : null
      }
      rows.push(row)
      console.log(JSON.stringify(row))
      expect(row.layoutRuns).toBe(0)
      expect(row.frames).toBe(50)
      expect(after.zoom.k).toBeCloseTo(before.zoom.k, 8)
      expect(after.mounted).toBe(before.mounted)
      expect(row.cameraPaints).toBeGreaterThanOrEqual(50)
      if (before.profiling)
        expect(row.layers!.NetworkHtmlMarksLayer.commits).toBeGreaterThan(0)
      if (scale === "fit") expect(before.mounted).toBe(scenario.nodes)
      if (scale === 1) expect(before.mounted).toBeLessThan(scenario.nodes)
      await settled(page)
    }
    const edgeCost =
      scenario.nodes === 3000
        ? await page.evaluate(() => window.cameraScale.edgeCost())
        : null
    if (edgeCost) console.log(JSON.stringify({ edgeCost }))
    const reportPath = testInfo.outputPath("measurements.json")
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          browser: await page.context().browser()!.version(),
          cpuThrottle: 4,
          productionProfiling: await page.evaluate(
            () => window.cameraScale.profiling
          ),
          machine: { platform: platform(), arch: arch(), cpu: cpus()[0].model },
          rows,
          edgeCost
        },
        null,
        2
      )
    )
    await testInfo.attach("camera-scale-measurements", {
      path: reportPath,
      contentType: "application/json"
    })
    await cdp.detach()
  })
}

test("curved edges retain screen tolerance, callback data and tooltip placement through camera changes", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await ready(page, "nodes=300&edge-hits")
  const tooltip = page.getByTestId("camera-tooltip")
  for (const k of [0.3, 1, 2]) {
    await setScale(page, k)
    for (const action of ["zoom", "pan", "resize"]) {
      if (action === "pan") {
        await page.evaluate(() => window.cameraScale.handle!.panBy(50, 30))
        await expect(tooltip).toHaveCount(0)
        await settled(page)
      }
      if (action === "resize") {
        await page.getByRole("button", { name: "Resize chart" }).click()
        await settled(page)
      }
      const point = await page.evaluate(() => {
        const box = document.querySelector("canvas")!.getBoundingClientRect()
        const zoom = window.cameraScale.handle!.getZoom()
        const plot = window.cameraScale.viewport!.plotRect!
        return {
          x: box.x + plot.x + zoom.x + 100 * zoom.k,
          y: box.y + plot.y + zoom.y - 100 * zoom.k
        }
      })
      // Midpoint + 4 screen pixels hits; +12 misses, regardless of k.
      await page.mouse.move(point.x, point.y + 4)
      await expect(tooltip).toHaveText("edge: Connection 0")
      await expect
        .poll(() => page.evaluate(() => window.cameraScale.hover?.nodeOrEdge))
        .toBe("edge")
      const frame = (await page.locator(".stream-network-frame").boundingBox())!
      const tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(frame.x)
      expect(tip.y).toBeGreaterThanOrEqual(frame.y)
      expect(tip.x + tip.width).toBeLessThanOrEqual(frame.x + frame.width)
      expect(tip.y + tip.height).toBeLessThanOrEqual(frame.y + frame.height)
      await page.mouse.click(point.x, point.y + 4)
      expect(
        await page.evaluate(() => ({
          id: window.cameraScale.click?.data?.id,
          kind: window.cameraScale.click?.nodeOrEdge
        }))
      ).toEqual({ id: "edge-0", kind: "edge" })
      await page.mouse.move(point.x, point.y + 12)
      await expect(tooltip).toHaveCount(0)
      await page.mouse.move(1430, 990)
      await expect(tooltip).toHaveCount(0)
      const node = await page.evaluate(() => {
        const box = document.querySelector("canvas")!.getBoundingClientRect()
        const zoom = window.cameraScale.handle!.getZoom()
        const plot = window.cameraScale.viewport!.plotRect!
        return {
          x: box.x + plot.x + zoom.x + 100 * zoom.k,
          y: box.y + plot.y + zoom.y + 24 * zoom.k
        }
      })
      await page.mouse.move(node.x, node.y)
      await expect(tooltip).toHaveText("node: Pipeline 0")
      await page.evaluate(() => window.cameraScale.handle!.panBy(10, 0))
      await expect(tooltip).toHaveCount(0)
      await settled(page)
    }
  }
  expect(errors).toEqual([])
})

test("touch taps deliver node and curved edge callbacks", async ({
  browser
}, testInfo) => {
  const context = await browser.newContext({
    hasTouch: true,
    baseURL: testInfo.project.use.baseURL
  })
  const page = await context.newPage()
  try {
    await ready(page, "nodes=300&edge-hits")
    await setScale(page, 1)
    for (const [id, y] of [
      ["node-0", 24],
      ["edge-0", -100]
    ] as const) {
      const p = await page.evaluate((y) => {
        const box = document.querySelector("canvas")!.getBoundingClientRect()
        const zoom = window.cameraScale.handle!.getZoom()
        const plot = window.cameraScale.viewport!.plotRect!
        return {
          x: box.x + plot.x + zoom.x + 100 * zoom.k,
          y: box.y + plot.y + zoom.y + y * zoom.k
        }
      }, y)
      await page.touchscreen.tap(p.x, p.y)
      expect(
        await page.evaluate(() => window.cameraScale.click?.data?.id)
      ).toBe(id)
    }
  } finally {
    await context.close()
  }
})

test("1000 LOD consumers defer promotion until continuous wheel input settles", async ({
  page
}) => {
  await ready(page, "nodes=1000&all-mounted")
  await setScale(page, 0.2)
  await expect(page.locator("[data-lod='0']")).toHaveCount(1000)
  const promotionsDuringMotion = await page.evaluate(async () => {
    const canvas = document.querySelector("canvas")!
    const box = canvas.getBoundingClientRect()
    let promoted = 0
    for (let i = 0; i < 50; i++) {
      canvas.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: box.x + 400,
          clientY: box.y + 300,
          deltaY: -15
        })
      )
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      )
      promoted = Math.max(
        promoted,
        document.querySelectorAll("[data-lod='1'], [data-lod='2']").length
      )
    }
    return promoted
  })
  expect(promotionsDuringMotion).toBe(0)
  await settled(page)
  await expect(page.locator("[data-lod='2']")).toHaveCount(1000)
  // Also exercise actual browser wheel input (the timing loop dispatches DOM
  // events so CDP round trips cannot dominate frame intervals).
  const before = await page.evaluate(
    () => window.cameraScale.handle!.getZoom().k
  )
  await page.mouse.move(420, 320)
  await page.mouse.wheel(0, 30)
  await expect
    .poll(() => page.evaluate(() => window.cameraScale.handle!.getZoom().k))
    .toBeLessThan(before)
  await settled(page)
})
