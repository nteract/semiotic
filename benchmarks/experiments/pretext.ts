/**
 * Isolated Pretext evaluation. No dependency installation or library changes.
 * Usage: node --import tsx benchmarks/experiments/pretext.ts PACKAGE_DIR OUTPUT.json [--source] [--dom-canvas] [--dpr=2]
 * PACKAGE_DIR must contain the extracted @chenglou/pretext@0.0.9 npm package.
 */
import { build } from "esbuild"
import { chromium, firefox, webkit } from "playwright"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { gzipSync } from "node:zlib"

import type { Pretext, runEvaluation } from "./pretext-browser"
async function main() {
  const [packageArg, outputArg, ...flags] = process.argv.slice(2)
  if (!packageArg || !outputArg) {
    throw new Error("Usage: pretext.ts PACKAGE_DIR OUTPUT.json")
  }
  const packageDir = resolve(packageArg)
  const manifest = JSON.parse(
    readFileSync(resolve(packageDir, "package.json"), "utf8")
  )
  if (manifest.name !== "@chenglou/pretext" || manifest.version !== "0.0.9") {
    throw new Error("This evaluation is pinned to @chenglou/pretext@0.0.9")
  }
  const source = flags.includes("--source")
  const domCanvas = flags.includes("--dom-canvas")
  const deviceScaleFactor = flags.includes("--dpr=2") ? 2 : 1
  const entry = resolve(packageDir, source ? "src/layout.ts" : "dist/layout.js")
  const api =
    "prepare,prepareWithSegments,layout,layoutWithLines,measureNaturalWidth,clearCache"
  const variants = {
    height: { names: "prepare,layout", entry },
    width: { names: "prepareWithSegments,measureNaturalWidth", entry },
    lines: {
      names: "prepareWithSegments,layoutWithLines,measureNaturalWidth",
      entry
    },
    richInline: {
      names:
        "prepareRichInline,walkRichInlineLineRanges,materializeRichInlineLineRange",
      entry: resolve(
        packageDir,
        source ? "src/rich-inline.ts" : "dist/rich-inline.js"
      )
    }
  }
  const bundles: Record<string, { minifiedBytes: number; gzipBytes: number }> =
    {}
  for (const [name, variant] of Object.entries(variants)) {
    const result = await build({
      stdin: {
        contents: `export {${variant.names}} from ${JSON.stringify(variant.entry)}`,
        resolveDir: process.cwd()
      },
      bundle: true,
      minify: true,
      format: "esm",
      write: false
    })
    const bytes = result.outputFiles[0].contents
    bundles[name] = {
      minifiedBytes: bytes.length,
      gzipBytes: gzipSync(bytes).length
    }
  }
  const browserBundle = await build({
    stdin: {
      contents: `export {${api}} from ${JSON.stringify(entry)}`,
      resolveDir: process.cwd()
    },
    bundle: true,
    minify: true,
    format: "iife",
    globalName: "pretext",
    write: false
  })

  const probeBundle = await build({
    entryPoints: [
      fileURLToPath(new URL("./pretext-browser.ts", import.meta.url))
    ],
    bundle: true,
    minify: true,
    format: "iife",
    globalName: "probe",
    write: false
  })

  const nodeModule: Pretext = await import(pathToFileURL(entry).href)
  let nodePrepare: string
  try {
    nodeModule.prepare("Chart annotation", "12px Arial")
    nodePrepare = "succeeded"
  } catch (error) {
    nodePrepare = String(error)
  }

  const corpus = [
    "iiiiiiiiiiii",
    "WWWWWWWWWWWW",
    "Revenue increased after the product launch.",
    "January 2026 · $1,234.56 (+12.5%)",
    "A very long annotation describing regional differences in revenue and growth.",
    "https://example.com/VeryLongUnbrokenIdentifier2026",
    "季度营收增长显著，华东地区表现最佳。",
    "売上高は前年同期比で増加しました。",
    "รายได้เพิ่มขึ้นอย่างต่อเนื่องในไตรมาสนี้",
    "ارتفعت الإيرادات بنسبة ١٢٪ خلال العام",
    "הכנסות 2026 עלו ב-12% ברבעון הראשון",
    "Revenue 🚀 increased 👩🏽‍💻 across regions 🌍.",
    "Café naïve résumé — München São Paulo",
    "North\u00a0America has high\u00a0growth this quarter",
    "Long\u00adterm inter\u00adnational investment increased",
    "North\u200bAmerica\u200bRevenue\u200bGrowth"
  ]
  const fonts = [
    "12px Arial",
    "bold 12px Arial",
    "18px Arial",
    "12px Georgia",
    '12px "Courier New"',
    "12px system-ui",
    "12px sans-serif"
  ]
  const widths = [80, 120, 180, 240]
  const browsers: Record<string, unknown> = {}
  for (const [name, browserType] of Object.entries({
    chromium,
    firefox,
    webkit
  })) {
    if (!existsSync(browserType.executablePath())) {
      browsers[name] = {
        skipped: "Playwright browser executable not installed"
      }
      continue
    }
    const browser = await browserType.launch({ headless: true })
    try {
      const page = await browser.newPage({ deviceScaleFactor })
      await page.setContent('<html lang="en"><body></body></html>')
      if (domCanvas) {
        await page.addScriptTag({
          content: "globalThis.OffscreenCanvas = undefined"
        })
      }
      await page.addScriptTag({ content: browserBundle.outputFiles[0].text })
      await page.addScriptTag({ content: probeBundle.outputFiles[0].text })
      const measurements = await page.evaluate<
        Awaited<ReturnType<typeof runEvaluation>>
      >(`probe.runEvaluation(${JSON.stringify({ corpus, fonts, widths })})`)
      browsers[name] = { version: browser.version(), ...measurements }
      process.stderr.write(
        `${name}: ${measurements.rows.length} layout comparisons completed\n`
      )
    } finally {
      await browser.close()
    }
  }

  writeFileSync(
    resolve(outputArg),
    `${JSON.stringify(
      {
        package: `${manifest.name}@${manifest.version}`,
        packageDir,
        source,
        measurementContext: domCanvas
          ? "DOM canvas fallback"
          : "default (OffscreenCanvas where available)",
        measuredAt: new Date().toISOString(),
        platform: `${process.platform}/${process.arch}`,
        node: process.version,
        bundles,
        nodePrepare,
        browsers
      },
      null,
      2
    )}\n`
  )
  process.stderr.write(`Results written to ${resolve(outputArg)}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
