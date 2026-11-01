import { expect, test, type Locator } from "@playwright/test"
import * as React from "react"
import { renderToString } from "react-dom/server"
import { WordCloud } from "semiotic/wordcloud"
import { renderChartWithEvidence } from "semiotic/server"
import { makeWordCloudParityCases } from "./wordcloud-parity-fixtures"
import { compareCurrentPanels } from "./helpers/ssrParity"
import { expectTooltipWithinPlot, waitForChartReady, waitForRafs } from "./helpers"

declare global {
  interface Window {
    __hydrateWordCloud(host: HTMLElement): void
    __wordCloudHydrationErrors: string[]
  }
}

const hulls = (surface: Locator) => surface.locator("[data-wordcloud-hull]").evaluateAll((paths) =>
  paths.map((path) => ({
    id: path.getAttribute("data-wordcloud-hull"),
    members: path.getAttribute("data-member-count"),
    path: path.getAttribute("d"),
    fill: path.getAttribute("fill"),
    label: path.getAttribute("aria-label")
  }))
)

const MAX_INK_DIFFERENCE = 0.03

test.describe("WordCloud CSR / SSR / hydration parity", () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  for (const fixture of makeWordCloudParityCases()) {
    test(fixture.id, async ({ page }, testInfo) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      const { svg, evidence } = renderChartWithEvidence("WordCloud", fixture.props)
      const reactSSR = renderToString(React.createElement(WordCloud, fixture.props))
      expect(evidence).toMatchObject({
        frameType: "network", status: "ok", empty: false,
        markCountByType: { "node:rect": 3 },
        wordCloud: { inputCount: 4, placedCount: 3, omitted: [{ reason: "missing-text" }] }
      })

      await page.goto(`/ssr-parity-examples/?case=${fixture.id}`)
      const client = page.getByTestId(`csr-${fixture.id}`)
      if (fixture.props.renderAs === "canvas") await waitForChartReady(page, `csr-${fixture.id}`)
      else await expect(client.locator("svg[data-network-scene] [data-word-id]")).toHaveCount(3)
      await expect(client.locator("[data-wordcloud-state]")).toHaveAttribute("data-wordcloud-state", "ready")

      await page.evaluate(({ svg, reactSSR }) => {
        for (const [id, html] of [["cloud-server", svg], ["cloud-hydrated", reactSSR]]) {
          const host = document.createElement("div")
          host.className = "test-case"
          host.dataset.testid = id
          host.innerHTML = html
          document.getElementById("root")!.append(host)
        }
      }, { svg, reactSSR })
      const server = page.getByTestId("cloud-server").locator("svg").first()
      const csr = client.locator("[data-wordcloud-state]")
      const hydrationHost = page.getByTestId("cloud-hydrated")
      const hydrated = hydrationHost.locator("[data-wordcloud-state]")
      const expectedHulls = await hulls(server)
      expect(expectedHulls).toHaveLength(2)
      expect(expectedHulls.map(({ members }) => members)).toEqual(["2", "2"])
      for (const surface of [csr, hydrated]) {
        expect(await hulls(surface)).toEqual(expectedHulls)
        const comparison = await compareCurrentPanels(page, server, surface)
        expect(comparison.sameSize).toBe(true)
        expect(comparison.inkPixels).toBeGreaterThan(1000)
        expect(comparison.differenceRatio, JSON.stringify(comparison)).toBeLessThan(MAX_INK_DIFFERENCE)
      }

      // Compare the live frame after React replaces its server SVG, as well as
      // the pre-hydration markup. No fallback client remount may hide a mismatch.
      await hydrationHost.evaluate((host) => window.__hydrateWordCloud(host as HTMLElement))
      if (fixture.props.renderAs === "canvas") await waitForChartReady(page, "cloud-hydrated")
      else await expect(hydrated.locator("svg[data-network-scene] [data-word-id]")).toHaveCount(3)
      await waitForRafs(page)
      expect(await page.evaluate(() => window.__wordCloudHydrationErrors)).toEqual([])
      expect(await hulls(hydrated)).toEqual(expectedHulls)
      const comparison = await compareCurrentPanels(page, server, hydrated)
      expect(comparison.sameSize).toBe(true)
      expect(comparison.differenceRatio, JSON.stringify(comparison)).toBeLessThan(MAX_INK_DIFFERENCE)

      // Keep the live canvases and React event roots intact while arranging a
      // reviewable comparison sheet, like the other SSR/CSR visual baselines.
      await page.evaluate(({ id, renderAs }) => {
        const root = document.getElementById("root")!
        const sheet = document.createElement("section")
        sheet.className = "ssr-csr-sheet"
        sheet.dataset.testid = "wordcloud-parity-sheet"
        const title = document.createElement("h1")
        title.textContent = `WordCloud group hulls — ${renderAs}`
        const columns = document.createElement("div")
        columns.className = "ssr-csr-columns"
        columns.style.gridTemplateColumns = "repeat(3, max-content)"
        for (const [label, testId] of [
          ["SSR · static SVG", "cloud-server"],
          [`CSR · ${renderAs}`, `csr-${id}`],
          [`Hydrated · ${renderAs}`, "cloud-hydrated"]
        ]) {
          const host = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!
          host.querySelector("h2")?.remove()
          const panel = document.createElement("article")
          panel.className = "ssr-csr-panel"
          const heading = document.createElement("h2")
          heading.textContent = label
          panel.append(heading, host)
          columns.append(panel)
        }
        sheet.append(title, columns)
        root.append(sheet)
      }, { id: fixture.id, renderAs: fixture.props.renderAs })

      // Hover the actual retained word bounds on both client entry paths.
      const word = fixture.props.layout!.words.find((word) => word.id === "care")!
      for (const surface of [csr, hydrated]) {
        await surface.scrollIntoViewIfNeeded()
        const box = (await surface.boundingBox())!
        await page.mouse.move(box.x + 12 + 160 + word.x + (word.x0 + word.x1) / 2,
          box.y + 8 + 100 + word.y + (word.y0 + word.y1) / 2)
        const tooltip = surface.locator(".stream-network-tooltip")
        await expect(tooltip).toContainText("care")
        await expect(tooltip).toContainText("12")
        await expectTooltipWithinPlot(surface, { left: 12, right: 18, top: 8, bottom: 14 })
        await page.mouse.move(0, 0)
        await expect(tooltip).toBeHidden()
      }
      expect(errors).toEqual([])
      for (const [name, surface] of [["server", server], ["client", csr], ["hydrated", hydrated]] as const)
        await testInfo.attach(`wordcloud-${name}`, { body: await surface.screenshot(), contentType: "image/png" })

      // Prove the ink comparison detects missing words even with both hulls
      // intact; a hull-only render must not satisfy the parity assertion.
      const serverContents = await server.innerHTML()
      try {
        await server.locator("[data-word-id]").evaluateAll((words) => words.forEach((word) => word.remove()))
        expect((await compareCurrentPanels(page, server, csr)).differenceRatio).toBeGreaterThan(MAX_INK_DIFFERENCE)
      } finally {
        await server.evaluate((element, contents) => { element.innerHTML = contents }, serverContents)
      }
      await expect(page.getByTestId("wordcloud-parity-sheet")).toHaveScreenshot(
        `ssr-csr-${fixture.id}.png`,
        { maxDiffPixels: 250 }
      )
    })
  }
})
