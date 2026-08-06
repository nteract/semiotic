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

    const mediaRound = await scrollRoundIntoObserver(page, "05")
    await expect(mediaRound.getByRole("heading", { level: 2 })).toHaveText(
      "DHQ stopped treating the digital as a medium"
    )
    await expect(stage.getByRole("heading", { level: 3 })).toHaveText(
      "Media Studies falls out of DHQ’s connective tissue"
    )
    await expect(stage.locator(".stream-ordinal-frame")).toHaveAttribute(
      "aria-label",
      /grouped horizontal bar chart comparing how often Media Studies appears overall and within Tools, Project Report, Digital Humanities, and Cultural Criticism/i
    )
    await expect(
      stage.getByRole("button", {
        name: "Section 05: DHQ stopped treating the digital as a medium"
      })
    ).toHaveAttribute("aria-current", "step")
    await expectActiveSvgMatchesHost(stage)

    await scrollRoundIntoObserver(page, "08")
    await expect(stage.getByRole("heading", { level: 3 })).toHaveText(
      "How DHQ filed AI and code in volume 17.2"
    )
    await expect(stage.locator(".stream-ordinal-frame")).toHaveAttribute(
      "aria-label",
      /horizontal bar chart of eight selected DHQ controlled-tag counts across the 26 items published in volume 17\.2/i
    )
    await expect(
      stage.getByRole("button", {
        name: "Section 08: AI fits the methods and collides with the mythology"
      })
    ).toHaveAttribute("aria-current", "step")
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

  test("shows where the tools tag elides practice and exposes the ordinal data table", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)
    await scrollRoundIntoObserver(page, "06")

    const toolsRound = page.locator("#thunderdome-round-06")
    await expect(toolsRound.getByRole("heading", { level: 2 })).toHaveText(
      "The tools tag is not where all the tools are"
    )
    await expect(toolsRound).toContainText(
      "That is a category of discourse, not an inventory of every article that computes."
    )
    await expect(toolsRound).toContainText(
      "Practice became method, case, and situated intervention rather than “here is a tool.”"
    )

    const stage = page
      .getByRole("complementary", { name: "Active chart" })
      .locator(".thunderdome-stage")
    await expect(stage.getByRole("heading", { level: 3 })).toHaveText(
      "Tools, project reports, and either one"
    )
    await expect(stage.locator(".stream-ordinal-frame")).toHaveAttribute(
      "aria-label",
      /grouped horizontal bar chart comparing DHQ’s Tools tag, Project Report tag, and the deduplicated union/i
    )
    await expect(
      stage.getByRole("button", { name: /^View data summary/ })
    ).toBeAttached()
    await expectActiveSvgMatchesHost(stage)

    const dataSummaryTrigger = stage.getByRole("button", {
      name: /^View data summary/
    })
    await dataSummaryTrigger.focus()
    await dataSummaryTrigger.press("Enter")
    await expect(
      stage.locator(".semiotic-accessible-data-table-summary")
    ).toBeVisible()
    await expect(
      stage.getByRole("table", { name: "Sample data for clusterbar chart" })
    ).toBeVisible()

    expect(browserErrors).toEqual([])
  })

  test("keeps chart labels and active section navigation legible in forced colors", async ({
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
    const activeNav = stage.getByRole("button", {
      name: "Section 06: The tools tag is not where all the tools are"
    })
    const inactiveNav = stage.getByRole("button", {
      name: "Section 05: DHQ stopped treating the digital as a medium"
    })

    const forcedColorState = await stage.evaluate((element) => {
      const chartLabel = element.querySelector("svg text")
      const active = element.querySelector(
        '.thunderdome-stage__nav button[aria-current="step"]'
      )
      const inactive = element.querySelector(
        ".thunderdome-stage__nav button:not([aria-current])"
      )
      if (!chartLabel || !active || !inactive) return null
      return {
        stageBackground: getComputedStyle(element).backgroundColor,
        labelFill: getComputedStyle(chartLabel).fill,
        activeBackground: getComputedStyle(active).backgroundColor,
        activeColor: getComputedStyle(active).color,
        inactiveBackground: getComputedStyle(inactive).backgroundColor
      }
    })

    expect(forcedColorState).not.toBeNull()
    expect(forcedColorState?.labelFill).not.toBe(
      forcedColorState?.stageBackground
    )
    expect(forcedColorState?.activeBackground).not.toBe(
      forcedColorState?.inactiveBackground
    )
    expect(forcedColorState?.activeColor).not.toBe(
      forcedColorState?.activeBackground
    )
    await expect(activeNav).toHaveAttribute("aria-current", "step")
    await expect(inactiveNav).not.toHaveAttribute("aria-current", "step")
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
      ".stream-network-frame, .stream-xy-frame, .stream-ordinal-frame"
    )
    await expect(rounds).toHaveCount(8)
    await expect(stages).toHaveCount(8)
    await expect(frames).toHaveCount(8, { timeout: 60_000 })
    await expect(stages.locator(".semiotic-chart-title")).toHaveCount(0)
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
