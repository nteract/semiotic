// Run with the docs source server running: node scripts/wordcloud/benchmark.mjs
// Reports complete preparations, including sprite rasterization and placement.
import { chromium } from "@playwright/test"
import { arch, cpus, platform } from "node:os"

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.goto("http://127.0.0.1:3000/examples/word-cloud")
  const results = await page.evaluate(async (root) => {
    const { prepareWordCloudLayout } = await import(
      /* @vite-ignore */ `/@fs/${root}/src/components/semiotic-wordcloud.ts`
    )
    const { shapes } = await import(
      /* @vite-ignore */ `/@fs/${root}/docs/src/pages/examples/word-cloud/shapes.ts`
    )
    await document.fonts.load('32px "Crimson Text"')
    const measurements = []
    for (const [width, height] of [
      [600, 400],
      [1200, 800]
    ]) {
      for (const count of [100, 300, 1000]) {
        for (const masked of [false, true]) {
          const options = {
            data: Array.from({ length: count }, (_, i) => ({
              text: `term${i}`,
              value: count - i
            })),
            width,
            height,
            maxWords: count,
            fontFamily: "Crimson Text",
            fontSizeRange: [8, 64],
            seed: 71,
            ...(masked
              ? {
                  mask: {
                    type: "svgPath",
                    path: shapes.heart.path,
                    viewBox: [0, 0, 200, 200],
                    mode: "inside"
                  }
                }
              : {})
          }
          await prepareWordCloudLayout(options)
          const milliseconds = []
          let placed = 0
          for (let trial = 0; trial < 3; trial++) {
            const start = performance.now()
            const layout = await prepareWordCloudLayout(options)
            milliseconds.push(Math.round((performance.now() - start) * 10) / 10)
            placed = layout.words.length
          }
          measurements.push({
            width,
            height,
            count,
            masked,
            placed,
            omitted: count - placed,
            milliseconds
          })
        }
      }
    }
    return { userAgent: navigator.userAgent, measurements }
  }, process.cwd())
  console.log(
    JSON.stringify(
      {
        environment: {
          node: process.version,
          platform: platform(),
          arch: arch(),
          cpu: cpus()[0]?.model
        },
        engine: "d3-cloud@2.0.0",
        seed: 71,
        font: "Crimson Text",
        method:
          "One warmup then three full preparations per case; deterministic synthetic aggregated terms, no animation or worker.",
        ...results
      },
      null,
      2
    )
  )
} finally {
  await browser.close()
}
