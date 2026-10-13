import * as React from "react"
import { renderToString } from "react-dom/server"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"
import { HydrationFixture } from "./network-hydration-fixture"

async function hoverNetwork(page: Page, edge = false) {
  const canvas = page.getByTestId("hydration-network").locator("canvas").first()
  const box = (await canvas.boundingBox())!
  const point = await page.evaluate(
    (isEdge) =>
      (
        window as unknown as {
          hydrationReviewPoint: (edge: boolean) => { x: number; y: number }
        }
      ).hydrationReviewPoint(isEdge),
    edge
  )
  await page.mouse.move(box.x + point.x, box.y + point.y)
  const tooltip = page.getByTestId("hydration-tooltip")
  await expect(tooltip).toHaveText(
    edge
      ? "Measured connection: measured value 2"
      : "Measured node: measured value 7"
  )
  const rect = (await tooltip.boundingBox())!
  const viewport = page.viewportSize()!
  expect(rect.x).toBeGreaterThanOrEqual(0)
  expect(rect.y).toBeGreaterThanOrEqual(0)
  expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width)
  expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height)
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
}

test("published network SSR survives pending worker hydration and enables real hover after handoff", async ({
  page
}) => {
  const library = createRequire(resolve("package.json"))(
    resolve("dist/network.min.js")
  )
  library.registerBuiltInNetworkLayouts()
  const chart = React.createElement(
    React.StrictMode,
    null,
    React.createElement(HydrationFixture, { Frame: library.StreamNetworkFrame })
  )
  const markup = renderToString(chart, { identifierPrefix: "review-" })
  let releaseWorker!: () => void
  const gate = new Promise<void>((resolveGate) => {
    releaseWorker = resolveGate
  })
  let workerRequests = 0
  await page.route("**/forceLayoutWorker.js*", async (route) => {
    workerRequests++
    await gate
    await route.continue()
  })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await page.evaluate(
    async ({ html, fixtureURL, libraryURL }) => {
      const host = document.createElement("main")
      host.id = "hydration-review"
      host.innerHTML = html
      document.body.replaceChildren(host)
      const [fixture, clientLibrary] = await Promise.all([
        import(fixtureURL),
        import(libraryURL)
      ])
      clientLibrary.registerBuiltInNetworkLayouts()
      fixture.hydrate(host, clientLibrary)
    },
    {
      html: markup,
      fixtureURL: `/@fs/${resolve("integration-tests/network-hydration-fixture.ts")}`,
      libraryURL: `/@fs/${resolve("dist/network.module.min.js")}`
    }
  )
  try {
    await expect.poll(() => workerRequests).toBeGreaterThan(0)
    const network = page.getByTestId("hydration-network")
    await expect(network.locator("svg circle")).toHaveCount(2)
    await expect(network.locator("canvas")).toHaveCount(0)
    await expect(network.locator(".stream-network-frame")).toHaveAttribute(
      "aria-busy",
      "true"
    )
    await expect(
      network.getByRole("img", { name: "Network measurements" })
    ).toHaveAccessibleName("Network measurements")
    releaseWorker()
    await expect(network.locator("canvas")).toHaveCount(1)
    await expect(network.locator("canvas")).toHaveAttribute(
      "aria-label",
      "Network chart, 2 nodes, 1 edges"
    )
    await expect
      .poll(() =>
        page.evaluate(() =>
          (
            window as unknown as { hydrationReviewRootRetained: () => boolean }
          ).hydrationReviewRootRetained()
        )
      )
      .toBe(true)
    await hoverNetwork(page)
    await page.getByRole("button", { name: "Pan and zoom network" }).click()
    await hoverNetwork(page)
    await hoverNetwork(page, true)
    const revision = await page.evaluate(
      () =>
        (
          window as unknown as {
            hydrationReviewLayout: () => { revision: number }
          }
        ).hydrationReviewLayout().revision
    )
    await page.getByRole("button", { name: "Resize network" }).click()
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                hydrationReviewLayout: () => { revision: number }
              }
            ).hydrationReviewLayout().revision
        )
      )
      .toBeGreaterThan(revision)
    await expect(network.locator(".stream-network-frame")).not.toHaveAttribute(
      "aria-busy",
      "true"
    )
    await hoverNetwork(page)
    await hoverNetwork(page, true)
    await expect(network.locator("canvas")).toHaveAttribute(
      "aria-label",
      "Network chart, 2 nodes, 1 edges"
    )
    const summaryButton = network.getByRole("button", {
      name: /view data summary/i
    })
    await summaryButton.focus()
    await summaryButton.press("Enter")
    await expect(network.getByRole("table").first()).toContainText(
      "Measured node"
    )
    await expect(network.getByRole("img")).toHaveCount(1)
    const results = await new AxeBuilder({ page })
      .include("#hydration-review")
      .withRules(["svg-img-alt", "aria-allowed-role", "nested-interactive"])
      .analyze()
    expect(results.violations).toEqual([])
    expect(errors).toEqual([])
  } finally {
    releaseWorker()
  }
})
