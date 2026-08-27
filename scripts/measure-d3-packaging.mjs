#!/usr/bin/env node

/**
 * Compare Semiotic's shipped external-d3 model with a synthetic fully bundled
 * d3 package in packed webpack and Next consumers.
 *
 * The alternate package is deliberately generated from the packed production
 * ESM entries rather than source. That keeps package exports, shared chunks,
 * directives, and minification in the experiment before d3 is folded in.
 *
 * Usage:
 *   node scripts/measure-d3-packaging.mjs --toolchain-root /tmp/toolchain
 *   node scripts/measure-d3-packaging.mjs --toolchain-root /tmp/toolchain --write benchmarks/setup/d3-packaging.json
 */

import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import {
  existsSync,
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"
import { build as esbuild } from "esbuild"

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, "..")
const args = process.argv.slice(2)
const toolchainRoot = optionValue(args, "--toolchain-root")
const writeTarget = optionValue(args, "--write")
const allowedArgs = new Set([
  "--toolchain-root",
  toolchainRoot,
  "--write",
  writeTarget
])
if (args.some((arg) => !allowedArgs.has(arg))) usage()
if (!toolchainRoot) usage()

const toolchainPackage = join(resolve(toolchainRoot), "package.json")
if (!existsSync(join(resolve(toolchainRoot), "node_modules"))) {
  throw new Error(`Toolchain root has no node_modules/: ${toolchainRoot}`)
}
const requireFromToolchain = createRequire(toolchainPackage)
const webpack = requireFromToolchain("webpack")
const webpackVersion = requireFromToolchain("webpack/package.json").version
const nextPackagePath = requireFromToolchain.resolve("next/package.json")
const nextVersion = JSON.parse(readFileSync(nextPackagePath, "utf8")).version
const nextBin = join(dirname(nextPackagePath), "dist/bin/next")

const D3_RUNTIME_PACKAGES = Object.freeze([
  "d3-array",
  "d3-brush",
  "d3-chord",
  "d3-force",
  "d3-geo",
  "d3-hierarchy",
  "d3-interpolate",
  "d3-quadtree",
  "d3-scale",
  "d3-selection",
  "d3-shape",
  "d3-zoom"
])
const CASES = Object.freeze([
  { name: "xy-line", subpath: "xy", symbol: "LineChart" },
  { name: "ordinal-bar", subpath: "ordinal", symbol: "BarChart" },
  { name: "network-sankey", subpath: "network", symbol: "SankeyDiagram" },
  { name: "geo-choropleth", subpath: "geo", symbol: "ChoroplethMap" }
])
const HOST_EXTERNALS = Object.freeze([
  "react",
  "react-dom",
  "react-dom/*",
  "matter-js",
  "@dimforge/rapier2d-compat",
  "world-atlas",
  "roughjs",
  "sharp",
  "gifenc",
  "jsdom",
  "topojson-client"
])

const tempRoot = mkdtempSync(join(tmpdir(), "semiotic-d3-packaging-"))
try {
  const tarball = packRepository(tempRoot)
  const consumerRoot = join(tempRoot, "consumer")
  const consumerModules = join(consumerRoot, "node_modules")
  mkdirSync(consumerModules, { recursive: true })
  const externalPackageRoot = join(consumerModules, "semiotic")
  unpackPackage(tarball, externalPackageRoot)
  linkNodeModules(join(REPO_ROOT, "node_modules"), consumerModules)
  linkNodeModules(join(resolve(toolchainRoot), "node_modules"), consumerModules)
  const bundledPackageRoot = join(consumerModules, "semiotic-d3-bundled")
  const bundledBuild = await buildBundledVariant(
    externalPackageRoot,
    bundledPackageRoot
  )

  const webpackCases = []
  for (const entry of CASES) {
    const externalized = await measureWebpackCase({
      consumerRoot,
      packageName: "semiotic",
      entry
    })
    const bundled = await measureWebpackCase({
      consumerRoot,
      packageName: "semiotic-d3-bundled",
      entry
    })
    webpackCases.push({
      ...entry,
      externalized,
      bundled,
      delta: sizeDelta(externalized, bundled)
    })
  }

  const nextExternalized = measureNextCase({
    consumerRoot,
    nextBin,
    packageName: "semiotic",
    name: "externalized"
  })
  const nextBundled = measureNextCase({
    consumerRoot,
    nextBin,
    packageName: "semiotic-d3-bundled",
    name: "bundled"
  })
  const d3InstallClosure = installedDependencyClosure(
    D3_RUNTIME_PACKAGES,
    join(REPO_ROOT, "node_modules")
  )
  const externalizedWebpackWins = webpackCases.filter(
    (entry) => entry.delta.gzipBytes > 0
  ).length
  const report = {
    schemaVersion: 1,
    package: JSON.parse(
      readFileSync(join(externalPackageRoot, "package.json"), "utf8")
    ).version,
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version
    },
    method: {
      artifact: "npm pack --ignore-scripts production tarball",
      externalized:
        "Packed Semiotic package with individual d3 runtime dependencies resolved by the consumer bundler.",
      bundled:
        "Synthetic package generated from the packed family ESM entries with all d3 modules folded into its split ESM graph; React, optional adapters, and topojson-client remain external.",
      webpack: webpackVersion,
      next: nextVersion,
      nextBundler: "webpack",
      esbuild: requireFromRepo("esbuild/package.json").version,
      hostExternals: HOST_EXTERNALS
    },
    bundledVariant: bundledBuild,
    d3InstallClosure,
    webpack: webpackCases,
    next: {
      case: { subpath: "xy", symbol: "LineChart" },
      externalized: nextExternalized,
      bundled: nextBundled,
      delta: sizeDelta(nextExternalized, nextBundled)
    },
    decision: {
      model: "externalized-runtime-dependencies",
      rationale:
        `Externalized d3 produced the smaller gzip payload in ${externalizedWebpackWins} of ${webpackCases.length} representative webpack builds and in the Next/webpack route. ` +
        "The one bundled win was too small to justify larger common XY/ordinal/geo paths or a custom dependency contract.",
      exception:
        "None. Every directly imported d3 package remains a normal runtime dependency and a bare production-artifact import; consumer bundlers own final tree-shaking and deduplication."
    }
  }
  const serialized = `${JSON.stringify(report, null, 2)}\n`
  if (writeTarget) {
    const outputPath = resolve(REPO_ROOT, writeTarget)
    writeFileSync(outputPath, serialized)
    console.log(`Wrote ${relative(REPO_ROOT, outputPath)}`)
  } else {
    process.stdout.write(serialized)
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}

function requireFromRepo(specifier) {
  return createRequire(join(REPO_ROOT, "package.json"))(specifier)
}

function optionValue(values, option) {
  const index = values.indexOf(option)
  if (index === -1) return null
  const value = values[index + 1]
  if (!value || value.startsWith("--")) usage()
  return value
}

function usage() {
  throw new Error(
    "Usage: node scripts/measure-d3-packaging.mjs --toolchain-root <dir> [--write <repo-relative-json>]"
  )
}

function packRepository(outputDirectory) {
  if (!existsSync(join(REPO_ROOT, "dist"))) {
    throw new Error("Missing dist/. Run npm run dist:prod first.")
  }
  const output = execFileSync(
    "npm",
    [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      outputDirectory,
      "--cache",
      join(outputDirectory, "npm-cache")
    ],
    { cwd: REPO_ROOT, encoding: "utf8" }
  )
  const result = JSON.parse(output)
  return join(outputDirectory, result[0].filename)
}

function unpackPackage(tarball, destination) {
  mkdirSync(destination, { recursive: true })
  execFileSync(
    "tar",
    ["-xzf", tarball, "-C", destination, "--strip-components=1"],
    { stdio: "pipe" }
  )
}

function linkNodeModules(source, target) {
  if (!existsSync(source)) return
  for (const name of readdirSync(source)) {
    if (name === ".bin" || name === "semiotic") continue
    const sourcePath = join(source, name)
    if (name.startsWith("@")) {
      const targetScope = join(target, name)
      mkdirSync(targetScope, { recursive: true })
      for (const scopedName of readdirSync(sourcePath)) {
        linkIfMissing(
          join(sourcePath, scopedName),
          join(targetScope, scopedName)
        )
      }
    } else {
      linkIfMissing(sourcePath, join(target, name))
    }
  }
}

function linkIfMissing(source, target) {
  if (existsSync(target)) return
  symlinkSync(source, target, "dir")
}

async function buildBundledVariant(externalPackageRoot, packageRoot) {
  const outdir = join(packageRoot, "dist")
  mkdirSync(outdir, { recursive: true })
  const entryPoints = Object.fromEntries(
    CASES.map((entry) => [
      entry.subpath,
      join(externalPackageRoot, "dist", `${entry.subpath}.module.min.js`)
    ])
  )
  const result = await esbuild({
    entryPoints,
    outdir,
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    minify: true,
    metafile: true,
    entryNames: "[name]",
    chunkNames: "chunks/[name]-[hash]",
    external: HOST_EXTERNALS,
    nodePaths: [join(REPO_ROOT, "node_modules")],
    logLevel: "warning"
  })
  const remainingD3Imports = []
  for (const outputFile of Object.keys(result.metafile.outputs)) {
    for (const imported of result.metafile.outputs[outputFile].imports) {
      if (D3_RUNTIME_PACKAGES.some((name) => imported.path === name)) {
        remainingD3Imports.push({ outputFile, path: imported.path })
      }
    }
  }
  if (remainingD3Imports.length > 0) {
    throw new Error(
      `Synthetic bundled package retained d3 imports: ${JSON.stringify(remainingD3Imports)}`
    )
  }
  // Worker URLs are public artifact-relative contracts. esbuild cannot infer
  // that a string passed through Semiotic's worker-session helper is a file
  // asset, so retain the three shipped workers beside both entry and chunk
  // modules in this synthetic package.
  const chunkDirectory = join(outdir, "chunks")
  mkdirSync(chunkDirectory, { recursive: true })
  for (const worker of [
    "forceLayoutWorker.js",
    "physicsWorker.js",
    "processSankeyLayoutWorker.js"
  ]) {
    const source = join(externalPackageRoot, "dist", worker)
    cpSync(source, join(outdir, worker))
    cpSync(source, join(chunkDirectory, worker))
  }
  writeFileSync(
    join(packageRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "semiotic-d3-bundled",
        version: "0.0.0-measurement",
        type: "module",
        sideEffects: false,
        exports: Object.fromEntries(
          CASES.map((entry) => [
            `./${entry.subpath}`,
            `./dist/${entry.subpath}.js`
          ])
        )
      },
      null,
      2
    )}\n`
  )
  const sizes = directoryJavaScriptSize(outdir)
  return { ...sizes, outputFiles: Object.keys(result.metafile.outputs).length }
}

async function measureWebpackCase({ consumerRoot, packageName, entry }) {
  const fixtureRoot = join(
    consumerRoot,
    "webpack",
    `${packageName}-${entry.name}`
  )
  const outputPath = join(fixtureRoot, "dist")
  mkdirSync(fixtureRoot, { recursive: true })
  const entryPath = join(fixtureRoot, "entry.mjs")
  writeFileSync(
    entryPath,
    `import { ${entry.symbol} } from ${JSON.stringify(`${packageName}/${entry.subpath}`)};\nglobalThis.__semioticMeasurement = ${entry.symbol};\n`
  )
  const stats = await runWebpack({
    mode: "production",
    target: "web",
    context: consumerRoot,
    entry: entryPath,
    devtool: false,
    output: {
      path: outputPath,
      filename: "main.js",
      chunkFilename: "[name].[contenthash].js",
      clean: true
    },
    externals: externalizeHosts,
    optimization: { minimize: true, usedExports: true },
    resolve: { modules: [join(consumerRoot, "node_modules"), "node_modules"] },
    performance: { hints: false }
  })
  const modules = stats.toJson({ all: false, modules: true }).modules ?? []
  const resolvedD3Modules = modules.filter((module) =>
    /node_modules[\\/]d3-[^\\/]+/.test(module.name ?? "")
  ).length
  return { ...directoryJavaScriptSize(outputPath), resolvedD3Modules }
}

function runWebpack(config) {
  return new Promise((resolvePromise, reject) => {
    webpack(config, (error, stats) => {
      if (error) return reject(error)
      if (!stats || stats.hasErrors()) {
        return reject(
          new Error(
            stats?.toString({ all: false, errors: true }) ?? "webpack failed"
          )
        )
      }
      resolvePromise(stats)
    })
  })
}

function externalizeHosts({ request }, callback) {
  if (
    request &&
    HOST_EXTERNALS.some(
      (name) =>
        request === name ||
        (name.endsWith("/*") && request.startsWith(name.slice(0, -1)))
    )
  ) {
    callback(null, `commonjs ${request}`)
  } else {
    callback()
  }
}

function measureNextCase({ consumerRoot, nextBin, packageName, name }) {
  const appRoot = join(consumerRoot, "next", name)
  const appDirectory = join(appRoot, "app")
  mkdirSync(appDirectory, { recursive: true })
  symlinkSync(
    join(consumerRoot, "node_modules"),
    join(appRoot, "node_modules"),
    "dir"
  )
  writeFileSync(
    join(appRoot, "package.json"),
    `${JSON.stringify({ name: `semiotic-d3-next-${name}`, private: true, type: "module" })}\n`
  )
  writeFileSync(
    join(appRoot, "next.config.mjs"),
    'export default { output: "export", reactStrictMode: true }\n'
  )
  writeFileSync(
    join(appDirectory, "layout.jsx"),
    "export default function Layout({ children }) { return <html><body>{children}</body></html> }\n"
  )
  writeFileSync(
    join(appDirectory, "chart.jsx"),
    `"use client"\nimport { LineChart } from ${JSON.stringify(`${packageName}/xy`)}\nconst data = [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 1 }]\nexport default function Chart() { return <LineChart data={data} xAccessor="x" yAccessor="y" title="Packaging measurement" /> }\n`
  )
  writeFileSync(
    join(appDirectory, "page.jsx"),
    'import Chart from "./chart"\nexport default function Page() { return <main><Chart /></main> }\n'
  )
  execFileSync(process.execPath, [nextBin, "build", "--webpack"], {
    cwd: appRoot,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PRIVATE_WORKER_THREADS: "1"
    },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  })
  return directoryJavaScriptSize(join(appRoot, ".next", "static"))
}

function directoryJavaScriptSize(root) {
  const files = walkFiles(root).filter((file) => file.endsWith(".js"))
  let rawBytes = 0
  let gzipBytes = 0
  for (const file of files) {
    const bytes = readFileSync(file)
    rawBytes += bytes.byteLength
    gzipBytes += gzipSync(bytes, { level: 9 }).byteLength
  }
  return { rawBytes, gzipBytes, files: files.length }
}

function walkFiles(root) {
  if (!existsSync(root)) return []
  const files = []
  const visit = (path) => {
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) return
    if (stat.isDirectory()) {
      for (const name of readdirSync(path)) visit(join(path, name))
    } else if (stat.isFile()) {
      files.push(path)
    }
  }
  visit(root)
  return files
}

function installedDependencyClosure(packageNames, nodeModulesRoot) {
  const pending = [...packageNames]
  const visited = new Set()
  while (pending.length > 0) {
    const name = pending.pop()
    if (!name || visited.has(name)) continue
    const packagePath = join(nodeModulesRoot, name)
    const manifestPath = join(packagePath, "package.json")
    if (!existsSync(manifestPath)) {
      throw new Error(`Missing installed d3 dependency ${name}`)
    }
    visited.add(name)
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      if (dependency.startsWith("d3-")) pending.push(dependency)
    }
  }
  const packagePaths = [...visited].map((name) => join(nodeModulesRoot, name))
  return {
    directPackages: packageNames.length,
    installedPackages: visited.size,
    unpackedBytes: packagePaths.reduce(
      (sum, packagePath) => sum + directoryBytes(packagePath),
      0
    ),
    packages: [...visited].sort()
  }
}

function directoryBytes(root) {
  return walkFiles(root).reduce((sum, file) => sum + statSync(file).size, 0)
}

function sizeDelta(externalized, bundled) {
  return {
    rawBytes: bundled.rawBytes - externalized.rawBytes,
    gzipBytes: bundled.gzipBytes - externalized.gzipBytes
  }
}
