import { expect, test, type Locator, type Page } from "@playwright/test"
import { collectBrowserErrors } from "./helpers/browser"

const ROUTE = "/examples/digital-humanities-thunderdome"
const PAGE_TITLE = "Thunderdome Has Rounded Corners"

async function settleDocument(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
}

async function openExample(page: Page) {
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" })
  await expect(
    page.getByRole("heading", { level: 1, name: PAGE_TITLE })
  ).toBeVisible({
    timeout: 60_000
  })
  await expect(
    page.getByRole("region", { name: "Eight chart sections" })
  ).toBeVisible()
  await settleDocument(page)
}

async function scrollRoundIntoObserver(page: Page, roundNumber: string) {
  const round = page.locator(`#thunderdome-round-${roundNumber}`)
  await round.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    window.scrollTo({
      top: window.scrollY + bounds.top - window.innerHeight * 0.24
    })
  })
  await expect(round).toHaveAttribute("aria-current", "step", {
    timeout: 15_000
  })
  await settleDocument(page)
  return round
}

async function expectActiveSvgMatchesHost(stage: Locator) {
  await expect
    .poll(
      () =>
        stage.locator(".thunderdome-stage__chart").evaluate((host) => {
          const svg = host.querySelector("svg")
          if (!svg) return 0
          return host.getBoundingClientRect().width
        }),
      { message: "the desktop chart host should retain its measured width" }
    )
    .toBeGreaterThan(500)

  await expect
    .poll(
      () =>
        stage.locator(".thunderdome-stage__chart").evaluate((host) => {
          const svg = host.querySelector("svg")
          if (!svg) return Number.POSITIVE_INFINITY
          const styles = getComputedStyle(host)
          const horizontalPadding =
            Number.parseFloat(styles.paddingLeft) +
            Number.parseFloat(styles.paddingRight)
          return Math.abs(
            host.clientWidth -
              horizontalPadding -
              svg.getBoundingClientRect().width
          )
        }),
      {
        message:
          "the active Semiotic SVG should continue to track its host after a keyed scene remount"
      }
    )
    .toBeLessThanOrEqual(4)
}

test.describe("Thunderdome Has Rounded Corners scrollytelling", () => {
  test("advances the single sticky Semiotic stage as desktop rounds enter the arena", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    const arena = page.getByRole("region", {
      name: "Eight chart sections"
    })
    await expect(arena).toHaveClass(/is-sticky/)
    await expect(arena.locator(".thunderdome-round")).toHaveCount(8)
    await expect(arena.locator(".thunderdome-stage")).toHaveCount(1)

    const stageColumn = arena.getByRole("complementary", {
      name: "Active chart"
    })
    const stage = stageColumn.locator(".thunderdome-stage")
    await expect(stage.getByRole("heading", { level: 3 })).toHaveText(
      "From punch cards to agents, 1949–2026"
    )
    await expect(stage.locator(".stream-xy-frame")).toHaveAttribute(
      "aria-label",
      /chronological spiral of thirteen documented digital-humanities/i
    )
    await expectActiveSvgMatchesHost(stage)

    await scrollRoundIntoObserver(page, "03")
    await expect(stage.getByRole("heading", { level: 3 })).toHaveText(
      "One author vs. multi-author published items"
    )
    await expect(stage.locator(".stream-xy-frame")).toHaveAttribute(
      "aria-label",
      /annual share of published DHQ items with one listed author/i
    )
    await expect(
      stage.getByRole("button", {
        name: "Section 03: More names on the byline"
      })
    ).toHaveAttribute("aria-current", "step")
    await expectActiveSvgMatchesHost(stage)

    const stickyPosition = await stageColumn.evaluate((element) => {
      const styles = getComputedStyle(element)
      return {
        position: styles.position,
        top: Number.parseFloat(styles.top),
        renderedTop: element.getBoundingClientRect().top
      }
    })
    expect(stickyPosition.position).toBe("sticky")
    expect(
      Math.abs(stickyPosition.renderedTop - stickyPosition.top)
    ).toBeLessThanOrEqual(2)

    await scrollRoundIntoObserver(page, "07")
    await expect(stage.getByRole("heading", { level: 3 })).toHaveText(
      "Two recommendation steps, printed author names"
    )
    await expect(stage.locator(".stream-network-frame")).toHaveAttribute(
      "aria-label",
      /force-directed author projection built from two top-three/i
    )
    await expect(
      stage.getByRole("button", {
        name: "Section 07: Follow a recommendation to its authors"
      })
    ).toHaveAttribute("aria-current", "step")
    await expectActiveSvgMatchesHost(stage)

    const methods = stage.getByRole("group", {
      name: "Recommendation method"
    })
    await expect(
      methods.getByRole("button", { name: "Editorial keywords" })
    ).toHaveAttribute("aria-pressed", "true")
    await expect(stage.locator(".thunderdome-stage__controls > p")).toContainText(
      "18 author names"
    )
    await methods.getByRole("button", { name: "Title/abstract embeddings" }).click()
    await expect(
      methods.getByRole("button", { name: "Title/abstract embeddings" })
    ).toHaveAttribute("aria-pressed", "true")
    await expect(stage.locator(".thunderdome-stage__controls > p")).toContainText(
      "6 author names"
    )
    await expectActiveSvgMatchesHost(stage)

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }))
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1)
    expect(browserErrors).toEqual([])
  })

  test("changes a chapter once when its reading line crosses the boundary", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)
    await scrollRoundIntoObserver(page, "01")

    const stage = page
      .getByRole("complementary", { name: "Active chart" })
      .locator(".thunderdome-stage")
    await expect(stage.getByRole("heading", { level: 3 })).toHaveText(
      "From punch cards to agents, 1949–2026"
    )

    const sceneHistory = await page.evaluate(async () => {
      const nextRound = document.querySelector<HTMLElement>(
        "#thunderdome-round-02"
      )
      const heading = document.querySelector<HTMLElement>(
        ".thunderdome-stage h3"
      )
      if (!nextRound || !heading) return []

      const readingLine = window.innerHeight * 0.43
      const boundary =
        window.scrollY + nextRound.getBoundingClientRect().top - readingLine
      const waitForFrame = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      window.scrollTo({ top: Math.max(0, boundary - 180) })
      await waitForFrame()
      await waitForFrame()

      const history = [heading.textContent]
      const mutationObserver = new MutationObserver(() => {
        const label = heading.textContent
        if (label && history.at(-1) !== label) history.push(label)
      })
      mutationObserver.observe(heading, {
        childList: true,
        characterData: true,
        subtree: true
      })

      for (
        let position = boundary - 180;
        position <= boundary + 180;
        position += 18
      ) {
        window.scrollTo({ top: position })
        await waitForFrame()
      }
      await waitForFrame()
      await waitForFrame()
      mutationObserver.disconnect()

      return history.filter(Boolean)
    })

    expect(sceneHistory).toEqual([
      "From punch cards to agents, 1949–2026",
      "Named public clusters in the 806-item corpus"
    ])
    expect(browserErrors).toEqual([])
  })

  test("does not yield a stage-nav target back to the chapter it is leaving", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    const sceneHistory = await page.evaluate(async () => {
      const heading = document.querySelector<HTMLElement>(
        ".thunderdome-stage h3"
      )
      const target = document.querySelector<HTMLButtonElement>(
        '[aria-label="Section 03: More names on the byline"]'
      )
      if (!heading || !target) return []

      const history = [heading.textContent]
      const mutationObserver = new MutationObserver(() => {
        const label = heading.textContent
        if (label && history.at(-1) !== label) history.push(label)
      })
      mutationObserver.observe(heading, {
        childList: true,
        characterData: true,
        subtree: true
      })

      target.click()
      await new Promise<void>((resolve) => window.setTimeout(resolve, 900))
      mutationObserver.disconnect()
      return history.filter(Boolean)
    })

    expect(sceneHistory).toEqual([
      "From punch cards to agents, 1949–2026",
      "One author vs. multi-author published items"
    ])
    expect(browserErrors).toEqual([])
  })

  test("keeps classification uncertainty negotiable and exposes the changed flow table", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)
    await scrollRoundIntoObserver(page, "06")

    const stage = page
      .getByRole("complementary", { name: "Active chart" })
      .locator(".thunderdome-stage")
    await expect(stage.getByRole("heading", { level: 3 })).toHaveText(
      "What a tidy interface throws away"
    )

    const policy = stage.getByRole("group", {
      name: "How multi-tag articles are displayed"
    })
    const displayOneTag = policy.getByRole("button", {
      name: "Tidy: one tag each"
    })
    const retainMultipleTags = policy.getByRole("button", {
      name: "Honest: keep the pile"
    })
    await expect(displayOneTag).toHaveAttribute("aria-pressed", "true")
    await expect(retainMultipleTags).toHaveAttribute("aria-pressed", "false")
    await expect(stage.getByRole("button", { name: /^View data summary/ })).toBeAttached()
    await expectActiveSvgMatchesHost(stage)
    const classificationFinding = stage.locator(
      ".thunderdome-stage__controls > p"
    )
    await expect(classificationFinding).toContainText(
      "791 multi-tag articles are forced into the single-tag bucket."
    )

    await retainMultipleTags.click()
    await expect(displayOneTag).toHaveAttribute("aria-pressed", "false")
    await expect(retainMultipleTags).toHaveAttribute("aria-pressed", "true")
    await expect(classificationFinding).toContainText(
      "791 multi-tag articles stay multi-tag on the right."
    )

    const dataSummaryTrigger = stage.getByRole("button", { name: /^View data summary/ })
    await expect(dataSummaryTrigger).toBeAttached()
    await expectActiveSvgMatchesHost(stage)
    await dataSummaryTrigger.focus()
    await dataSummaryTrigger.press("Enter")
    await expect(stage.locator(".semiotic-accessible-data-table-summary")).toBeVisible()
    await expect(
      stage.getByRole("table", { name: "Node data and degree summary for Network chart" })
    ).toBeVisible()
    await expect(
      stage.getByRole("table", { name: "Edge data for Network chart" })
    ).toBeVisible()

    expect(browserErrors).toEqual([])
  })

  test("keeps chart labels and selected controls legible in forced colors", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ forcedColors: "active" })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)
    await scrollRoundIntoObserver(page, "06")

    const stage = page
      .getByRole("complementary", { name: "Active chart" })
      .locator(".thunderdome-stage")
    const displayOneTag = stage.getByRole("button", {
      name: "Tidy: one tag each"
    })
    const retainMultipleTags = stage.getByRole("button", {
      name: "Honest: keep the pile"
    })

    const forcedColorState = await stage.evaluate((element) => {
      const chartLabel = element.querySelector("svg text")
      const selected = element.querySelector(
        '.thunderdome-stage__controls button[aria-pressed="true"]'
      )
      const unselected = element.querySelector(
        '.thunderdome-stage__controls button[aria-pressed="false"]'
      )
      if (!chartLabel || !selected || !unselected) return null
      return {
        stageBackground: getComputedStyle(element).backgroundColor,
        labelFill: getComputedStyle(chartLabel).fill,
        selectedBackground: getComputedStyle(selected).backgroundColor,
        selectedColor: getComputedStyle(selected).color,
        unselectedBackground: getComputedStyle(unselected).backgroundColor
      }
    })

    expect(forcedColorState).not.toBeNull()
    expect(forcedColorState?.labelFill).not.toBe(
      forcedColorState?.stageBackground
    )
    expect(forcedColorState?.selectedBackground).not.toBe(
      forcedColorState?.unselectedBackground
    )
    expect(forcedColorState?.selectedColor).not.toBe(
      forcedColorState?.selectedBackground
    )
    await expect(displayOneTag).toHaveAttribute("aria-pressed", "true")
    await expect(retainMultipleTags).toHaveAttribute("aria-pressed", "false")
    expect(browserErrors).toEqual([])
  })

  test("renders all eight Semiotic views inline on a phone without horizontal overflow", async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    const arena = page.getByRole("region", {
      name: "Eight chart sections"
    })
    await expect(arena).toHaveClass(/is-inline/)
    await expect(
      arena.getByRole("complementary", { name: "Active chart" })
    ).toHaveCount(0)

    const rounds = arena.locator(".thunderdome-round")
    const stages = arena.locator(".thunderdome-stage.is-inline")
    const frames = stages.locator(
      ".stream-network-frame, .stream-xy-frame, .stream-ordinal-frame, .stream-physics-frame"
    )
    await expect(rounds).toHaveCount(8)
    await expect(stages).toHaveCount(8)
    await expect(frames).toHaveCount(8, { timeout: 60_000 })
    await expect(
      stages.getByRole("button", { name: /^View data summary/ })
    ).toHaveCount(8)

    for (let index = 0; index < 8; index += 1) {
      const round = rounds.nth(index)
      const stage = stages.nth(index)
      const frame = frames.nth(index)
      await expect(round.getByRole("heading", { level: 2 })).toBeVisible()
      await expect(stage.getByRole("heading", { level: 3 })).toBeVisible()
      await expect(frame).toHaveAttribute("role", "group")
      await expect(frame).toHaveAttribute("tabindex", "0")
      expect(await frame.getAttribute("aria-label")).toMatch(/\S/)
    }

    const containment = await page.evaluate(() => {
      const root = document.documentElement
      return {
        viewportWidth: root.clientWidth,
        pageScrollWidth: root.scrollWidth,
        stages: [
          ...document.querySelectorAll<HTMLElement>(
            ".thunderdome-stage.is-inline"
          )
        ].map((stage) => {
          const bounds = stage.getBoundingClientRect()
          return {
            left: bounds.left,
            right: bounds.right
          }
        })
      }
    })
    expect(containment.pageScrollWidth).toBeLessThanOrEqual(
      containment.viewportWidth + 1
    )
    for (const stage of containment.stages) {
      expect(stage.left).toBeGreaterThanOrEqual(-1)
      expect(stage.right).toBeLessThanOrEqual(containment.viewportWidth + 1)
    }

    expect(browserErrors).toEqual([])
  })
})
