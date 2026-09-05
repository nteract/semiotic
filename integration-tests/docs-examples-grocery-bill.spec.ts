import { expect, test } from "@playwright/test"
import sharp from "sharp"

test("grocery receipt reopens state, handles missing prices, and downloads all formats", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/examples/grocery-bill")
  await expect(
    page.getByRole("heading", { name: "Your grocery bill has a memory." })
  ).toBeVisible()
  await expect(page.getByTestId("before-total")).toHaveText("$18.28")
  await page.getByLabel("Comparison month", { exact: true }).selectOption("2025-03")
  await expect(page.getByTestId("after-total")).toHaveText("$29.40")
  await page.getByLabel("Comparison month", { exact: true }).selectOption("2025-06")
  await page.getByLabel("Receipt size", { exact: true }).selectOption("print")
  await page.getByRole("button", { name: "Four dozen eggs" }).click()
  await expect(page.getByTestId("after-total")).toHaveText("$38.61")
  await page
    .getByRole("link", { name: "Open a link to this exact comparison" })
    .click()
  await page.reload()
  await expect(page.getByTestId("after-total")).toHaveText("$38.61")
  await page.getByLabel("Receipt size", { exact: true }).selectOption("print")
  for (const name of [
    "Download SVG",
    "Download PNG",
    "Accessible HTML",
    "Data packet"
  ]) {
    const download = page.waitForEvent("download")
    await page.getByRole("button", { name, exact: true }).click()
    const completed = await download
    expect(await completed.failure()).toBeNull()
    if (name === "Download PNG") {
      const path = await completed.path()
      expect(path).not.toBeNull()
      expect((await sharp(path!).metadata()).width).toBe(1520)
    }
  }
  await page
    .getByRole("button", { name: "A month with missing chicken prices" })
    .click()
  await expect(page.getByTestId("after-total")).toHaveText("Unavailable")
  const subset = page.getByRole("checkbox", {
    name: "Use an explicitly labeled comparable subset"
  })
  await subset.focus()
  await page.keyboard.press("Space")
  await expect(page.getByTestId("before-total")).toHaveText("$11.92")
  expect(errors).toEqual([])
})

for (const width of [320, 390, 768, 1280]) {
  test(`grocery receipt has no article overflow at ${width}px`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/examples/grocery-bill")
    await expect(
      page.getByRole("heading", { name: "What stayed in the bag?" })
    ).toBeVisible()
    const geometry = await page
      .locator(".grocery-story")
      .evaluate((element) => ({
        width: element.clientWidth,
        scroll: element.scrollWidth
      }))
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1)
    if (width < 600)
      await expect(
        page.getByRole("region", { name: "Aligned before and after receipt" })
      ).toBeVisible()
    const target = page.getByRole("button", {
      name: "Increase Bananas quantity"
    })
    await target.focus()
    await page.keyboard.press("Enter")
    await expect(
      page.getByRole("spinbutton", { name: "Bananas quantity in lb" })
    ).toHaveValue("2.25")
    await page.emulateMedia({ forcedColors: "active" })
    await expect(target).toBeVisible()
  })
}
