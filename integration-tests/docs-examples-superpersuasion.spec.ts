import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFile } from "node:fs/promises"

test("the decision map keeps the case, constraint and acceptable response together", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/examples/superpersuasion")
  const flow = page.getByRole("region", {
    name: "Where should the advice lead?"
  })
  const canvas = flow.locator("canvas").first()
  await expect(canvas).toHaveAttribute("width", /[1-9]/)
  const before = await canvas.evaluate((node: HTMLCanvasElement) =>
    node.toDataURL()
  )
  await flow.getByRole("button", { name: "Wrong fit 6" }).click()
  await expect(flow.getByRole("status")).toContainText("Showing 6 of 24")
  await flow
    .getByLabel("Look inside a case")
    .selectOption("negative-recharts-color")
  await expect(flow.locator(".sp-case-content")).toContainText(
    "Keep current tool"
  )
  await expect(flow.locator(".sp-case-content")).toContainText(
    "No dependency or library changes."
  )
  await expect
    .poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL()))
    .not.toBe(before)
  await flow
    .getByText("Read the exact routes for these 6 cases", { exact: true })
    .click()
  const table = flow.getByRole("table", { name: /One row per authored case/ })
  await expect(table.locator("tbody tr")).toHaveCount(6)
  await expect(table).not.toContainText("Use Semiotic")
  await flow.getByRole("button", { name: "All situations 24" }).click()
  await expect(table.locator("tbody tr")).toHaveCount(24)
  await flow
    .getByLabel("Look inside a case")
    .selectOption("requested-capability-comparison")
  await expect(flow.locator(".sp-case-content")).toContainText(
    "Judgment required"
  )
  await expect(flow.locator(".sp-case-content")).toContainText(
    "Try an isolated pilot; Keep current tool"
  )
  expect(errors).toEqual([])
})

test("field guides deliver the selected task and the correction carries its real history", async ({
  page,
  request
}) => {
  await page.goto("/examples/superpersuasion")
  await page
    .getByRole("button", { name: "Keep a chart current", exact: true })
    .click()
  const guide = page.getByTestId("sp-selected-guide")
  await expect(guide).toContainText("quietly add a second one")
  const file = guide.getByRole("link", { name: /Take the same guide/ })
  await expect(file).toHaveAttribute("href", "/tasks/update-live-chart.json")
  const packet = await (
    await request.get((await file.getAttribute("href"))!)
  ).json()
  expect(packet.id).toBe("update-live-chart")
  expect(packet.api.usageMode).toBe("push")
  expect(packet.api.dataRequired).toBe(false)
  expect(
    packet.examples.some((example: { source: string }) =>
      example.source.includes("pushMany")
    )
  ).toBe(true)

  const desk = page.getByRole("region", {
    name: "Can the recommendation change its mind?"
  })
  const conclusion = page.getByTestId("sp-correction-conclusion")
  await expect(conclusion).toContainText("South leads with 30")
  await desk.getByText("Follow the change", { exact: true }).click()
  await desk
    .getByRole("button", { name: "Try changing the figures alone" })
    .click()
  await expect(page.getByTestId("sp-correction-status")).toContainText(
    "requires revisiting"
  )
  await expect(conclusion).toContainText("60")
  const canvas = page
    .getByTestId("sp-correction-chart")
    .locator("canvas")
    .first()
  const before = await canvas.evaluate((node: HTMLCanvasElement) =>
    node.toDataURL()
  )
  await desk
    .getByRole("button", { name: "Correct the source", exact: true })
    .click()
  await expect(conclusion).toContainText("West leads with 36")
  await expect(conclusion).toContainText("78")
  await expect
    .poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL()))
    .not.toBe(before)
  const history = desk.getByRole("list", {
    name: "Earlier and current conclusions"
  })
  await expect(history).toContainText("The total is 60")
  await expect(history).toContainText("The total is 78")

  await desk.getByText("What travels with the chart?", { exact: true }).click()
  const download = page.waitForEvent("download")
  await desk.getByRole("button", { name: "Save this reading" }).click()
  const saved = JSON.parse(
    await readFile((await (await download).path())!, "utf8")
  )
  expect(saved.chart.props.data).toEqual([
    { region: "North", total: 12 },
    { region: "South", total: 30 },
    { region: "West", total: 36 }
  ])
  expect(saved.context.contract.claims).toHaveLength(4)
  expect(saved.context.contract.accountability.reviews).toEqual([
    { id: "editorial-review", status: "pending" }
  ])
  await desk.getByLabel("Keep the source and correction context").uncheck()
  await expect(page.getByTestId("sp-correction-handoff")).toContainText(
    "loses the source identity"
  )
  const bareDownload = page.waitForEvent("download")
  await desk.getByRole("button", { name: "Save this reading" }).click()
  const bare = JSON.parse(
    await readFile((await (await bareDownload).path())!, "utf8")
  )
  expect(bare.context).toBeUndefined()
  expect(bare.chart).toEqual(saved.chart)
  await desk.getByRole("button", { name: "Start again" }).click()
  await expect(conclusion).toContainText("South leads with 30")
})

test("the article remains readable on a phone with keyboard controls and reduced motion", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/examples/superpersuasion")
  await expect(
    page.getByRole("heading", { level: 1, name: /The art of being/ })
  ).toBeVisible()
  const story = page.locator(".sp-story")
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    )
  ).toBe(true)
  const scroll = page.getByRole("region", {
    name: /Decision flow diagram; scroll/
  })
  await scroll.focus()
  await scroll.press("ArrowRight")
  await expect
    .poll(() => scroll.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(0)
  await page
    .getByRole("button", { name: "Correct a source", exact: true })
    .focus()
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("sp-selected-guide")).toContainText(
    "Which statements depended on the old figure?"
  )
  const audit = await new AxeBuilder({ page }).include(".sp-story").analyze()
  expect(audit.violations).toEqual([])
  await story.screenshot({
    path: test.info().outputPath("superpersuasion-mobile.png")
  })
})
