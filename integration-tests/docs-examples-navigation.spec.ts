import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test.describe("structured navigation hierarchy and geo contract", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility/navigation", {
      waitUntil: "domcontentloaded"
    })
    await expect(
      page.getByRole("heading", { name: "Structured Navigation", level: 1 })
    ).toBeVisible()
  })

  test("exposes overview-first assistive text and WAI-ARIA tree structure", async ({
    page
  }) => {
    const hierarchy = page.getByRole("tree", {
      name: "Organization hierarchy navigation"
    })
    const geography = page.getByRole("tree", {
      name: "Regional score navigation"
    })
    await expect(hierarchy).toBeVisible()
    await expect(geography).toBeVisible()

    const hierarchySnapshot = await hierarchy.ariaSnapshot()
    expect(hierarchySnapshot).toContain(
      'tree "Organization hierarchy navigation"'
    )
    expect(hierarchySnapshot).toContain("3 leaves and 4 total descendants")
    expect(hierarchySnapshot).toContain(
      "Company: 2 direct children, 4 total descendants, 3 leaves, leaf total 9."
    )

    const geographySnapshot = await geography.ariaSnapshot()
    expect(geographySnapshot).toContain('tree "Regional score navigation"')
    expect(geographySnapshot).toContain(
      "Values are available for 4 of 5 regions"
    )
    expect(geographySnapshot).toContain("Highest values: 1 region")
    expect(geographySnapshot).toContain("No numeric value: 1 region")

    const axe = await new AxeBuilder({ page })
      .include('[data-testid="hierarchy-navigation-demo"]')
      .include('[data-testid="choropleth-navigation-demo"]')
      .analyze()
    expect(axe.violations).toEqual([])
  })

  test("moves browser focus through hierarchy and ranked region branches", async ({
    page
  }) => {
    const hierarchy = page.getByRole("tree", {
      name: "Organization hierarchy navigation"
    })
    const hierarchyRoot = hierarchy.getByRole("treeitem").first()
    await hierarchyRoot.focus()
    await page.keyboard.press("ArrowRight")
    const company = hierarchy.getByRole("treeitem", {
      name: /Company: 2 direct children/
    })
    await expect(company).toBeFocused()
    await expect(company).toHaveAttribute("aria-expanded", "false")
    await page.keyboard.press("ArrowRight")
    await expect(company).toHaveAttribute("aria-expanded", "true")
    await page.keyboard.press("ArrowRight")
    await expect(
      hierarchy.getByRole("treeitem", {
        name: /Engineering: 2 direct children/
      })
    ).toBeFocused()

    const geography = page.getByRole("tree", {
      name: "Regional score navigation"
    })
    const geographyRoot = geography.getByRole("treeitem").first()
    await geographyRoot.focus()
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("ArrowDown")
    const middle = geography.getByRole("treeitem", {
      name: /Middle values: 2 regions/
    })
    await expect(middle).toBeFocused()
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    const beta = geography.getByRole("treeitem", {
      name: "Beta: 60, rank 2 of 4."
    })
    await expect(beta).toBeFocused()
    await expect(beta).toHaveAttribute("aria-level", "3")
    await expect(beta).toHaveAttribute("aria-posinset", "1")
    await expect(beta).toHaveAttribute("aria-setsize", "2")
  })
})
