import { test, expect } from "@playwright/test"

for (const mode of ["false", "null"]) {
  test(`tooltip ${mode} suppresses chrome while preserving hover observations`, async ({
    page
  }) => {
    await page.goto(
      `/network-custom-layout-examples/?zoom-test&tooltip=${mode}`
    )
    const frame = page.locator(".stream-network-frame")
    const box = (await frame.boundingBox())!
    await page.mouse.move(box.x + 190, box.y + 140)
    await expect(page.getByTestId("zoom-hover")).toHaveText("a")
    await expect(
      frame.locator(".stream-network-tooltip, .semiotic-tooltip")
    ).toHaveCount(0)
  })
}

test("camera aligns canvas, SVG, HTML and inverse hits without rerunning layout", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/network-custom-layout-examples/?zoom-test")
  await expect(page.getByLabel("Draft", { exact: true })).toBeVisible()
  const before = await page.evaluate(() => window.networkZoomLayoutCalls)
  await page.evaluate(() =>
    window.networkZoomHandle!.zoomTo({ x: -50, y: 15, k: 1.5 }, 0)
  )
  await expect(page.getByLabel("Zoom level")).toHaveText("150%")
  const geometry = await page.evaluate(() => {
    const frame = document
      .querySelector(".stream-network-frame")!
      .getBoundingClientRect()
    // Firefox includes the outline in getBoundingClientRect; compare the
    // authored SVG box projected through the browser's actual camera matrix.
    const shape = document.querySelector<SVGGraphicsElement>(
      '[data-testid="world-overlay"] rect'
    )!
    const bounds = shape.getBBox(),
      matrix = shape.getScreenCTM()!
    const corner = new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix)
    const end = new DOMPoint(
      bounds.x + bounds.width,
      bounds.y + bounds.height
    ).matrixTransform(matrix)
    const svg = {
      x: corner.x,
      y: corner.y,
      width: end.x - corner.x,
      height: end.y - corner.y
    }
    const html = document
      .querySelector('[data-mark-id="a"]')!
      .getBoundingClientRect()
    const bg = document
      .querySelector('[data-testid="world-background"]')!
      .getBoundingClientRect()
    const canvas = document.querySelector("canvas")!
    const pixel = canvas
      .getContext("2d")!
      .getImageData(
        Math.round(((30 - 50 + 150 + 50) * canvas.width) / 540),
        Math.round(((20 + 15 + 120 + 60) * canvas.height) / 360),
        1,
        1
      ).data
    return {
      svg: {
        x: svg.x - frame.x,
        y: svg.y - frame.y,
        w: svg.width,
        h: svg.height
      },
      html: {
        x: html.x - frame.x,
        y: html.y - frame.y,
        w: html.width,
        h: html.height
      },
      bg: { x: bg.x - frame.x, y: bg.y - frame.y },
      pixel: [...pixel],
      frame: { x: frame.x, y: frame.y }
    }
  })
  // DOMMatrix uses float32 in Firefox: compare to 1/10,000 of a CSS pixel.
  for (const [key, expected] of Object.entries({
    x: 130,
    y: 155,
    w: 180,
    h: 120
  })) {
    expect(geometry.svg[key as keyof typeof geometry.svg]).toBeCloseTo(
      expected,
      4
    )
    expect(geometry.html[key as keyof typeof geometry.html]).toBeCloseTo(
      expected,
      4
    )
  }
  expect(geometry.bg).toEqual({ x: 130, y: 155 })
  expect(geometry.pixel).toEqual([51, 102, 204, 255])
  await page.mouse.move(geometry.frame.x + 220, geometry.frame.y + 240)
  await expect(page.getByTestId("zoom-hover")).toHaveText("a")
  await expect(page.getByTestId("zoom-tooltip")).toHaveText("a")
  const snapshot = JSON.parse(
    await page.getByTestId("zoom-viewport").innerText()
  )
  expect(snapshot.visibleRect.x).toBeCloseTo(50 / 1.5)
  expect(snapshot.visibleRect.y).toBeCloseTo(-15 / 1.5)
  expect(snapshot.visibleRect.width).toBeCloseTo(500 / 1.5)
  expect(await page.evaluate(() => window.networkZoomLayoutCalls)).toBe(before)
  expect(errors).toEqual([])
})

test("virtual camera preserves focused drafts and discovers distant cards", async ({
  page
}) => {
  await page.goto("/network-custom-layout-examples/?zoom-test")
  const input = page.getByLabel("Draft", { exact: true })
  await input.fill("unsaved draft")
  await page.evaluate(() =>
    window.networkZoomHandle!.zoomTo({ x: -1100, y: -850, k: 1 }, 0)
  )
  await expect(page.getByText("Far card", { exact: true })).toBeVisible()
  await expect(input).toHaveValue("unsaved draft")
  await expect(input).toBeFocused()
  await page.getByRole("button", { name: "Fit", exact: true }).click()
  await expect
    .poll(async () => (await input.boundingBox())!.width)
    .toBeLessThan(70)
  await expect(page.getByText("Far card", { exact: true })).toBeVisible()
  await expect(page.locator(".stream-network-frame")).toHaveJSProperty(
    "scrollLeft",
    0
  )
  await expect(page.locator(".stream-network-frame")).toHaveJSProperty(
    "scrollTop",
    0
  )
})

test("keyboard navigation reveals a distant retained node", async ({
  page
}) => {
  await page.goto("/network-custom-layout-examples/?zoom-test")
  const frame = page.locator(".stream-network-frame")
  await frame.focus()
  await frame.press("ArrowRight")
  await frame.press("End")
  await expect(page.getByText("Far card", { exact: true })).toBeVisible()
  await expect(frame).toBeFocused()
  expect(
    await page.evaluate(() => window.networkZoomHandle!.getZoom().x)
  ).toBeLessThan(-500)
})

test("camera reprojects a paused frame at double device pixel ratio", async ({
  browser
}) => {
  const context = await browser.newContext({ deviceScaleFactor: 2 })
  const page = await context.newPage()
  try {
    await page.goto(
      "http://127.0.0.1:1234/network-custom-layout-examples/?zoom-test&paused"
    )
    await expect(page.getByLabel("Zoom level")).toHaveText("100%")
    await page.evaluate(() =>
      window.networkZoomHandle!.zoomTo({ x: -50, y: 15, k: 1.5 }, 0)
    )
    await expect(page.getByLabel("Zoom level")).toHaveText("150%")
    const raster = await page.evaluate(() => {
      const canvas = document.querySelector("canvas")!
      return {
        width: canvas.width,
        pixels: [
          ...canvas.getContext("2d")!.getImageData(180 * 2, 215 * 2, 1, 1).data
        ]
      }
    })
    expect(raster).toEqual({ width: 1080, pixels: [51, 102, 204, 255] })
  } finally {
    await context.close()
  }
})

test("controlled cameras wait for acceptance and locks cover controls and imperative changes", async ({
  page
}) => {
  await page.goto("/network-custom-layout-examples/?zoom-test")
  await page.getByLabel("Controlled", { exact: true }).check()
  await page.getByRole("button", { name: "Zoom in", exact: true }).click()
  await expect(page.getByLabel("Zoom level")).toHaveText("100%")
  await page.getByLabel("Accept changes", { exact: true }).check()
  await page.getByRole("button", { name: "Zoom in", exact: true }).click()
  await expect(page.getByLabel("Zoom level")).toHaveText("200%")
  await page.getByLabel("Lock", { exact: true }).check()
  await expect(
    page.getByRole("button", { name: "Zoom in", exact: true })
  ).toBeDisabled()
  await page.evaluate(() =>
    window.networkZoomHandle!.zoomTo({ x: 1000, y: 1000, k: 4 }, 0)
  )
  await expect
    .poll(() => page.evaluate(() => window.networkZoomHandle!.getZoom().k))
    .toBe(2)
})

test("canonical cards degrade to skeletons and restore detail only after zoom settles", async ({
  page
}) => {
  await page.goto("/network-custom-layout-examples/?zoom")
  const first = page.locator('[data-mark-id="step-0"] article')
  await expect(first).toHaveAttribute("data-lod", "3")
  const calls = await page.evaluate(() => window.networkZoomDemoLayoutCalls)
  await page.getByRole("button", { name: "Zoom out", exact: true }).click()
  await expect(page.getByLabel("Zoom level")).toHaveText("50%")
  await expect(first).toHaveAttribute("data-lod", "2")
  await expect(first.locator("input")).toHaveCount(0)
  await page.getByRole("button", { name: "Zoom out", exact: true }).click()
  await expect(page.getByLabel("Zoom level")).toHaveText("25%")
  await expect(first).toHaveAttribute("data-lod", "1")
  await page.getByRole("button", { name: "Reset", exact: true }).click()
  await expect(page.getByTestId("zoom-phase")).toHaveText("Exploring…")
  await expect(first.locator("input")).toHaveCount(0)
  await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
  await expect(first).toHaveAttribute("data-lod", "3")
  expect(await page.evaluate(() => window.networkZoomDemoLayoutCalls)).toBe(
    calls
  )
})

for (const { ctrlKey, controlled } of [
  { ctrlKey: false, controlled: false },
  { ctrlKey: true, controlled: false },
  { ctrlKey: true, controlled: true }
]) {
  for (const direction of [-1, 1]) {
    test(`${controlled ? "controlled " : ""}${ctrlKey ? "pinch-wheel" : "wheel"} zoom ${direction < 0 ? "in" : "out"} never reverses with animated controls enabled`, async ({
      page
    }) => {
      await page.goto("/network-custom-layout-examples/?zoom-test&animated")
      await expect(page.getByLabel("Zoom level")).toHaveText("100%")
      if (controlled) {
        await page.getByLabel("Controlled", { exact: true }).check()
        await page.getByLabel("Accept changes", { exact: true }).check()
      }
      const box = (await page.locator(".stream-network-frame").boundingBox())!
      // Native wheel coordinates are integer-rounded in Firefox. Use an
      // integer cursor and account for the frame's fractional CSS origin.
      const cursor = { x: Math.round(box.x + 130), y: Math.round(box.y + 260) }
      const anchor = { x: cursor.x - box.x - 30, y: cursor.y - box.y - 20 }
      await page.mouse.move(cursor.x, cursor.y)
      if (ctrlKey) await page.keyboard.down("Control")
      for (let i = 0; i < 12; i++) await page.mouse.wheel(0, direction * 8)
      if (ctrlKey) await page.keyboard.up("Control")
      const expected = Math.exp(-direction * 12 * 8 * (ctrlKey ? 0.008 : 0.002))
      await expect
        .poll(() => page.evaluate(() => window.networkZoomHandle!.getZoom().k))
        .toBeCloseTo(expected, 8)
      const changes = await page.evaluate(() => window.networkZoomChanges)
      expect(changes.length).toBeGreaterThan(2)
      let previous = 1
      for (const view of changes) {
        expect((view.k - previous) * -direction).toBeGreaterThanOrEqual(-1e-12)
        expect(view.x + anchor.x * view.k).toBeCloseTo(anchor.x)
        expect(view.y + anchor.y * view.k).toBeCloseTo(anchor.y)
        previous = view.k
      }
    })
  }
}

for (const controlled of [false, true]) {
  for (const ctrlKey of [false, true]) {
    test(`${controlled ? "controlled" : "uncontrolled"} ${ctrlKey ? "pinch-wheel" : "wheel"} paints the full gesture each frame without a release snap`, async ({
      page
    }) => {
      await page.goto("/network-custom-layout-examples/?zoom-test&animated")
      await expect(page.getByLabel("Zoom level")).toHaveText("100%")
      if (controlled) {
        await page.getByLabel("Controlled", { exact: true }).check()
        await page.getByLabel("Accept changes", { exact: true }).check()
      }
      const samples = await page.evaluate(
        async ({ ctrlKey }) => {
          const frame = document.querySelector<HTMLElement>(
            ".stream-network-frame"
          )!
          const box = frame.getBoundingClientRect()
          const canvas = frame.querySelector("canvas")!
          const context = canvas.getContext("2d")!
          const ratio = canvas.width / box.width
          const overlay = frame.querySelector<SVGGraphicsElement>(
            '[data-testid="world-overlay"] rect'
          )!
          const clientX = Math.round(box.x + 130)
          const clientY = Math.round(box.y + 260)
          const anchor = { x: clientX - box.x - 30, y: clientY - box.y - 20 }
          const samples: {
            expected: number
            actual: number
            html: number
            svg: number
            canvas: number
          }[] = []
          let sum = 0
          // Deliver events at frame boundaries, then read committed geometry on
          // the following frame. Do not poll until a tween reaches its endpoint:
          // the chart must display the full input while fingers are still moving.
          const paint = () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve())
              )
            )
          for (const direction of [-1, 1]) {
            for (let i = 0; i < 12; i++) {
              const deltaY = direction * 8
              sum += deltaY
              canvas.dispatchEvent(
                new WheelEvent("wheel", {
                  deltaY,
                  clientX,
                  clientY,
                  ctrlKey,
                  bubbles: true,
                  cancelable: true
                })
              )
              await paint()
              const expected = Math.exp(-sum * (ctrlKey ? 0.008 : 0.002))
              const html = frame
                .querySelector('[data-mark-id="a"]')!
                .getBoundingClientRect()
              // Count the opaque blue canvas rectangle across an interior row.
              // This measures its painted width independently of the camera ref.
              const bottom = 20 + anchor.y + (160 - anchor.y) * expected
              const row = context.getImageData(
                0,
                Math.floor((bottom - 10) * ratio),
                canvas.width,
                1
              ).data
              let blue = 0
              for (let x = 0; x < row.length; x += 4) {
                if (
                  row[x] === 51 &&
                  row[x + 1] === 102 &&
                  row[x + 2] === 204 &&
                  row[x + 3] === 255
                )
                  blue++
              }
              samples.push({
                expected,
                actual: window.networkZoomHandle!.getZoom().k,
                html: html.width,
                svg: overlay.getScreenCTM()!.a,
                canvas: blue / ratio
              })
            }
          }
          return samples
        },
        { ctrlKey }
      )
      for (const sample of samples) {
        expect(sample.actual).toBeCloseTo(sample.expected, 8)
        // Firefox rounds layout boxes to 1/60 CSS px. Measure widths directly
        // with a subpixel tolerance, keeping the camera assertion exact above.
        expect(Math.abs(sample.html - 120 * sample.expected)).toBeLessThan(0.02)
        expect(sample.svg).toBeCloseTo(sample.expected, 4)
        expect(Math.abs(sample.canvas - 120 * sample.expected)).toBeLessThan(2)
      }
      const movingCount = await page.evaluate(
        () => window.networkZoomChanges.length
      )
      // Wait past the configured transition and settle delays specifically to
      // prove release emits no further geometric updates.
      await page.waitForTimeout(400)
      expect(await page.evaluate(() => window.networkZoomChanges.length)).toBe(
        movingCount
      )
      expect(
        await page.evaluate(() => window.networkZoomHandle!.getZoom().k)
      ).toBeCloseTo(1, 8)
    })
  }
}

test("mouse wheel is anchored to its cursor and touch pinch uses the same camera", async ({
  page,
  browserName
}) => {
  test.skip(
    browserName !== "chromium",
    "CDP touch injection is Chromium-specific; pointer lifecycle also has unit coverage"
  )
  await page.goto("/network-custom-layout-examples/?zoom-test")
  await expect(page.getByLabel("Zoom level")).toHaveText("100%")
  const box = (await page.locator(".stream-network-frame").boundingBox())!
  await page.mouse.move(box.x + 130, box.y + 120)
  await page.mouse.wheel(0, -200)
  await expect
    .poll(() => page.evaluate(() => window.networkZoomHandle!.getZoom().k))
    .toBeGreaterThan(1)
  const wheel = await page.evaluate(() => window.networkZoomHandle!.getZoom())
  expect(wheel.x + 100 * wheel.k).toBeCloseTo(100)
  expect(wheel.y + 100 * wheel.k).toBeCloseTo(100)
  await page.evaluate(() =>
    window.networkZoomHandle!.zoomTo({ x: 0, y: 0, k: 1 }, 0)
  )
  await expect(page.getByLabel("Zoom level")).toHaveText("100%")
  const cdp = await page.context().newCDPSession(page)
  const touchPoints = (right: number) => [
    { x: box.x + 130, y: box.y + 270, id: 1 },
    { x: box.x + right, y: box.y + 270, id: 2 }
  ]
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: touchPoints(230)
  })
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: touchPoints(330)
  })
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: []
  })
  await expect
    .poll(() => page.evaluate(() => window.networkZoomHandle!.getZoom().k))
    .toBeCloseTo(2)
})
