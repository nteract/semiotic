import { test, expect, type Page } from "@playwright/test"

// ProcessSankey now wraps StreamNetworkFrame, which paints bands and
// ribbons to a canvas. The legend, time axis, lane rails, particles,
// and node labels are SVG overlays inside the frame's `<svg>` group.
// Tests inspect canvas pixels for the data layer and DOM for chrome.

const PAGE = "/process-sankey-examples/"

async function canvasHasPaint(page: Page, testId: string): Promise<boolean> {
  return page.evaluate((id) => {
    const container = document.querySelector(`[data-testid="${id}"]`)
    if (!container) return false
    const canvas = container.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvas || canvas.width === 0 || canvas.height === 0) return false
    const ctx = canvas.getContext("2d")
    if (!ctx) return false
    let data: Uint8ClampedArray
    try {
      data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    } catch {
      return false
    }
    for (let i = 0; i < data.length; i += 16) {
      const a = data[i + 3]
      if (a <= 10) continue
      if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) continue
      return true
    }
    return false
  }, testId)
}

// Lightweight checksum of the canvas's raw pixel bytes. Used to detect
// motion across frames — particle animation (rAF-driven) makes the
// pixel data differ between samples, while static bands/ribbons paint
// the same bytes each frame. A non-cryptographic 32-bit hash is plenty
// for "is anything moving" detection.
async function canvasFingerprint(page: Page, testId: string): Promise<number> {
  return page.evaluate((id) => {
    const container = document.querySelector(`[data-testid="${id}"]`)
    if (!container) return 0
    const canvas = container.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvas) return 0
    const ctx = canvas.getContext("2d")
    if (!ctx) return 0
    let data: Uint8ClampedArray
    try {
      data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    } catch {
      return 0
    }
    let hash = 0
    // Stride-sample to keep this fast even on large canvases. The
    // sample is dense enough (~1 byte / 64) that a couple of moving
    // particles still perturb the hash.
    for (let i = 0; i < data.length; i += 64) {
      hash = ((hash * 31) | 0) ^ data[i]
    }
    return hash >>> 0
  }, testId)
}

test.describe("ProcessSankey - Static", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
  })

  test("renders bands + ribbons on the canvas, plus an SVG legend", async ({ page }) => {
    const tc = page.locator('[data-testid="static-basic"]')
    await expect(tc).toBeVisible()
    // Allow first paint
    await expect.poll(() => canvasHasPaint(page, "static-basic"), { timeout: 5_000 }).toBe(true)
    // Categorical legend swatches paint via the frame's overlay.
    const legendItems = tc.locator(".semiotic-legend-item, [class*='legend-item']")
    expect(await legendItems.count()).toBeGreaterThan(0)
  })

  test("particles render when showParticles is on", async ({ page }) => {
    const tc = page.locator('[data-testid="static-particles"]')
    await expect(tc).toBeVisible()
    // Particles ride the canvas + ParticlePool pipeline since the
    // unification with SankeyDiagram (they used to be `<circle>`
    // elements in an SVG overlay). The observable invariant is now
    // canvas-pixel motion: rAF-driven particle stepping makes the
    // pixel data change frame-to-frame, while a static
    // band-and-ribbon paint is byte-identical between samples.
    await expect.poll(() => canvasHasPaint(page, "static-particles"), { timeout: 5_000 }).toBe(true)
    // Let any intro transition settle so the only remaining motion
    // is the particle stream itself.
    await page.waitForTimeout(700)
    const first = await canvasFingerprint(page, "static-particles")
    await page.waitForTimeout(400)
    const second = await canvasFingerprint(page, "static-particles")
    expect(second).not.toBe(first)
  })
})

test.describe("ProcessSankey - Push API", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
  })

  test("seeding via ref grows the canvas", async ({ page }) => {
    const tc = page.locator('[data-testid="push-demo"]')
    await expect(tc).toBeVisible()
    // Empty initial state — canvas exists but no painted pixels.
    expect(await canvasHasPaint(page, "push-demo")).toBe(false)

    await tc.locator('[data-testid="push-seed"]').click()
    await expect.poll(() => canvasHasPaint(page, "push-demo"), { timeout: 5_000 }).toBe(true)
    await expect(tc.locator('[data-testid="push-count"]')).toHaveText(/pushed [1-9]\d*/)
  })

  test("clear() empties the chart back out", async ({ page }) => {
    const tc = page.locator('[data-testid="push-demo"]')
    await tc.locator('[data-testid="push-seed"]').click()
    await expect.poll(() => canvasHasPaint(page, "push-demo")).toBe(true)
    await tc.locator('[data-testid="push-clear"]').click()
    await expect.poll(() => canvasHasPaint(page, "push-demo")).toBe(false)
    await expect(tc.locator('[data-testid="push-count"]')).toHaveText("pushed 0")
  })
})

test.describe("ProcessSankey - Validation", () => {
  test("backward-in-time edges render an inline error block", async ({ page }) => {
    await page.goto(PAGE)
    const tc = page.locator('[data-testid="validation-failure"]')
    await expect(tc).toBeVisible()
    // The validation gate paints an inline SVG with the failure message
    // (this path is HOC-side; doesn't use the Frame).
    await expect(tc.locator("svg")).toContainText(/data invalid/i)
    await expect(tc.locator("svg")).toContainText(/backward-edge|ends before/i)
  })
})

test.describe("ProcessSankey - Rendering Integrity", () => {
  test("loads without JS errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))
    await page.goto(PAGE)
    await page.waitForTimeout(500)
    const real = errors.filter((e) => !e.includes("act(") && !e.includes("Warning:"))
    expect(real).toEqual([])
  })
})

// ── Visual regression baselines ────────────────────────────────────────
// Pixel-snapshots that fail on any unintentional rendering drift in
// the band layout, ribbon geometry, axis chrome, legend, or particle
// emission. Update with:
//   npx playwright test integration-tests/process-sankey.spec.ts --update-snapshots
//
// `maxDiffPixels` budget is generous (300) because the canvas pipeline's
// anti-aliasing varies slightly across runners, but tight enough to
// catch any structural change (extra band, dropped ribbon, shifted axis).
test.describe("ProcessSankey - Visual baselines", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
  })

  test("static — categorical bands + legend", async ({ page }) => {
    const tc = page.locator('[data-testid="static-basic"]')
    await expect.poll(() => canvasHasPaint(page, "static-basic"), { timeout: 5_000 }).toBe(true)
    // Particle layer is gated by `showParticles`; the static-basic
    // case doesn't emit any, so the snapshot is deterministic. Allow
    // one extra frame for layout settle.
    await page.waitForTimeout(120)
    await expect(tc).toHaveScreenshot("static-basic.png", { maxDiffPixels: 300 })
  })

  // No pixel snapshot for the particle stream — rAF-driven animation
  // makes per-frame state non-deterministic across runners (the
  // existing "particles render when showParticles is on" test verifies
  // emission count, which is the observable invariant).

  test("validation failure block", async ({ page }) => {
    const tc = page.locator('[data-testid="validation-failure"]')
    await expect(tc).toBeVisible()
    await expect(tc).toHaveScreenshot("validation-failure.png", { maxDiffPixels: 100 })
  })
})
