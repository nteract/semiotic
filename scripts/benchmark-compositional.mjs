import { chromium } from "playwright"
import { cpus, platform, arch, totalmem } from "node:os"
import { writeFileSync } from "node:fs"
import { createServer } from "vite"

const server = await createServer({ configFile: "vite.docs.config.mjs", server: { host: "127.0.0.1", port: 3017, strictPort: true }, logLevel: "error" })
let browser
try {
  await server.listen()
  browser = await chromium.launch({ args: ["--enable-precise-memory-info"] })
  const page = await browser.newPage()
  await page.goto("http://127.0.0.1:3017/")
  const results = []
  for (const [owners, edges] of [[30, 300], [200, 5000], [1000, 25000]]) {
    const samples = []
    for (let i = 0; i < 6; i++) {
      const result = await page.evaluate(async ([owners, edges, path]) => {
        const { runCompositionalBenchmark } = await import(path)
        const result = runCompositionalBenchmark(owners, edges)
        return { ...result, heapBytes: performance.memory?.usedJSHeapSize ?? null }
      }, [owners, edges, `/@fs${process.cwd()}/benchmarks/compositional.ts`])
      if (i) samples.push(result)
    }
    const percentile = (key, p) => samples.map(s => s[key]).sort((a, b) => a - b)[Math.ceil(samples.length * p) - 1]
    const timings = Object.fromEntries(["preparationMs", "localGeometryMs", "routeOnlyTransactionMs", "sceneEmissionMs", "traceMs", "heapBytes"].map(key => [key, { p50: percentile(key, .5), p95: percentile(key, .95) }]))
    results.push({ owners, edges, samples: samples.length, warmups: 1, timings, routedEdges: samples[0].routedEdges, sceneEdges: samples[0].sceneEdges, status: samples[0].status, diagnostics: samples[0].diagnostics })
    console.log(JSON.stringify(results.at(-1)))
  }
  const report = { recordedAt: new Date().toISOString(), device: { cpu: cpus()[0].model, platform: platform(), architecture: arch(), memoryBytes: totalmem() }, browser: await browser.version(), node: process.version,
    scope: "Warmed browser CPU microbenchmark of materialized disjoint owner pairs; five measured samples. Route-only transaction includes validation, local geometry, routing, and metrics. Local geometry is separately sampled, not subtracted. Heap is whole-page used JS heap, not retained feature memory. Optimizer, painting and picking are not timed; these results are not latency promises.", results }
  writeFileSync("benchmarks/setup/compositional-dag.json", JSON.stringify(report, null, 2) + "\n")
} finally {
  await browser?.close()
  await server.close()
}
