import { chromium, expect } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { cpus, platform, release } from "node:os"
import { gzipSync } from "node:zlib"

const url = process.argv[2] || "http://127.0.0.1:4173/examples/jobs-report/"
const output = process.argv[3] || "/private/tmp/e06-route-measurement.json"
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  const responses = []
  page.on("response", (response) =>
    responses.push(
      response.body().then((bytes) => ({
        path: new URL(response.url()).pathname,
        type: response.request().resourceType(),
        status: response.status(),
        decodedBytes: bytes.length,
        estimatedGzipBytes: gzipSync(bytes).length
      }))
    )
  )
  const cdp = await context.newCDPSession(page)
  let transferredBytes = 0
  cdp.on("Network.loadingFinished", (event) => {
    transferredBytes += event.encodedDataLength
  })
  await cdp.send("Network.enable")
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true })
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 500000,
    uploadThroughput: 500000
  })
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (document.querySelector("#docs-server-opening h1")) {
        window.__jobsOpeningReady = performance.now()
        observer.disconnect()
      }
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  const navigation = await page.goto(url, { waitUntil: "networkidle" })
  const html = await navigation.text()
  if (!html.includes('id="docs-server-opening"') || !html.includes("147,000"))
    throw new Error("Expected the prerendered story, not the SPA fallback")
  await expect(page.getByTestId("jobs-selected-summary")).toContainText(
    "−20,000"
  )
  const initialResources = await Promise.all(responses.slice())
  const initialTransferBytes = transferredBytes
  const timing = await page.evaluate(() => ({
    openingMilliseconds: window.__jobsOpeningReady,
    paints: performance
      .getEntriesByType("paint")
      .map(({ name, startTime }) => ({ name, startTime }))
  }))
  const controls = {}
  for (const control of ["reference-month", "publication-date"]) {
    const samples = []
    await page.getByLabel("Employment reference month").selectOption("2025-06")
    for (let index = 0; index < 30; index++) {
      const start = performance.now()
      if (control === "reference-month") {
        await page
          .getByLabel("Employment reference month")
          .selectOption(index % 2 ? "2025-06" : "2025-07")
        await expect(page.getByTestId("jobs-selected-summary")).toContainText(
          index % 2 ? "−20,000" : "+64,000"
        )
      } else {
        await page
          .getByLabel("Estimate available in this release")
          .selectOption(index % 2 ? "2026-03-06" : "2025-07-03")
        await expect(page.getByTestId("jobs-selected-summary")).toContainText(
          index % 2 ? "vintage −20,000" : "vintage +147,000"
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
    controls[control] = {
      samples,
      p95Milliseconds: [...samples].sort((a, b) => a - b)[28]
    }
  }
  const beforeExport = responses.length
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download SVG", exact: true }).click()
  await download
  await page.waitForLoadState("networkidle")
  const optionalExportResources = await Promise.all(
    responses.slice(beforeExport)
  )
  const fallback = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 }
  })
  const staticPage = await fallback.newPage()
  await staticPage.goto(url)
  await expect(staticPage.locator("body")).toContainText("13,000 decline")
  await expect(staticPage.locator("body")).toContainText("October 2025")
  await fallback.close()
  const blocked = await browser.newContext({
    viewport: { width: 390, height: 844 }
  })
  const blockedPage = await blocked.newPage()
  await blockedPage.route(/\.js(?:\?|$)/, (route) => route.abort())
  await blockedPage.goto(url, { waitUntil: "domcontentloaded" })
  await expect(blockedPage.locator("#docs-server-opening")).toContainText(
    "147,000"
  )
  await blocked.close()
  await page.screenshot({
    path: "/private/tmp/e06-production-phone.png",
    fullPage: true
  })
  if (errors.length) throw new Error(errors.join("\n"))
  const scripts = initialResources.filter(({ type }) => type === "script")
  const report = {
    measuredAt: new Date().toISOString(),
    environment: {
      hardware: cpus()[0].model,
      os: `${platform()} ${release()}`,
      browser: browser.version(),
      node: process.version
    },
    profile: {
      viewport: [390, 844],
      downloadBitsPerSecond: 4000000,
      latencyMilliseconds: 150,
      cache: "disabled"
    },
    limitations: [
      "Desktop proxy, not real Android; one cold navigation is not navigation p95.",
      "Interaction samples include automation and two animation frames.",
      "Gzip sizes are estimates; transfer bytes reflect this preview server.",
      "No independent human reader or assistive-technology session is asserted."
    ],
    readingWithoutJavaScript: true,
    readingWithScriptsBlocked: true,
    initialTransferBytes,
    initialScriptDecodedBytes: scripts.reduce(
      (total, row) => total + row.decodedBytes,
      0
    ),
    initialScriptEstimatedGzipBytes: scripts.reduce(
      (total, row) => total + row.estimatedGzipBytes,
      0
    ),
    timing,
    controls,
    initialResources,
    optionalExportResources
  }
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(report, null, 2) + "\n")
  if (report.initialScriptEstimatedGzipBytes > 450 * 1024 ||
    optionalExportResources.filter(({ type }) => type === "script").reduce((total, row) => total + row.estimatedGzipBytes, 0) > 320 * 1024 ||
    Object.values(controls).some(({ p95Milliseconds }) => p95Milliseconds > 80))
    throw new Error("Jobs route exceeded its recorded desktop-proxy budget; inspect the saved report before changing a ceiling")
  console.log(
    JSON.stringify({
      output,
      gzipBytes: report.initialScriptEstimatedGzipBytes,
      timing,
      p95: Object.fromEntries(
        Object.entries(controls).map(([key, value]) => [
          key,
          value.p95Milliseconds
        ])
      )
    })
  )
} finally {
  await browser.close()
}
