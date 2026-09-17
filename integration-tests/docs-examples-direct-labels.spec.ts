import { test, expect } from "@playwright/test"

test("LineChart docs teach direct labels with working controls and copyable code", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/charts/line-chart")
  await page.getByRole("link", { name: "Direct Labels", exact: true }).click()
  const demo = page.getByRole("region", { name: "Direct label explorer", exact: true })
  const labels = demo.locator("[data-direct-label-id]")
  const evidence = async () => JSON.parse(
    (await demo.locator(".semiotic-direct-labels").getAttribute("data-label-layout"))!
  )
  await expect(labels).toHaveCount(6)
  await expect.poll(async () => (await evidence()).measurement.measured).toBe(6)
  const positions = () => labels.locator("text").evaluateAll((nodes) =>
    nodes.map((node) => Number(node.getAttribute("y")))
  )
  const original = await positions()
  await demo.getByLabel("Numeric units").selectOption("1000000000")
  await expect(demo.locator("svg > desc")).toContainText("50000000000")
  expect(await positions()).toEqual(original)

  await demo.getByLabel("Label position").selectOption("start")
  await expect.poll(async () => Number(await labels.locator("text").first().getAttribute("x"))).toBeLessThan(0)
  await demo.getByLabel("Direct labels", { exact: true }).uncheck()
  await expect(labels).toHaveCount(0)
  await demo.getByLabel("Direct labels", { exact: true }).check()
  await demo.getByLabel("Label position").selectOption("end")
  await demo.getByLabel("Numeric units").selectOption("1")
  await demo.getByLabel("Series count").selectOption("24")
  await demo.getByRole("slider", { name: "Chart height", exact: true }).fill("180")
  await expect.poll(async () => (await evidence()).omitted).toBeGreaterThan(0)
  await expect(demo.locator("svg > desc")).toContainText("Product 24")
  await demo.getByRole("slider", { name: "Chart height", exact: true }).fill("600")
  await expect(labels).toHaveCount(24)

  await demo.getByRole("slider", { name: "Label font size" }).fill("16")
  await expect(labels.locator("text").first()).toHaveAttribute("font-size", "16")
  await demo.getByRole("slider", { name: "Label-side margin" }).fill("40")
  await expect.poll(async () => (await evidence()).omitted).toBeGreaterThan(0)
  await demo.getByRole("slider", { name: "Label-side margin" }).fill("180")
  await expect(labels).toHaveCount(24)

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: async (text: string) => { document.body.dataset.copiedChart = text }
    } })
  })
  await demo.locator(".live-example-toolbar").getByRole("button", { name: "Copy", exact: true }).click()
  const copied = await page.locator("body").getAttribute("data-copied-chart")
  expect(copied).toContain('from "semiotic/xy"')
  expect(copied).toContain('position: "end", fontSize: 16')
  expect(copied).toContain('product: "Product 24"')
  expect(copied).toContain("height: 600")
  expect(copied).toContain("right: 180")
  expect(copied).not.toContain("Copy includes")
  expect(errors).toEqual([])

  await demo.getByLabel("Series count").selectOption("6")
  await demo.getByRole("slider", { name: "Chart height", exact: true }).fill("320")
  await demo.getByRole("slider", { name: "Label font size" }).fill("12")
  await demo.getByRole("slider", { name: "Label-side margin" }).fill("110")
  await demo.getByRole("heading", { name: "Try direct labels" }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath("direct-label-docs.png") })
})
