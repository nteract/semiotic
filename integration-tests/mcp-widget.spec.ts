import { test, expect } from "@playwright/test"
import path from "node:path"
import {
  initializeServer,
  sendRequest,
  spawnServer
} from "../src/__tests__/scenarios/mcpStdioHarness"
import { waitForProcessExit } from "../src/__tests__/scenarios/mcpHttpServerHarness"

test("shipped widget keeps SVG resources inert and chart styles and hover usable", async ({
  page
}) => {
  const fixtures = path.resolve("ai/__fixtures__")
  const proc = spawnServer([], {
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${JSON.stringify(path.join(fixtures, "mcp-widget-svg.cjs"))}`,
    SEMIOTIC_TEST_WIDGET_SVG: path.join(fixtures, "widget-hostile.svg")
  })
  let html: string
  let result: Record<string, unknown>
  try {
    await initializeServer(proc)
    html = (
      await sendRequest(proc, "resources/read", {
        uri: "ui://semiotic/chart-widget.html"
      })
    ).result.contents[0].text
    result = (
      await sendRequest(proc, "tools/call", {
        name: "renderInteractiveChart",
        arguments: {
          component: "BarChart",
          props: {
            data: [
              { region: "North", revenue: 10 },
              { region: "South", revenue: 18 }
            ],
            categoryAccessor: "region",
            valueAccessor: "revenue"
          }
        }
      })
    ).result
    expect(result.isError).not.toBe(true)
  } finally {
    proc.kill("SIGTERM")
    await waitForProcessExit(proc)
  }

  // Deliberately omit host CSP: the SVG boundary itself must block loads.
  const requests: string[] = []
  await page.route("**/*", (route) => {
    requests.push(route.request().url())
    return route.abort()
  })
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" })
  await page.setContent(html)
  await page.evaluate((params) => {
    window.postMessage(
      { jsonrpc: "2.0", method: "ui/notifications/tool-result", params },
      "*"
    )
  }, result)
  const chart = page.locator("#chart > svg")
  const bar = chart.locator("#revenue")
  await expect(bar).toBeVisible()
  await expect(page.locator("body")).toBeVisible()
  await expect(bar).toHaveAttribute("fill", "url(#paint)")
  for (const id of [
    "mask-attribute",
    "mask-webkit-attribute",
    "mask-inline",
    "mask-webkit-inline",
    "mask-sheet",
    "mask-webkit-sheet"
  ]) {
    await expect(chart.locator(`#${id}`)).toHaveCSS("mask-image", "none")
  }
  await expect(chart.locator("#mask-local")).toHaveAttribute(
    "mask",
    "url(#local-mask)"
  )
  await expect(chart.locator("#mask-local")).toHaveCSS(
    "mask-image",
    /url\(.*#local-mask.*\)/
  )
  expect(
    await chart.evaluate((svg) => {
      const xml = new XMLSerializer().serializeToString(svg)
      return (
        new DOMParser()
          .parseFromString(xml, "image/svg+xml")
          .querySelector("parsererror")?.textContent ?? null
      )
    })
  ).toBeNull()
  await expect(chart.locator("#theme-text")).toHaveCSS(
    "fill",
    "oklch(0.5 0.1 30)"
  )
  await expect(chart.locator("#theme-text")).toHaveCSS(
    "font-family",
    '"ACME; Sans } /* Text */", serif'
  )
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await expect(chart.locator("#theme-text")).toHaveCSS(
    "fill",
    "rgb(20, 30, 40)"
  )
  await expect(chart.locator(".annotation-deferred")).toHaveCSS("opacity", "0")

  for (const width of [900, 700]) {
    await page.setViewportSize({ width, height: 800 })
    await page.locator("#zoom").fill(width === 900 ? "100" : "150")
    await bar.hover()
    const mark = await bar.boundingBox()
    expect(mark).not.toBeNull()
    const pointer = {
      x: Math.floor(mark!.x + mark!.width / 2),
      y: Math.floor(mark!.y + mark!.height / 2)
    }
    await page.mouse.move(pointer.x, pointer.y)
    await expect(page.locator("#hover")).toHaveText("North revenue: 10")
    await expect(chart.locator(".annotation-deferred")).toHaveCSS(
      "opacity",
      "1"
    )
    const tooltip = await page.locator("#hover").boundingBox()
    expect(tooltip).not.toBeNull()
    expect(tooltip!.x).toBe(Math.min(pointer.x + 12, width - 300))
    expect(tooltip!.y).toBe(Math.min(pointer.y + 12, 730))
    await page.getByRole("button", { name: "Data", exact: true }).hover()
    await expect(page.locator("#hover")).toBeHidden()
  }
  await page.getByRole("button", { name: "Data", exact: true }).click()
  await expect(page.locator("#dataDrawer")).toContainText("North")
  expect(
    await page.evaluate(
      () => (window as Window & { __widgetExecuted?: boolean }).__widgetExecuted
    )
  ).toBeUndefined()
  expect(requests).toEqual([])
})
