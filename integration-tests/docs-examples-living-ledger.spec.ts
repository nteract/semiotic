import { expect, test } from "@playwright/test"

test.describe("Living Ledger authored source interactions", () => {
  test("keeps the three teaching cases linked to their claims and replay state", async ({
    page
  }) => {
    await page.goto("/examples/living-ledger", { waitUntil: "networkidle" })
    await expect(
      page.getByRole("heading", { level: 1, name: "The Living Ledger" })
    ).toBeVisible()
    await expect(page.locator(".ll-field-plate")).toContainText("Jul 12, 2026")

    await page.locator(".ll-case-contrast article button").nth(2).click()
    await expect(page).toHaveURL(/system=pollination/)
    await expect(page.locator("#ll-selected-title")).toHaveText(
      "Central Valley pollination"
    )
    await expect(page.locator(".ll-selected-copy")).toContainText(
      "managed hives add 21"
    )
    await expect(page.locator(".ll-panel--ledger")).toContainText(
      "What people add"
    )
    await expect(page.locator(".ll-panel--ledger")).toContainText(
      "21 reference index"
    )

    await page.locator(".ll-scene-rail li button").nth(3).click()
    await expect(page.locator(".ll-scrubber")).toContainText("Day 138 / 180")
    await expect(page.locator("#ll-selected-title")).toHaveText(
      "Central Congo forest"
    )
    await expect(page.locator(".ll-selected-copy")).toContainText(
      "disturbance events"
    )
    await expect(page.locator(".ll-scene-note")).toContainText(
      "failure is not yet observed"
    )

    await page.locator(".ll-scene-rail li button").nth(2).click()
    await expect(page.locator("#ll-selected-title")).toHaveText("Reef 14")
    await expect(page.locator(".ll-panel--pulse")).toContainText(
      "Warning · 4 degC-week"
    )
    await expect(page).toHaveURL(/day=112/)

    await page.getByRole("button", { name: "How do we know?" }).click()
    await expect(
      page.locator(".ll-panel--network .ll-panel-header h3")
    ).toHaveText("How do we know?")
    await expect(page).toHaveURL(/web=evidence/)
  })

  test("turns reduced motion into discrete updates and keeps the phone layout contained", async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/examples/living-ledger", { waitUntil: "networkidle" })

    await page.locator(".ll-scene-rail li button").nth(1).click()
    await expect(page.locator(".ll-scrubber")).toContainText("Day 100 / 180")
    await expect(page.locator(".ll-pipeline-host")).toContainText("1 queued")
    await expect(page.locator(".ll-pipeline-host")).toContainText(
      "1 quarantined"
    )

    await page.getByRole("button", { name: "Show end state" }).click()
    await expect(page.locator(".ll-scrubber")).toContainText("Day 180 / 180")
    await expect(page).toHaveURL(/day=179/)

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }))
    expect(viewport.scrollWidth).toBe(viewport.clientWidth)
  })
})
