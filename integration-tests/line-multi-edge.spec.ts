import { expect, test } from "@playwright/test"

test("LineChart multi hover snaps to the last sample in x-extent padding", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/chart-features-examples/?line-multi-edge")
  const frame = page.locator(".stream-xy-frame")
  const rows = frame.locator("[data-testid='multi-rows']")
  // Plot x for a minute in the [0, 20] window, inside the 10px side margins.
  const hoverMinute = async (minute: number, width: number) => {
    const plotWidth = width - 20
    await frame.hover({ position: { x: 10 + (minute / 20) * plotWidth, y: 100 } })
  }

  for (const width of [420, 300]) {
    await hoverMinute(5, width)
    await expect(rows).toHaveText("5: A=5 B=10")
    await hoverMinute(11, width)
    await expect(rows).toHaveText("11: A=11 B=22")
    await hoverMinute(18, width)
    await expect(rows).toHaveText("11: A=11 B=22")
    await page.mouse.move(0, 0)
    await expect(frame.locator(".stream-frame-tooltip")).toHaveCount(0)
    if (width === 420) await page.getByRole("button", { name: "Narrow chart" }).click()
  }
  expect(errors).toEqual([])
})
