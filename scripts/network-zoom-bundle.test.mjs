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

test("perspective pictograms stay opt-in and dependency-free", async () => {
  for (const entry of ["semiotic", "semiotic-network", "semiotic-xy"]) {
    const result = await consumer(`./src/components/${entry}`)
    assert.equal(
      Object.keys(result.metafile.inputs).some((path) =>
        path.includes("/networkPerspectiveKit/")
      ),
      false,
      entry
    )
  }
  const kit = await consumer("./src/components/semiotic-network-perspective")
  const inputs = Object.keys(kit.metafile.inputs)
  assert.equal(inputs.some((path) => /networkPerspective(Scene|Runtime|Extras)|StreamNetworkFrame/.test(path)), false)
  assert.ok(gzipSync(kit.outputFiles[0].contents).length < 4 * 1024)
})

test("static network rendering excludes the perspective animation runtime", async () => {
  for (const entry of ["semiotic-server", "semiotic-server-edge"]) {
    const result = await consumer(`./src/components/${entry}`)
    const inputs = result.metafile.inputs
    const reachable = new Set()
    const visit = (path) => {
      if (reachable.has(path) || !inputs[path]) return
      reachable.add(path)
      for (const dependency of inputs[path].imports) {
        if (dependency.kind !== "dynamic-import") visit(dependency.path)
      }
    }
    visit("<stdin>")
    assert.ok([...reachable].some((path) => path.endsWith("/networkPerspectiveScene.ts")), entry)
    assert.equal([...reachable].some((path) => path.endsWith("/networkPerspectiveRuntime.ts")), false, entry)
  }
  const network = await consumer("./src/components/semiotic-network", "projectNetworkScene")
  assert.ok(Object.keys(network.metafile.inputs).some((path) => path.endsWith("/networkPerspectiveScene.ts")))
})
