import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test("category task retains exact values across orientations and keeps verification optional", async ({
  page
}) => {
  const requested: string[] = []
  page.on("request", (request) => requested.push(request.url()))
  await page.goto("/tasks/compare-category-totals")
  const example = page.getByRole("region", {
    name: "Category comparison example"
  })
  const canvas = example.locator("canvas[aria-label]")
  await expect(canvas).toHaveAttribute("aria-label", /North|3/)
  const initial = await canvas.evaluate((node: HTMLCanvasElement) =>
    node.toDataURL()
  )
  const summary = example.getByRole("button", {
    name: "View data summary (3 elements)"
  })
  await summary.focus()
  await summary.press("Enter")
  const table = example.getByRole("table", { includeHidden: true })
  await expect(table.locator("tbody tr")).toContainText([
    "North",
    "South",
    "West"
  ])
  await expect(table).toContainText("12")
  await expect(table).toContainText("30")
  await expect(table).toContainText("18")
  await example.getByLabel("Bar direction").selectOption("horizontal")
  await expect
    .poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL()))
    .not.toBe(initial)
  await expect(table).toContainText("South")
  await expect(table).toContainText("30")
  expect(
    requested.filter((url) =>
      /\/src\/components\/(?:ai|server|artifact)\//.test(url)
    )
  ).toEqual([])
})

test("source correction refuses stale claims, preserves revised claims and explains handoff loss", async ({
  page
}) => {
  await page.goto("/tasks/correct-published-chart")
  const example = page.getByRole("region", {
    name: "Source correction demonstration"
  })
  const status = page.getByTestId("source-correction-status")
  await example.getByRole("button", { name: "Try changing data only" }).click()
  await expect(status).toContainText("Correction refused")
  await expect(
    example.getByRole("list", { name: "Claim history" })
  ).toContainText("60")
  await example
    .getByRole("button", { name: "Correct data and both claims" })
    .click()
  await expect(status).toContainText("total 78")
  await expect(status).toContainText("West leads with 36")
  const claims = example.getByRole("list", { name: "Claim history" })
  await expect(claims).toContainText("superseded")
  await expect(claims).toContainText("78")
  await expect(example).toContainText("publishable is false")
  await example
    .getByText("Optional handoff: see what another reader receives", {
      exact: true
    })
    .click()
  await example.getByLabel("Include correction sidecar").uncheck()
  await expect(page.getByTestId("source-handoff-status")).toContainText(
    /unavailable|missing|without/i
  )
  await example.getByLabel("Include correction sidecar").check()
  await expect(page.getByTestId("source-handoff-status")).toContainText(
    /preserv|verified|match|available/i
  )
  const download = page.waitForEvent("download")
  await example
    .getByRole("button", { name: "Download chart configuration" })
    .click()
  expect((await download).suggestedFilename()).toBe(
    "regional-totals.config.json"
  )
})

test("task pages and machine views agree on source identity and recovery guidance", async ({
  page,
  request
}) => {
  await page.goto("/tasks")
  const index = await (await request.get("/tasks/index.json")).json()
  expect(index.tasks).toHaveLength(3)
  for (const task of index.tasks) {
    const packet = await (await request.get(task.json)).json()
    const markdown = await (await request.get(task.markdown)).text()
    expect(packet.id).toBe(task.id)
    expect(markdown).toContain(packet.identity.sourceRevision)
    expect(markdown).toContain(packet.recovery[0].action)
    await page
      .getByRole("link", { name: task.title, exact: true })
      .last()
      .click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(task.title)
    await expect(page.getByTestId("task-source-version")).toContainText(
      packet.identity.packageVersion
    )
    await page.goto("/tasks")
  }
})

test("task workflows remain readable and pass automated accessibility checks on a narrow viewport", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const id of [
    "compare-category-totals",
    "update-live-chart",
    "correct-published-chart"
  ]) {
    await page.goto(`/tasks/${id}`)
    await expect(page.locator(".task-page canvas[aria-label]")).toHaveAttribute(
      "aria-label",
      /./
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(390)
    expect(
      (await new AxeBuilder({ page }).include(".task-page").analyze())
        .violations
    ).toEqual([])
  }
})
