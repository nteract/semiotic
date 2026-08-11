import { expect, test, type Page } from "@playwright/test"
import { collectBrowserErrors } from "./helpers/browser"

const ROUTE = "/examples/hellhole-changed-addresses"

async function openExample(page: Page) {
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" })
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "The Hellhole Changed Addresses"
    })
  ).toBeVisible({ timeout: 60_000 })
  await expect(page.locator("#hellhole-evidence-spine")).toBeAttached()
}

test.describe("The Hellhole Changed Addresses", () => {
  test("keeps the three evidence classes separate and serializes the observer state", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    await expect(page.locator(".stream-xy-frame")).toHaveCount(2)
    await expect(page.locator(".stream-geo-frame")).toHaveCount(2)
    await expect(page.locator(".stream-network-frame")).toHaveCount(1)
    await expect(page.locator(".stream-ordinal-frame")).toHaveCount(3)
    const argumentDesk = page.locator(".hellhole-controller")
    await expect(argumentDesk).toHaveCSS("position", "sticky")
    await expect(
      page.getByRole("heading", { name: "What the moving “HELL” means" })
    ).toBeVisible()
    await expect(
      argumentDesk.getByText(/Culture moves the accusation from downtown/i)
    ).toBeVisible()
    await expect(
      argumentDesk.getByText(
        "Lens → chapter 03 · cohort → chapter 04 · metric → chapter 07"
      )
    ).toBeVisible()
    await expect(
      argumentDesk.getByRole("button", { name: /Representation/ })
    ).toHaveCount(1)
    await expect(
      page
        .locator(".hellhole-evidence-ledger__sources")
        .getByText("R12 · B", { exact: true })
    ).toBeVisible()
    await expect(
      page
        .locator(".hellhole-evidence-ledger__sources")
        .getByText("ACS 16–20 · A", { exact: true })
    ).toBeVisible()
    await expect(page.locator(".stream-xy-frame").nth(0)).toHaveAttribute(
      "aria-label",
      /three aligned evidence lanes/i
    )
    await expect(page.locator(".stream-xy-frame").nth(1)).toHaveAttribute(
      "aria-label",
      /age-period-cohort field/i
    )
    await expect(page.locator(".stream-geo-frame").nth(0)).toHaveAttribute(
      "aria-label",
      /NYC core.*suburban ring/i
    )
    await expect(page.locator(".stream-geo-frame").nth(1)).toHaveAttribute(
      "aria-label",
      /Suburban ring.*NYC core/i
    )
    await expect(
      page.getByText("The numbers object. Nobody asked them.")
    ).toBeVisible()
    await expect(
      page.getByRole("table", { name: /same fixed county pairs/i })
    ).toBeVisible()

    await page.getByRole("button", { name: /All three/ }).click()
    await expect(page).toHaveURL(/lens=all/)
    await expect(
      argumentDesk.getByText(
        /label fractures into crime, cost, commute, and preference/i
      )
    ).toBeVisible()
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Three stories at war."
      })
    ).toBeVisible()

    await page.locator("#hellhole-born").fill("1978")
    await expect(page).toHaveURL(/born=1978/)
    await page.locator("#hellhole-compare").fill("1990")
    await expect(page).toHaveURL(/compare=1990/)
    const followCohort = page.getByRole("button", { name: "Follow cohort" })
    await followCohort.click()
    await expect(page).toHaveURL(/cut=cohort/)
    await expect(followCohort).toHaveAttribute("aria-pressed", "true")
    await page.locator("#hellhole-window").selectOption("desire")
    await expect(page.locator("#hellhole-window")).toHaveValue("desire")

    await expect(page).toHaveURL(/born=1978/)
    await expect(page).toHaveURL(/compare=1990/)
    await expect(page).toHaveURL(/cut=cohort/)
    await expect(page).toHaveURL(/window=desire/)
    await expect(page.getByText("Age 15 in 1993")).toBeVisible()
    await expect(page.getByText("Age 15 in 2005")).toBeVisible()

    await page.getByRole("button", { name: "Representation" }).last().click()
    await expect(page).toHaveURL(/metric=representation/)
    await expect(
      page.getByText("The culture already rendered its verdict.")
    ).toBeVisible()
    await expect(
      page.getByText(/works march from urban ruin to suburban rot/i)
    ).toBeVisible()

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }))
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1)
    expect(browserErrors).toEqual([])
  })

  test("preserves the argument and controls on a narrow reduced-motion viewport", async ({
    page
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" })
    await page.setViewportSize({ width: 390, height: 844 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    await expect(page.locator(".hellhole-example")).toHaveClass(
      /is-reduced-motion/
    )
    await expect(page.locator(".hellhole-stamp")).toHaveClass(/is-static/)
    await expect
      .poll(() =>
        page.evaluate(() => matchMedia("(forced-colors: active)").matches)
      )
      .toBe(true)
    await expect(
      page.getByLabel("Evidence and observer controls")
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Show me the whole indictment" })
    ).toBeVisible()
    await expect(
      page.getByText(
        "First the city was hell. Then hell got a lawn. Your birth year chose the monster."
      )
    ).toBeAttached()
    await expect(page.locator(".stream-geo-frame")).toHaveCount(2)
    await expect(
      page.getByText("The numbers object. Nobody asked them.")
    ).toBeAttached()

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }))
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1)
    expect(browserErrors).toEqual([])
  })
})
