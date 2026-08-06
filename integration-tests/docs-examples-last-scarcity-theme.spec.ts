import { expect, test, type Page } from "@playwright/test"
import { collectBrowserErrors } from "./helpers/browser"
import { expectThemeRoundTrip } from "./helpers/themeRoundTrip"

const ROUTE = "/examples/the-last-scarcity#flood"

async function readThemePaints(page: Page) {
  return page.locator(".last-scarcity").evaluate((root) => {
    const sample = (selector: string) => {
      const node = document.querySelector(selector)
      if (!node) throw new Error(`Missing Last Scarcity theme sample: ${selector}`)
      const style = getComputedStyle(node)
      return { fill: style.fill, stroke: style.stroke }
    }
    const style = getComputedStyle(root)
    const explicitLightSurfaces = [...root.querySelectorAll("*")].filter((node) => {
      const background = getComputedStyle(node).backgroundColor
      return ["rgb(255, 255, 255)", "rgb(255, 254, 250)", "rgb(247, 245, 236)"].includes(
        background,
      )
    }).length

    return {
      providerTheme: root.closest("[data-semiotic-theme]")?.getAttribute("data-semiotic-theme"),
      background: style.backgroundColor,
      color: style.color,
      colorScheme: style.colorScheme,
      paper: style.getPropertyValue("--ls-paper").trim(),
      chartPaper: style.getPropertyValue("--ls-chart-paper").trim(),
      explicitLightSurfaces,
      wheel: sample("#empty-office svg circle"),
      courtLabel: sample("#court svg text"),
      palaceLabel: sample(".ls-palace svg text"),
      gauntletBackdrop: sample("#agon .stream-frame-background__backdrop"),
    }
  })
}

test("Last Scarcity follows the docs theme and restores its paper-light styling", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript(() => localStorage.setItem("semiotic-theme", "light"))
  const errors = collectBrowserErrors(page)

  await page.goto(ROUTE, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { level: 1, name: "The Last Scarcity" })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.locator("#agon .stream-frame-background__backdrop")).toHaveCount(1)

  await expectThemeRoundTrip({
    page,
    provider: ".last-scarcity",
    readSnapshot: () => readThemePaints(page),
    assertLight: (light) => {
      expect(light).toMatchObject({
        providerTheme: "carbon",
        background: "rgb(255, 254, 250)",
        color: "rgb(32, 59, 50)",
        colorScheme: "light",
        paper: "#fffefa",
        chartPaper: "",
        wheel: { fill: "rgb(255, 254, 250)" },
        courtLabel: { fill: "rgb(49, 76, 66)" },
        palaceLabel: { fill: "rgb(36, 63, 54)" },
        gauntletBackdrop: { fill: "rgb(255, 255, 255)" },
      })
      expect(light.explicitLightSurfaces).toBeGreaterThan(0)
    },
    assertDark: (dark) => {
      expect(dark).toMatchObject({
        providerTheme: "carbon-dark",
        background: "rgb(22, 22, 22)",
        color: "rgb(244, 244, 244)",
        colorScheme: "dark",
        paper: "#161616",
        chartPaper: "#161616",
        explicitLightSurfaces: 0,
        wheel: { fill: "rgb(22, 22, 22)" },
        courtLabel: { fill: "rgb(244, 244, 244)" },
        palaceLabel: { fill: "rgb(244, 244, 244)" },
        gauntletBackdrop: { fill: "rgb(22, 22, 22)" },
      })
    },
  })
  expect(errors).toEqual([])
})
