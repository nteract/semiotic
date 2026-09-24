import { test } from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { gzipSync } from "node:zlib"
import { readFileSync } from "node:fs"

async function consumer(entry, names = "*") {
  return build({
    stdin: {
      contents:
        names === "*"
          ? `export * from "${entry}"`
          : `export {${names}} from "${entry}"`,
      resolveDir: process.cwd(),
      loader: "ts"
    },
    bundle: true,
    write: false,
    minify: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    external: ["react", "react-dom", "react/jsx-runtime"],
    metafile: true,
    logLevel: "silent"
  })
}

test("ordinary imports exclude the optional gesture/LOD runtime", async () => {
  for (const entry of [
    "semiotic",
    "semiotic-network",
    "semiotic-xy",
    "semiotic-ordinal"
  ]) {
    const result = await consumer(`./src/components/${entry}`)
    assert.equal(
      Object.keys(result.metafile.inputs).some((path) =>
        path.includes("/networkZoom/")
      ),
      false,
      entry
    )
  }
})

test("opt-in gestures stay small and published zoom entries reuse the canonical chart", async () => {
  const base = await consumer(
    "./src/components/semiotic-network",
    "NetworkCustomChart"
  )
  const zoom = await consumer("./src/components/semiotic-network-zoom")
  const driver = await consumer("./src/components/stream/networkZoom/gestures")
  const gzip = (result) => gzipSync(result.outputFiles[0].contents).length
  // Initial measured overhead is ~4 KiB. This cap includes the wrapper,
  // geometry, controls and LOD, and deliberately excludes the existing chart.
  assert.ok(
    gzip(zoom) - gzip(base) < 6 * 1024,
    `Optional runtime: ${gzip(zoom) - gzip(base)} gzip bytes`
  )
  assert.ok(
    gzip(driver) < 4 * 1024,
    `Pointer driver: ${gzip(driver)} gzip bytes`
  )
  const esm = readFileSync("dist/semiotic-network-zoom.module.min.js", "utf8")
  const cjs = readFileSync("dist/semiotic-network-zoom.min.js", "utf8")
  assert.match(esm, /network\.module\.min\.js/)
  assert.match(cjs, /network\.min\.js/)
  assert.doesNotMatch(
    readFileSync("dist/semiotic-client-cjs-shared.min.js", "utf8"),
    /Network viewport controls/
  )
})
