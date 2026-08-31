import { expect, test } from "@playwright/test"

test("transit diagram recipe is discoverable and demonstrates every layout mode", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  await page.goto("/recipes", { waitUntil: "domcontentloaded" })
  const transitNavLink = page
    .getByRole("navigation", { name: "Documentation sidebar" })
    .getByRole("link", { name: "Transit Diagram", exact: true })
  await expect(transitNavLink).toBeVisible()
  await transitNavLink.click()

  await expect(page).toHaveURL(/\/recipes\/transit-diagram$/)
  await expect(page.getByRole("heading", { name: "Transit Diagram", level: 1 })).toBeVisible()
  await expect(page.locator("canvas")).toHaveCount(1)
  await expect(page.locator(".transit-diagram-stations")).toHaveCount(1)
  await expect(page.locator("[data-transit-station]")).toHaveCount(6)

  await page.getByRole("button", { name: "Compact", exact: true }).click()
  await expect(page.getByRole("button", { name: "Compact", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.locator(".transit-diagram-stations")).toHaveCount(1)

  await page.getByRole("button", { name: "Minimap", exact: true }).click()
  await expect(page.getByRole("button", { name: "Minimap", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.locator(".transit-diagram-stations")).toHaveCount(0)

  await page.getByRole("button", { name: "Automatic topology" }).click()
  await expect(page.getByRole("button", { name: "Automatic topology" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  expect(errors).toEqual([])
})

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
