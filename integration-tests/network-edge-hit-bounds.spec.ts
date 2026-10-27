import { test, expect } from "@playwright/test"
import type {} from "./network-custom-layout-examples/cameraScaleFixture"
import type { NetworkSceneEdge } from "../src/components/stream/networkTypes"

test("conservative edge bounds match unfiltered Canvas paths across geometry, styles and zoom", async ({
  page
}) => {
  await page.goto(
    "/network-custom-layout-examples/camera-scale.html?nodes=300&edge-hits"
  )
  await expect
    .poll(() => page.evaluate(() => !!window.cameraScale?.handle))
    .toBe(true)
  const result = await page.evaluate(() => {
    type PathEdge = Exclude<NetworkSceneEdge, { type: "line" }>
    const paths = [
      "M-150,-30 C-100,170 100,-170 150,30",
      "M1e2,0 C1e3,5e2 -1e3,5e2 -1e2,0",
      "M-150,0 c20,120 90,120 100,0 s90,-120 100,0",
      "M-150,0 q75,150 150,0 t150,0",
      "M-90,-30 a90,40 37 1 1 180,60 a90,40 37 1 1 -180,-60",
      "M-80,0 A1,1 0 01160,0", // corrected radii and adjacent arc flags
      "M-100,-70 H100 V70 H-100 Z M-40,-20 V20 H40 V-20 Z",
      "M-100,0 L0,0 L-100,30", // sharp miter extends past x=0
      "M-100,0 L100,0 L", // Canvas can retain a valid prefix
      "M-100,-50 L100,-50 M-100,50 L100,50",
      "M-100,-100 L-100,-100 Z",
      "M-500,0 C-500,500 500,500 500,0" // large unfilled cubic uses subdivision
    ]
    const edges: PathEdge[] = paths.map((pathD, i) => ({
      type: (["bezier", "ribbon", "curved"] as const)[i % 3],
      pathD,
      style: {
        fill: i % 3 === 1 ? "red" : "none",
        stroke: "navy",
        strokeWidth: 1
      },
      datum: { id: `edge-${i}` }
    }))
    const ctx = document.createElement("canvas").getContext("2d")!
    const hitTest = window.cameraScale.hitTest
    const mismatches: unknown[] = []
    let checks = 0,
      hits = 0
    const compare = (scene: PathEdge[], k: number, wide = false) => {
      const parsed = scene.map((edge) => new Path2D(edge.pathD))
      const index = window.cameraScale.prepareEdges(scene)
      // Exhaustive Canvas oracle: search every painted surface before padded
      // strokes, in increasing distance bands (quarter-slop resolution), with
      // last-painted ties. No production bounds, index or hit helper is used.
      const probes = scene.flatMap((edge, order) => {
        if (edge.interactive === false || edge.datum == null) return []
        const { fill, stroke, strokeWidth = 1 } = edge.style
        const bands: { order: number; distance: number; width: number | null }[] = []
        if (fill && fill !== "none") bands.push({ order, distance: 0, width: null })
        if (stroke !== "none" && strokeWidth > 0) {
          const padding = Math.max(0, 5 / k - strokeWidth / 2)
          for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
            const distance = padding * fraction
            bands.push({ order, distance, width: strokeWidth + distance * 2 })
          }
        }
        return bands
      }).sort((a, b) => a.distance - b.distance || b.order - a.order)
      for (let x = wide ? -600 : -190; x <= (wide ? 600 : 190); x += wide ? 19 : 13) {
        for (let y = wide ? -550 : -140; y <= (wide ? 550 : 140); y += wide ? 23 : 11) {
          const probe = probes.find(({ order, width }) => {
            if (width === null) return ctx.isPointInPath(parsed[order], x, y)
            ctx.lineWidth = width
            return ctx.isPointInStroke(parsed[order], x, y)
          })
          const expected = probe ? scene[probe.order] : undefined
          const actual = hitTest([], scene, x, y, 12, null, 0, true, k)?.mark
          const indexed = hitTest([], scene, x, y, 12, null, 0, true, k, index)?.mark
          if ((actual !== expected || indexed !== expected) && mismatches.length < 10)
            mismatches.push({
              x,
              y,
              k,
              expected: expected?.datum,
              actual: actual?.datum,
              indexed: indexed?.datum
            })
          if (expected) hits++
          checks++
        }
      }
    }
    // Exercise every shape independently, then reverse-painted overlaps.
    for (const k of [0.3, 1, 2]) {
      for (const edge of edges) compare([edge], k)
      compare([edges[edges.length - 1]], k, true)
      compare(edges, k)
    }
    // The same records/array can be mutated by a retained layout/restyle.
    edges.reverse()
    edges[0].pathD = "M-90,-30 H90 V30 H-90 Z"
    edges[0].style = { fill: "red", stroke: "none" }
    edges[1].interactive = false
    edges[2].style.strokeWidth = 40
    edges[3].style.strokeWidth = 0
    edges[4].style.fill = "none"
    for (const k of [0.3, 1, 2]) compare(edges, k)

    const invalidWidth: PathEdge = {
      type: "curved",
      pathD: "M-100,0 H100",
      style: { stroke: "navy", strokeWidth: NaN },
      datum: { id: "invalid-width" }
    }
    // Canvas ignores non-finite line widths. Its initial 1px width still owns
    // this point; the rejection stage must not treat NaN as zero padding.
    const invalidWidthHit = !!hitTest([], [invalidWidth], 0, 0.25)

    const miter = edges.find((edge) => edge.pathD === "M-100,0 L0,0 L-100,30")!
    miter.style.strokeWidth = 1
    ctx.lineWidth = 10
    const miterPoint = { x: 25, y: -4 }
    return {
      checks,
      hits,
      mismatches,
      miterOracle: ctx.isPointInStroke(
        new Path2D(miter.pathD),
        miterPoint.x,
        miterPoint.y
      ),
      invalidWidthHit,
      miterHit: !!hitTest([], [miter], miterPoint.x, miterPoint.y)
    }
  })
  expect(result.checks).toBeGreaterThan(20_000)
  expect(result.hits).toBeGreaterThan(1_000)
  expect(result.mismatches).toEqual([])
  expect(result.miterOracle).toBe(true)
  expect(result.miterHit).toBe(true)
  expect(result.invalidWidthHit).toBe(true)
})

test("layout edge-hit policy switches hover, click and cursors while nodes stay interactive", async ({
  page
}) => {
  await page.goto(
    "/network-custom-layout-examples/camera-scale.html?nodes=300&edge-hits&hit-policy"
  )
  await expect
    .poll(() =>
      page.evaluate(() => !!window.cameraScale?.handle?.getCustomLayout())
    )
    .toBe(true)
  await page.evaluate(() =>
    window.cameraScale.handle!.zoomTo({ x: 20, y: 300, k: 1 }, 0)
  )
  // An idle phase can still describe the previous camera before the queued
  // zero-duration move commits. Wait for the requested view before hovering.
  await expect.poll(() => page.evaluate(() => window.cameraScale.handle!.getZoom()))
    .toEqual({ x: 20, y: 300, k: 1 })
  await expect
    .poll(() => page.evaluate(() => window.cameraScale.phase))
    .toBe("idle")
  const canvas = page.locator("canvas")
  const tooltip = page.getByTestId("camera-tooltip")
  const point = async (y: number) =>
    page.evaluate((y) => {
      const box = document.querySelector("canvas")!.getBoundingClientRect()
      const view = window.cameraScale.handle!.getZoom()
      const plot = window.cameraScale.viewport!.plotRect!
      return {
        x: box.x + plot.x + view.x + 100 * view.k,
        y: box.y + plot.y + view.y + y * view.k
      }
    }, y)
  for (const enabled of [true, false, true]) {
    if (!enabled)
      await page.getByRole("button", { name: "Disable edge hits" }).click()
    else if (
      await page.getByRole("button", { name: "Enable edge hits" }).count()
    )
      await page.getByRole("button", { name: "Enable edge hits" }).click()
    await expect
      .poll(() =>
        page.evaluate(
          () => window.cameraScale.handle!.getCustomLayout()!.edgeHitTesting
        )
      )
      .toBe(enabled)
    const edge = await point(-100)
    await page.mouse.move(edge.x, edge.y)
    if (enabled) await expect(tooltip).toHaveText("edge: Connection 0")
    else await expect(tooltip).toHaveCount(0)
    await expect(canvas).toHaveCSS("cursor", enabled ? "crosshair" : "auto")
    await page.mouse.click(edge.x, edge.y)
    await expect
      .poll(() =>
        page.evaluate(() => window.cameraScale.click?.data?.id ?? null)
      )
      .toBe(enabled ? "edge-0" : null)
    const node = await point(24)
    await page.mouse.move(node.x, node.y)
    await expect(tooltip).toHaveText("node: Pipeline 0")
    await page.mouse.click(node.x, node.y)
    expect(await page.evaluate(() => window.cameraScale.click?.data?.id)).toBe(
      "node-0"
    )
    await page.mouse.move(1430, 990)
    await expect(tooltip).toHaveCount(0)
  }

  // A programmatic policy change can happen with the pointer still over the
  // old edge. It must clear both the displayed and observed hover immediately.
  const edge = await point(-100)
  await page.mouse.move(edge.x, edge.y)
  await expect(tooltip).toHaveText("edge: Connection 0")
  await page
    .getByRole("button", { name: "Disable edge hits" })
    .evaluate((button: HTMLButtonElement) => button.click())
  await expect(tooltip).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => window.cameraScale.hover))
    .toBeNull()
  await expect(canvas).toHaveCSS("cursor", "auto")
})
