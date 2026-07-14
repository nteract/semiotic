import { expect, test, type Page } from "@playwright/test"

const ROUTE = "/examples/sentence-structure"
const PAGE_TITLE = "The Sentence Is Not the Words"
const FILTER_TITLE =
  "Explore 20 sentences about love from Shakespeare, shown as word paths."

const STRUCTURAL_VIEWS = [
  ["a sentence diagram", "reed-kellogg"],
  ["phrase structure", "constituency"],
  ["word relationships", "dependency"],
  ["possible interpretations", "ambiguity"],
  ["a meaning graph", "semantics"],
  ["an argument structure", "rhetoric"],
  ["word paths", "word-tree"],
  ["phrase relationships", "phrase-net"],
  ["textual variants", "variants"],
] as const

function collectBrowserErrors(page: Page) {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))
  return errors
}

async function openExample(page: Page) {
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { level: 1, name: PAGE_TITLE })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.locator(".sentence-explorer")).toBeVisible()
}

async function chooseFilterOption(
  page: Page,
  trigger: RegExp,
  dialogName: string,
  optionName: string,
) {
  await page.getByRole("button", { name: trigger }).click()
  const dialog = page.getByRole("dialog", { name: dialogName })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("option", { name: optionName, exact: true }).click()
}

test.describe("The Sentence Is Not the Words authored source interactions", () => {
  test("preserves a token through all nine views and distinguishes the telescope parses", async ({
    page,
  }) => {
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    const filterTitle = page.locator(".sentence-explorer__filter")
    await expect(filterTitle).toHaveAttribute("aria-label", FILTER_TITLE)
    await expect(filterTitle).toContainText(FILTER_TITLE)
    await expect(filterTitle.getByRole("button")).toHaveCount(4)

    const navigation = page.getByRole("navigation", { name: "Sentence structures" })
    await expect(navigation.getByRole("button")).toHaveCount(9)
    await expect(navigation.getByRole("button", { name: /word paths/i })).toHaveAttribute(
      "aria-current",
      "step",
    )

    const recoverablePath = page
      .locator('.sentence-stage [role="button"][aria-label*="recover source"]')
      .first()
    await expect(recoverablePath).toBeVisible({ timeout: 30_000 })
    await recoverablePath.click()
    const recoveredSource = page.locator(".sentence-source-recovery")
    await expect(recoveredSource).toBeVisible()
    await expect(recoveredSource.getByText("Recovered source", { exact: true })).toBeVisible()
    expect(await recoveredSource.locator("cite").textContent()).toMatch(/\S/)

    const tokenRibbon = page.locator(".sentence-token-ribbon__tokens")
    const telescope = tokenRibbon.getByRole("button", { name: /^telescope\b/i })
    await telescope.click()
    await expect(telescope).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByText("1 followed", { exact: true })).toBeVisible()

    const stage = page.locator(".sentence-stage")
    for (const [label, view] of STRUCTURAL_VIEWS) {
      await navigation.getByRole("button", { name: new RegExp(label, "i") }).click()
      await expect(stage).toHaveAttribute("data-view", view)
      await expect(tokenRibbon.getByRole("button", { name: /^telescope\b/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    }

    await navigation.getByRole("button", { name: /possible interpretations/i }).click()
    const interpretations = page.getByRole("group", { name: "Choose an interpretation" })
    await expect(interpretations.getByRole("button")).toHaveCount(2)
    const instrument = interpretations.getByRole("button", { name: /I used the telescope/i })
    const possession = interpretations.getByRole("button", {
      name: /The man had the telescope/i,
    })
    await expect(instrument).toHaveAttribute("aria-pressed", "true")
    await expect(possession).toHaveAttribute("aria-pressed", "false")
    await possession.click()
    await expect(possession).toHaveAttribute("aria-pressed", "true")
    await expect(page.locator(".sentence-summary")).toContainText(
      /The man had the telescope.*prepositional phrase modifies “man”/i,
    )

    await page.evaluate(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })
    expect(browserErrors).toEqual([])
  })

  test("switches specimens, clears stale selection, and exposes Buffalo structure accessibly", async ({
    page,
  }) => {
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    const tokenRibbon = page.locator(".sentence-token-ribbon__tokens")
    await tokenRibbon.getByRole("button", { name: /^telescope\b/i }).click()

    const specimenGrid = page.locator(".sentence-specimens__grid")
    const buffalo = specimenGrid.getByRole("button", { name: /Buffalo mode/i })
    await buffalo.click()

    const explorer = page.locator(".sentence-explorer")
    await expect(explorer).toHaveAttribute("data-buffalo-mode", "true")
    await expect(buffalo).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByText("BUFFALO MODE", { exact: true })).toBeVisible()
    await expect(page.getByText("no word followed", { exact: true })).toBeVisible()
    await expect(page.locator(".sentence-explorer__filter")).toHaveAttribute(
      "aria-label",
      "Explore 2 sentences about power from the grammar lab, shown as word paths.",
    )
    await expect(
      tokenRibbon.getByRole("button", { name: /^buffalo\b/i }),
    ).toHaveCount(8)

    const navigation = page.getByRole("navigation", { name: "Sentence structures" })
    await navigation.getByRole("button", { name: /word relationships/i }).click()
    await expect(page.locator(".sentence-stage")).toHaveAttribute("data-view", "dependency")

    const summary = page.locator(".sentence-summary")
    await expect(summary.getByRole("heading", { level: 2 })).toHaveText("Word relationships")
    await summary.locator("summary").click()
    expect(await summary.locator("li").count()).toBeGreaterThan(0)
    await expect(summary).toContainText(/authored root/i)

    expect(browserErrors).toEqual([])
  })

  test("keeps the title, filtered working set, active specimen, and summary coherent", async ({
    page,
  }) => {
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    await chooseFilterOption(page, /Subject: love/i, "Subject", "ambiguity")
    const navigation = page.getByRole("navigation", { name: "Sentence structures" })
    await navigation.getByRole("button", { name: /phrase relationships/i }).click()

    await expect(page.locator(".sentence-explorer__filter")).toHaveAttribute(
      "aria-label",
      "Explore 0 sentences about ambiguity from Shakespeare, shown as phrase relationships.",
    )
    const emptySummary = page.locator(".sentence-summary")
    await expect(emptySummary).toContainText(
      "No matching phrase relationships in the current corpus selection.",
    )
    await expect(page.locator(".sentence-stage__empty")).toContainText(
      /No matching sentences.*empty intersection/i,
    )
    await expect(page.locator(".sentence-diagram--phrase-net")).toHaveCount(0)
    await expect(
      page.locator('.sentence-stage [role="button"][aria-label*="recover a source phrase"]'),
    ).toHaveCount(0)

    await chooseFilterOption(page, /Subject: ambiguity/i, "Subject", "rhetoric")
    await chooseFilterOption(page, /Corpus: Shakespeare/i, "Corpus", "the grammar lab")
    await navigation.getByRole("button", { name: /word relationships/i }).click()

    await expect(page.locator(".sentence-explorer__filter")).toHaveAttribute(
      "aria-label",
      "Explore 1 sentence about rhetoric from the grammar lab, shown as word relationships.",
    )
    const rhetoricalSpecimen = page
      .locator(".sentence-specimens__grid")
      .getByRole("button", { name: /Evidence, claim, and concession/i })
    await expect(rhetoricalSpecimen).toHaveAttribute("aria-pressed", "true")
    await expect(page.locator(".sentence-token-ribbon__tokens")).toContainText("analyst")
    await expect(
      page.locator(".sentence-token-ribbon__tokens").getByRole("button", {
        name: /^telescope\b/i,
      }),
    ).toHaveCount(0)
    await expect(page.locator(".sentence-summary")).toContainText(
      /distrusted is the authored root/i,
    )
    await expect(page.locator(".sentence-source-recovery")).toHaveCount(0)

    expect(browserErrors).toEqual([])
  })

  test("uses the rewritten word as the active path and keeps an explicit canonical variant", async ({
    page,
  }) => {
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    const tokenRibbon = page.locator(".sentence-token-ribbon__tokens")
    await tokenRibbon.getByRole("button", { name: /^telescope\b/i }).click()
    await page.getByRole("button", { name: "notebook", exact: true }).click()

    await expect(page.locator(".sentence-rewrite__before")).toHaveText(
      "I saw the man with the telescope.",
    )
    await expect(page.locator(".sentence-rewrite__after")).toHaveText(
      "I saw the man with the notebook.",
    )
    await expect(page.getByRole("group", { name: "Word path direction" })).toContainText(
      "from “notebook”",
    )

    const navigation = page.getByRole("navigation", { name: "Sentence structures" })
    await navigation.getByRole("button", { name: /textual variants/i }).click()
    const variants = page.locator(".sentence-diagram--variants")
    await expect(variants).toBeVisible()
    await expect(variants.locator("text", { hasText: "CANONICAL SENTENCE" })).toHaveCount(1)
    await expect(variants.locator("text", { hasText: "YOUR REWRITE" })).toHaveCount(1)
    await expect(variants.locator("text", { hasText: "telescope" }).first()).toBeVisible()
    await expect(variants.locator("text", { hasText: "notebook" }).first()).toBeVisible()

    expect(browserErrors).toEqual([])
  })

  test("exposes the real structural nodes and edges through Network frame accessibility", async ({
    page,
  }) => {
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    const networkFrame = page.locator(".sentence-stage .stream-network-frame")
    await expect(networkFrame).toHaveAttribute(
      "aria-label",
      /authored (word-tree|word paths) structure/i,
    )
    const dataSummaryTrigger = networkFrame.getByRole("button", {
      name: /View data summary \(\d+ nodes, [1-9]\d* edges\)/,
    })
    await expect(dataSummaryTrigger).toBeAttached()
    await dataSummaryTrigger.focus()
    await dataSummaryTrigger.press("Enter")
    await expect(networkFrame.locator(".semiotic-accessible-data-table-summary")).toContainText(
      /\d+ nodes, [1-9]\d* edges/i,
    )

    expect(browserErrors).toEqual([])
  })

  test("wraps the complete filter sentence without clipping the stage at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    const filterTitle = page.locator(".sentence-explorer__filter")
    await expect(filterTitle).toHaveAttribute("aria-label", FILTER_TITLE)
    const bounds = await filterTitle.evaluate((element) => {
      const title = element as HTMLElement
      const buttons = [...title.querySelectorAll<HTMLElement>("[data-sentence-filter-key]")]
      const titleBox = title.getBoundingClientRect()
      const firstBox = buttons.at(0)?.getBoundingClientRect()
      const lastBox = buttons.at(-1)?.getBoundingClientRect()
      const stage = document.querySelector<HTMLElement>(".sentence-stage")
      const frame = stage?.querySelector<HTMLElement>(".stream-network-frame")
      const canvas = stage?.querySelector<HTMLCanvasElement>("canvas")
      const svg = stage?.querySelector<SVGSVGElement>("svg")
      const stageBox = stage?.getBoundingClientRect()
      const frameBox = frame?.getBoundingClientRect()
      const canvasBox = canvas?.getBoundingClientRect()
      const svgBox = svg?.getBoundingClientRect()
      return {
        whiteSpace: getComputedStyle(title).whiteSpace,
        clientWidth: title.clientWidth,
        scrollWidth: title.scrollWidth,
        left: titleBox.left,
        right: titleBox.right,
        firstTop: firstBox?.top ?? 0,
        lastTop: lastBox?.top ?? 0,
        viewportWidth: document.documentElement.clientWidth,
        pageScrollWidth: document.documentElement.scrollWidth,
        stageClientWidth: stage?.clientWidth ?? 0,
        stageScrollWidth: stage?.scrollWidth ?? 0,
        stageLeft: stageBox?.left ?? 0,
        stageRight: stageBox?.right ?? 0,
        frameLeft: frameBox?.left ?? 0,
        frameRight: frameBox?.right ?? 0,
        canvasLeft: canvasBox?.left ?? 0,
        canvasRight: canvasBox?.right ?? 0,
        svgLeft: svgBox?.left ?? 0,
        svgRight: svgBox?.right ?? 0,
      }
    })

    await filterTitle.getByRole("button", { name: /Structural view:/i }).click()
    const mobileDialog = page.getByRole("dialog", { name: "Structural view" })
    await expect(mobileDialog).toBeVisible()
    const dialogBounds = await mobileDialog.evaluate((element) => {
      const box = element.getBoundingClientRect()
      return {
        left: box.left,
        right: box.right,
        viewportWidth: document.documentElement.clientWidth,
      }
    })
    await page.keyboard.press("Escape")

    expect(bounds.whiteSpace).toBe("normal")
    expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 1)
    expect(bounds.pageScrollWidth).toBeLessThanOrEqual(bounds.viewportWidth + 1)
    expect(bounds.left).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth + 1)
    expect(bounds.lastTop).toBeGreaterThan(bounds.firstTop)
    expect(bounds.stageLeft).toBeGreaterThanOrEqual(0)
    expect(bounds.stageRight).toBeLessThanOrEqual(bounds.viewportWidth + 1)
    expect(bounds.stageScrollWidth).toBeLessThanOrEqual(bounds.stageClientWidth + 1)
    expect(bounds.frameLeft).toBeGreaterThanOrEqual(bounds.stageLeft - 1)
    expect(bounds.frameRight).toBeLessThanOrEqual(bounds.stageRight + 1)
    expect(bounds.canvasLeft).toBeGreaterThanOrEqual(bounds.stageLeft - 1)
    expect(bounds.canvasRight).toBeLessThanOrEqual(bounds.stageRight + 1)
    expect(bounds.svgLeft).toBeGreaterThanOrEqual(bounds.stageLeft - 1)
    expect(bounds.svgRight).toBeLessThanOrEqual(bounds.stageRight + 1)
    expect(dialogBounds.left).toBeGreaterThanOrEqual(8)
    expect(dialogBounds.right).toBeLessThanOrEqual(dialogBounds.viewportWidth - 8)
    expect(browserErrors).toEqual([])
  })

  test("keeps the filter dock and mobile rail stacked below the measured examples header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)
    await page.locator(".sentence-stage").scrollIntoViewIfNeeded()

    const mobileStack = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(".examples-top-bar")!
      const dock = document.querySelector<HTMLElement>(".sentence-filter-dock")!
      const rail = document.querySelector<HTMLElement>(".sentence-view-rail")!
      return {
        headerBottom: header.getBoundingClientRect().bottom,
        dockTop: dock.getBoundingClientRect().top,
        dockBottom: dock.getBoundingClientRect().bottom,
        railTop: rail.getBoundingClientRect().top,
        headerPosition: getComputedStyle(header).position,
        contentHeaderPosition: getComputedStyle(
          document.querySelector<HTMLElement>(".sentence-workbench__header")!,
        ).position,
      }
    })
    expect(Math.abs(mobileStack.dockTop - mobileStack.headerBottom)).toBeLessThanOrEqual(1)
    expect(Math.abs(mobileStack.railTop - mobileStack.dockBottom)).toBeLessThanOrEqual(1)
    expect(mobileStack.headerPosition).toBe("sticky")
    expect(mobileStack.contentHeaderPosition).not.toBe("sticky")

    const triggers = page.locator(".sentence-explorer__filter button[data-sentence-filter-key]")
    for (let index = 0; index < (await triggers.count()); index += 1) {
      await triggers.nth(index).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible()
      const box = await dialog.boundingBox()
      expect(box?.y ?? -1).toBeGreaterThanOrEqual(0)
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(568)
      await page.keyboard.press("Escape")
    }

    await page.setViewportSize({ width: 1440, height: 760 })
    await page.locator(".sentence-stage").scrollIntoViewIfNeeded()
    const desktopOffsets = await page.evaluate(() => {
      const headerBounds = document
        .querySelector<HTMLElement>(".examples-top-bar")!
        .getBoundingClientRect()
      return {
      headerBottom: headerBounds.bottom,
      headerLeft: headerBounds.left,
      headerRight: headerBounds.right,
      dockTop: document
        .querySelector<HTMLElement>(".sentence-filter-dock")!
        .getBoundingClientRect().top,
      }
    })
    expect(Math.abs(desktopOffsets.dockTop - desktopOffsets.headerBottom)).toBeLessThanOrEqual(1)
    expect(desktopOffsets.headerLeft).toBe(0)
    expect(desktopOffsets.headerRight).toBe(1440)

    await page.goto("/getting-started")
    const docsHeader = page.locator(".docs-top-bar")
    await expect(docsHeader).toBeVisible()
    expect(await docsHeader.evaluate((element) => getComputedStyle(element).position)).toBe("sticky")
    expect(browserErrors).toEqual([])
  })
})
