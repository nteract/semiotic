import assert from "node:assert/strict"
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, resolve, sep } from "node:path"
import type { Browser } from "playwright-chromium"
import { assertNoDiagnostics } from "./contracts.ts"

export async function serveOutput(directory: string) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url ?? "/", "http://localhost").pathname
      const path = resolve(
        directory,
        `.${decodeURIComponent(pathname === "/" ? "/index.html" : pathname)}`
      )
      if (!path.startsWith(resolve(directory) + sep))
        throw new Error("Invalid path")
      const types: Record<string, string> = {
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".html": "text/html",
        ".wasm": "application/wasm"
      }
      response.setHeader(
        "Content-Type",
        types[extname(path)] ?? "application/octet-stream"
      )
      response.end(await readFile(path))
    } catch {
      response.statusCode = 404
      response.end("Not found")
    }
  })
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolveListen)
  })
  const address = server.address()
  assert.ok(address && typeof address !== "string")
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((done, reject) => {
        server.closeAllConnections()
        server.close((error) => (error ? reject(error) : done()))
      })
  }
}

export async function checkBrowser(
  browser: Browser,
  url: string,
  surfaceUrl?: string
) {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1200 }
  })
  const diagnostics: string[] = []
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type()))
      diagnostics.push(`console ${message.type()}: ${message.text()}`)
  })
  page.on("pageerror", (error) =>
    diagnostics.push(`pageerror: ${error.message}`)
  )
  page.on("requestfailed", (request) =>
    diagnostics.push(
      `request failed: ${request.url()} ${request.failure()?.errorText}`
    )
  )
  page.on("response", (response) => {
    if (response.status() >= 400)
      diagnostics.push(`HTTP ${response.status()}: ${response.url()}`)
  })
  try {
    await page.addInitScript(() => {
      const workers: Record<string, { messages: number; valid: boolean }> = {}
      Object.assign(window, { __consumerWorkers: workers })
      const NativeWorker = window.Worker
      window.Worker = class extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          const name = options?.name ?? "unnamed"
          const record: { messages: number; valid: boolean } = {
            messages: 0,
            valid: false
          }
          workers[name] = record
          this.addEventListener("message", (event) => {
            const data = event.data
            record.messages++
            if (name === "semiotic-force-layout")
              record.valid ||= Number.isFinite(data.positions?.source?.x)
            if (name === "semiotic-process-sankey-layout")
              record.valid ||= data.layoutConfig?.bands?.length > 0
            if (name === "semiotic-physics")
              record.valid ||=
                data.ok === true && data.payload?.frame?.ids?.length > 0
          })
          this.addEventListener("error", (event) =>
            console.error(`Worker ${name}: ${event.message}`)
          )
        }
      }
    })
    await page.goto(url)
    if (surfaceUrl)
      await page.evaluate(async (path) => {
        await import(/* @vite-ignore */ path)
      }, surfaceUrl)
    await page.waitForFunction(
      () => {
        const state = window as unknown as {
          __semioticConsumer: { force: boolean; peer: boolean; error?: string }
          __consumerWorkers: Record<string, { valid: boolean }>
        }
        if (state.__semioticConsumer?.error)
          throw new Error(state.__semioticConsumer.error)
        return (
          state.__semioticConsumer?.force &&
          state.__semioticConsumer.peer &&
          [
            "semiotic-force-layout",
            "semiotic-process-sankey-layout",
            "semiotic-physics"
          ].every((name) => state.__consumerWorkers[name]?.valid)
        )
      },
      undefined,
      { timeout: 30_000 }
    )
    // Evidence of data-layer paint, rather than merely mounted containers.
    await page.waitForFunction(
      () =>
        ["line", "bar", "sankey", "physics"].every((id) =>
          Array.from(
            document.querySelectorAll<HTMLCanvasElement>(`#${id} canvas`)
          ).some((canvas) => {
            if (!canvas.width || !canvas.height) return false
            // Read a test-owned CPU canvas. Repeated reads of the chart's
            // GPU canvas would themselves emit Chromium performance warnings.
            const probe = document.createElement("canvas")
            probe.width = canvas.width
            probe.height = canvas.height
            const context = probe.getContext("2d", { willReadFrequently: true })
            if (!context) return false
            context.drawImage(canvas, 0, 0)
            const pixels = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            ).data
            for (let i = 0; i < pixels.length; i += 4) {
              if (
                pixels[i + 3] > 10 &&
                Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 230
              )
                return true
            }
            return false
          })
        ),
      undefined,
      { timeout: 15_000 }
    )
    assertNoDiagnostics("Browser diagnostics", diagnostics)
    return {
      charts: ["LineChart", "BarChart", "ProcessSankey", "UnitPileChart"],
      workers: 3
    }
  } catch (error) {
    const state = await page
      .evaluate(() => ({
        charts: ["line", "bar", "sankey", "physics"].map((id) => ({
          id,
          canvases: Array.from(
            document.querySelectorAll<HTMLCanvasElement>(`#${id} canvas`)
          ).map((canvas) => ({
            width: canvas.width,
            height: canvas.height,
            top: canvas.getBoundingClientRect().top,
            painted:
              canvas.width > 0 &&
              canvas.height > 0 &&
              Boolean(
                canvas
                  .getContext("2d")
                  ?.getImageData(0, 0, canvas.width, canvas.height)
                  .data.some((value, index) => index % 4 === 3 && value > 10)
              )
          }))
        }))
      }))
      .catch(() => null)
    throw new Error(
      `${String(error)}\n${diagnostics.join("\n")}\nBrowser state: ${JSON.stringify(state)}`
    )
  } finally {
    await page.close()
  }
}
