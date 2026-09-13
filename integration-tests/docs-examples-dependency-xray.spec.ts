import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test("supplier topology, capacity, branch detail and exports remain consistent", async ({
  page
}, testInfo) => {
  await page.goto("/examples/dependency-xray")
  await expect(
    page.getByRole("heading", {
      name: "Three suppliers. Two share one dependency."
    })
  ).toBeVisible()
  await expect(page.getByTestId("required-targets")).toHaveText(
    "X is required for: A, B."
  )
  await expect(page.getByRole("status")).toHaveText(
    "No admitted path to A avoids X."
  )
  await page.screenshot({
    path: testInfo.outputPath("dependency-xray-supplier.png"),
    fullPage: true,
    animations: "disabled"
  })
  await page.getByLabel("Add Y → A bypass (0 units/week)").check()
  await expect(page.getByTestId("required-targets")).toHaveText(
    "X is required for: B."
  )
  await expect(page.getByRole("status")).toHaveText("Bypass: world → Y → A.")
  await expect(
    page.getByText("Y has zero usable capacity, so the shortfall stays 70%.", {
      exact: false
    })
  ).toBeVisible()
  await page.getByLabel("Reverse backbone ranking").check()
  await expect(page.getByTestId("required-targets")).toHaveText(
    "X is required for: B."
  )
  await page
    .getByRole("button", { name: "Collapse branch", exact: true })
    .click()
  await expect(
    page.getByRole("table", { name: "Local directed adjacency matrix" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Open branch", exact: true }).click()
  await page.getByRole("button", { name: "Show bypass on chart" }).click()
  const evidenceDownload = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Export evidence", exact: true })
    .click()
  const evidence = await evidenceDownload
  expect(evidence.suggestedFilename()).toBe("supplier-evidence.json")
  const evidencePath = await evidence.path()
  const { readFileSync } = await import("node:fs")
  const packet = JSON.parse(readFileSync(evidencePath!, "utf8"))
  expect(packet.synthetic).toBe(true)
  expect(packet.measures.shortfallBps).toBe(7000)
  expect(packet.bypass.value.path.edgeIds).toEqual(["wY", "YA"])
  expect(
    new Set([...packet.displayBackbone, ...packet.residualEdges]).size
  ).toBe(packet.originalEdges.length)
  const svgDownload = page.waitForEvent("download")
  await page
    .getByRole("button", { name: "Export static SVG", exact: true })
    .click()
  const svg = readFileSync((await (await svgDownload).path())!, "utf8")
  expect(svg).toContain("X lies on all admitted paths to B")
  expect(svg).toContain("dominator-bracket")
  await page.getByLabel("Add Y → A bypass (0 units/week)").uncheck()
  await expect(page.getByTestId("required-targets")).toHaveText(
    "X is required for: A, B."
  )
})

test("mobile exposes the branch inspector and accessible adjacency", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/examples/dependency-xray")
  await expect(
    page.getByRole("region", { name: "Branch and bypass inspector" })
  ).toBeVisible()
  await expect(page.getByTestId("dependency-overview")).toBeHidden()
  await page.getByLabel("Target", { exact: true }).selectOption("product")
  await expect(page.getByRole("status")).toHaveText(
    "Bypass: world → C → product."
  )
  const audit = await new AxeBuilder({ page })
    .include(".dependency-xray")
    .analyze()
  expect(audit.violations).toEqual([])
  await page.getByRole("button", { name: "Switch to light mode" }).click()
  const light = await new AxeBuilder({ page })
    .include(".dependency-xray")
    .analyze()
  expect(light.violations).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
})
