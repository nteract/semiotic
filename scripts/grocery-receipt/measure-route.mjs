import { chromium, expect } from "@playwright/test"
import { writeFile } from "node:fs/promises"
import { cpus, platform, release, arch, tmpdir } from "node:os"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

// A desktop proxy baseline, not the real-Android acceptance test in G07.
// Run against `vite preview` after the complete production build.
const url = process.argv[2] || "http://127.0.0.1:4173/examples/grocery-bill"
const output = process.argv[3] || join(tmpdir(), "e01-route-measurement.json")
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  const cdp = await context.newCDPSession(page)
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
    if (new URL(response.url()).origin !== new URL(url).origin) return
    responses.push(
      response.body().then((body) => ({
        path: new URL(response.url()).pathname,
        type: response.request().resourceType(),
        status: response.status(),
        decodedBytes: body.length,
        estimatedGzipBytes: gzipSync(body).length
      }))
    )
  })
  await page.goto(url, { waitUntil: "networkidle" })
  await page
    .getByRole("spinbutton", { name: "Bananas quantity in lb" })
    .waitFor()
  const initialResponses = await Promise.all(responses.slice())
  const initialTiming = await page.evaluate(() => ({
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
  for (const control of ["quantity", "month"]) {
    const samples = []
    for (let index = 0; index < 30; index++) {
      const start = performance.now()
      if (control === "quantity") {
        await page
          .getByRole("button", {
            name: `${index % 2 ? "Decrease" : "Increase"} Bananas quantity`
          })
          .click()
        await expect(
          page.getByRole("spinbutton", { name: "Bananas quantity in lb" })
        ).toHaveValue(index % 2 ? "2" : "2.25")
      } else {
        await page
          .getByLabel("Comparison month", { exact: true })
          .selectOption(index % 2 ? "2025-06" : "2025-03")
        await expect(page.getByTestId("after-total")).toHaveText(
          index % 2 ? "$27.29" : "$29.40"
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
  const report = {
    measuredAt: new Date().toISOString(),
    url,
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
      dataPositions: 576,
      controls: "warm; 30 completed actions per class"
    },
    limitations: [
      "Desktop Chromium with a phone viewport, not a real Android device.",
      "Only one cold navigation; this does not establish navigation p95.",
      "Interaction timings include Playwright automation and two animation frames; they are a proxy, not physical input-to-paint latency.",
      "Gzip figures are estimates from separately compressing decoded responses; actual server transfer is reported separately."
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
