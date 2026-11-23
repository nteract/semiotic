import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { buildSync } from "esbuild"
import { packNpmArtifact } from "./lib/npm-pack.mjs"

const scripts = dirname(fileURLToPath(import.meta.url))
export const edgeVmVersion = "5.0.0"

export function checkPackedServerRuntimes(consumerDirectory) {
  const project = realpathSync(consumerDirectory)
  const fixture = join(project, "runtime-matrix")
  cpSync(join(scripts, "fixtures/packed-server-runtimes"), fixture, {
    recursive: true
  })
  const require = createRequire(join(project, "package.json"))
  const packageRoot = dirname(require.resolve("semiotic/package.json"))
  const { exports } = require("semiotic/package.json")

  console.log(
    `Packed server consumers with ReactDOM ${require("react-dom/package.json").version}`
  )
  for (const [file, condition] of [
    ["node.cjs", "require"],
    ["node.mjs", "import"]
  ]) {
    const entry = execFileSync(process.execPath, [join(fixture, file)], {
      cwd: project,
      encoding: "utf8"
    }).trim()
    assert.equal(
      realpathSync(entry),
      realpathSync(resolve(packageRoot, exports["./server"][condition]))
    )
    const { metafile } = buildSync({
      absWorkingDir: project,
      entryPoints: [entry],
      bundle: true,
      platform: "node",
      format: condition === "import" ? "esm" : "cjs",
      packages: "external",
      write: false,
      metafile: true
    })
    const imports = Object.values(metafile.outputs).flatMap(
      (output) => output.imports
    )
    assert.ok(
      imports.some(
        (module) => module.external && module.path === "react-dom/server"
      ),
      `${file} must use the consumer's react-dom/server`
    )
    console.log(
      `✓ ${file}: published ${condition} export, external ReactDOM, chart and dashboard`
    )
  }

  const edgeExport = exports["./server/edge"]
  const reactPackage = require("react-dom/package.json")
  const peer = reactPackage.exports["./server"]
  const reactRoot = dirname(require.resolve("react-dom/package.json"))
  const { EdgeVM } = require("@edge-runtime/vm")
  for (const [platform, edgeLight] of [
    ["neutral", true],
    ["browser", true],
    ["browser", false]
  ]) {
    const { outputFiles, metafile } = buildSync({
      absWorkingDir: project,
      entryPoints: [join(fixture, "edge.mjs")],
      bundle: true,
      platform,
      format: "iife",
      conditions: edgeLight ? ["edge-light", "browser"] : ["browser"],
      mainFields: ["module", "main"],
      define: { "process.env.NODE_ENV": '"production"' },
      write: false,
      metafile: true
    })
    const inputs = Object.keys(metafile.inputs).map((input) =>
      resolve(project, input)
    )
    const entry = edgeLight
      ? edgeExport["edge-light"].import
      : edgeExport.import
    assert.ok(
      inputs.includes(resolve(packageRoot, entry)),
      `Expected published ${entry}`
    )
    const reactEntry = edgeLight
      ? (peer["edge-light"] ?? peer.browser)
      : peer.browser
    assert.ok(
      inputs.includes(resolve(reactRoot, reactEntry)),
      `Expected ReactDOM ${reactEntry}`
    )
    assert.ok(
      !inputs.some((path) =>
        /[/\\]node_modules[/\\](?:sharp[/\\]|jsdom[/\\]|react-dom[/\\]client\.js$)/.test(
          path
        )
      ),
      "Edge rendering pulled in a native or DOM dependency"
    )
    if (edgeLight) {
      new EdgeVM().evaluate(outputFiles[0].text)
      console.log(
        `✓ Vercel Edge Runtime (${platform} bundler): synchronous chart and dashboard`
      )
    } else {
      console.log(
        "✓ Browser bundler: published browser entry and ReactDOM browser renderer"
      )
    }
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({ options: { tarball: { type: "string" } } })
  const root = dirname(scripts)
  const workspace = realpathSync(
    mkdtempSync(join(tmpdir(), "semiotic-server-consumer-"))
  )
  try {
    const registry =
      process.env.SEMIOTIC_PACK_REGISTRY || "https://registry.npmjs.org"
    const archive = values.tarball
      ? resolve(values.tarball)
      : packNpmArtifact({ cwd: root, destination: workspace, registry })
    const require = createRequire(join(root, "package.json"))
    const react = require("react/package.json").version
    const reactDom = require("react-dom/package.json").version
    for (const [reactVersion, domVersion] of [
      ["18.1.0", "18.1.0"],
      [react, reactDom]
    ]) {
      const project = join(workspace, `react-${domVersion}`)
      mkdirSync(project)
      writeFileSync(
        join(project, "package.json"),
        JSON.stringify({
          name: "semiotic-server-consumer",
          private: true,
          type: "module",
          dependencies: {
            semiotic: `file:${archive}`,
            react: reactVersion,
            "react-dom": domVersion,
            "@edge-runtime/vm": edgeVmVersion
          }
        })
      )
      execFileSync(
        "npm",
        [
          "install",
          "--omit=optional",
          "--ignore-scripts",
          "--no-audit",
          "--no-fund",
          "--package-lock=false",
          "--dry-run=false",
          "--registry",
          registry
        ],
        { cwd: project, stdio: "inherit" }
      )
      checkPackedServerRuntimes(project)
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
}
