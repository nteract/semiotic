import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { cp, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { execFileSync } from "node:child_process"
import { cpus, platform, arch } from "node:os"
import { networkCameraDiagnostics } from "../scripts/lib/network-camera-diagnostics"
import type {} from "./network-custom-layout-examples/cameraScaleFixture"

const capture = JSON.parse(
  readFileSync(
    resolve(
      process.env.NETWORK_CAMERA_CAPTURE ??
        "test-results/network-camera/production-measurements.json"
    ),
    "utf8"
  )
)
const diagnostics = networkCameraDiagnostics(capture)

test.afterAll(async () => {
  // Keep the exact minified JavaScript and maps used by the CPU/DOM traces.
  if (diagnostics.length)
    await cp(
      "node_modules/.cache/network-camera/assets",
      "test-results/network-camera/diagnostics/assets",
      { recursive: true }
    )
})

// A clean capture has no replay: it must never produce replacement timings.
test("validate saved acceptance evidence", () => {
  expect(capture.production).toBeDefined()
})

for (const diagnostic of diagnostics) {
  const label =
    diagnostic.kind === "camera"
      ? `camera ${diagnostic.row.nodes} ${diagnostic.row.cards} edges=${diagnostic.row.edgeHits} scale=${diagnostic.row.scale}`
      : `pointer ${diagnostic.row.scenario} scale=${diagnostic.row.k}`
  test(`diagnose ${label}`, async ({ page }, testInfo) => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
    const query =
      diagnostic.kind === "camera"
        ? `nodes=${diagnostic.row.nodes}&cards=${diagnostic.row.cards}${diagnostic.row.edgeHits ? "&edge-hits" : ""}`
        : "nodes=3000&edge-hits"
    await page.goto(
      `/network-custom-layout-examples/camera-scale.html?${query}`
    )
    await expect
      .poll(() =>
        page.evaluate(() => !!window.cameraScale?.handle?.getCustomLayout?.())
      )
      .toBe(true)
    await page.evaluate((diagnostic) => {
      const scale =
        diagnostic.kind === "camera" ? diagnostic.row.scale : diagnostic.row.k
      if (scale === "fit") window.cameraScale.handle!.fitToContent()
      else
        window.cameraScale.handle!.zoomTo(
          {
            x: 20,
            y: diagnostic.kind === "camera" ? 300 : 450,
            k: Number(scale)
          },
          0
        )
    }, diagnostic)
    await expect
      .poll(() => page.evaluate(() => window.cameraScale.phase))
      .toBe("idle")
    await page.locator("canvas").hover({ position: { x: 130, y: 220 } })
    await page.waitForTimeout(100)

    await cdp.send("Profiler.enable")
    await cdp.send("Profiler.setSamplingInterval", { interval: 100 })
    await cdp.send("Profiler.start")
    await cdp.send("Tracing.start", {
      categories:
        "devtools.timeline,disabled-by-default-devtools.timeline.stack",
      transferMode: "ReturnAsStream"
    })
    await page.evaluate(async (diagnostic) => {
      const canvas = document.querySelector("canvas")!
      const box = canvas.getBoundingClientRect()
      const m = window.cameraScale,
        plot = m.viewport!.plotRect!,
        view = m.handle!.getZoom()
      for (let i = 0; i < 100; i++) {
        if (diagnostic.kind === "camera") {
          canvas.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              clientX: box.x + 400,
              clientY: box.y + 300,
              deltaY: i % 2 ? -1 : 1
            })
          )
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
          )
        } else {
          const { scenario, k } = diagnostic.row
          const y =
            scenario === "node"
              ? 24
              : scenario === "miss" || (scenario === "alternating" && i % 2)
                ? -200
                : -100
          for (let j = 0; j < 4; j++)
            canvas.dispatchEvent(
              new MouseEvent("mousemove", {
                bubbles: true,
                clientX:
                  box.x + plot.x + view.x + 100 * k + (i % 2 ? 5 : -5) + j,
                clientY: box.y + plot.y + view.y + y * k
              })
            )
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
        }
      }
    }, diagnostic)
    const { profile } = await cdp.send("Profiler.stop")
    const traceComplete = new Promise<string>((resolve) => {
      cdp.once("Tracing.tracingComplete", ({ stream }) => resolve(stream!))
    })
    await cdp.send("Tracing.end")
    const stream = await traceComplete
    const chunks: Buffer[] = []
    for (;;) {
      const chunk = await cdp.send("IO.read", { handle: stream })
      chunks.push(
        Buffer.from(chunk.data, chunk.base64Encoded ? "base64" : "utf8")
      )
      if (chunk.eof) break
    }
    await cdp.send("IO.close", { handle: stream })
    await writeFile(
      testInfo.outputPath("cpu.cpuprofile"),
      JSON.stringify(profile)
    )
    await writeFile(testInfo.outputPath("timeline.json"), Buffer.concat(chunks))
    await writeFile(
      testInfo.outputPath("diagnostic.json"),
      JSON.stringify(
        {
          purpose: "Diagnostic replay only; never timing acceptance",
          acceptanceSourceCommit: capture.production.sourceCommit,
          replaySourceCommit:
            process.env.GITHUB_SHA ||
            execFileSync("git", ["rev-parse", "HEAD"], {
              encoding: "utf8"
            }).trim(),
          replayBrowser: page.context().browser()!.version(),
          replayMachine: {
            platform: platform(),
            arch: arch(),
            cpu: cpus()[0].model
          },
          acceptance: diagnostic,
          cpuThrottle: 4,
          sampleIntervalMicroseconds: 100,
          iterations: 100
        },
        null,
        2
      )
    )
    await cdp.detach()
  })
}
