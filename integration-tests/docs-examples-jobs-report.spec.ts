import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFile } from "node:fs/promises"
import bootstrap from "../docs/src/pages/examples/jobs-report/bootstrap.json"

test("publication dates change the reading, with no future estimate or invented first value", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/examples/jobs-report")
  const summary = page.getByTestId("jobs-selected-summary")
  await expect(summary).toContainText("Mar 6, 2026 vintage −20,000")
  const canvas = page.getByTestId("jobs-waterfall").locator("canvas").first()
  await expect
    .poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.width))
    .toBeGreaterThan(0)
  const before = await canvas.evaluate((node: HTMLCanvasElement) =>
    node.toDataURL()
  )
  await page
    .getByLabel("Estimate available in this release")
    .selectOption("2025-07-03")
  await expect(summary).toContainText("Jul 3, 2025 vintage +147,000")
  await expect(summary).toContainText("third Unavailable")
  await expect
    .poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL()))
    .not.toBe(before)
  await page.getByLabel("Employment reference month").selectOption("2025-12")
  await expect(summary).toContainText("vintage Unavailable")
  await expect(
    page.getByRole("button", { name: "Save briefing packet" })
  ).toHaveCount(0)
  await page
    .getByLabel("Estimate available in this release")
    .selectOption("2026-03-06")
  await expect(summary).toContainText("third −17,000")
  await page.getByLabel("Employment reference month").selectOption("2025-10")
  await expect(summary).toContainText("first Unavailable; third −173,000")
  await page.reload()
  await expect(summary).toContainText("October 2025")
  await expect(page.getByTestId("jobs-estimate-cards")).toContainText(
    "−140,000"
  )
  expect(errors).toEqual([])
})

test("downloads and reopening preserve the selected dates, values and pending review", async ({
  page,
  request
}) => {
  await page.goto("/examples/jobs-report?month=2025-07&vintage=2026-03-06")
  await expect(page.getByTestId("jobs-selected-summary")).toContainText(
    "July 2025"
  )
  await page.getByLabel("Briefing emphasis").selectOption("size")
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Save briefing packet" }).click()
  const packet = JSON.parse(
    await readFile((await (await download).path())!, "utf8")
  )
  expect(
    packet.values.find((row: { key: string }) => row.key === "dated").value
  ).toBe(64000)
  expect(packet.publication).toMatchObject({
    status: "conditional",
    publishable: false
  })
  expect(packet.reading).toBe("size")
  await page.getByLabel("Employment reference month").selectOption("2025-06")
  const file = page.getByLabel("Reopen a saved briefing packet")
  await file.setInputFiles({
    name: "briefing.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(packet))
  })
  await expect(page.getByTestId("jobs-export-status")).toContainText(
    "restored and checked"
  )
  await expect(page.getByTestId("jobs-selected-summary")).toContainText(
    "July 2025"
  )
  await expect(page.getByTestId("jobs-export-status")).toHaveAttribute(
    "data-restored",
    "true"
  )
  await expect(page.getByLabel("Briefing emphasis")).toHaveValue("size")
  packet.values[0].value = 0
  await file.setInputFiles({
    name: "changed.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(packet))
  })
  await expect(page.getByTestId("jobs-export-status")).toContainText(
    "Packet refused"
  )
  await expect(page.getByTestId("jobs-export-status")).toHaveAttribute(
    "data-restored",
    "false"
  )
  for (const name of [
    "Download SVG",
    "Download PNG",
    "Printable HTML",
    "Source CSV"
  ]) {
    const saving = page.waitForEvent("download")
    await page.getByRole("button", { name, exact: true }).click()
    const bytes = await readFile((await (await saving).path())!)
    if (name === "Download PNG")
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
    else if (name === "Source CSV")
      expect(bytes.toString()).toContain('"2025-07","2026-03-06"')
    else expect(bytes.toString()).toContain("+64,000")
  }
  const email = await (
    await request.get(`${bootstrap.base}/edition-b/email.html`)
  ).text()
  expect(email).toContain("−20,000")
  expect(email).toContain("Jul 3, 2025")
  // Vite adds development-client scripts to served HTML. Check the shipped
  // file itself for the no-script contract, then the served table for content.
  const shippedEmail = await readFile(
    `docs/public${bootstrap.base}/edition-b/email.html`,
    "utf8"
  )
  expect(shippedEmail).not.toContain("<script")
})

for (const width of [320, 390, 768, 1280]) {
  test(`the reading and controls remain usable at ${width}px`, async ({
    page
  }, testInfo) => {
    await page.setViewportSize({ width, height: 950 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/examples/jobs-report")
    await expect(page.getByTestId("jobs-selected-summary")).toContainText(
      "−20,000"
    )
    const selector = page.getByLabel("Employment reference month")
    await selector.focus()
    await expect(selector).toBeFocused()
    await page.keyboard.type("July 2025")
    await page.keyboard.press("Tab")
    await expect(page.getByTestId("jobs-selected-summary")).toContainText(
      "July 2025"
    )
    const bounds = await selector.boundingBox()
    expect(bounds!.height).toBeGreaterThanOrEqual(44)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(width + 1)
    await page
      .getByText(
        "Read all 24 months, with exact values and publication dates",
        { exact: true }
      )
      .click()
    await expect(page.locator(".jobs-all-values tbody tr")).toHaveCount(24)
    await expect(
      page
        .locator(".jobs-all-values tbody tr")
        .filter({ hasText: "October 2025" })
    ).toContainText("Unavailable")
    if (width === 390) {
      const audit = await new AxeBuilder({ page })
        .include(".jobs-story")
        .analyze()
      expect(
        audit.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map(({ target }) => target)
        }))
      ).toEqual([])
      await page.emulateMedia({ forcedColors: "active" })
      await expect(selector).toHaveValue("2025-07")
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBeLessThanOrEqual(width + 1)
      await page.emulateMedia({ forcedColors: "none" })
      await page
        .locator(".jobs-opening")
        .screenshot({ path: testInfo.outputPath("jobs-opening-390.png") })
      await page
        .locator(".jobs-desk")
        .screenshot({ path: testInfo.outputPath("jobs-desk-390.png") })
    }
  })
}
