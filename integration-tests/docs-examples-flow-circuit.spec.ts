import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFileSync } from "node:fs"

test.setTimeout(60_000)

async function evidencePacket(page: Page) {
  const downloaded = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Export evidence and tape", exact: true })
    .click()
  return JSON.parse(readFileSync((await (await downloaded).path())!, "utf8"))
}

test("keyboard activation updates the inspector and history in both studies", async ({
  page
}) => {
  await page.goto("/examples/flow-circuit")
  const surface = page.getByTestId("circuit-overview")
  const frame = surface.locator(".stream-physics-frame")
  const selected = page.getByRole("combobox", { name: "Module", exact: true })
  for (const [story, first, second] of [
    ["etl", "source", "router"],
    ["retry", "boundary", "inventory"]
  ]) {
    await page
      .getByRole("combobox", { name: "Study", exact: true })
      .selectOption(story)
    await frame.press("Home")
    await frame.press("Enter")
    await expect(selected).toHaveValue(first)
    await expect(surface.locator("[data-history-module]")).toHaveAttribute(
      "data-history-module",
      first
    )
    await frame.press("ArrowRight")
    await frame.press("Space")
    await expect(selected).toHaveValue(second)
    await expect(surface.locator("[data-history-module]")).toHaveAttribute(
      "data-history-module",
      second
    )
  }
})

test("ETL observation and modeled candidate retain counts through display changes and exports", async ({
  page
}, info) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/examples/flow-circuit")
  await expect(
    page.getByRole("heading", { name: "Spare capacity. One growing queue." })
  ).toBeVisible()
  await expect(page.getByTestId("observed-completions")).toHaveText("40,000")
  await expect(page.getByTestId("observed-queued")).toHaveText("1,200,000")
  const before = await evidencePacket(page)
  await page.getByText("Display controls", { exact: true }).click()
  await page.getByLabel("Direction particles").press("Home")
  await page.getByRole("button", { name: "Change particle pattern" }).click()
  await page.getByRole("button", { name: "Reduce motion", exact: true }).click()
  await page.getByLabel("Reverse display backbone").check()
  await page.setViewportSize({ width: 1100, height: 900 })
  const after = await evidencePacket(page)
  expect(after.edition).toEqual(before.edition)
  expect(after.reading).toEqual(before.reading)
  expect(after.matches).toEqual(before.matches)
  expect(after.backboneEdgeIds).not.toEqual(before.backboneEdgeIds)
  expect(
    new Set([...after.backboneEdgeIds, ...after.residualEdgeIds]).size
  ).toBe(17)
  await page
    .getByTestId("circuit-overview")
    .locator('[data-circuit-module="p2"] rect')
    .first()
    .scrollIntoViewIfNeeded()
  const moduleBox = await page
    .getByTestId("circuit-overview")
    .locator('[data-circuit-module="p2"] rect')
    .first()
    .boundingBox()
  await page.mouse.click(
    moduleBox!.x + moduleBox!.width / 2,
    moduleBox!.y + moduleBox!.height / 2
  )
  await expect(
    page.getByRole("combobox", { name: "Module", exact: true })
  ).toHaveValue("p2")
  await expect(
    page.getByTestId("circuit-overview").locator("[data-history-module]")
  ).toHaveAttribute("data-history-module", "p2")
  await page
    .getByRole("combobox", { name: "Module", exact: true })
    .selectOption("router")
  await page
    .getByRole("button", { name: "router to p1: in:p1", exact: true })
    .click()
  await expect(
    page.getByTestId("circuit-overview").locator('[data-circuit-edge="in:p1"]')
  ).toHaveAttribute("data-highlighted", "true")
  await page
    .getByRole("combobox", { name: "Reading", exact: true })
    .selectOption("modeled-scenario")
  await expect(page.getByTestId("modeled-completions")).toHaveText("60,000")
  await expect(page.getByTestId("modeled-queued")).toHaveText("0")
  await expect(page.getByTestId("observed-queued")).toHaveText("1,200,000")
  await page
    .getByRole("combobox", { name: "Hot-key partitions", exact: true })
    .selectOption("2")
  await expect(page.getByTestId("modeled-queued")).toHaveText("600,000")
  await page
    .getByRole("combobox", { name: "Hot-key partitions", exact: true })
    .selectOption("4")
  const candidate = await evidencePacket(page)
  expect(
    candidate.edition.model.guardrails.map(
      (row: { status: string }) => row.status
    )
  ).toEqual(["pass", "unverified"])
  expect(candidate.observedReference.edition).toEqual(before.edition)
  const downloaded = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Export static SVG", exact: true })
    .click()
  const svg = readFileSync((await (await downloaded).path())!, "utf8")
  expect(svg).toContain('data-circuit-edition="modeled"')
  expect(svg).toContain("7.5k / 10k rec/s")
  expect(svg.match(/data-circuit-module=/g)).toHaveLength(11)
  expect(svg.match(/data-circuit-edge=/g)).toHaveLength(17)
  await page.screenshot({
    path: info.outputPath("flow-circuit-etl.png"),
    fullPage: true,
    animations: "disabled"
  })
  expect(errors).toEqual([])
})

test("retry replay reads the supplied tape and keeps modeled outcomes separate", async ({
  page
}, info) => {
  await page.clock.install({ time: new Date("2026-09-12T12:00:00Z") })
  await page.goto("/examples/flow-circuit")
  await page
    .getByRole("combobox", { name: "Study", exact: true })
    .selectOption("retry")
  await expect(page.getByTestId("observed-roots")).toHaveText("10,000")
  await expect(page.getByTestId("observed-attempts")).toHaveText("30,000")
  await expect(page.getByTestId("observed-queued")).toHaveText("Unmeasured")
  await expect(page.getByTestId("observed-successes")).toHaveText("Unmeasured")
  await page
    .getByRole("combobox", { name: "Reading", exact: true })
    .selectOption("observed-replay")
  await expect(page.getByTestId("observed-attempts")).toHaveText("10,000")
  await page.clock.pauseAt(new Date("2026-09-12T12:01:00Z"))
  await page.getByRole("button", { name: "Play replay", exact: true }).click()
  await page.clock.runFor(1100)
  await page.getByRole("button", { name: "Pause replay", exact: true }).click()
  await expect(page.getByTestId("circuit-time")).toHaveText(
    "Latest observation: 10s"
  )
  await expect(page.getByTestId("observed-attempts")).toHaveText("20,000")
  await page.clock.runFor(3000)
  await expect(page.getByTestId("observed-attempts")).toHaveText("20,000")
  await page.getByLabel("Observation time").press("End")
  await expect(page.getByTestId("observed-attempts")).toHaveText("30,000")
  await page
    .getByRole("combobox", { name: "Reading", exact: true })
    .selectOption("modeled-scenario")
  await expect(page.getByTestId("modeled-attempts")).toHaveText("12,000")
  await expect(page.getByTestId("modeled-successes")).toHaveText("9,000")
  await expect(page.getByTestId("modeled-queued")).toHaveText("Unmeasured")
  await page
    .getByRole("combobox", { name: "Retry budget", exact: true })
    .selectOption("2")
  await expect(page.getByTestId("modeled-successes")).toHaveText("9,500")
  await expect(page.getByTestId("observed-successes")).toHaveText("Unmeasured")
  await page.screenshot({
    path: info.outputPath("flow-circuit-retry.png"),
    fullPage: true,
    animations: "disabled"
  })
})

test("module grammar preserves original multigraph ports and requires explicit join rules", async ({
  page
}, info) => {
  await page.goto("/examples/flow-circuit")
  await page.getByText("Explore the module grammar", { exact: true }).click()
  const grammar = page.locator(".flow-circuit__grammar")
  const surface = page.getByTestId("circuit-grammar")
  await expect(surface.locator('[data-module-kind="join-all"]')).toHaveCount(1)
  await expect(surface.locator('[data-module-kind="selector"]')).toHaveCount(1)
  await expect(surface.locator('[data-module-kind="dependency"]')).toHaveCount(
    1
  )
  await expect(surface.locator("[data-circuit-edge]")).toHaveCount(12)
  await surface.locator(".stream-physics-frame").press("Home")
  await surface.locator(".stream-physics-frame").press("Enter")
  await expect(
    grammar.getByRole("combobox", { name: "Module", exact: true })
  ).toHaveValue("source")
  await grammar
    .getByRole("button", { name: "source to a: sa, sa-parallel", exact: true })
    .click()
  await expect(surface.locator('[data-highlighted="true"]')).toHaveCount(2)
  await grammar.getByLabel("Declare join and selection rules").uncheck()
  await expect(surface.locator('[data-module-kind="join-all"]')).toHaveCount(0)
  await expect(surface.locator('[data-module-kind="selector"]')).toHaveCount(0)
  await expect(surface.locator('[data-circuit-module="join"]')).toHaveAttribute(
    "data-module-kind",
    "junction"
  )
  await grammar
    .getByRole("combobox", { name: "Module", exact: true })
    .selectOption("gate")
  await grammar
    .getByRole("button", { name: "gate to gate: gg", exact: true })
    .click()
  await expect(surface.locator('[data-circuit-edge="gg"]')).toHaveAttribute(
    "data-highlighted",
    "true"
  )
  await grammar.getByLabel("Declare join and selection rules").check()
  await surface.screenshot({
    path: info.outputPath("flow-circuit-grammar.png"),
    animations: "disabled"
  })
})

test("mobile exposes readings and inspection with reduced motion in both themes", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/examples/flow-circuit")
  await expect(page.getByTestId("circuit-overview")).toBeHidden()
  await expect(
    page.getByRole("table", {
      name: "Observed and modeled readings",
      exact: true
    })
  ).toBeVisible()
  await page
    .getByRole("combobox", { name: "Study", exact: true })
    .selectOption("retry")
  await page
    .getByRole("combobox", { name: "Reading", exact: true })
    .selectOption("observed-replay")
  await expect(
    page.getByRole("button", { name: "Play replay", exact: true })
  ).toBeDisabled()
  await page.getByLabel("Observation time").press("End")
  await expect(page.getByTestId("observed-attempts")).toHaveText("30,000")
  await page
    .getByRole("combobox", { name: "Module", exact: true })
    .selectOption("inventory")
  await expect(
    page.getByRole("table", {
      name: "Local directed adjacency matrix",
      exact: true
    })
  ).toBeVisible()
  for (let theme = 0; theme < 2; theme++) {
    expect(
      (await new AxeBuilder({ page }).include(".flow-circuit").analyze())
        .violations
    ).toEqual([])
    if (theme === 0)
      await page.getByRole("button", { name: "Switch to light mode" }).click()
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
})
