import { expect, test, type Page } from "@playwright/test"
import { collectBrowserErrors } from "./helpers/browser"

const ROUTE = "/examples/parataxis-machine"

async function openExample(page: Page) {
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" })
  await expect(
    page.getByRole("heading", { level: 1, name: "Parataxis Machine" })
  ).toBeVisible({ timeout: 60_000 })
  await expect(page.locator(".parataxis-machine")).toBeAttached()
}

test.describe("Parataxis Machine", () => {
  test("turns reader choices into visible relations across four Semiotic views", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    await expect(page.locator(".stream-network-frame")).toHaveCount(1)
    await expect(page.locator(".stream-xy-frame")).toHaveCount(2)
    await expect(page.locator(".stream-ordinal-frame")).toHaveCount(1)
    await expect(page.locator(".pm-constellation-svg")).toBeAttached()

    const connectorToggle = page.getByRole("button", {
      name: "Show connectors"
    })
    await connectorToggle.click()
    await expect(
      page.getByRole("button", { name: "Hide connectors" })
    ).toBeVisible()
    await expect(page.locator(".pm-hero-sentence")).toContainText("therefore")

    await page
      .locator(".pm-relation-bank")
      .getByRole("button", { name: /but.*contrast/i })
      .click()
    await expect(page.locator(".pm-gap-console__reading")).toContainText(
      "This reading treats the second clause as a contrast"
    )
    await expect(page.locator(".pm-gap")).toContainText("but")

    await page.getByRole("tab", { name: "Declared relation" }).click()
    await expect(page.locator(".pm-collapse-stage")).toContainText(
      "She took the stairs"
    )
    await expect(page.locator(".pm-collapse-stage")).toContainText("because")
    await expect(page.locator(".pm-collapse-stage")).toContainText(
      "the elevator was broken."
    )

    await page.getByRole("tab", { name: "Fragmented" }).click()
    await expect(page.locator(".pm-collapse-stage")).toHaveClass(
      /mode-scattered/
    )
    await expect(page.locator(".pm-collapse-stage")).toContainText(
      "Up the stairs."
    )
    await expect(page.locator(".pm-stage-note")).toContainText(
      "Fragments remove parts of the clauses"
    )

    await page.getByRole("button", { name: "irony" }).click()
    await expect(page.locator(".pm-reader-result")).toContainText(
      "That interpretation is plausible"
    )

    await page.getByRole("button", { name: "Reveal implied argument" }).click()
    await expect(page.locator(".pm-dashboard")).toHaveClass(/show-links/)

    await page.getByRole("button", { name: "Prophetic", exact: true }).click()
    await expect(page.locator(".pm-machine-output")).toContainText(
      "The towers count the hours."
    )
    await page.getByRole("button", { name: "Show possible connectors" }).click()
    await expect(page.locator(".pm-machine-output blockquote")).toContainText(
      "then"
    )

    expect(browserErrors).toEqual([])
  })

  test("keeps the rhetoric lab legible on a narrow reduced-motion viewport", async ({
    page
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.setViewportSize({ width: 390, height: 844 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    await expect(page.locator(".parataxis-machine")).toHaveClass(
      /is-reduced-motion/
    )
    await expect(
      page.getByRole("button", { name: "MOTION: STILL" })
    ).toBeVisible()
    await expect(
      page.getByText(
        "Parataxis puts clauses next to one another and leaves their relationship unstated."
      )
    ).toBeVisible()
    await expect(page.locator(".pm-heatmap-shell")).toBeAttached()
    await expect(page.locator(".pm-machine-console")).toBeAttached()

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }))
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1)
    expect(browserErrors).toEqual([])
  })
})
