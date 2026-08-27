import { expect, test } from "@playwright/test"

test("transit diagram example mounts both geometry paths and contains its mobile floor", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  await page.goto("/examples/lines-of-thought", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Lines of Thought", level: 1 })).toBeVisible()
  await expect(page.getByText("Harbor", { exact: true })).toBeVisible()
  await expect(page.getByText("Delta / ocean", { exact: true })).toBeVisible()
  await expect(page.locator("canvas")).toHaveCount(2)

  await page.getByRole("button", { name: "Ignore coordinates" }).click()
  await expect(page.getByRole("button", { name: "Ignore coordinates" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator(".transit-story__chart-host").first()).toBeVisible()
  const pageOverflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(pageOverflows).toBe(false)
  expect(errors).toEqual([])
})
