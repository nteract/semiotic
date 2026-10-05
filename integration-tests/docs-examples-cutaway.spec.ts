import { test, expect, type Locator, type Page } from "@playwright/test"

const tooltip = (page: Page) =>
  page.locator(".stream-network-tooltip").filter({ visible: true })

async function nodePoint(cutaway: Locator, id: string, index = 0) {
  const label = cutaway
    .locator("svg text")
    .filter({ hasText: new RegExp(`^${id}$`) })
    .nth(index)
  const box = (await label.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 + 18 }
}

for (const chart of ["resolution-atlas-chart", "boundary-loom-chart"]) {
  test(`${chart} cutaway places reciprocal boundary edges on the correct sides`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.goto(`/charts/${chart}`)
    await page.getByLabel("Cutaway example").selectOption("reciprocal")
    const cutaway = page.getByTestId("resolution-cutaway")
    await cutaway.getByLabel("Path evidence").selectOption("observed")
    await expect(cutaway).toContainText(
      "1 supported / 1 queried / 1 total pairs"
    )
    await expect(
      cutaway.locator("svg text").filter({ hasText: /^A$/ })
    ).toHaveCount(2)
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 1000 })
      await cutaway.locator("canvas").scrollIntoViewIfNeeded()
      await cutaway.locator(".stream-network-frame").focus()
      const incoming = await nodePoint(cutaway, "A", 0)
      const outgoing = await nodePoint(cutaway, "A", 1)
      const entry = await nodePoint(cutaway, "x1")
      const exit = await nodePoint(cutaway, "x2")
      expect(incoming.x).toBeLessThan(entry.x)
      expect(outgoing.x).toBeGreaterThan(exit.x)
      for (const [point, side] of [
        [incoming, "incoming"],
        [outgoing, "outgoing"]
      ] as const) {
        await page.mouse.move(point.x, point.y)
        await expect(tooltip(page)).toContainText(
          `A; outside neighbor; ${side} connection; supporting path`
        )
        const box = (await tooltip(page).boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.y + box.height).toBeLessThanOrEqual(1000)
        await page.keyboard.press("Escape")
        await expect(tooltip(page)).toHaveCount(0)
      }
      for (const [a, b, text] of [
        [incoming, entry, "ax1: A → x1"],
        [exit, outgoing, "x2a: x2 → A"]
      ] as const) {
        const distance = Math.hypot(b.x - a.x, b.y - a.y)
        await page.mouse.move(
          (a.x + b.x) / 2 - ((b.y - a.y) / distance) * 6,
          (a.y + b.y) / 2 + ((b.x - a.x) / distance) * 6
        )
        await expect(tooltip(page)).toContainText(
          `${text}; boundary connection; supporting path`
        )
        await page.mouse.move(2, 2)
        await expect(tooltip(page)).toHaveCount(0)
      }
    }
    expect(errors).toEqual([])
  })

  test(`${chart} cutaway selects support cells and inspects original marks and edges`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`/charts/${chart}`)
    const cutaway = page.getByTestId("resolution-cutaway")
    await expect(cutaway).toContainText(
      "3 supported / 4 queried / 4 total pairs"
    )
    const cell = cutaway
      .locator("svg text")
      .filter({ hasText: /^[●×?]$/ })
      .nth(1)
    await cell.scrollIntoViewIfNeeded()
    const box = (await cell.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await expect(tooltip(page)).toContainText("x1 to y2: yes")
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(cutaway.getByRole("status")).toContainText("x1 → y2")
    await page.keyboard.press("Escape")
    await expect(tooltip(page)).toHaveCount(0)
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 1000 })
      await cutaway.locator("canvas").scrollIntoViewIfNeeded()
      const a = await nodePoint(cutaway, "x1"),
        b = await nodePoint(cutaway, "y2")
      await page.mouse.move(a.x, a.y)
      await expect(tooltip(page)).toContainText(
        "x1; inside component; selected entry"
      )
      const bounds = (await tooltip(page).boundingBox())!
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
      expect(bounds.y).toBeGreaterThanOrEqual(0)
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(1000)
      // Midpoint of the actual directed quadratic edge, including its bend.
      const distance = Math.hypot(b.x - a.x, b.y - a.y)
      await page.mouse.move(
        (a.x + b.x) / 2 - ((b.y - a.y) / distance) * 6,
        (a.y + b.y) / 2 + ((b.x - a.x) / distance) * 6
      )
      await expect(tooltip(page)).toContainText(
        "x1y2: x1 → y2; inside component; supporting path"
      )
      await page.mouse.move(2, 2)
      await expect(tooltip(page)).toHaveCount(0)
    }
    await cutaway.getByLabel("Path evidence").selectOption("observed")
    await expect(cutaway).toContainText(
      "2 supported / 4 queried / 4 total pairs"
    )
    const row = cutaway.getByRole("row").filter({ hasText: /x1\s*y2/ })
    await row.getByRole("button", { name: "Inspect no" }).click()
    await expect(cutaway.getByRole("status")).toContainText("Observed: no")
    await expect(cutaway.getByRole("status")).toContainText(
      "All admitted journeys were searched"
    )
    await page.getByLabel("Cutaway example").selectOption("single")
    await expect(
      cutaway.locator("svg text").filter({ hasText: "x1 → x2: no" })
    ).toBeVisible()
    await expect(cutaway.getByRole("status")).toContainText(
      "All internal connections were searched"
    )
    await page.getByLabel("Cutaway example").selectOption("missing")
    await cutaway.getByLabel("Path evidence").selectOption("observed")
    await expect(
      cutaway.getByRole("button", { name: "Inspect unknown" })
    ).toHaveCount(4)
    await expect(cutaway.getByRole("status")).toContainText("missing-traces")
    expect(errors).toEqual([])
  })
}

test("the lab combines Editorial across sections and preserves its connections and lineage", async ({
  page
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(
    "/examples/novel-network-lab?question=gateway&a=forest&b=atlas&stage=Release"
  )
  const pane = page.locator('.novel-pane[data-view="atlas"]')
  const label = pane.locator("svg text").filter({ hasText: /^▏Editorial$/ })
  await expect(label).toHaveCount(1)
  await expect(
    pane.locator("svg text").filter({ hasText: /Editorial [12]\/2/ })
  ).toHaveCount(0)
  await expect(pane).toContainText("5 nodes · 8 inside")
  await expect(pane).toContainText("Editing + Review")
  const canvas = pane.locator("canvas").first()
  const plot = pane.locator(".novel-plot")
  await plot.scrollIntoViewIfNeeded()
  // Both source columns and the authored-group column remain in the same canvas.
  async function pixel(label: Locator) {
    const box = (await label.boundingBox())!,
      drawing = (await canvas.boundingBox())!
    return canvas.evaluate(
      (element: HTMLCanvasElement, point) => {
        const ratio = element.width / element.getBoundingClientRect().width
        return [
          ...element
            .getContext("2d")!
            .getImageData(
              Math.round(point.x * ratio),
              Math.round(point.y * ratio),
              1,
              1
            ).data
        ]
      },
      { x: box.x - drawing.x - 4, y: box.y - drawing.y + box.height / 2 }
    )
  }
  const author = pane
    .locator("svg text")
    .filter({ hasText: /^Author$/ })
    .first()
  const copy = pane
    .locator("svg text")
    .filter({ hasText: /^Copy$/ })
    .first()
  for (const width of [1440, 1024]) {
    await page.mouse.move(2, 2)
    await page.setViewportSize({ width, height: 1000 })
    await label.scrollIntoViewIfNeeded()
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
    )
    const originals = [await pixel(author), await pixel(copy)]
    const baseline = await pixel(label)
    const box = (await label.boundingBox())!
    const copyBox = (await copy.boundingBox())!
    // Hit both the former Editing and Review fragments, now one continuous mark.
    for (const y of [box.y + box.height / 2, copyBox.y + copyBox.height / 2]) {
      await page.mouse.move(box.x + box.width / 2, y)
      await expect(tooltip(page)).toContainText(
        "Editorial; 5 original nodes; 8 internal edges"
      )
      await expect(tooltip(page)).toContainText("sections: Editing + Review")
      await expect(tooltip(page)).not.toContainText("Part ")
      const bounds = (await tooltip(page).boundingBox())!
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
      await expect.poll(() => pixel(label)).not.toEqual(baseline)
      await expect.poll(() => pixel(author)).not.toEqual(originals[0])
      await expect.poll(() => pixel(copy)).not.toEqual(originals[1])
      await page.mouse.move(2, 2)
      await expect(tooltip(page)).toHaveCount(0)
    }
  }
  await plot.screenshot({
    path: info.outputPath("editorial-single-component.png")
  })
  const box = (await label.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(pane.getByLabel("Group explanation")).toContainText(
    "5 original members"
  )
  await expect(pane.getByLabel("Group explanation")).toContainText(
    "Members: Author, Copy, Editor, Legal, Proof"
  )
})
