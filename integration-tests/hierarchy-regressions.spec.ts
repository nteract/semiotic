import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot } from "./helpers"

const margin = { left: 20, right: 20, top: 40, bottom: 20 }
for (const kind of [
  "treemap",
  "circlepack",
  "tree",
  "cluster",
  "partition",
  "orbit"
]) {
  test(`${kind} retains repeated names, proportions, hover, and keyboard targets`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`/hierarchy-regressions/?kind=${kind}`)
    const chart = page.getByTestId("chart")
    const frame = chart.locator(".stream-network-frame")
    const canvas = chart.locator("canvas").first()
    const tooltip = chart.locator(".stream-network-tooltip")
    const read = () =>
      page.evaluate(
        () =>
          window.hierarchyRef?.current?.getTopology().nodes.map((n) => ({
            id: n.id,
            record: n.data?.record,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            value: n.value
          })) ?? []
      )
    await expect.poll(async () => (await read()).length).toBe(7)
    const originalIds = (await read()).map(({ id }) => id).sort()
    for (const phase of ["initial", "resize", "replace"]) {
      if (phase === "resize")
        await page.getByRole("button", { name: "Resize chart" }).click()
      if (phase === "replace")
        await page.getByRole("button", { name: "Replace values" }).click()
      await expect(canvas).toHaveCSS(
        "width",
        `${phase === "initial" ? 560 : 460}px`
      )
      const changed = phase === "replace"
      if (changed && kind !== "orbit") {
        await expect
          .poll(
            async () =>
              (await read()).find((n) => n.record === "B/Other")?.value
          )
          .toBe(8)
      }
      const nodes = await read()
      expect(nodes.map(({ id }) => id).sort()).toEqual(originalIds)
      const first = nodes.find((n) => n.record === "A/Other")!
      const second = nodes.find((n) => n.record === "B/Other")!
      if (["treemap", "partition", "circlepack"].includes(kind)) {
        expect(
          (first.width * first.height) / (second.width * second.height)
        ).toBeCloseTo(changed ? 1 / 8 : 2, 6)
        const zero = nodes.find((n) => n.record === "A/Zero")!
        expect(zero.width * zero.height).toBe(0)
      }
      for (const node of [first, second]) {
        const x = margin.left + node.x
        const y = margin.top + node.y
        // Check a real painted mark before exercising pointer interaction.
        await expect
          .poll(() =>
            canvas.evaluate(
              (element: HTMLCanvasElement, point) => {
                const scale = element.width / element.clientWidth
                return element
                  .getContext("2d")!
                  .getImageData(
                    Math.floor(point.x * scale),
                    Math.floor(point.y * scale),
                    1,
                    1
                  ).data[3]
              },
              { x, y }
            )
          )
          .toBeGreaterThan(0)
        await canvas.hover({ position: { x, y } })
        await expect(tooltip).toContainText(
          `${node.record}: ${node === first ? (changed ? 1 : 4) : changed ? 8 : 2}`
        )
        await expectTooltipWithinPlot(chart, margin)
        await page.mouse.move(0, 0)
        await expect(tooltip).toHaveCount(0)
      }
      if (kind === "tree" || kind === "cluster") {
        const link = await page.evaluate(() => {
          const edge = window
            .hierarchyRef!.current!.getTopology()
            .edges.find(
              (edge) =>
                typeof edge.target === "object" &&
                edge.target.data?.record === "B/Other"
            )!
          if (
            typeof edge.source !== "object" ||
            typeof edge.target !== "object"
          )
            throw new Error("Missing tree endpoints")
          return {
            x: (edge.source.x + edge.target.x) / 2,
            y: (edge.source.y + edge.target.y) / 2
          }
        })
        await canvas.hover({
          position: { x: margin.left + link.x, y: margin.top + link.y }
        })
        await expect(tooltip).toContainText("Hierarchy link at depth 2")
        await expectTooltipWithinPlot(chart, margin)
        await page.mouse.move(0, 0)
        await expect(tooltip).toHaveCount(0)
      }
    }
    // PageDown traverses the flat list; arrow keys navigate spatially.
    await frame.focus()
    await frame.press("Home")
    const visited = new Set<string>()
    for (let i = 0; i < 9; i++) {
      visited.add((await tooltip.textContent()) ?? "")
      await frame.press("PageDown")
    }
    expect([...visited].some((text) => text.includes("A/Other: 1"))).toBe(true)
    expect([...visited].some((text) => text.includes("B/Other: 8"))).toBe(true)
    await frame.press("Escape")
    await expect(tooltip).toHaveCount(0)
    const summary = chart.getByRole("button", { name: /View data summary/ })
    await summary.focus()
    await summary.press("Enter")
    const moreNodes = chart.getByRole("button", {
      name: /Show \d+ more nodes?/
    })
    await moreNodes.focus()
    await moreNodes.press("Enter")
    const table = chart.getByRole("table").first()
    for (const node of (await read()).filter((node) =>
      ["A/Other", "B/Other"].includes(node.record)
    )) {
      await expect(
        table.getByRole("row", { name: node.id, exact: true })
      ).toHaveCount(1)
    }
    expect(errors).toEqual([])
  })
}
