import { expect, test } from "@playwright/test"
import { hoverCanvasMark } from "./helpers/hoverCanvasMark"

for (const movesAfterSampling of [false, true]) {
  test(`canvas hover avoids an SVG control ${movesAfterSampling ? "that moves after sampling" : "at fractional coordinates"}`, async ({
    page
  }) => {
    await page.setContent(`
      <div style="position:relative; margin:0.375px; width:200px; height:120px">
        <canvas width="400" height="240" style="width:200px;height:120px"></canvas>
        <svg width="200" height="120" style="position:absolute;inset:0;pointer-events:none">
          <rect role="button" aria-label="Source on" x="${movesAfterSampling ? 160 : 20}" y="20"
            width="40" height="40" style="pointer-events:auto" fill="#2563eb" />
        </svg>
      </div>
      <output></output>
    `)
    await page.evaluate((movesAfterSampling) => {
      const canvas = document.querySelector("canvas")!
      const context = canvas.getContext("2d")!
      const control = document.querySelector("rect")!
      const output = document.querySelector("output")!
      context.scale(2, 2)
      context.fillStyle = "#2563eb"
      for (const x of [40, 120]) {
        context.beginPath()
        context.arc(x, 40, 5, 0, Math.PI * 2)
        context.fill()
      }
      canvas.addEventListener("pointermove", (event) => {
        const bounds = canvas.getBoundingClientRect()
        if (
          Math.hypot(
            event.clientX - bounds.x - 120,
            event.clientY - bounds.y - 40
          ) < 5
        )
          output.textContent = "Visible event"
      })
      control.addEventListener("click", () =>
        control.setAttribute("aria-label", "Source off")
      )
      if (movesAfterSampling) {
        const read = context.getImageData.bind(context)
        context.getImageData = (...args: Parameters<typeof read>) => {
          const pixels = read(...args)
          // Move after the synchronous pixel/hit scan but before Playwright's
          // hover action, reproducing a responsive source rail covering it.
          queueMicrotask(() => control.setAttribute("x", "20"))
          return pixels
        }
      }
    }, movesAfterSampling)

    await hoverCanvasMark(page.locator("canvas"), [37, 99, 235])
    await expect(page.locator("output")).toHaveText("Visible event")
    // The helper must leave the foreground control genuinely interactive.
    await page.getByRole("button", { name: "Source on" }).click()
    await expect(page.getByRole("button", { name: "Source off" })).toBeVisible()
  })
}
