import { resolve } from "node:path"
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function hoverMark(
  page: Page,
  family: "geo" | "network",
  text: string,
  value = 7,
  kind = "Point"
) {
  const canvas = page
    .getByTestId(`grooming-${family}`)
    .locator("canvas")
    .first()
  const rect = (await canvas.boundingBox())!
  const point = await page.evaluate(
    (key) =>
      (
        window as unknown as {
          grooming: Record<string, () => { x: number; y: number }>
        }
      ).grooming[key](),
    `${family}${kind}`
  )
  await page.mouse.move(rect.x + point.x, rect.y + point.y)
  const tooltip = page.getByTestId("grooming-tooltip")
  await expect(tooltip).toHaveText(`${text}: measured value ${value}`)
  const box = (await tooltip.boundingBox())!
  const viewport = page.viewportSize()!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
}

test("real marks retain tooltips through camera changes, resize, and automatic palettes", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" })
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await page.evaluate(
    async (fixtureURL) => {
      const host = document.createElement("main")
      host.id = "grooming-fixture"
      document.body.replaceChildren(host)
      const fixture = await import(fixtureURL)
      fixture.mount(host)
    },
    `/@fs/${resolve("integration-tests/grooming-fixture.tsx")}`
  )
  await expect(page.getByTestId("palette")).toHaveAttribute(
    "data-background",
    "#ffffff"
  )
  await hoverMark(page, "network", "Measured node")
  await page.getByRole("button", { name: "Pan and zoom network" }).click()
  await hoverMark(page, "network", "Measured node")
  await hoverMark(page, "network", "Measured connection", 2, "EdgePoint")
  await hoverMark(page, "geo", "Measured site")
  await page
    .getByTestId("grooming-geo")
    .getByRole("button", { name: /zoom in/i })
    .click()
  await hoverMark(page, "geo", "Measured site")
  await page.getByRole("button", { name: "Resize charts" }).click()
  await hoverMark(page, "network", "Measured node")
  await hoverMark(page, "geo", "Measured site")
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(page.getByTestId("palette")).toHaveAttribute(
    "data-background",
    "#1a1a2e"
  )
  await expect(page.getByTestId("palette")).toHaveAttribute(
    "data-text",
    "#e0e0e0"
  )
  await hoverMark(page, "geo", "Measured site")
  const results = await new AxeBuilder({ page })
    .include("#grooming-fixture")
    .withRules(["svg-img-alt", "aria-allowed-role", "nested-interactive"])
    .analyze()
  expect(results.violations).toEqual([])
  expect(errors).toEqual([])
})
