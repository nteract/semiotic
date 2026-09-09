import { expect, test, type Locator } from "@playwright/test"

async function expectPileProjection(editor: Locator, labels: string[]) {
  const projection = editor.getByTestId("physics-pile-projection-overlay")
  await expect(projection.locator("g text")).toHaveText(labels)
  await expect(projection.locator("g text:visible")).toHaveCount(labels.length)
}

for (const theme of ["light", "dark"] as const) {
  test(`Watermark closure preserves historical admissions (${theme})`, async ({
    page
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.addInitScript(
      (value) => localStorage.setItem("semiotic-theme", value),
      theme
    )
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto("/examples/watermarks")
    const reading = page.getByRole("table", {
      name: "Settled event-time windows"
    })
    await expect(reading.getByRole("row").nth(1).getByRole("cell")).toHaveText([
      "0-12s",
      "2",
      "1",
      "1",
      "2"
    ])
    await expect(
      page.getByTestId("watermark-admission-decision")
    ).toContainText("The window was already closed, so this event was late.")
    const frontier = page.getByRole("slider", { name: /Arrival frontier/i })
    await frontier.fill("60")
    await expect(reading.getByRole("row").nth(1).getByRole("cell")).toHaveText([
      "0-12s",
      "1",
      "1",
      "0",
      "1"
    ])
    await expect(
      page.getByTestId("watermark-admission-decision")
    ).toContainText("The window was still open, so this event was accepted.")
    await frontier.fill("70")
    await expect(reading.getByRole("row").nth(1).getByRole("cell")).toHaveText([
      "0-12s",
      "2",
      "1",
      "1",
      "2"
    ])
    await page.screenshot({
      path: testInfo.outputPath("watermarks-admission.png"),
      fullPage: true
    })
    expect(errors).toEqual([])
  })

  test(`Reduced-motion journey retains crossings through selection and replay (${theme})`, async ({
    page
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.addInitScript(
      (value) => localStorage.setItem("semiotic-theme", value),
      theme
    )
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto("/examples/stakeholder-journey")
    const activation = page
      .locator(".stakeholder-journey__ledger-row")
      .filter({ has: page.getByText("Activation", { exact: true }) })
      .locator("b")
      .first()
    await expect(activation).toHaveText(/^[1-9]\d? \/ 36$/)
    const first = Number((await activation.textContent())!.split(" / ")[0])
    await page.getByRole("button", { name: /^Ecosystem Leadership:/ }).click()
    await expect
      .poll(async () =>
        Number((await activation.textContent())!.split(" / ")[0])
      )
      .toBeGreaterThanOrEqual(first)
    await page
      .getByRole("button", { name: "Replay cohort", exact: true })
      .click()
    await expect(activation).toHaveText(/^[1-9]\d? \/ 36$/)
    expect(errors).toEqual([])
  })

  test(`Live pile edits keep quantities and category labels together (${theme})`, async ({
    page
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.addInitScript(
      (value) => localStorage.setItem("semiotic-theme", value),
      theme
    )
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    await page.goto("/charts/unit-pile-chart#live-updates")
    const editor = page.getByRole("region", { name: "Live pile editor" })
    const status = editor.getByRole("status")
    await expect(status).toHaveText("2 source records · Total 98")
    await expectPileProjection(editor, ["98", "A"])
    await editor
      .getByRole("button", { name: "Add 49 to A", exact: true })
      .click()
    await expect(status).toHaveText("3 source records · Total 147")
    await expectPileProjection(editor, ["147", "A"])
    await editor
      .getByRole("button", { name: "Add category B", exact: true })
      .click()
    await expect(status).toHaveText("4 source records · Total 247")
    await expectPileProjection(editor, ["147", "A", "100", "B"])
    await editor.getByLabel("Value per full circle").selectOption("50")
    await expect(status).toHaveText("4 source records · Total 247")
    await expectPileProjection(editor, ["147", "A", "100", "B"])
    await expect(editor.getByText(/Full circle = 50/)).toBeVisible()
    await editor.getByLabel("Pause motion").check()
    await editor
      .getByRole("button", { name: "Remove last record", exact: true })
      .click()
    await expect(status).toHaveText("3 source records · Total 147")
    await expectPileProjection(editor, ["147", "A"])
    await editor
      .getByRole("button", { name: "Double first record", exact: true })
      .click()
    await expect(status).toHaveText("3 source records · Total 196")
    await expectPileProjection(editor, ["196", "A"])
    await editor.getByLabel("Pause motion").uncheck()
    await editor.screenshot({ path: testInfo.outputPath("live-pile.png") })
    await editor.getByRole("button", { name: "Clear", exact: true }).click()
    await expect(status).toHaveText("0 source records · Total 0")
    await expectPileProjection(editor, [])
    await editor
      .getByRole("button", { name: "Reset 49 + 49", exact: true })
      .click()
    await expect(status).toHaveText("2 source records · Total 98")
    await expectPileProjection(editor, ["98", "A"])
    await editor.getByLabel("Data source").selectOption("empty")
    await editor
      .getByRole("button", { name: "Add 49 to A", exact: true })
      .click()
    await expect(status).toHaveText("0 source records · Total 0")
    await expect(editor.locator("canvas")).toHaveCount(0)
    await expectPileProjection(editor, [])
    await editor.getByLabel("Data source").selectOption("push")
    await expect(status).toHaveText("0 source records · Total 0")
    await expectPileProjection(editor, [])
    await editor
      .getByRole("button", { name: "Add 49 to A", exact: true })
      .click()
    await expect(status).toHaveText("1 source record · Total 49")
    await expectPileProjection(editor, ["49", "A"])
    expect(pageErrors).toEqual([])
  })

  test(`Equal-value swarm discloses crowding and responds to radius changes (${theme})`, async ({
    page
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.addInitScript(
      (value) => localStorage.setItem("semiotic-theme", value),
      theme
    )
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    await page.goto("/charts/collision-swarm-chart#example")
    await page
      .getByRole("button", { name: "Test equal values", exact: true })
      .click()
    await expect(
      page.getByTestId("collision-swarm-overlap-warning")
    ).toBeVisible()
    await expect(
      page.getByText("n=50 · overlaps", { exact: true })
    ).toBeVisible()
    const canvas = page.locator(".stream-physics-frame canvas").first()
    await canvas.evaluate((node) =>
      node.setAttribute("data-update-probe", "retained")
    )
    await page.screenshot({ path: testInfo.outputPath("swarm-crowded.png") })
    await page
      .getByRole("combobox", { name: "Point radius", exact: true })
      .selectOption("2")
    await expect(
      page.getByTestId("collision-swarm-overlap-warning")
    ).toHaveCount(0)
    await expect(page.getByText("n=50", { exact: true })).toBeVisible()
    await expect(canvas).toHaveAttribute("data-update-probe", "retained")
    await canvas.scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath("swarm-separated.png") })
    expect(pageErrors).toEqual([])
  })

  test(`Release Machine previews and clears a blocker resolution (${theme})`, async ({
    page
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.addInitScript(
      (value) => localStorage.setItem("semiotic-theme", value),
      theme
    )
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    await page.goto("/examples/chain-reaction")

    await page
      .getByRole("button", { name: "Preview resolution", exact: true })
      .click()
    await expect(
      page.getByRole("button", { name: "Clear preview", exact: true })
    ).toBeVisible()
    await expect(page.getByText(/^Preview: resolving /)).toBeVisible()
    await expect(page.getByText(/^Mechanical preview: /)).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath("preview.png") })

    await page
      .getByRole("button", { name: "Clear preview", exact: true })
      .click()
    await expect(
      page.getByRole("button", { name: "Preview resolution", exact: true })
    ).toBeEnabled()
    await expect(
      page.getByText("Recorded replay mode", { exact: true })
    ).toBeVisible()
    await expect(page.getByText(/^Preview: resolving /)).toHaveCount(0)
    expect(pageErrors).toEqual([])
  })
}
