import { chromium, expect } from "@playwright/test"
import { writeFile } from "node:fs/promises"
import { cpus, platform, release, arch, tmpdir } from "node:os"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

// A desktop proxy baseline, not the real-Android acceptance test in G07.
// Run against `vite preview` after the complete production build.
// Vite preview needs the trailing slash to serve the prerendered directory index.
const url = process.argv[2] || "http://127.0.0.1:4173/examples/plane-day/"
const output = process.argv[3] || join(tmpdir(), "e02-route-measurement.json")
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  const failedRequests = []
  page.on("requestfailed", (request) =>
    failedRequests.push({
      url: request.url(),
      type: request.resourceType(),
      error: request.failure()?.errorText
    })
  )
  const cdp = await context.newCDPSession(page)
  let networkTransferBytes = 0
  cdp.on("Network.loadingFinished", (event) => {
    networkTransferBytes += event.encodedDataLength
  })
  await cdp.send("Network.enable")
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true })
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 500000,
    uploadThroughput: 500000
  })
  const responses = []
  page.on("response", (response) => {
    responses.push(
      response.body().then((body) => ({
        origin: new URL(response.url()).origin,
        path: new URL(response.url()).pathname,
        type: response.request().resourceType(),
        status: response.status(),
        decodedBytes: body.length,
        estimatedGzipBytes: gzipSync(body).length
      }))
    )
  })
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (
        document.querySelector("#docs-server-opening h1") ||
        (document.querySelector(".plane-opening h1") &&
          document.querySelector(".plane-deck"))
      ) {
        window.__e02OpeningReady = performance.now()
        observer.disconnect()
      }
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  const navigation = await page.goto(url, { waitUntil: "networkidle" })
  const documentHTML = await navigation.text()
  const serverRenderedOpening =
    documentHTML.includes('id="docs-server-opening"') &&
    documentHTML.includes("Scheduled departure")
  if (!serverRenderedOpening) {
    throw new Error(
      "Preview served the SPA fallback instead of the prerendered story. Use /examples/plane-day/ with a trailing slash."
    )
  }
  await page.getByRole("button", { name: "Pin HA 465 · HNL → PPG" }).waitFor()
  await expect(page.locator("#docs-server-opening")).toHaveCount(0)
  const initialResponses = await Promise.all(responses.slice())
  const initialNetworkTransferBytes = networkTransferBytes
  const initialTiming = await page.evaluate(() => ({
    openingContentReadyMilliseconds: window.__e02OpeningReady,
    paint: performance
      .getEntriesByType("paint")
      .map((entry) => ({ name: entry.name, startTime: entry.startTime })),
    resourceTransferBytes: performance
      .getEntriesByType("resource")
      .reduce((sum, entry) => sum + entry.transferSize, 0),
    documentTransferBytes:
      performance.getEntriesByType("navigation")[0].transferSize
  }))
  const controls = {}
  for (const control of ["flight", "clock", "view"]) {
    const samples = []
    for (let index = 0; index < 30; index++) {
      const start = performance.now()
      if (control === "flight") {
        const name =
          index % 2 ? "Pin HA 465 · HNL → PPG" : "Pin HA 11 · SFO → HNL"
        await page.getByRole("button", { name }).click()
        await expect(page.getByRole("button", { name })).toHaveAttribute(
          "aria-pressed",
          "true"
        )
      } else if (control === "clock") {
        const value = index % 2 ? "local" : "utc"
        await page.getByLabel("Clock labels").selectOption(value)
        await expect(page.getByLabel("Clock labels")).toHaveValue(value)
      } else {
        const value = index % 2 ? "timeline" : "network"
        await page.getByLabel("View", { exact: true }).selectOption(value)
        await expect(page.getByLabel("View", { exact: true })).toHaveValue(
          value
        )
      }
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      )
      samples.push(performance.now() - start)
    }
    const sorted = [...samples].sort((a, b) => a - b)
    controls[control] = {
      samples,
      p95Milliseconds: sorted[Math.ceil(sorted.length * 0.95) - 1]
    }
  }
  const scriptResponses = initialResponses.filter(
    (response) => response.type === "script"
  )
  // Verify the promised reading path with scripting enabled but bundles blocked.
  // Do this after timing so these separate contexts cannot warm the measured run.
  const openingChecks = []
  for (const route of ["plane-day", "grocery-bill"]) {
    const fallback = await browser.newContext()
    try {
      const staticPage = await fallback.newPage()
      await staticPage.route(/\.js(?:\?|$)/, (request) => request.abort())
      await staticPage.goto(new URL(`/examples/${route}/`, url).href, {
        waitUntil: "domcontentloaded"
      })
      await expect(staticPage.locator("#docs-server-opening h1")).toBeVisible()
      openingChecks.push({ route, scriptsBlocked: true, openingVisible: true })
    } finally {
      await fallback.close()
    }
  }
  const report = {
    measuredAt: new Date().toISOString(),
    url,
    serverRenderedOpening,
    openingChecks,
    failedRequests,
    initialNetworkTransferBytes,
    environment: {
      hardware: cpus()[0].model,
      os: `${platform()} ${release()}`,
      arch: arch(),
      browser: browser.version(),
      node: process.version
    },
    profile: {
      viewport: [390, 844],
      downloadBitsPerSecond: 4000000,
      latencyMilliseconds: 150,
      cache: "cold, disabled",
      sourceFlightRows: 7066,
      eligibleAircraftDays: 660,
      controls: "warm; 30 completed actions per class"
    },
    limitations: [
      "Desktop Chromium with a phone viewport, not a real Android device.",
      "Only one cold navigation; this does not establish navigation p95.",
      "Interaction timings include Playwright automation and two animation frames; they are a proxy, not physical input-to-paint latency.",
      "Gzip figures are estimates from separately compressing decoded responses; actual server transfer is reported separately.",
      "Failed requests are listed explicitly; their unavailable response sizes are not included in transfer totals."
    ],
    initialTiming,
    initialScriptDecodedBytes: scriptResponses.reduce(
      (sum, response) => sum + response.decodedBytes,
      0
    ),
    initialScriptEstimatedGzipBytes: scriptResponses.reduce(
      (sum, response) => sum + response.estimatedGzipBytes,
      0
    ),
    controls,
    responses: initialResponses
  }
  if (pageErrors.length) throw new Error(pageErrors.join("\n"))
  await writeFile(output, JSON.stringify(report, null, 2) + "\n")
  console.log(
    JSON.stringify({
      output,
      initialScriptDecodedBytes: report.initialScriptDecodedBytes,
      initialScriptEstimatedGzipBytes: report.initialScriptEstimatedGzipBytes,
      initialTiming,
      p95: Object.fromEntries(
        Object.entries(controls).map(([name, value]) => [
          name,
          value.p95Milliseconds
        ])
      )
    })
  )
} finally {
  await browser.close()
}
