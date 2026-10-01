import { test, expect, type Page } from "@playwright/test"
import { waitForRafs } from "./helpers"

/**
 * The isometric infrastructure example hit-tests projected marks: real
 * hovers over pictograms and routed links must produce the right tooltip at
 * the mark, survive a resize and a perspective switch, and dismiss on leave.
 */

const tooltip = (page: Page) => page.locator(".stream-network-tooltip")

/** Screen point just above a host's ground contact, found from its alert badge. */
async function hostPoint(page: Page, label: RegExp) {
  const badge = page.locator("div").filter({ hasText: label }).last()
  await expect(badge).toBeVisible()
  const box = (await badge.boundingBox())!
  // Badges sit 58px right of and 34px above the ground point; the
  // pictogram's body is ~20px above that point.
  return { x: box.x + box.width / 2 - 58, y: box.y + box.height / 2 + 34 - 20 }
}

async function hoverUntil(page: Page, around: { x: number; y: number }, text: RegExp, radius = 24, step = 4) {
  for (let r = 0; r <= radius; r += step) {
    for (let dx = -r; dx <= r; dx += step) {
      for (const dy of r === 0 ? [0] : [-r, r]) {
        await page.mouse.move(around.x + dx, around.y + dy)
        // Wait for the current move's coalesced hit test and React render.
        await waitForRafs(page)
        if (await tooltip(page).filter({ hasText: text }).isVisible()) {
          return { x: around.x + dx, y: around.y + dy }
        }
      }
    }
  }
  throw new Error(`No tooltip matching ${text} near ${around.x},${around.y}`)
}

test("hover, resize, perspective switch and dismissal follow projected marks", async ({ page }) => {
  await page.goto("/examples/isometric-infrastructure")
  const chart = page.locator(".stream-network-frame").first()
  // Region labels are drawn from the projected plates.
  await expect(page.getByText("INTERNET FACING", { exact: true })).toBeVisible()
  await expect(page.getByText("PRIVATE SUBNET", { exact: true })).toBeVisible()

  // A pictogram: the tooltip names the host, its role and its load.
  const at = await hoverUntil(page, await hostPoint(page, /CPU 81%/), /web-prd-1/)
  await expect(tooltip(page)).toContainText("Web tier (public)")
  await expect(tooltip(page)).toContainText("CPU 81%")
  let tip = (await tooltip(page).boundingBox())!
  expect(Math.hypot(tip.x + tip.width / 2 - at.x, tip.y + tip.height - at.y)).toBeLessThan(260)

  // Leaving the chart dismisses the tooltip.
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)

  // A routed link carries its protocol and endpoints: sweep the chart until
  // the pointer crosses one (routes follow the ground axes, so no fixed point).
  const area = (await chart.boundingBox())!
  let edgeHit = false
  // Start at the center where routes cluster, then sweep outward. Waiting
  // for every hit test makes scanning the empty top rows needlessly slow.
  sweep: for (let offset = 0; offset < area.height / 2 - 20; offset += 6) {
    for (const dy of offset === 0 ? [0] : [-offset, offset]) {
      const y = area.y + area.height / 2 + dy
      for (let x = area.x + 20; x < area.x + area.width - 20; x += 6) {
        await page.mouse.move(x, y)
        await waitForRafs(page)
        if (await tooltip(page).filter({ hasText: /→/ }).isVisible()) {
          edgeHit = true
          break sweep
        }
      }
    }
  }
  expect(edgeHit).toBe(true)
  await expect(tooltip(page)).toContainText(/→/)
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)

  // After a resize the projection refits; hovering the host still works.
  await page.setViewportSize({ width: 900, height: 900 })
  await hoverUntil(page, await hostPoint(page, /CPU 81%/), /web-prd-1/)
  tip = (await tooltip(page).boundingBox())!
  expect(tip.width).toBeGreaterThan(40)
  await page.mouse.move(2, 2)

  // Switch to the military view; after the tween the marks are hit-tested
  // at their new projected positions.
  await page.getByRole("radio", { name: "Military" }).click()
  await page.waitForTimeout(900)
  await hoverUntil(page, await hostPoint(page, /CPU 81%/), /web-prd-1/)
  await expect(tooltip(page)).toContainText("CPU 81%")
  await page.mouse.move(2, 2)
  await expect(tooltip(page)).toHaveCount(0)

  // And flat: the same layout, unprojected.
  await page.getByRole("radio", { name: "Flat" }).click()
  await page.waitForTimeout(900)
  await hoverUntil(page, await hostPoint(page, /CPU 81%/), /web-prd-1/)
})

test("the perspective toggle is a keyboard-operable radio group", async ({ page }) => {
  await page.goto("/examples/isometric-infrastructure")
  const group = page.getByRole("radiogroup", { name: "View" })
  await expect(group).toBeVisible()
  const isometric = group.getByRole("radio", { name: "Isometric" })
  await expect(isometric).toHaveAttribute("aria-checked", "true")
  await isometric.focus()
  await page.keyboard.press("ArrowRight")
  await expect(group.getByRole("radio", { name: "Pixel" })).toHaveAttribute("aria-checked", "true")
  await expect(group.getByRole("radio", { name: "Pixel" })).toBeFocused()
  await page.keyboard.press("Home")
  await expect(group.getByRole("radio", { name: "Flat" })).toHaveAttribute("aria-checked", "true")
})
