import { expect, type Page } from "@playwright/test"

/** A visible card may still belong to the initial 600px fallback layout. */
export async function waitForPipelineExplorerLayout(page: Page) {
  await expect
    .poll(() =>
      page.locator(".pipeline-chart").evaluate((host) => {
        const frame = host.querySelector(".stream-network-frame")
        const width = Math.floor(host.getBoundingClientRect().width)
        return width > 0 && frame?.getBoundingClientRect().width === width
      })
    )
    .toBe(true)
}
