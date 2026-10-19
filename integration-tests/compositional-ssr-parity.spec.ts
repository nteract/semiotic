import { expect, test } from "@playwright/test"
import type { NetworkCustomLayout, NetworkLayoutResult } from "semiotic/network"
import { compositionalPath } from "semiotic/recipes/core"
import { renderChartWithEvidence } from "semiotic/server"
import { makeCompositionalParityCases } from "./compositional-parity-fixtures"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"
import { compareCurrentPanels } from "./helpers/ssrParity"

declare global {
  interface Window {
    __compositionalInputKeys: string[]
    __compositionalFrame: {
      getCustomLayout(): NetworkLayoutResult
      getLayoutFailure(): unknown
    }
  }
}

test.describe("compositional CSR–SSR parity", () => {
  test.use({ viewport: { width: 1200, height: 800 } })

  for (const fixture of makeCompositionalParityCases()) {
    test(fixture.variant, async ({ page }, testInfo) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      const keys: string[][] = []
      const layout: NetworkCustomLayout<typeof fixture.props.layoutConfig> = (
        context
      ) => {
        keys.push(context.edges.map((edge) => edge._edgeKey!))
        return fixture.props.layout(context)
      }
      const { svg, evidence } = renderChartWithEvidence("NetworkCustomChart", {
        ...fixture.props,
        layout
      })
      expect(evidence).toMatchObject({
        empty: false,
        status: "ok",
        nodeCount: fixture.expectedNodeCount,
        edgeCount: 4,
        markCountByType: {
          "node:rect": fixture.expectedNodeCount,
          "edge:curved": 4
        }
      })
      await page.goto(`/ssr-parity-examples/?case=${fixture.id}`)
      await waitForChartReady(page, `csr-${fixture.id}`)
      const live = await page.evaluate(() => ({
        scene: window.__compositionalFrame.getCustomLayout(),
        failure: window.__compositionalFrame.getLayoutFailure(),
        keys: window.__compositionalInputKeys
      }))
      expect(live.failure).toBeNull()
      const expectedKeys = [
        "account",
        "quantity",
        "price",
        "account-audit"
      ].map((id) => JSON.stringify(["id", id]))
      expect(keys).toEqual([expectedKeys])
      expect(live.keys).toEqual(expectedKeys)
      expect(live.scene.sceneNodes).toHaveLength(fixture.expectedNodeCount)
      expect(new Set(live.scene.sceneNodes!.map((node) => node.id)).size).toBe(
        fixture.expectedNodeCount
      )
      expect(
        live.scene.sceneEdges!.map((edge) => ({
          id: edge.id,
          path: "pathD" in edge ? edge.pathD : undefined,
          source: edge.datum?.sourceTerminal,
          target: edge.datum?.targetTerminal
        }))
      ).toEqual(
        fixture.solved.edges.map((edge) => ({
          id: edge.edgeId,
          path: edge.sections.map(compositionalPath).join(" "),
          source: edge.source,
          target: edge.target
        }))
      )

      // Move the settled live chart beside the standalone server SVG so one
      // saved screenshot covers both renderers without recreating the canvas.
      await page.evaluate(({ id, variant, markup }) => {
        const client = document.querySelector<HTMLElement>(
          `[data-testid="csr-${id}"]`
        )!
        client.querySelector("h2")?.remove()
        const sheet = document.createElement("section")
        sheet.className = "ssr-csr-sheet"
        sheet.dataset.testid = "compositional-parity-sheet"
        const title = document.createElement("h1")
        title.textContent = `Compositional DAG — ${variant}`
        sheet.append(title)
        const columns = document.createElement("div")
        columns.className = "ssr-csr-columns"
        const server = document.createElement("div")
        server.className = "test-case"
        server.dataset.testid = "compositional-ssr"
        server.innerHTML = markup
        for (const [label, content] of [["SSR", server], ["CSR", client]] as const) {
          const panel = document.createElement("article")
          panel.className = "ssr-csr-panel"
          const heading = document.createElement("h2")
          heading.textContent = label
          panel.append(heading, content)
          columns.append(panel)
        }
        sheet.append(columns)
        // Keep React's delegated pointer events attached to the live chart.
        document.getElementById("root")!.append(sheet)
      }, { id: fixture.id, variant: fixture.variant, markup: svg })
      const csr = page
        .getByTestId(`csr-${fixture.id}`)
        .locator('[role="group"]')
        .first()
      const ssr = page.getByTestId("compositional-ssr").locator("svg").first()
      const routes = ssr.locator('path[stroke="#176b83"]')
      expect(
        await routes.evaluateAll((paths) =>
          paths.map((path) => path.getAttribute("d"))
        )
      ).toEqual(
        fixture.solved.edges.map((edge) =>
          edge.sections.map(compositionalPath).join(" ")
        )
      )
      const difference = await compareCurrentPanels(page, ssr, csr)
      expect(difference.sameSize).toBe(true)
      expect(
        difference.differenceRatio,
        JSON.stringify(difference)
      ).toBeLessThan(0.05)
      await testInfo.attach("current-parity", {
        body: JSON.stringify(difference, null, 2),
        contentType: "application/json"
      })
      await expect(page.getByTestId("compositional-parity-sheet")).toHaveScreenshot(
        `ssr-csr-${fixture.id}.png`,
        { maxDiffPixels: 250 }
      )

      // Inspect actual canvas pixels at each server route, after the camera and
      // margin transforms. A retained-but-unpainted wire must not pass parity.
      const probes = await page.evaluate(
        ({ id, count }) => {
          const canvas = document.querySelector<HTMLCanvasElement>(
            `[data-testid="csr-${id}"] canvas`
          )!
          const ctx = canvas.getContext("2d")!
          const ratio = canvas.width / canvas.getBoundingClientRect().width
          const paths = [
            ...document.querySelectorAll<SVGPathElement>(
              '[data-testid="compositional-ssr"] path[stroke="#176b83"]'
            )
          ]
          if (paths.length !== count) throw new Error("Missing server routes")
          return paths.map((path) => {
            let painted = 0
            for (const fraction of [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
              const point = path.getPointAtLength(
                path.getTotalLength() * fraction
              )
              const screen = new DOMPoint(point.x, point.y).matrixTransform(
                path.getScreenCTM()!
              )
              const root = document
                .querySelector('[data-testid="compositional-ssr"] > svg')!
                .getBoundingClientRect()
              const p = { x: screen.x - root.x, y: screen.y - root.y }
              const pixels = ctx.getImageData(
                Math.round(p.x * ratio) - 1,
                Math.round(p.y * ratio) - 1,
                3,
                3
              ).data
              let matches = false
              for (let i = 0; i < pixels.length; i += 4)
                if (
                  pixels[i + 3] > 0 &&
                  Math.abs(pixels[i] - 23) < 40 &&
                  Math.abs(pixels[i + 1] - 107) < 40 &&
                  Math.abs(pixels[i + 2] - 131) < 40
                )
                  matches = true
              if (matches) painted++
            }
            return painted
          })
        },
        { id: fixture.id, count: 4 }
      )
      for (const [index, count] of probes.entries())
        expect(
          count,
          `painted samples for ${fixture.solved.edges[index].edgeId}`
        ).toBeGreaterThanOrEqual(3)

      // Real canvas picking uses these same routes, including both independently
      // identified duplicates. Tooltip placement uses the transformed viewport.
      await csr.scrollIntoViewIfNeeded()
      for (const id of ["quantity", "account", "account-audit"]) {
        const index = fixture.solved.edges.findIndex(
          (edge) => edge.edgeId === id
        )
        const point = await routes
          .nth(index)
          .evaluate((path: SVGPathElement) => {
            const p = path.getPointAtLength(path.getTotalLength() / 2)
            const transformed = new DOMPoint(p.x, p.y).matrixTransform(
              path.getScreenCTM()!
            )
            const root = document
              .querySelector('[data-testid="compositional-ssr"] > svg')!
              .getBoundingClientRect()
            return { x: transformed.x - root.x, y: transformed.y - root.y }
          })
        const canvas = await csr.locator("canvas").boundingBox()
        await page.mouse.move(canvas!.x + point.x, canvas!.y + point.y)
        await expect(page.getByRole("tooltip")).toHaveText(`Interface ${id}`)
        await expectTooltipWithinPlot(csr, fixture.props.margin)
        await page.mouse.move(0, 0)
        await expect(page.getByRole("tooltip")).toHaveCount(0)
      }
      expect(errors).toEqual([])
    })
  }
})
