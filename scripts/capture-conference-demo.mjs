import { createHash } from "node:crypto"
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { setTimeout as wait } from "node:timers/promises"
import { URL, fileURLToPath } from "node:url"
import { spawn, spawnSync } from "node:child_process"
import ffmpegPath from "ffmpeg-static"
import { chromium } from "playwright-chromium"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, "..")
const outputDirectory = join(
  repositoryRoot,
  "docs/public/talk-demo-recordings"
)
const fixturePath = join(
  repositoryRoot,
  "docs/public/talk-demo-fixtures/conference-arc.json"
)
const baseURL =
  process.argv
    .find((argument) => argument.startsWith("--base-url="))
    ?.slice("--base-url=".length) ?? "http://127.0.0.1:3000"

const expectedEventTypes = [
  "suggestion-shown",
  "suggestion-chosen",
  "chart-rendered",
  "proposal-refused",
  "chart-edited",
  "audience-set",
  "render-evidence",
  "chart-replaced",
  "interrogation-asked",
  "interrogation-answered",
  "chart-exported",
]

const delay = (milliseconds) => wait(milliseconds)

async function isReachable(url) {
  try {
    const response = await globalThis.fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function startDocsServer() {
  if (await isReachable(baseURL)) return null

  const viteEntry = join(repositoryRoot, "node_modules/vite/bin/vite.js")
  const serverOutput = []
  const server = spawn(
    process.execPath,
    [
      viteEntry,
      "--config",
      "vite.docs.config.mjs",
      "--host",
      "127.0.0.1",
      "--port",
      new URL(baseURL).port || "3000",
      "--strictPort",
      "--logLevel",
      "error",
    ],
    {
      cwd: repositoryRoot,
      stdio: ["ignore", "pipe", "pipe"],
    }
  )
  server.stdout.on("data", (chunk) => serverOutput.push(chunk.toString()))
  server.stderr.on("data", (chunk) => serverOutput.push(chunk.toString()))

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode != null) {
      throw new Error(
        `Docs server exited with code ${server.exitCode}.\n${serverOutput.join("")}`
      )
    }
    if (await isReachable(baseURL)) return server
    await delay(250)
  }

  server.kill("SIGTERM")
  throw new Error(
    `Timed out waiting for ${baseURL}.\n${serverOutput.join("")}`
  )
}

async function clickBeat(stage, name) {
  await stage.getByRole("button", { name }).click()
  await delay(250)
}

async function clickAction(stage, name) {
  await stage.getByRole("button", { name, exact: true }).click()
  await delay(350)
}

function normalizeArc(events) {
  return events.map((event, index) => ({
    ...event,
    timestamp: 1_792_000_000_000 + index * 1_000,
    sessionId: "conference-stage-recorded",
    meta: {
      ...event.meta,
      capture: "playwright-rehearsal",
    },
  }))
}

async function sha256(path) {
  const bytes = await readFile(path)
  return createHash("sha256").update(bytes).digest("hex")
}

async function fileEntry(path, id, kind) {
  const bytes = await readFile(path)
  return {
    id,
    kind,
    path: `/talk-demo-recordings/${id}`,
    bytes: bytes.byteLength,
    sha256: await sha256(path),
  }
}

async function main() {
  await mkdir(outputDirectory, { recursive: true })
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "semiotic-conference-capture-")
  )
  const server = await startDocsServer()
  let browser

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: "light",
      reducedMotion: "reduce",
      recordVideo: {
        dir: temporaryDirectory,
        size: { width: 1440, height: 1000 },
      },
    })
    const page = await context.newPage()
    const localOrigin = new URL(baseURL).origin
    const externalRequests = []
    const pageErrors = []

    page.on("pageerror", (error) => pageErrors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text())
    })
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url())
      if (
        url.protocol === "data:" ||
        url.protocol === "blob:" ||
        url.origin === localOrigin
      ) {
        await route.continue()
        return
      }
      if (url.hostname === "fonts.googleapis.com") {
        await route.fulfill({
          status: 200,
          contentType: "text/css",
          body: "/* capture uses the system-font fallback */",
        })
        return
      }
      externalRequests.push(url.href)
      await route.abort("blockedbyclient")
    })

    await page.goto(`${baseURL}/intelligence/conference-demo`, {
      waitUntil: "domcontentloaded",
    })
    await page.addStyleTag({
      content: `
        .docs-top-bar,
        .sidebar,
        .page-toc {
          display: none !important;
        }
        .container {
          max-width: none !important;
          width: 100% !important;
        }
        .page-body {
          display: block !important;
        }
        .page-content {
          margin: 0 auto !important;
          max-width: 1200px !important;
        }
      `,
    })
    const stage = page.locator('[data-demo="conference-stage"]')
    await stage.waitFor({ state: "visible" })
    await stage.scrollIntoViewIfNeeded()
    await delay(500)

    await stage.screenshot({
      path: join(outputDirectory, "keyframe-01-candidates.png"),
    })
    await clickAction(stage, "Choose BoxPlot baseline")

    await clickBeat(stage, /Refuse the bad proposal/)
    await clickAction(stage, "Run deterministic refusal")
    await clickBeat(stage, /Declare production reality/)
    await clickAction(stage, "Apply production declaration")
    await clickBeat(stage, /Name the reader/)
    await clickAction(stage, "Target this reader")

    // Capture proof for the baseline before the chart is replaced.
    await clickBeat(stage, /Attach render evidence/)
    await clickAction(stage, "Attach proof to live arc")
    await clickBeat(stage, /Reveal the second mode/)
    await clickAction(stage, "Render proposed RidgelinePlot")
    await stage.screenshot({
      path: join(outputDirectory, "keyframe-02-variant.png"),
    })

    await clickBeat(stage, /Keep the custom-chart exit/)
    await stage.getByRole("button", { name: /Morph to snapshot/ }).waitFor()
    await delay(400)
    await clickBeat(stage, /Attach render evidence/)
    await clickAction(stage, "Attach proof to live arc")
    await clickBeat(stage, /Ground the reader/)
    await clickAction(stage, "Inspect grounding replay")
    await clickBeat(stage, /Export defensible JSX/)
    await clickAction(stage, "Mark JSX exported")
    await stage.screenshot({
      path: join(outputDirectory, "keyframe-03-handoff.png"),
    })

    const downloadPromise = page.waitForEvent("download")
    await clickAction(stage, "Download live arc")
    const download = await downloadPromise
    const downloadedArcPath = join(temporaryDirectory, "conference-live-arc.json")
    await download.saveAs(downloadedArcPath)
    const arc = normalizeArc(
      JSON.parse(await readFile(downloadedArcPath, "utf8"))
    )

    const eventTypes = new Set(arc.map(({ type }) => type))
    const missingTypes = expectedEventTypes.filter((type) => !eventTypes.has(type))
    const evidenceComponents = arc
      .filter(({ type }) => type === "render-evidence")
      .map(({ component }) => component)
    if (missingTypes.length > 0) {
      throw new Error(`Captured arc is missing: ${missingTypes.join(", ")}`)
    }
    if (
      !evidenceComponents.includes("BoxPlot") ||
      !evidenceComponents.includes("RidgelinePlot")
    ) {
      throw new Error(
        `Captured proof must cover BoxPlot and RidgelinePlot; got ${evidenceComponents.join(", ")}`
      )
    }
    if (externalRequests.length > 0 || pageErrors.length > 0) {
      throw new Error(
        [
          externalRequests.length
            ? `External requests: ${externalRequests.join(", ")}`
            : null,
          pageErrors.length ? `Page errors: ${pageErrors.join("\n")}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      )
    }

    await writeFile(fixturePath, `${JSON.stringify(arc, null, 2)}\n`)

    const video = page.video()
    await page.close()
    const webmPath = join(temporaryDirectory, "conference-stage.webm")
    await video.saveAs(webmPath)
    await context.close()

    const mp4Path = join(outputDirectory, "conference-stage.mp4")
    const conversion = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-i",
        webmPath,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "28",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        mp4Path,
      ],
      { encoding: "utf8" }
    )
    if (conversion.status !== 0) {
      throw new Error(`MP4 conversion failed:\n${conversion.stderr}`)
    }

    const fileDefinitions = [
      ["conference-stage.mp4", "video/mp4"],
      ["keyframe-01-candidates.png", "image/png"],
      ["keyframe-02-variant.png", "image/png"],
      ["keyframe-03-handoff.png", "image/png"],
    ]
    const files = await Promise.all(
      fileDefinitions.map(([id, kind]) =>
        fileEntry(join(outputDirectory, id), id, kind)
      )
    )
    const manifest = {
      version: 1,
      sourceRoute: "/intelligence/conference-demo",
      fixture: "/talk-demo-fixtures/conference-arc.json",
      capture: {
        browser: "playwright-chromium",
        network: "external requests blocked",
        sessionId: "conference-stage-recorded",
        eventCount: arc.length,
        eventTypes: [...eventTypes].sort(),
      },
      files,
    }
    await writeFile(
      join(outputDirectory, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`
    )

    process.stdout.write(
      `Captured ${arc.length} events, ${files.length} fallback assets, and no external requests.\n`
    )
  } finally {
    if (browser) await browser.close().catch(() => {})
    if (server) server.kill("SIGTERM")
  }
}

await main()
