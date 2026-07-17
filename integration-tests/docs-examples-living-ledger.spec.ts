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

    const openingLayout = await page.evaluate(() => {
      const map = document.querySelector(".ll-panel--map")
      const controls = document.querySelector(".ll-control-deck")
      const stickyDeck = document.querySelector(".ll-sticky-deck")
      const flowers = document.querySelector(".ll-flower-band")
      const triage = document.querySelector(".ll-panel--triage")
      if (!map || !controls || !stickyDeck || !flowers || !triage)
        throw new Error("Living Ledger opening panels are missing")
      return {
        hasRuleInterstitial: Boolean(document.querySelector(".ll-thesis")),
        mapTitle: map.querySelector(".ll-panel-header h3")?.textContent ?? null,
        flowersBeforeControls: Boolean(
          flowers.compareDocumentPosition(controls) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
        stickyDeckPosition: getComputedStyle(stickyDeck).position,
        mapWidth: map.getBoundingClientRect().width,
        triageWidth: triage.getBoundingClientRect().width
      }
    })
    expect(openingLayout.hasRuleInterstitial).toBe(false)
    expect(openingLayout.mapTitle).toBeNull()
    expect(openingLayout.flowersBeforeControls).toBe(true)
    expect(openingLayout.stickyDeckPosition).toBe("sticky")
    expect(openingLayout.mapWidth).toBeGreaterThan(900)
    expect(
      Math.abs(openingLayout.mapWidth - openingLayout.triageWidth)
    ).toBeLessThan(1)

    const stickyStack = await page.evaluate(async () => {
      const deck = document.querySelector(".ll-sticky-deck")
      const flowers = document.querySelector(".ll-flower-band")
      const controls = document.querySelector(".ll-control-deck")
      if (!deck || !flowers || !controls) throw new Error("Living Ledger sticky stack is missing")
      window.scrollTo(0, deck.getBoundingClientRect().top + window.scrollY)
      await new Promise(requestAnimationFrame)
      return {
        deckTop: deck.getBoundingClientRect().top,
        stickyOffset: Number.parseFloat(getComputedStyle(deck).top),
        flowersBottom: flowers.getBoundingClientRect().bottom,
        controlsTop: controls.getBoundingClientRect().top,
      }
    })
    expect(Math.abs(stickyStack.deckTop - stickyStack.stickyOffset)).toBeLessThanOrEqual(1)
    expect(Math.abs(stickyStack.flowersBottom - stickyStack.controlsTop)).toBeLessThanOrEqual(1)

    const flowerStations = page.locator(".ll-flower-band > button")
    await expect(flowerStations).toHaveCount(9)
    await expect(flowerStations.first()).toHaveAttribute("aria-pressed", "true")
    const pollinationFlower = page
      .locator(".ll-flower-band")
      .getByRole("button", { name: /Central Valley pollination/ })
    await pollinationFlower.click()
    await expect(pollinationFlower).toHaveAttribute("aria-pressed", "true")
    await expect(page.locator("#ll-selected-title")).toHaveText(
      "Central Valley pollination"
    )

    await page.getByRole("button", { name: "Policy", exact: true }).click()
    await expect(page.locator(".ll-policy-band")).toBeVisible()
    await expect(page.locator(".ll-flower-band")).toHaveCount(0)
    await expect(page.locator(".ll-policy-band > button")).toHaveCount(9)
    await expect(page.locator(".ll-lens-brief--policy")).toContainText("Next step")
    await expect(page.locator(".ll-alert-desk")).toContainText(
      "The decisions that need an owner"
    )
    await expect(page.locator(".ll-triage-host")).toHaveAttribute("data-lens", "policy")
    await expect(page.locator(".ll-panel--triage .ll-panel-header h3")).toHaveText(
      "Where should support go next?"
    )
    await expect(page.locator(".ll-pulse-host")).toHaveAttribute("data-lens", "policy")
    await expect(page.locator(".ll-panel--pulse .ll-panel-header h3")).toHaveText(
      "What could require action next?"
    )
    await expect(page.locator(".ll-pulse-key")).toContainText("planning forecast")
    await expect(page.locator(".ll-policy-queue")).toBeVisible()
    await expect(page.locator(".ll-policy-queue")).toContainText("Needs review")
    await expect(page).toHaveURL(/audience=policy/)

    await page.getByRole("button", { name: "Science", exact: true }).click()
    await expect(page.locator(".ll-science-band")).toBeVisible()
    await expect(page.locator(".ll-policy-band")).toHaveCount(0)
    await expect(page.locator(".ll-science-band > button")).toHaveCount(9)
    await expect(page.locator(".ll-lens-brief--science")).toContainText("Sources")
    await expect(page.locator(".ll-provenance")).toHaveAttribute("open", "")
    await expect(page.locator(".ll-panel--network .ll-panel-header h3")).toHaveText(
      "How do we know?"
    )
    await expect(page.locator(".ll-triage-host")).toHaveAttribute("data-lens", "science")
    await expect(page.locator(".ll-panel--triage .ll-panel-header h3")).toHaveText(
      "What does the evidence support?"
    )
    await expect(page.locator(".ll-pulse-host")).toHaveAttribute("data-lens", "science")
    await expect(page.locator(".ll-panel--pulse .ll-panel-header h3")).toHaveText(
      "What does the indicator actually show?"
    )
    await expect(page.locator(".ll-pulse-key")).toContainText("reference envelope")
    await expect(page.locator(".ll-science-trace")).toBeVisible()
    await expect(page.locator(".ll-science-trace")).toContainText(
      "Each mark is one replay record"
    )
    await expect(page).toHaveURL(/audience=science/)

    await page.getByRole("button", { name: "Public", exact: true }).click()
    await expect(page.locator(".ll-flower-band")).toBeVisible()
    await expect(page.locator(".ll-science-band")).toHaveCount(0)
    await expect(page.locator(".ll-triage-host")).toHaveAttribute("data-lens", "public")
    await expect(page.locator(".ll-pulse-host")).toHaveAttribute("data-lens", "public")
    await expect(page.locator(".ll-pulse-key")).toContainText("recorded change")
    await expect(page.locator(".ll-public-journey")).toBeVisible()
    const emDash = String.fromCodePoint(0x2014)
    expect(await page.locator(".living-ledger").textContent()).not.toContain(
      emDash
    )

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
    await expect(page.locator(".ll-public-journey")).toContainText(
      "How a reading earns a careful claim"
    )
    await expect(page.locator(".ll-public-journey")).toContainText(
      "Then we make a limited statement"
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
