import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

const margin = { left: 40, right: 20, top: 40, bottom: 20 }
for (const kind of ["bars", "funnel", "columns", "timeline"]) {
  for (const input of kind === "timeline" ? ["push"] : ["bounded", "push"]) {
    const orientations =
      kind === "funnel"
        ? ["vertical"]
        : kind === "timeline"
          ? ["horizontal"]
          : ["vertical", "horizontal"]
    for (const orientation of orientations) {
      test(`${kind} ${input} ${orientation} domains, hover, resize, and ${kind === "timeline" ? "eviction" : "replacement"}`, async ({
        page
      }) => {
        const errors: string[] = []
        page.on("pageerror", (error) => errors.push(error.message))
        await page.goto(
          `/ordinal-domain-regressions/?kind=${kind}&input=${input}&orientation=${orientation}`
        )
        await waitForChartReady(page, "chart")
        const chart = page.getByTestId("chart")
        const canvas = chart.locator("canvas").first()
        const tooltip = chart.locator(".stream-ordinal-tooltip")
        if (kind === "timeline") {
          await page
            .getByRole("button", { name: "Evict oldest interval" })
            .click()
          await expect(chart.locator(".semiotic-axis-left")).toContainText("C")
        }
        for (const width of [500, 380]) {
          if (width === 380)
            await page.getByRole("button", { name: "Resize chart" }).click()
          await expect(canvas).toHaveCSS("width", `${width}px`)
          for (const changed of [false, true]) {
            if (changed && kind !== "timeline")
              await page.getByRole("button", { name: "Replace data" }).click()
            // Replacement is retained during resize.
            const replaced = changed || width === 380
            const w = width - 60
            const h = 200
            const probes =
              kind === "bars"
                ? [
                    {
                      x: orientation === "vertical" ? w / 2 : w / 6,
                      y: orientation === "vertical" ? h * 0.9 : h / 2,
                      text: "Negative: -4"
                    },
                    {
                      x: orientation === "vertical" ? w / 2 : w * 0.8,
                      y: orientation === "vertical" ? h * 0.2 : h / 2,
                      text: `Positive: ${replaced ? 8 : 6}`
                    }
                  ]
                : kind === "funnel"
                  ? [{ x: w / 4, y: h / 2, text: replaced ? "80" : "120" }]
                  : kind === "columns"
                    ? [
                        {
                          x:
                            orientation === "vertical"
                              ? w * (replaced ? 0.375 : 0.125)
                              : w / 2,
                          y:
                            orientation === "vertical"
                              ? h / 2
                              : h * (replaced ? 0.375 : 0.125),
                          text: "A: 10"
                        },
                        {
                          x:
                            orientation === "vertical"
                              ? w * (replaced ? 0.875 : 0.625)
                              : w / 2,
                          y:
                            orientation === "vertical"
                              ? h / 2
                              : h * (replaced ? 0.875 : 0.625),
                          text: "C: 10"
                        }
                      ]
                    : [{ x: (w * 5) / 6, y: h * 0.75, text: "C: 50–40" }]
            for (const probe of probes) {
              await canvas.hover({
                position: { x: margin.left + probe.x, y: margin.top + probe.y }
              })
              await expect(tooltip).toContainText(probe.text)
              await expectTooltipWithinPlot(chart, margin)
              await page.mouse.move(0, 0)
              await expect(tooltip).toBeHidden()
            }
            if (kind === "columns") {
              const axis = orientation === "vertical" ? "bottom" : "left"
              const ticks = chart.locator(
                `.semiotic-axis-${axis} .semiotic-axis-tick`
              )
              const positions = await ticks.evaluateAll((elements) =>
                elements.map((e) => ({
                  label: e.textContent,
                  transform: e.parentElement!.getAttribute("transform")
                }))
              )
              const size = orientation === "vertical" ? w : h
              expect(positions.map((p) => p.label)).toEqual(["A", "B", "C"])
              for (const [i, fraction] of (replaced
                ? [0.375, 0.75, 0.875]
                : [0.125, 0.25, 0.625]
              ).entries()) {
                expect(positions[i].transform).toBe(
                  orientation === "vertical"
                    ? `translate(${size * fraction},${h})`
                    : `translate(0,${size * fraction})`
                )
              }
            }
          }
        }
        expect(errors).toEqual([])
      })
    }
  }
}
