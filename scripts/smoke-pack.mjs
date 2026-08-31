#!/usr/bin/env node
/**
 * Pack-and-import smoke test.
 *
 * Runs `npm pack`, installs the resulting tarball into a throwaway temp
 * project, and imports every published module sub-path entry point under both
 * ESM (`import`) and CJS (`require`). Metadata-only exports such as
 * `semiotic/package.json` are resolved and parsed separately. This catches
 * packaging bugs the build itself can't see — missing `files` entries, broken
 * `exports` map keys, `.d.ts` files that don't actually exist on disk, missing
 * chunk stubs, a NodeNext TypeScript consumer that cannot resolve public props,
 * and worker URLs that silently fall back in one module format.
 *
 * Run locally via `npm run check:pack`. Requires the dist bundles to be
 * built (`npm run dist`). Pass `--tarball <path>` to validate one already
 * created archive instead of packing the checkout. Exits non-zero on any
 * import failure.
 */
import { execFileSync, execSync } from "node:child_process"
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readdirSync,
  existsSync,
  readFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const packedConsumerFixture = join(
  __dirname,
  "fixtures",
  "packed-typescript-consumer"
)
const packedExampleConsumerFixture = join(
  __dirname,
  "fixtures",
  "packed-example-consumer"
)
const publicNpmRegistry =
  process.env.SEMIOTIC_PACK_REGISTRY || "https://registry.npmjs.org"
// Release CI sets this to the single immutable tarball it will publish. The
// default continues to pack the checkout for ordinary local/package checks.
const cliArgs = process.argv.slice(2)
const tarballOption = optionValue(cliArgs, "--tarball")
if (cliArgs.some((arg) => arg !== "--tarball" && arg !== tarballOption)) {
  throw new Error("Usage: node scripts/smoke-pack.mjs [--tarball <path>]")
}
const environmentTarball = process.env.SEMIOTIC_PACK_TARBALL?.trim() || null
if (
  tarballOption &&
  environmentTarball &&
  resolve(repoRoot, tarballOption) !== resolve(repoRoot, environmentTarball)
) {
  throw new Error(
    "Use either --tarball or SEMIOTIC_PACK_TARBALL, not two different tarballs"
  )
}
const suppliedTarball = tarballOption || environmentTarball
const sourcePackage = JSON.parse(
  readFileSync(join(repoRoot, "package.json"), "utf8")
)
const tmp = mkdtempSync(join(tmpdir(), "semiotic-smoke-"))
const npmCache = join(tmp, "npm-cache")

function optionValue(args, option) {
  const index = args.indexOf(option)
  if (index === -1) return null
  const value = args[index + 1]
  if (
    !value ||
    value.startsWith("--") ||
    args.indexOf(option, index + 1) !== -1
  ) {
    throw new Error(`Missing value for ${option}`)
  }
  return value
}

function run(cmd, { env, ...opts } = {}) {
  return execSync(cmd, {
    stdio: "pipe",
    encoding: "utf8",
    ...opts,
    env: { ...process.env, npm_config_cache: npmCache, ...env }
  })
}

// Multiline probes must bypass the shell: JSON-quoting a `node -e` string
// leaves literal `\n` tokens after shell parsing, which Node then reads as
// invalid source. Argument-vector execution also makes embedded regexes and
// quotes unambiguous.
function runNodeEval(
  code,
  { cwd, inputType = "module", conditions = [] } = {}
) {
  return execFileSync(
    process.execPath,
    [
      ...conditions.map((condition) => `--conditions=${condition}`),
      `--input-type=${inputType}`,
      "-e",
      code
    ],
    {
      cwd,
      stdio: "pipe",
      encoding: "utf8",
      env: { ...process.env, npm_config_cache: npmCache }
    }
  )
}

/**
 * Core subpaths are intended for Server Component and headless consumers.
 * Normal Node imports do not expose the reduced React `react-server` surface,
 * so they miss eager createContext/hook dependencies hidden in shared chunks.
 */
function checkReactServerCoreImports(proj, failures) {
  const entries = [
    "semiotic/ai/core",
    "semiotic/themes/core",
    "semiotic/utils/core",
    "semiotic/recipes/core"
  ]
  const code = `
    const entries = ${JSON.stringify(entries)}
    for (const entry of entries) {
      const module = await import(entry)
      if (!module || Object.keys(module).length === 0) {
        throw new Error(entry + " returned no exports")
      }
    }
    console.log(entries.length + " core entries")
  `
  try {
    const out = runNodeEval(code, {
      cwd: proj,
      conditions: ["react-server"]
    })
    console.log(`  ✓ react-server imports: ${out.trim()}`)
  } catch (err) {
    failures.push(`react-server core imports: ${firstLine(err)}`)
  }
}

// `execSync` errors carry `stderr`/`stdout` as Buffers when no encoding is
// applied to the failing channel. Coerce explicitly so `.split` etc. don't
// crash while we're already in an error path.
// Prefer the real Error line (ERR_MODULE_NOT_FOUND, etc.) over stack frames
// like `node:internal/modules/package_json_reader:314`.
function firstLine(err) {
  // `npm pack ... 2>&1` intentionally puts diagnostics on stdout. Node still
  // supplies an empty stderr Buffer on the Error object, so nullish-coalescing
  // stderr/stdout would hide the useful failure text. Combine every non-empty
  // channel instead.
  const raw = [err?.stderr, err?.stdout, err?.message, err]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join("\n")
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  const meaningful = lines.find(
    (l) =>
      /ERR_[A-Z_]+|Cannot find (?:package|module)|Error:|SyntaxError:|TypeError:/.test(
        l
      ) &&
      !l.startsWith("node:internal/") &&
      !l.startsWith("at ")
  )
  return (
    meaningful ??
    lines.find(
      (l) => !l.startsWith("node:internal/") && !l.startsWith("at ")
    ) ??
    lines[0] ??
    ""
  )
}

function findTarball(dir) {
  const files = readdirSync(dir)
  const tarball = files.find(
    (f) => f.startsWith("semiotic-") && f.endsWith(".tgz")
  )
  if (!tarball) {
    // Surface what's actually in the dir so CI logs aren't a dead end —
    // npm pack returning 0 without producing a tarball is rare enough
    // that the directory listing is the single most useful breadcrumb.
    throw new Error(
      `no tarball produced in ${dir} (contents: ${files.length === 0 ? "<empty>" : files.join(", ")})`
    )
  }
  return join(dir, tarball)
}

function localModuleSpecifiers(text) {
  const specifiers = new Set()
  const patterns = [
    /\b(?:import|export)\s*[^"'()]*?\s*from\s*["'](\.\/[^"']+)["']/g,
    /\bimport\s*["'](\.\/[^"']+)["']/g,
    /\bimport\(\s*["'](\.\/[^"']+)["']\s*\)/g
  ]
  for (const re of patterns) {
    let match
    while ((match = re.exec(text)) !== null) {
      specifiers.add(match[1])
    }
  }
  return specifiers
}

function assertLocalChunksExist(packageRoot, entryRel, failures) {
  const seen = new Set()
  const visit = (relPath) => {
    if (seen.has(relPath)) return
    seen.add(relPath)
    const absPath = join(packageRoot, relPath.replace(/^\.\//, ""))
    if (!existsSync(absPath)) {
      failures.push(`${entryRel}: missing local ESM chunk ${relPath}`)
      return
    }
    const text = readFileSync(absPath, "utf8")
    const baseDir = dirname(relPath)
    for (const specifier of localModuleSpecifiers(text)) {
      const nextRel = `./${resolve(packageRoot, baseDir, specifier).slice(packageRoot.length + 1)}`
      visit(nextRel)
    }
  }
  visit(entryRel)
}

function collectFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...collectFiles(path))
    else files.push(path)
  }
  return files
}

function checkPrivateDeclarations(packageRoot, failures) {
  const distRoot = join(packageRoot, "dist")
  const leaked = collectFiles(distRoot)
    .filter((path) => path.endsWith(".d.ts"))
    .map((path) => path.slice(packageRoot.length + 1).replaceAll("\\", "/"))
    .filter((path) =>
      /(?:^|\/)(?:__tests__|test-utils|internal)(?:\/|$)/.test(path)
    )
    .sort()

  if (leaked.length > 0) {
    failures.push(`private declarations published: ${leaked.join(", ")}`)
    return
  }
  console.log("  ✓ test/internal declarations are absent from the package")
}

function checkClientBoundaryDirectives(packageRoot, exportsMap, failures) {
  const clientEntries = [
    "./realtime",
    "./realtime/core",
    "./realtime/react",
    "./themes/react",
    "./utils",
    "./utils/react",
    "./recipes",
    "./recipes/react"
  ]
  const serverSafeEntries = [
    "./utils/core",
    "./recipes/core",
    "./themes",
    "./themes/core"
  ]

  for (const [expectedClient, entries] of [
    [true, clientEntries],
    [false, serverSafeEntries]
  ]) {
    for (const entry of entries) {
      const exportEntry = exportsMap[entry]
      if (!exportEntry || typeof exportEntry !== "object") {
        failures.push(
          `${entry}: missing conditional export for client-boundary check`
        )
        continue
      }
      for (const condition of ["import", "require"]) {
        const target = exportEntry[condition]
        if (typeof target !== "string") continue
        const code = readFileSync(
          join(packageRoot, target.replace(/^\.\//, "")),
          "utf8"
        )
        const hasDirective = /^["']use client["'];/.test(code)
        if (hasDirective !== expectedClient) {
          failures.push(
            `${entry} (${condition}) ${expectedClient ? "is missing" : "unexpectedly carries"} ` +
              'the "use client" directive'
          )
        }
      }
    }
  }

  if (!failures.some((failure) => failure.includes('"use client" directive'))) {
    console.log(
      "  ✓ mixed React facades are client-tagged; core facades remain server-safe"
    )
  }
}

/**
 * `semiotic/utils` combines the React-free core entry with selected browser
 * helpers. Both sub-entries intentionally expose `resolveResponsiveDimension`
 * for direct consumers, but the combined ESM facade must select the core copy
 * rather than forwarding two `export *` declarations. Bundlers such as webpack
 * otherwise warn about the ambiguous star export and omit it from the barrel.
 */
function checkUtilsFacadeExportContract(packageRoot, exportsMap, failures) {
  const exportEntry = exportsMap["./utils"]
  const target = exportEntry && typeof exportEntry === "object"
    ? exportEntry.import
    : null
  if (typeof target !== "string") {
    failures.push("./utils: missing ESM export for facade contract check")
    return
  }

  const code = readFileSync(
    join(packageRoot, target.replace(/^\.\//, "")),
    "utf8"
  )
  const exportsCore = /export\*from["']\.\/semiotic-utils-core\.module\.min\.js["']/.test(code)
  const reactHelperExport =
    /export\{([^}]*)\}from["']\.\/semiotic-utils-react\.module\.min\.js["']/.exec(code)?.[1] ?? ""
  const reactHelperNames = new Set(reactHelperExport.split(","))
  const reexportsReactHelpers = [
    "ThemeProvider",
    "useTheme",
    "useReducedMotion",
    "useHighContrast",
    "useResponsiveSize",
  ].every((helper) => reactHelperNames.has(helper))
  const starsReact = /export\*from["']\.\/semiotic-utils-react\.module\.min\.js["']/.test(code)

  if (!exportsCore || !reexportsReactHelpers || starsReact) {
    failures.push(
      "./utils ESM facade must star-export core and explicitly re-export React helpers to avoid conflicting star exports"
    )
    return
  }
  console.log("  ✓ utils facade has no conflicting core/react star exports")
}

/**
 * `semiotic/themes/core` is a data/serialization entry and must remain usable
 * in RSC and edge code that does not install or initialize a React runtime.
 * Inspect the packed artifact's complete local import graph rather than only
 * its facade: shared chunks can otherwise hide a transitive React dependency.
 */
function checkThemeCoreReactFree(packageRoot, exportsMap, failures) {
  const exportEntry = exportsMap["./themes/core"]
  if (!exportEntry || typeof exportEntry !== "object") {
    failures.push(
      "./themes/core: missing conditional export for React-free graph check"
    )
    return
  }

  const visitGraph = (entryPath) => {
    const seen = new Set()
    const visit = (filePath) => {
      const resolvedPath = resolve(filePath)
      if (seen.has(resolvedPath) || !existsSync(resolvedPath)) return
      seen.add(resolvedPath)
      const code = readFileSync(resolvedPath, "utf8")
      const localSpecifiers = [
        ...Array.from(
          code.matchAll(
            /(?:from\s*|import\s*)["'](\.?\.?\/[^"']+\.js)["']/g
          ),
          (match) => match[1]
        ),
        ...Array.from(
          code.matchAll(
            /require\(\s*["'](\.?\.?\/[^"']+\.js)["']\s*\)/g
          ),
          (match) => match[1]
        )
      ]
      for (const specifier of localSpecifiers) {
        visit(resolve(dirname(resolvedPath), specifier))
      }
    }
    visit(entryPath)
    return seen
  }

  let failed = false
  for (const condition of ["import", "require"]) {
    const target = exportEntry[condition]
    if (typeof target !== "string") continue
    const entryPath = join(packageRoot, target.replace(/^\.\//, ""))
    for (const filePath of visitGraph(entryPath)) {
      const code = readFileSync(filePath, "utf8")
      const importsReact =
        /(?:from\s*|import\s*(?:\(\s*)?)["']react(?:\/[^"']+)?["']/.test(
          code
        ) ||
        /require\(\s*["']react(?:\/[^"']+)?["']\s*\)/.test(code)
      if (!importsReact) continue
      failed = true
      failures.push(
        `./themes/core (${condition}) transitively imports React through ${filePath.slice(packageRoot.length + 1)}`
      )
    }
  }

  if (!failed) {
    console.log("  ✓ themes/core packed import graph is React-free")
  }
}

/**
 * CommonJS subpaths must share one React-context runtime. A module resolving is
 * insufficient: independent bundled copies let a provider render normally
 * while a family chart silently reads the default context from another copy.
 */
function checkCjsClientContextIdentity(proj, failures) {
  const code = `
    const React = require("react")
    const { renderToStaticMarkup } = require("react-dom/server")
    const themes = require("semiotic/themes/react")
    const utils = require("semiotic/utils")
    const line = require("semiotic/line")
    const { LineChart } = require("semiotic/xy")
    if (themes.ThemeProvider !== utils.ThemeProvider) {
      throw new Error("mixed CommonJS facades expose different ThemeProvider instances")
    }
    if (line.LineChart !== LineChart) {
      throw new Error("line and xy CommonJS facades expose different LineChart instances")
    }
    const color = "#010203"
    const data = [
      { x: 0, y: 1, series: "a" },
      { x: 1, y: 2, series: "a" },
    ]
    const html = renderToStaticMarkup(
      React.createElement(
        themes.ThemeProvider,
        { theme: { mode: "dark", colors: { categorical: [color] } } },
        React.createElement(line.LineChart, {
          data,
          xAccessor: "x",
          yAccessor: "y",
          lineBy: "series",
          colorBy: "series",
        }),
      ),
    )
    if (!/<path[^>]*stroke="#010203"/.test(html)) {
      throw new Error("themes/react provider did not reach the line/xy CommonJS chart")
    }
    console.log("shared provider identity and themed family render")
  `
  try {
    const out = runNodeEval(code, { cwd: proj, inputType: "commonjs" })
    console.log(`  ✓ CommonJS client runtime: ${out.trim()}`)
  } catch (err) {
    failures.push(`CommonJS client runtime: ${firstLine(err)}`)
  }
}

/**
 * The CJS recipes entry must keep d3-geo lazy. ESM already has shared chunks,
 * but a monolithic CommonJS namespace can otherwise make every non-geo
 * recipe pay for the geographic-dot-grid implementation at require time.
 */
function checkCjsRecipeGeoIsolation(proj, failures) {
  const code = `
    const Module = require("node:module")
    const originalLoad = Module._load
    let loaded = false
    Module._load = function(request, ...args) {
      if (request === "d3-geo") loaded = true
      return originalLoad.call(this, request, ...args)
    }
    const recipeEntries = [
      "semiotic/recipes",
      "semiotic/recipes/core",
      "semiotic/recipes/react",
    ]
    const expectedEntry = require("node:path").join(
      "dist",
      "semiotic-recipes.min.js",
    )
    const resolvedEntry = require.resolve("semiotic/recipes")
    if (!resolvedEntry.endsWith(expectedEntry)) {
      throw new Error("semiotic/recipes did not resolve through its packed require condition: " + resolvedEntry)
    }
    const namespaces = recipeEntries.map((entry) => [entry, require(entry)])
    if (loaded) throw new Error("a CJS recipe namespace eagerly loaded d3-geo")
    const geoExports = new Set([
      "geographicDotGridLayout",
      "sampleGeographicDotGrid",
    ])
    let checked = 0
    for (const [entry, namespace] of namespaces) {
      for (const name of Object.keys(namespace)) {
        if (geoExports.has(name)) continue
        void namespace[name]
        checked += 1
        if (loaded) {
          throw new Error(entry + " export " + name + " loaded d3-geo")
        }
      }
    }
    const recipes = require("semiotic/recipes")
    if (typeof recipes.dagreLayout !== "function") {
      throw new Error("semiotic/recipes lost its non-geo dagreLayout export")
    }
    const dotGrid = recipes.geographicDotGridLayout
    if (typeof dotGrid !== "function" || !loaded) {
      throw new Error("geographic dot-grid export was not lazy-loadable")
    }
    const { geoEquirectangular, geoPath } = require("d3-geo")
    const area = {
      type: "Feature",
      id: "compatibility-area",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[[-20, -10], [-20, 10], [20, 10], [20, -10], [-20, -10]]],
      },
    }
    const projection = geoEquirectangular().fitExtent([[0, 0], [120, 80]], area)
    const sampled = recipes.sampleGeographicDotGrid(
      [area],
      {
        geoPath: geoPath(projection),
        invertedPoint: (x, y) => projection.invert([x, y]),
      },
      { width: 120, height: 80 },
      { columns: 8 },
    )
    if (sampled.dots.length === 0) {
      throw new Error("d3-geo 3.1.0 did not execute the geoBounds/geoContains recipe path")
    }
    console.log(checked + " non-geo exports stayed d3-geo-free; packed require condition and d3-geo 3.1.0 recipe execution passed")
  `
  try {
    const out = runNodeEval(code, { cwd: proj, inputType: "commonjs" })
    console.log(`  ✓ CommonJS recipe geo isolation: ${out.trim()}`)
  } catch (err) {
    failures.push(`CommonJS recipe geo isolation: ${firstLine(err)}`)
  }
}

/**
 * geographicDotGrid calls only geoBounds and geoContains. Both are available
 * in d3-geo 3.1.0, which is also a common lockfile resolution for the d3 v7
 * meta-package. Keep that compatible floor and prove the packed consumer can
 * share its application-owned copy instead of installing a nested d3-geo.
 */
function checkCjsRecipeD3GeoDedupe(proj, failures) {
  const code = `
    const { createRequire } = require("node:module")
    const appD3Geo = require.resolve("d3-geo")
    const semioticRequire = createRequire(require.resolve("semiotic/package.json"))
    const d3Require = createRequire(require.resolve("d3"))
    const semioticD3Geo = semioticRequire.resolve("d3-geo")
    const metaPackageD3Geo = d3Require.resolve("d3-geo")
    if (semioticD3Geo !== appD3Geo || metaPackageD3Geo !== appD3Geo) {
      throw new Error(
        "d3-geo was nested: app=" + appD3Geo +
        "; semiotic=" + semioticD3Geo +
        "; d3=" + metaPackageD3Geo
      )
    }
    console.log("semiotic and d3 share the consumer-owned d3-geo 3.1.0")
  `
  try {
    const out = runNodeEval(code, { cwd: proj, inputType: "commonjs" })
    console.log(`  ✓ CommonJS recipe d3-geo dedupe: ${out.trim()}`)
  } catch (err) {
    failures.push(`CommonJS recipe d3-geo dedupe: ${firstLine(err)}`)
  }
}

/**
 * The experimental ESM entry is assembled from canonical stable graphs plus a
 * stateless auxiliary projection. Guard both its complete runtime surface and
 * the constructor/component identities that must match `semiotic/physics`.
 */
function checkExperimentalFacadeParity(proj, failures) {
  const code = `
    import { createRequire } from "node:module"
    import * as experimentalEsm from "semiotic/experimental"
    import * as physicsEsm from "semiotic/physics"
    const require = createRequire(import.meta.url)
    const experimentalCjs = require("semiotic/experimental")
    const physicsCjs = require("semiotic/physics")
    const esmKeys = Object.keys(experimentalEsm).sort()
    const cjsKeys = Object.keys(experimentalCjs).sort()
    if (JSON.stringify(esmKeys) !== JSON.stringify(cjsKeys)) {
      const missing = cjsKeys.filter((key) => !esmKeys.includes(key))
      const unexpected = esmKeys.filter((key) => !cjsKeys.includes(key))
      throw new Error(
        "runtime export mismatch; missing=" + missing.join(",") +
        "; unexpected=" + unexpected.join(",")
      )
    }
    const identityPairs = [
      ["BuiltInPhysicsEngineAdapter", "unstable_BuiltInPhysicsEngineAdapter"],
      ["createDefaultPhysicsEngineAdapter", "unstable_createDefaultPhysicsEngineAdapter"],
      ["PhysicsPipelineStore", "unstable_PhysicsPipelineStore"],
      ["evaluatePhysicsBodyBudget", "unstable_evaluatePhysicsBodyBudget"],
      ["PhysicsSedimentAccumulator", "unstable_PhysicsSedimentAccumulator"],
      ["sedimentHeightfield", "unstable_sedimentHeightfield"],
      ["StreamPhysicsFrame", "unstable_StreamPhysicsFrame"],
      ["PhysicsCustomChart", "unstable_PhysicsCustomChart"],
    ]
    for (const [stableName, experimentalName] of identityPairs) {
      if (physicsEsm[stableName] !== experimentalEsm[experimentalName]) {
        throw new Error("ESM identity mismatch for " + experimentalName)
      }
      if (physicsCjs[stableName] !== experimentalCjs[experimentalName]) {
        throw new Error("CJS identity mismatch for " + experimentalName)
      }
    }
    console.log(esmKeys.length + " matching exports and canonical physics identities")
  `
  try {
    const out = runNodeEval(code, { cwd: proj })
    console.log(`  ✓ experimental facade: ${out.trim()}`)
  } catch (err) {
    failures.push(`experimental facade: ${firstLine(err)}`)
  }
}

function checkExperimentalBridgeStoreAnchor(packageRoot, failures) {
  const bridgePath = join(
    packageRoot,
    "dist/semiotic-experimental-react-shared.module.min.js"
  )
  if (!existsSync(bridgePath)) {
    failures.push("experimental bridge: internal ESM entry is missing")
    return
  }

  const code = readFileSync(bridgePath, "utf8")
  const anchorImports = Array.from(
    code.matchAll(
      /import\s*\{([^}]*)\}\s*from\s*["']\.\/semiotic-client-shared\.module\.min\.js["']/g
    ),
    (match) => match[1]
  ).join(",")
  const missingSelectors = [
    "useObservationSelector",
    "useSelectionSelector"
  ].filter((name) => !anchorImports.includes(name))

  if (missingSelectors.length > 0) {
    failures.push(
      `experimental bridge: canonical store anchor is missing ${missingSelectors.join(", ")}`
    )
    return
  }
  console.log("  ✓ experimental bridge imports canonical LinkedCharts stores")
}

/**
 * `./package.json` is intentionally an exported metadata resource, not a
 * JavaScript entry point. Keep it in the pack contract, but don't try to
 * import it as a module. Every other export must describe a module through
 * conditional `import`/`require`/`default` and is smoke-tested below.
 */
function splitExports(exportsMap, failures) {
  if (!exportsMap || typeof exportsMap !== "object") {
    failures.push("package.json: missing exports map")
    return { modules: [], packageJson: null, resources: [] }
  }

  const modules = []
  const resources = []
  let packageJson = null

  for (const [entry, exportEntry] of Object.entries(exportsMap)) {
    if (entry === "./package.json") {
      packageJson = exportEntry
      continue
    }

    // JSON schemas and standalone bindings are deliberately exported as
    // resources, not package entry modules with import/require conditions.
    if (typeof exportEntry === "string") {
      resources.push({ entry, target: exportEntry })
      continue
    }

    if (!exportEntry || typeof exportEntry !== "object") {
      failures.push(
        `${entry}: expected a conditional module export in package.json`
      )
      continue
    }

    const esmPath = exportEntry.import ?? exportEntry.default
    if (
      typeof esmPath !== "string" &&
      typeof exportEntry.require !== "string"
    ) {
      failures.push(
        `${entry}: no import, default, or require condition in package.json`
      )
      continue
    }

    modules.push({ entry, exportEntry, esmPath })
  }

  return { modules, packageJson, resources }
}

function checkPackageJsonExport(
  packageRoot,
  packageJsonExport,
  proj,
  failures
) {
  if (typeof packageJsonExport !== "string") {
    failures.push("semiotic/package.json: missing metadata-only export")
    return
  }

  const metadataPath = join(packageRoot, packageJsonExport.replace(/^\.\//, ""))
  if (!existsSync(metadataPath)) {
    failures.push(
      `semiotic/package.json: ${packageJsonExport} not found in installed package`
    )
    return
  }

  try {
    JSON.parse(readFileSync(metadataPath, "utf8"))
  } catch (err) {
    failures.push(`semiotic/package.json: invalid JSON (${err.message})`)
    return
  }

  try {
    const code =
      "const pkg = require('semiotic/package.json'); if (!pkg || typeof pkg !== 'object' || !pkg.name) { throw new Error('invalid package metadata') } console.log(pkg.name)"
    const out = run(`node --input-type=commonjs -e ${JSON.stringify(code)}`, {
      cwd: proj
    })
    if (out.trim() !== "semiotic") {
      failures.push(
        `semiotic/package.json: resolved unexpected package name ${JSON.stringify(out.trim())}`
      )
      return
    }
    console.log("  ✓ semiotic/package.json (metadata): resolves and parses")
  } catch (err) {
    failures.push(`semiotic/package.json (metadata): ${firstLine(err)}`)
  }
}

function checkPortabilitySpec(packageRoot, resources, proj, failures) {
  const specExport = resources.find((resource) => resource.entry === "./spec/*")
  if (!specExport || specExport.target !== "./spec/*") {
    failures.push(
      "semiotic/spec/*: missing resource export for the published IDID schemas"
    )
    return
  }

  const schemaNames = [
    "chart-capability.schema.json",
    "audience-profile.schema.json",
    "annotation-provenance.schema.json"
  ]
  for (const name of schemaNames) {
    const path = join(packageRoot, "spec", "v0.1", name)
    if (!existsSync(path)) {
      failures.push(
        `semiotic/spec/v0.1/${name}: missing from installed tarball`
      )
      continue
    }
    try {
      const schema = JSON.parse(readFileSync(path, "utf8"))
      if (
        schema.$schema !== "https://json-schema.org/draft/2020-12/schema" ||
        typeof schema.$id !== "string" ||
        !schema.$id.includes(`/spec/v0.1/${name}`)
      ) {
        failures.push(`semiotic/spec/v0.1/${name}: invalid schema identity`)
        continue
      }
      console.log(`  ✓ semiotic/spec/v0.1/${name}: packaged and parseable`)
    } catch (err) {
      failures.push(`semiotic/spec/v0.1/${name}: invalid JSON (${err.message})`)
    }
  }

  try {
    const code =
      "import * as m from 'semiotic/spec/bindings/vega-lite.mjs'; if (typeof m.attachIdid !== 'function') throw new Error('missing binding export'); console.log(m.IDID_SPEC_VERSION)"
    const out = run(`node --input-type=module -e ${JSON.stringify(code)}`, {
      cwd: proj
    })
    if (out.trim() !== "0.1") {
      failures.push(
        `semiotic/spec/bindings/vega-lite.mjs: unexpected spec version ${JSON.stringify(out.trim())}`
      )
    } else {
      console.log(
        "  ✓ semiotic/spec/bindings/vega-lite.mjs: resolves from installed tarball"
      )
    }
  } catch (err) {
    failures.push(`semiotic/spec/bindings/vega-lite.mjs: ${firstLine(err)}`)
  }
}

function legacyAliasPaths(entryPoints) {
  const aliases = new Set()
  for (const { esmPath } of entryPoints) {
    if (typeof esmPath !== "string") continue
    const path = esmPath.replace(/^\.\//, "")
    if (path.endsWith(".module.min.js")) {
      aliases.add(path.replace(/\.module\.min\.js$/, ".module.js"))
      aliases.add(path.replace(/\.module\.min\.js$/, ".js"))
    }
  }
  return [...aliases].sort()
}

/**
 * The old unminified-looking filenames were local build copies only: they were
 * never in the tarball or exports map. Assert that they stay absent so a local
 * fixture cannot accidentally start depending on an unpublished deep path.
 */
function checkUnpublishedLegacyAliases(
  packageRoot,
  entryPoints,
  proj,
  failures
) {
  const aliases = legacyAliasPaths(entryPoints)
  for (const alias of aliases) {
    if (existsSync(join(packageRoot, alias))) {
      failures.push(`legacy alias unexpectedly published: semiotic/${alias}`)
    }
  }

  try {
    const code =
      "try { await import('semiotic/dist/semiotic.module.js'); throw new Error('legacy deep import unexpectedly resolved') } catch (error) { if (error?.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error; console.log(error.code) }"
    const out = run(`node --input-type=module -e ${JSON.stringify(code)}`, {
      cwd: proj
    })
    if (out.trim() !== "ERR_PACKAGE_PATH_NOT_EXPORTED") {
      failures.push(
        `legacy deep import: unexpected result ${JSON.stringify(out.trim())}`
      )
    } else {
      console.log(
        `  ✓ ${aliases.length} legacy aliases absent; deep import remains blocked`
      )
    }
  } catch (err) {
    failures.push(`legacy deep import: ${firstLine(err)}`)
  }
}

function quoted(value) {
  return JSON.stringify(String(value))
}

function runFixtureScript(fixtureDir, script, args = []) {
  const command = [
    quoted(process.execPath),
    quoted(join(fixtureDir, script)),
    ...args.map(quoted)
  ].join(" ")
  return run(command, { cwd: fixtureDir })
}

/**
 * Compile real TypeScript source from a fresh consumer project. Merely finding
 * a .d.ts file does not prove its package-export resolution or public props
 * type-check under NodeNext.
 */
function checkTypeScriptConsumer(proj, packageRoot, failures) {
  const fixtureDir = join(proj, "packed-typescript-consumer")
  cpSync(packedConsumerFixture, fixtureDir, { recursive: true })

  const tsc = join(
    proj,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsc.cmd" : "tsc"
  )
  if (!existsSync(tsc)) {
    failures.push("TypeScript consumer: local tsc was not installed")
    return
  }

  try {
    run(
      `${quoted(tsc)} --project ${quoted(join(fixtureDir, "tsconfig.json"))} --pretty false`,
      {
        cwd: fixtureDir
      }
    )
    console.log("  ✓ TypeScript consumer: NodeNext public imports compile")
  } catch (err) {
    failures.push(`TypeScript consumer: ${firstLine(err)}`)
  }

  // The force recipe is a public API that actually creates the worker. Run it
  // through ESM and CJS entry conditions with a Web Worker-shaped fake, then
  // execute each shipped worker module itself through a worker_threads bridge.
  // This catches a CJS import.meta transform that would otherwise silently
  // force the synchronous fallback despite all module-import checks passing.
  for (const script of [
    "run-force-worker-client.mjs",
    "run-force-worker-client.cjs"
  ]) {
    try {
      const out = runFixtureScript(fixtureDir, script)
      console.log(`  ✓ ${out.trim()}`)
    } catch (err) {
      failures.push(`TypeScript consumer ${script}: ${firstLine(err)}`)
    }
  }

  for (const [kind, asset] of [
    ["force", "forceLayoutWorker.js"],
    ["physics", "physicsWorker.js"]
  ]) {
    const workerPath = join(packageRoot, "dist", asset)
    if (!existsSync(workerPath)) {
      failures.push(`worker:${kind}: ${asset} not found in installed package`)
      continue
    }
    try {
      const out = runFixtureScript(fixtureDir, "run-worker-module.mjs", [
        kind,
        pathToFileURL(workerPath).href
      ])
      console.log(`  ✓ ${out.trim()}`)
    } catch (err) {
      failures.push(`worker:${kind}: ${firstLine(err)}`)
    }
  }
}

/**
 * The public-export loop verifies that modules resolve; this fixture goes one
 * step further and executes the three current ExampleDefinition pilot chart
 * families from a clean installed tarball. It deliberately uses server
 * rendering so it stays portable in the package job. Browser interaction and
 * visual behavior are covered by the source-route Playwright gate.
 */
function checkPackedExampleConsumer(proj, failures) {
  const fixtureDir = join(proj, "packed-example-consumer")
  cpSync(packedExampleConsumerFixture, fixtureDir, { recursive: true })

  try {
    const out = runFixtureScript(fixtureDir, "run-pilot-examples.mjs")
    console.log(`  ✓ ${out.trim()}`)
  } catch (err) {
    failures.push(`Packed pilot examples: ${firstLine(err)}`)
  }
}

console.log(`▶ smoke dir: ${tmp}`)

let exitCode = 0
const failures = []

try {
  let tarball
  if (suppliedTarball) {
    tarball = resolve(repoRoot, suppliedTarball)
    if (!existsSync(tarball))
      throw new Error(`Supplied tarball does not exist: ${tarball}`)
    if (!tarball.endsWith(".tgz"))
      throw new Error(`Supplied tarball is not a .tgz file: ${tarball}`)
    console.log(`▶ using supplied tarball: ${tarball}`)
  } else {
    // Pack the working repo into a tarball inside the temp dir.
    // `--pack-destination` lands the tarball next to our temp consumer
    // project; capturing combined output keeps CI logs useful when npm
    // pack exits 0 but produces nothing (rare, but seen on some runners
    // when --pack-destination is silently ignored).
    console.log("▶ npm pack")
    const packOut = run(`npm pack --pack-destination "${tmp}" 2>&1`, {
      cwd: repoRoot
    })
    if (packOut?.trim())
      console.log(
        packOut
          .trim()
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n")
      )
    tarball = findTarball(tmp)
    console.log(`  tarball: ${tarball}`)
  }

  // Set up a throwaway project that consumes it. Use Node's mkdir rather
  // than spawning a shell builtin so this runs on Windows too.
  const proj = join(tmp, "consumer")
  mkdirSync(proj, { recursive: true })
  writeFileSync(
    join(proj, "package.json"),
    JSON.stringify(
      {
        name: "semiotic-smoke-consumer",
        version: "0.0.0",
        private: true,
        type: "module",
        // These are deliberately consumer-owned dependencies. Semiotic has React
        // runtime peers, while its public declarations import React types; a clean
        // TypeScript app needs both rather than borrowing this repository's tree.
        dependencies: {
          // Pin the resolution an existing d3 v7 application can carry. The
          // packed Semiotic install must accept this copy rather than place a
          // second ESM-only d3-geo under node_modules/semiotic.
          d3: "7.8.5",
          "d3-geo": "3.1.0",
          react: sourcePackage.devDependencies.react,
          "react-dom": sourcePackage.devDependencies["react-dom"],
          // The smoke suite imports every public entry point, including the
          // explicitly opt-in semiotic/rough adapter. Model that consumer choice
          // by installing its optional peer without making it a core dependency.
          roughjs: sourcePackage.devDependencies.roughjs
        },
        devDependencies: {
          "@types/react": sourcePackage.devDependencies["@types/react"],
          "@types/react-dom": sourcePackage.devDependencies["@types/react-dom"],
          typescript: sourcePackage.devDependencies.typescript
        }
      },
      null,
      2
    ) + "\n"
  )

  console.log("▶ npm install <tarball>")
  // --no-save avoids dirtying the throwaway package.json with a tarball path.
  // --ignore-scripts skips lifecycle hooks of transitive deps; we only care
  // about whether the tarball's files resolve.
  // --no-legacy-peer-deps forces npm to install peerDependencies (react,
  // react-dom). The repo `.npmrc` sets `legacy-peer-deps=true` for the
  // eslint-plugin-react / ESLint 10 peer mismatch, and that npm_config_*
  // flag is inherited by child installs — without this override the smoke
  // consumer never gets React and every React entry point fails to import.
  // Explicitly use the public registry rather than inheriting a developer's
  // private mirror/token. The fixture installs only public npm dependencies;
  // SEMIOTIC_PACK_REGISTRY can point at an approved CI mirror when needed.
  run(
    `npm install --no-save --include=dev --ignore-scripts --no-legacy-peer-deps --registry=${quoted(publicNpmRegistry)} ${quoted(tarball)}`,
    { cwd: proj }
  )

  // Verify each entry resolves under ESM and CJS, and that its `types`
  // file (per package.json `exports`) actually exists on disk.
  const pkg = JSON.parse(
    run(
      `node -e "console.log(JSON.stringify(require('semiotic/package.json')))"`,
      { cwd: proj }
    )
  )
  if (
    pkg.name !== sourcePackage.name ||
    pkg.version !== sourcePackage.version
  ) {
    failures.push(
      `installed tarball identity ${pkg.name}@${pkg.version} does not match ${sourcePackage.name}@${sourcePackage.version}`
    )
  }
  const packageRoot = join(proj, "node_modules/semiotic")
  const {
    modules: entryPoints,
    packageJson: packageJsonExport,
    resources
  } = splitExports(pkg.exports, failures)
  console.log(
    `▶ checking ${entryPoints.length} importable entry points from package.json#exports (semiotic@${pkg.version})`
  )
  checkPackageJsonExport(packageRoot, packageJsonExport, proj, failures)
  checkPortabilitySpec(packageRoot, resources, proj, failures)
  checkUnpublishedLegacyAliases(packageRoot, entryPoints, proj, failures)
  checkPrivateDeclarations(packageRoot, failures)
  checkClientBoundaryDirectives(packageRoot, pkg.exports, failures)
  checkUtilsFacadeExportContract(packageRoot, pkg.exports, failures)
  checkThemeCoreReactFree(packageRoot, pkg.exports, failures)
  checkReactServerCoreImports(proj, failures)
  checkExperimentalBridgeStoreAnchor(packageRoot, failures)

  for (const { entry, exportEntry, esmPath } of entryPoints) {
    const importPath = entry === "." ? "semiotic" : `semiotic${entry.slice(1)}`

    if (typeof esmPath === "string") {
      assertLocalChunksExist(packageRoot, esmPath, failures)
    }

    // ESM import
    try {
      const code = `import * as m from "${importPath}"; if (!m || typeof m !== "object") { throw new Error("empty module") } console.log(Object.keys(m).length)`
      const out = run(`node --input-type=module -e ${JSON.stringify(code)}`, {
        cwd: proj
      })
      const exportCount = parseInt(out.trim(), 10)
      if (!Number.isFinite(exportCount) || exportCount === 0) {
        failures.push(`${importPath} (ESM): no exports`)
      } else {
        console.log(`  ✓ ${importPath} (ESM): ${exportCount} exports`)
      }
    } catch (err) {
      failures.push(`${importPath} (ESM): ${firstLine(err)}`)
    }

    // CJS require — many entries publish a `require` field.
    if (exportEntry.require) {
      try {
        const code = `const m = require("${importPath}"); if (!m || typeof m !== "object") { throw new Error("empty module") } console.log(Object.keys(m).length)`
        const out = run(
          `node --input-type=commonjs -e ${JSON.stringify(code)}`,
          { cwd: proj }
        )
        const exportCount = parseInt(out.trim(), 10)
        if (!Number.isFinite(exportCount) || exportCount === 0) {
          failures.push(`${importPath} (CJS): no exports`)
        } else {
          console.log(`  ✓ ${importPath} (CJS): ${exportCount} exports`)
        }
      } catch (err) {
        failures.push(`${importPath} (CJS): ${firstLine(err)}`)
      }
    }

    // Types path resolves to a real .d.ts file.
    if (exportEntry.types) {
      const typesPath = join(
        proj,
        "node_modules/semiotic",
        exportEntry.types.replace(/^\.\//, "")
      )
      if (!existsSync(typesPath)) {
        failures.push(
          `${importPath} (types): ${exportEntry.types} not found in installed package`
        )
      } else {
        console.log(`  ✓ ${importPath} (types): ${exportEntry.types}`)
      }
    }
  }

  checkCjsClientContextIdentity(proj, failures)
  checkCjsRecipeGeoIsolation(proj, failures)
  checkCjsRecipeD3GeoDedupe(proj, failures)
  checkExperimentalFacadeParity(proj, failures)

  checkTypeScriptConsumer(proj, packageRoot, failures)
  checkPackedExampleConsumer(proj, failures)
} catch (err) {
  console.error("✗ smoke test crashed:", firstLine(err))
  exitCode = 2
} finally {
  // Clean up — best-effort.
  try {
    rmSync(tmp, { recursive: true, force: true })
  } catch {
    /* noop */
  }
}

if (failures.length > 0) {
  console.error("\n✗ pack smoke test failures:")
  for (const f of failures) console.error(`  - ${f}`)
  exitCode = exitCode || 1
}

if (exitCode === 0)
  console.log("\n✅ pack smoke test passed (all package.json#exports entries)")
process.exit(exitCode)
