import { expect, type Page } from "@playwright/test"

interface ThemeRoundTripOptions<T> {
  page: Page
  readSnapshot: () => Promise<T>
  provider: string
  lightTheme?: string
  darkTheme?: string
  assertLight?: (snapshot: T) => void | Promise<void>
  assertDark?: (snapshot: T) => void | Promise<void>
}

async function waitForThemePaint(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
}

/** Assert a docs-controlled light → dark → light transition restores exactly. */
export async function expectThemeRoundTrip<T>({
  page,
  readSnapshot,
  provider,
  lightTheme = "carbon",
  darkTheme = "carbon-dark",
  assertLight,
  assertDark,
}: ThemeRoundTripOptions<T>) {
  const light = await readSnapshot()
  await assertLight?.(light)

  await page.getByRole("button", { name: "Switch to dark mode" }).click()
  await expect.poll(() =>
    page.locator(provider).evaluate((node) =>
      node.closest("[data-semiotic-theme]")?.getAttribute("data-semiotic-theme"),
    ),
  ).toBe(darkTheme)
  await waitForThemePaint(page)
  const dark = await readSnapshot()
  await assertDark?.(dark)

  await page.getByRole("button", { name: "Switch to light mode" }).click()
  await expect.poll(() =>
    page.locator(provider).evaluate((node) =>
      node.closest("[data-semiotic-theme]")?.getAttribute("data-semiotic-theme"),
    ),
  ).toBe(lightTheme)
  await waitForThemePaint(page)
  await expect.poll(readSnapshot).toEqual(light)
  return { light, dark }
}
