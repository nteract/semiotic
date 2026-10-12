import { expect, test } from "@playwright/test"

test("measures live HTML and SVG control targets in CSS pixels", async ({
  page
}) => {
  await page.goto("/control-audit-examples/")
  await page.getByRole("button", { name: "Audit controls" }).click()
  const audit = JSON.parse((await page.getByTestId("audit").textContent())!)
  expect(audit.ok).toBe(false)
  expect(audit.findings).toContainEqual(
    expect.objectContaining({
      controlId: "small",
      status: "fail",
      message: expect.stringContaining("10px × 10px")
    })
  )
  expect(audit.findings).toContainEqual(
    expect.objectContaining({
      controlId: "large",
      status: "pass",
      message: expect.stringContaining("40px × 40px")
    })
  )
  expect(
    audit.findings.filter(
      (entry: { controlId: string }) => entry.controlId === "cycle"
    )
  ).toHaveLength(3)
  expect(audit.findings).toContainEqual(
    expect.objectContaining({ controlId: "amount" })
  )
})

test("a full-cycle brush keeps its selected ring through keyboard and pointer moves", async ({
  page
}) => {
  await page.goto("/control-audit-examples/")
  const range = page.getByRole("slider", { name: "Range (move both ends)" })
  await range.focus()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("End")
  await expect(page.getByTestId("range")).toHaveText("0,24")
  const bounds = (await range.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.2)
  await page.mouse.down()
  await page.mouse.move(
    bounds.x + bounds.width * 0.8,
    bounds.y + bounds.height * 0.8
  )
  await page.mouse.up()
  await expect(page.getByTestId("range")).toHaveText("0,24")
  await expect(page.getByRole("slider", { name: "Range end" })).toHaveAttribute(
    "aria-valuemax",
    "24"
  )
})
