import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { it } from "node:test"

const root = fileURLToPath(new URL("../", import.meta.url))

// Executed in a fresh Node process so date parsing and Intl use the requested
// host timezone/locale. Exercise shipped artifacts, not source transforms.
function verify(runtime) {
  if (runtime.bin) {
    const bins = runtime.bin([0.1, 0.3, 0.5, 0.9, null, Infinity].map(v => ({ v })), {
      field: "v", bins: 4, domain: [0.1, 0.9]
    })
    assert.deepEqual(bins.map(({ x0, x1, value }) => [x0, x1, value]), [
      [0.1, 0.3, 1], [0.3, 0.5, 1], [0.5, 0.7, 1], [0.7, 0.9, 1]
    ])
    assert.throws(() => runtime.bin([], { field: "v", bins: 0 }), RangeError)
    assert.throws(() => runtime.bin([], { field: "v", domain: [1, -1] }), RangeError)
    return
  }
  const summary = runtime.summarizeData([
    { v: ".5", zip: "02134", t: "2020-01-01" },
    { v: "+5", zip: "02135", t: "2020-01-01T00:00:00" },
    { v: "bad", zip: "02136", t: "2019-12-31T16:00:00-08:00" },
    { v: null, zip: "02137", t: "2020/01/01" }
  ])
  assert.deepEqual(summary.fields.v, {
    type: "numeric", min: 0.5, max: 5, mean: 2.75, median: 2.75,
    observedCount: 3, missingCount: 1, excludedCount: 1
  })
  assert.equal(summary.fields.zip.type, "categorical")
  assert.deepEqual(summary.fields.t, {
    type: "date", min: "2020-01-01T00:00:00.000Z", max: "2020-01-01T00:00:00.000Z",
    observedCount: 4, missingCount: 0, excludedCount: 1
  })
  if (!runtime.computeAnnotationFreshness) return
  const notes = JSON.parse(JSON.stringify([{
    type: "callout", provenance: { createdAt: "2020-01-01T00:00:00" }, lifecycle: { ttlHint: "P1W" }
  }]))
  const options = { dataExtent: ["2020-02-01", "invalid", "2020-01-01"] }
  assert.equal(runtime.computeAnnotationFreshness(notes, options)[0].lifecycle.freshness, "expired")
  assert.deepEqual(runtime.applyAnnotationLifecycle(notes, options), [])
  assert.throws(() => runtime.computeAnnotationFreshness([{
    ...notes[0], lifecycle: { ttlHint: "P1M" }
  }], options), /ttlHint/)
  const annotation = runtime.fromDbtArtifacts({ sources: { results: [{
    unique_id: "source.shop.orders", status: "error", max_loaded_at: "2026-06-20T00:00:00"
  }] } }).annotations[0]
  assert.equal(annotation.label, "orders stale since Jun 20")
  assert.equal(annotation.value, Date.UTC(2026, 5, 20))
}

for (const [TZ, LANG] of [["UTC", "en_US.UTF-8"], ["America/Los_Angeles", "de_DE.UTF-8"], ["Asia/Tokyo", "ja_JP.UTF-8"]]) {
  for (const entry of ["semiotic-data", "semiotic-ai", "semiotic-ai-core"]) {
    for (const format of ["cjs", "esm"]) {
      it(`${entry} ${format}: deterministic data semantics under ${TZ} / ${LANG}`, () => {
        const filename = resolve(root, "dist", `${entry}${format === "esm" ? ".module" : ""}.min.js`)
        const load = format === "esm"
          ? `await import(${JSON.stringify(pathToFileURL(filename).href)})`
          : `createRequire(import.meta.url)(${JSON.stringify(filename)})`
        const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
          import assert from "node:assert/strict"
          import { createRequire } from "node:module"
          const runtime = ${load}
          const verify = ${verify.toString()}
          verify(runtime)
        `], { cwd: root, env: { ...process.env, TZ, LANG, LC_ALL: LANG }, encoding: "utf8", timeout: 20000 })
        assert.equal(result.status, 0, result.stderr || String(result.error))
      })
    }
  }
}
