import { expect, test } from "@playwright/test"

for (const raw of [false, true]) {
  for (const mode of ["owned", "plain"]) {
    test(`${raw ? "frame" : "chart"} ${mode} renderer keeps one surface through zoom, pan and resize`, async ({
      page
    }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(
        `/network-custom-layout-examples/?zoom-test&tooltip=${mode}${raw ? "&raw-tooltip" : ""}`
      )
      const frame = page.locator(".stream-network-frame")
      const tooltip = frame.locator(".stream-network-tooltip")
      await expect(page.getByLabel("Draft", { exact: true })).toBeVisible()

      const checkHover = async (x: number, y: number, label: string) => {
        const bounds = (await frame.boundingBox())!
        await page.mouse.move(bounds.x + x, bounds.y + y)
        await expect(page.getByTestId("zoom-hover")).toHaveText(label)
        await expect(tooltip).toHaveText(label)
        await expect(frame.locator(".semiotic-tooltip")).toHaveCount(1)
        const surface = frame.locator(".semiotic-tooltip")
        await expect(surface).not.toHaveCSS(
          "background-color",
          "rgba(0, 0, 0, 0)"
        )
        if (mode === "owned") {
          await expect(tooltip).toHaveCSS(
            "background-color",
            "rgba(0, 0, 0, 0)"
          )
          await expect(surface).toHaveCSS("background-color", "rgb(0, 0, 128)")
        }
        const tip = (await tooltip.boundingBox())!
        expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
        expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
        expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
      }

      await checkHover(190, 140, "a")
      await checkHover(250, 220, "edge")
      await page.evaluate(() =>
        window.networkZoomHandle!.zoomTo({ x: -50, y: 15, k: 1.5 }, 0)
      )
      await checkHover(220, 240, "a")
      await checkHover(310, 335, "edge")
      await page.getByRole("button", { name: "Narrow chart" }).click()
      await checkHover(220, 240, "a")
      await checkHover(295, 335, "edge")
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }

  for (const mode of [
    "null",
    "undefined",
    "boolean",
    "true",
    "text",
    "whitespace",
    "array",
    "fragment",
    "zero"
  ]) {
    test(`${raw ? "frame" : "chart"} callback result ${mode} follows the content contract`, async ({
      page
    }) => {
      await page.goto(
        `/network-custom-layout-examples/?zoom-test&tooltip=${mode}${raw ? "&raw-tooltip" : ""}`
      )
      const frame = page.locator(".stream-network-frame")
      await expect(page.getByLabel("Draft", { exact: true })).toBeVisible()
      const bounds = (await frame.boundingBox())!
      await page.mouse.move(bounds.x + 190, bounds.y + 140)
      await expect(page.getByTestId("zoom-hover")).toHaveText("a")
      const tooltip = frame.locator(".stream-network-tooltip")
      if (mode === "zero") {
        await expect(tooltip).toHaveText("0")
        await expect(frame.locator(".semiotic-tooltip")).toHaveCount(1)
      } else {
        await expect(tooltip).toHaveCount(0)
      }
    })
  }
}
