import { test, expect, type Page } from "@playwright/test"

/**
 * Perspective pieces on the feature page: tokens (tree nodes) and slabs
 * (sankey nodes) are hit-tested at their projected, thickened positions.
 * Real hovers must surface the right tooltip near the mark, survive a
 * thickness change, and dismiss on leave.
 */

const tooltip = (page: Page) => page.locator(".stream-network-tooltip")
const panel = (page: Page, name: string) => page.locator("figure").filter({ hasText: name })

/** Spiral out from a point until a tooltip matching `text` appears. */
async function hoverUntil(page: Page, around: { x: number; y: number }, text: RegExp, radius = 48, step = 3) {
  for (let r = 0; r <= radius; r += step) {
    for (let dx = -r; dx <= r; dx += step) {
      for (const dy of r === 0 ? [0] : [-r, r]) {
        await page.mouse.move(around.x + dx, around.y + dy)
        const tip = tooltip(page).filter({ hasText: text })
        if (await tip.isVisible()) return { x: around.x + dx, y: around.y + dy }
      }
    }
  }
  throw new Error(`No tooltip matching ${text} near ${around.x},${around.y}`)
}

async function labelCenter(page: Page, figure: string, text: string) {
  const label = panel(page, figure).getByText(text, { exact: true }).first()
  await expect(label).toBeVisible()
  const box = (await label.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test("tree tokens and sankey slabs show tooltips at their projected marks", async ({ page }) => {
  await page.goto("/features/perspective")
  await expect(page.getByRole("group", { name: "Perspective controls" })).toBeVisible()

  // A token: the tree node named "Data" (labels sit beside their node).
  const tree = "TreeDiagram · tokens"
  await panel(page, tree).scrollIntoViewIfNeeded()
  let at = await hoverUntil(page, await labelCenter(page, tree, "Data"), /^\s*Data/)
  let tip = (await tooltip(page).boundingBox())!
  expect(Math.hypot(tip.x + tip.width / 2 - at.x, tip.y + tip.height - at.y)).toBeLessThan(220)
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)

  // A slab: the sankey node "Electricity", not one of its bands.
  const sankey = "SankeyDiagram · slabs"
  await panel(page, sankey).scrollIntoViewIfNeeded()
  at = await hoverUntil(page, await labelCenter(page, sankey, "Electricity"), /^(?![\s\S]*→)[\s\S]*Electricity/)
  tip = (await tooltip(page).boundingBox())!
  expect(Math.hypot(tip.x + tip.width / 2 - at.x, tip.y + tip.height - at.y)).toBeLessThan(220)
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)

  // Thicker pieces move up on screen; hit testing follows them.
  await page.getByRole("slider").fill("16")
  await page.waitForTimeout(300)
  await panel(page, sankey).scrollIntoViewIfNeeded()
  await hoverUntil(page, await labelCenter(page, sankey, "Electricity"), /^(?![\s\S]*→)[\s\S]*Electricity/)
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)
  await panel(page, tree).scrollIntoViewIfNeeded()
  await hoverUntil(page, await labelCenter(page, tree, "Data"), /^\s*Data/)
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)
})

test("a layout recipe's node cards and hit targets follow the projection", async ({ page }) => {
  await page.goto("/features/perspective")
  const lineage = "lineageDagLayout recipe"
  await panel(page, lineage).scrollIntoViewIfNeeded()
  // Hulls lie on the ground (their labels stand at the projected corner).
  await expect(panel(page, lineage).locator('[data-perspective="ground"] path.lineage-dag-hull')).toHaveCount(3)
  // The node card stands over its projected slab, so hovering at the card
  // finds the node the card names.
  let at = await hoverUntil(page, await labelCenter(page, lineage, "Join"), /Join/)
  let tip = (await tooltip(page).boundingBox())!
  expect(Math.hypot(tip.x + tip.width / 2 - at.x, tip.y + tip.height - at.y)).toBeLessThan(220)
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)

  // Another preset moves cards and hit targets together.
  await page.getByRole("radio", { name: "Military" }).first().click()
  await page.waitForTimeout(900)
  await panel(page, lineage).scrollIntoViewIfNeeded()
  at = await hoverUntil(page, await labelCenter(page, lineage, "Warehouse"), /Warehouse/)
  tip = (await tooltip(page).boundingBox())!
  expect(tip.width).toBeGreaterThan(30)
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)
})
