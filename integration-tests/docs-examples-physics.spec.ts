import { expect, test } from "@playwright/test"

for (const theme of ["light", "dark"] as const) {
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
