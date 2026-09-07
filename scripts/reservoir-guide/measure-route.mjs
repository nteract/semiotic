import { chromium, expect } from "@playwright/test"
import { writeFile } from "node:fs/promises"
import { cpus, platform, release, arch, tmpdir } from "node:os"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

// A desktop proxy baseline, not the real-Android acceptance test in G07.
// Run against `vite preview` after the complete production build.
// Vite preview needs the trailing slash to serve the prerendered directory index.
const url = process.argv[2] || "http://127.0.0.1:4173/examples/reservoir-guide/"
const output = process.argv[3] || join(tmpdir(), "e03-route-measurement.json")
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
        (document.querySelector(".reservoir-opening h1") &&
          document.querySelector(".reservoir-deck"))
      ) {
        window.__e03OpeningReady = performance.now()
        observer.disconnect()
      }
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  const navigation = await page.goto(url, { waitUntil: "networkidle" })
  const documentHTML = await navigation.text()
  const serverRenderedOpening =
    documentHTML.includes('id="docs-server-opening"') &&
    documentHTML.includes("3,258,792")
  if (!serverRenderedOpening) {
    throw new Error(
      "Preview served the SPA fallback instead of the prerendered story. Use /examples/reservoir-guide/ with a trailing slash."
    )
  }
  await page.getByTestId("season-chart").waitFor()
  await expect(page.locator("#docs-server-opening")).toHaveCount(0)
  const initialResponses = await Promise.all(responses.slice())
  const initialNetworkTransferBytes = networkTransferBytes
  const initialTiming = await page.evaluate(() => ({
    openingContentReadyMilliseconds: window.__e03OpeningReady,
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
  for (const [control, label, values, attribute] of [
    ["reservoir", "Reservoir", ["ORO", "SHA"], "data-station"],
    ["waterYear", "Selected water year", ["2024", "2025"], "data-year"],
    ["comparisonYear", "Comparison water year", ["2023", "2021"], null],
    ["calendarDate", "Calendar date", ["07-29", "07-30"], "data-month-day"]
  ]) {
    const samples = []
    for (let index = 0; index < 30; index++) {
      const value = values[index % 2]
      const start = performance.now()
      await page.getByLabel(label, { exact: true }).selectOption(value)
      await expect(page.getByLabel(label, { exact: true })).toHaveValue(value)
      if (attribute)
        await expect(
          page.getByTestId("reservoir-active-guide")
        ).toHaveAttribute(attribute, value)
      else
        await expect(page.locator(".reservoir-line-key")).toContainText(
          `Compare WY ${value}`
        )
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
  for (const route of ["reservoir-guide", "plane-day", "grocery-bill"]) {
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
      sourceStorageRows: 76704,
      reservoirs: 6,
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
