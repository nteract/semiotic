import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"

test.setTimeout(60_000)

for (const [route, frameClass, firstNode] of [
  ["flow-circuit", "stream-physics-frame", "Source"],
  ["dependency-xray", "stream-network-frame", "world"]
]) {
  test(`${route} connects theme, keyboard observation and SVG export`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("requestfailed", (request) => {
      if (request.resourceType() === "script")
        errors.push(`${request.url()}: ${request.failure()?.errorText}`)
    })
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })
    await page.goto(`/examples/${route}`)
    const frame = page.locator(`.${frameClass}`).first()
    try {
      await expect(frame).toBeVisible()
    } catch (error) {
      throw new Error(`${error}\n${errors.join("\n")}`)
    }
    await page.getByText("Read chart interactions", { exact: true }).click()
    await frame.press("Home")
    await frame.press("Space")
    await expect(page.getByTestId("atlas-observation")).toContainText(firstNode)
    const label = frame.locator("svg text[fill]").first()
    const originalInk = await label.getAttribute("fill")
    const canvas = await frame.locator("canvas").elementHandle()
    await page
      .getByRole("button", { name: /Switch to (light|dark) mode/ })
      .click()
    await expect(label).not.toHaveAttribute("fill", originalInk!)
    const currentInk = await label.getAttribute("fill")
    // Theme changes must not lose the fixed physics instance or active reading.
    if (route === "flow-circuit")
      expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true)
    await expect(page.getByTestId("atlas-observation")).toContainText(firstNode)
    const download = page.waitForEvent("download", { timeout: 15_000 })
    await page
      .getByRole("button", { name: "Export static SVG", exact: true })
      .click()
    const file = await download.catch((error) => {
      throw new Error(`${error}\n${errors.join("\n")}`)
    })
    const svg = readFileSync((await file.path())!, "utf8")
    expect(svg).toContain(`fill="${currentInk}"`)
    expect(svg).toContain("<title")
    expect(svg).toContain("<desc")
    expect(errors).toEqual([])
  })
}
