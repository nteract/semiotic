import { expect, test } from "@playwright/test"
import { waitForRafs } from "./helpers"

test("GoFish path bounds match native SVG and precise hover survives camera movement and resize (#1509)", async ({
  page
}) => {
  await page.goto("/recipe-regressions/?case=paths")
  const chart = page.getByTestId("paths")
  await expect(chart.locator("svg path[d]")).toHaveCount(5)
  // The two triangles share the same bounding box, with disjoint interiors.
  for (const action of [
    null,
    "Zoom and pan",
    "Reset camera",
    "Resize charts"
  ]) {
    if (action)
      await page.getByRole("button", { name: action, exact: true }).click()
    await waitForRafs(page)
    const targets = await chart
      .locator("svg path[d]")
      .evaluateAll((elements) => {
        const scene = (
          window as unknown as {
            pathGeometry: {
              network(): {
                sceneNodes: {
                  x: number
                  y: number
                  w: number
                  h: number
                  _hitPath: { transform: number[] }
                }[]
              }
            }
          }
        ).pathGeometry.network()
        return elements.map((element, i) => {
          const path = element as SVGPathElement
          const box = path.getBBox(),
            [tx, ty, sx, sy] = scene.sceneNodes[i]._hitPath.transform
          const expected = {
            x: box.x * sx + tx,
            y: box.y * sy + ty,
            w: box.width * sx,
            h: box.height * sy
          }
          const samples = [
            [30, 90],
            [90, 30],
            [190, 75],
            [300, 55],
            [385, 40]
          ]
          const point = new DOMPoint(...samples[i]).matrixTransform(
            path.getScreenCTM()!
          )
          return {
            expected,
            actual: scene.sceneNodes[i],
            x: point.x,
            y: point.y
          }
        })
      })
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]
      for (const key of ["x", "y", "w", "h"] as const)
        // Native getBBox tessellates arcs (e.g. 50.0244 for an analytic 50).
        // Exact analytic cases are independently covered by unit tests.
        expect(
          Math.abs(target.actual[key] - target.expected[key])
        ).toBeLessThan(0.05)
      await page.mouse.move(target.x, target.y)
      const tip = chart.locator(".stream-network-tooltip")
      await expect(tip).toHaveText(
        JSON.stringify({
          name: ["Lower petal", "Upper petal", "Arc", "Relative bar", "Curve"][
            i
          ]
        })
      )
      const canvas = (await chart.locator("canvas").first().boundingBox())!
      await expect
        .poll(async () => {
          const box = await tip.boundingBox()
          return (
            !!box &&
            box.x >= canvas.x + 19.5 &&
            box.y >= canvas.y + 39.5 &&
            box.x + box.width <= canvas.x + canvas.width - 19.5 &&
            box.y + box.height <= canvas.y + canvas.height - 19.5
          )
        })
        .toBe(true)
      await page.mouse.move(0, 0)
      await expect(tip).toBeHidden()
    }
  }
  const frame = chart.locator(".stream-network-frame")
  await frame.focus()
  await frame.press("Home")
  await frame.press("End")
  await expect(chart.locator(".stream-network-tooltip")).toHaveText(
    JSON.stringify({ name: "Curve" })
  )
  await waitForRafs(page)
  const mark = (await chart.locator("svg path[d]").last().boundingBox())!
  const ring = (await chart.locator('[stroke-dasharray="4,2"]').boundingBox())!
  // Playwright's box includes the 2px stroke, outside the ring's 3px padding.
  expect(ring.x).toBeCloseTo(mark.x - 4, 1)
  expect(ring.y).toBeCloseTo(mark.y - 4, 1)
  expect(ring.width).toBeCloseTo(mark.width + 8, 1)
  expect(ring.height).toBeCloseTo(mark.height + 8, 1)
  await frame.press("Escape")
  await expect(chart.locator(".stream-network-tooltip")).toBeHidden()
})

test("GoFish flower hover selects the painted petal instead of an overlapping box (#1509)", async ({
  page
}) => {
  await page.goto("/recipe-regressions/?case=paths&example=flower")
  const chart = page.getByTestId("paths")
  await expect(chart.locator("svg path[d]")).toHaveCount(30)
  const targets = await chart.evaluate((root) => {
    const scene = (
      window as unknown as {
        pathGeometry: {
          network(): {
            sceneNodes: { _hitPath?: { pathD: string }; datum: unknown }[]
          }
        }
      }
    ).pathGeometry.network()
    const paths = [...root.querySelectorAll<SVGPathElement>("svg path[d]")]
    const marks = scene.sceneNodes
      .filter((n) => n._hitPath)
      .map((n) => ({
        node: n,
        path: paths.find((p) => p.getAttribute("d") === n._hitPath!.pathD)!
      }))
    return marks.slice(0, 4).map(({ node, path }) => {
      const b = path.getBBox()
      for (let x = 1; x < 10; x++)
        for (let y = 1; y < 10; y++) {
          const point = new DOMPoint(
            b.x + (b.width * x) / 10,
            b.y + (b.height * y) / 10
          )
          const matrix = path.getScreenCTM()!
          const dx = 2 / Math.hypot(matrix.a, matrix.b)
          const dy = 2 / Math.hypot(matrix.c, matrix.d)
          if (
            ![
              [0, 0],
              [dx, 0],
              [-dx, 0],
              [0, dy],
              [0, -dy]
            ].every(([x, y]) =>
              path.isPointInFill(new DOMPoint(point.x + x, point.y + y))
            )
          )
            continue
          const painted = marks
            .filter((m) => m.path.isPointInFill(point))
            .at(-1)
          if (painted?.node !== node) continue
          const screen = point.matrixTransform(path.getScreenCTM()!)
          return { x: screen.x, y: screen.y, text: JSON.stringify(node.datum) }
        }
      throw new Error("Expected a visible point inside each flower petal")
    })
  })
  expect(targets).toHaveLength(4)
  for (const point of targets) {
    await page.mouse.move(point.x, point.y)
    await expect(chart.locator(".stream-network-tooltip")).toHaveText(
      point.text
    )
    await page.mouse.move(0, 0)
    await expect(chart.locator(".stream-network-tooltip")).toBeHidden()
  }
})

test("steep bump ribbons retain ordered boundaries and raw hover after resize and data changes (#1509)", async ({
  page
}) => {
  await page.goto("/recipe-regressions/?case=paths")
  const chart = page.getByTestId("bump")
  await chart.locator("canvas").first().waitFor({ state: "visible" })
  for (const action of [null, "Resize charts", "Update ranks"]) {
    if (action) await page.getByRole("button", { name: action }).click()
    await waitForRafs(page)
    const scene = await page.evaluate(() =>
      (
        window as unknown as {
          pathGeometry: {
            bump(): {
              nodes: {
                type: string
                topPath: number[][]
                bottomPath: number[][]
                datum: {
                  __bumpRaw: { team: string; period: number; value: number }
                }[]
              }[]
            }
          }
        }
      ).pathGeometry.bump()
    )
    const areas = scene.nodes.filter((n) => n.type === "area")
    expect(areas).toHaveLength(3)
    for (const area of areas)
      for (const path of [area.topPath, area.bottomPath]) {
        expect(path).toHaveLength(37)
        for (let i = 1; i < path.length; i++)
          expect(path[i][0]).toBeGreaterThanOrEqual(path[i - 1][0])
      }
    const last = areas.at(-1)!,
      index = 3,
      row = last.datum[index].__bumpRaw
    const x = (last.topPath[index][0] + last.bottomPath[index][0]) / 2
    const y = (last.topPath[index][1] + last.bottomPath[index][1]) / 2
    const canvas = chart.locator("canvas").first(),
      box = (await canvas.boundingBox())!
    await page.mouse.move(box.x + 20 + x, box.y + 40 + y)
    const tip = chart.locator(".stream-frame-tooltip")
    await expect(tip).toHaveText(
      `${row.team}: period ${row.period}, value ${row.value}`
    )
    await expect
      .poll(async () => {
        const bounds = await tip.boundingBox()
        return (
          !!bounds &&
          bounds.x >= box.x + 19.5 &&
          bounds.y >= box.y + 39.5 &&
          bounds.x + bounds.width <= box.x + box.width - 19.5 &&
          bounds.y + bounds.height <= box.y + box.height - 19.5
        )
      })
      .toBe(true)
    await page.mouse.move(0, 0)
    await expect(tip).toBeHidden()
  }
})

test("GoFish mixed paths and rectangles follow paint order after camera, resize, and data updates", async ({ page }) => {
  await page.goto("/recipe-regressions/?case=paths&example=mixed")
  const chart = page.getByTestId("paths")
  const cover = chart.locator('svg rect[fill="red"]')
  await expect(cover).toHaveCount(1)
  for (const action of [null, "Zoom and pan", "Resize charts", "Reverse paint order"]) {
    if (action) await page.getByRole("button", { name: action, exact: true }).click()
    await waitForRafs(page)
    const point = await cover.evaluate((node) => {
      const point = new DOMPoint(80, 80).matrixTransform((node as SVGGraphicsElement).getScreenCTM()!)
      return { x: point.x, y: point.y }
    })
    await page.mouse.move(point.x, point.y)
    const tooltip = chart.locator(".stream-network-tooltip")
    await expect(tooltip).toHaveText(JSON.stringify({ name: action === "Reverse paint order" ? "Triangle" : "Rectangle" }))
    const bounds = (await chart.locator("canvas").first().boundingBox())!
    const tip = (await tooltip.boundingBox())!
    expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
    expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
    expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
    expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
    await page.mouse.move(0, 0)
    await expect(tooltip).toBeHidden()
  }
})
