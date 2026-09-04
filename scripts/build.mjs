import { execSync } from "child_process"
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "fs"
import { build as tsupBuild } from "tsup"
import { publicJavaScriptEntrypoints } from "./lib/public-entrypoints.mjs"

const args = process.argv.slice(2)
const isProduction = args.includes("--production")
const isAnalyze = args.includes("--analyze")
const isDeclarationsOnly = args.includes("--declarations-only")

if (isDeclarationsOnly && (isProduction || isAnalyze)) {
  throw new Error(
    "--declarations-only cannot be combined with --production or --analyze"
  )
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const optionalDependencyNames = Object.keys(pkg.optionalDependencies ?? {})
const optionalPeerNames = Object.entries(pkg.peerDependenciesMeta ?? {})
  .filter(([, meta]) => meta && meta.optional)
  .map(([name]) => name)
const explicitExternals = [
  ...optionalDependencyNames,
  ...optionalPeerNames,
  /^world-atlas\//,
  "react-dom/server",
  "react/jsx-runtime",
  "react/jsx-dev-runtime"
]

/**
 * React 18 exports `react-dom/server.browser`, while React 19 also adds the
 * `server.edge` alias. Browser/edge source uses the former so the declared
 * peer range stays valid. Node artifacts rewrite only these local static
 * render modules to React's normal server entry, which avoids retaining a
 * MessagePort in short-lived Node processes.
 */
function nodeStaticMarkupSourcePlugin() {
  const nodeRenderedSources = /(?:\/|\\)(?:renderToStaticSVG|staticXY|staticOrdinal|staticNetwork|staticGeo|staticValue|animatedGif|PhysicsSettledSVG)\.tsx$/
  return {
    name: "node-static-markup-source",
    setup(build) {
      build.onLoad({ filter: /\.tsx$/ }, (args) => {
        if (!nodeRenderedSources.test(args.path)) return null
        const source = readFileSync(args.path, "utf8")
        if (!source.includes('"react-dom/server.browser"')) return null
        return {
          contents: source.replaceAll(
            '"react-dom/server.browser"',
            '"react-dom/server"'
          ),
          loader: "tsx"
        }
      })
    }
  }
}

function useClientDirectivePlugin({
  clientOnly = false,
  entryNames = []
} = {}) {
  const entryFiles = new Set(
    entryNames.flatMap((name) => [`${name}.module.min.js`, `${name}.min.js`])
  )
  return {
    name: "use-client-directive",
    buildEnd({ writtenFiles }) {
      if (!clientOnly) return
      for (const file of writtenFiles) {
        if (!file.name.endsWith(".js")) continue
        const fileName = file.name.split(/[\\/]/).pop()
        // The directive declares a public client boundary. Static and lazy
        // chunks are already below that boundary; tagging each one adds
        // redundant bytes to every separately-compressed request.
        if (!fileName || !entryFiles.has(fileName)) continue
        const code = readFileSync(file.name, "utf8")
        if (/^["']use client["'];/.test(code)) continue
        writeFileSync(file.name, `"use client";\n${code}`)
      }
    }
  }
}

const terserOptions = {
  compress: {
    pure_getters: true,
    unsafe: true,
    unsafe_comps: true,
    drop_console: false,
    pure_funcs: ["console.log", "console.debug"],
    drop_debugger: true,
    // Group function declarations before statement/data tables. This keeps
    // repeated code closer within gzip's window without changing public names.
    hoist_funs: true,
    passes: 2
  },
  mangle: {
    properties: false
  },
  format: {
    comments: false
  }
}

function baseBuildOptions({ minify, serverOnly, clientOnly, entryNames }) {
  return {
    outDir: "dist",
    // es2020 matches modern React/Vite targets and drops many esbuild
    // helpers (optional chaining, nullish coalescing, class fields stay native).
    target: "es2020",
    platform: serverOnly ? "node" : "neutral",
    dts: false,
    bundle: true,
    clean: false,
    sourcemap: !minify,
    minify: minify ? "terser" : false,
    terserOptions,
    external: explicitExternals,
    pure: ["console.log", "console.debug"],
    plugins: [useClientDirectivePlugin({ clientOnly, entryNames })],
    silent: true
  }
}

/**
 * CJS fallback: one fat file per entry. CommonJS cannot share cross-entry
 * chunks the way ESM can, so multi-subpath CJS consumers still pay a
 * duplication tax — acceptable for the legacy require() path.
 */
async function createCjsBundle(options = {}) {
  const {
    input = "src/components/semiotic.ts",
    name = "semiotic",
    minify = false,
    serverOnly = false,
    clientOnly = false,
    esbuildPlugins = []
  } = options

  await tsupBuild({
    ...baseBuildOptions({ minify, serverOnly, clientOnly, entryNames: [name] }),
    entry: { [name]: input },
    name: `${name}:cjs`,
    format: "cjs",
    splitting: false,
    esbuildPlugins: [nodeStaticMarkupSourcePlugin(), ...esbuildPlugins],
    noExternal: esbuildPlugins.length > 0 ? ["d3-geo"] : undefined,
    outExtension: () => ({ js: ".min.js" }),
    esbuildOptions(esbuildOptions) {
      esbuildOptions.conditions = ["module", "import", "default"]
    }
  })
}

/**
 * Multi-entry ESM build with shared chunks.
 *
 * Building each subpath (`xy`, `network`, `ai`, …) as an isolated bundle
 * inlines Stream frames / shared utils into every entry. A consumer that
 * imports several subpaths then pays for PipelineStore, SceneToSVG, etc.
 * once per entry (~3–4× the real graph).
 *
 * One esbuild graph with `splitting: true` emits shared chunks that every
 * entry imports, so `semiotic/ai` + `semiotic/xy` + `semiotic/network` share
 * one copy of the frame runtime. That is the standard fix for multi-entry
 * library packaging — not per-HOC endpoints.
 */
async function createSharedEsmGroup({
  entries,
  minify = false,
  serverOnly = false,
  clientOnly = false,
  groupName = "esm",
  analyze = false,
  esbuildPlugins = []
} = {}) {
  const names = Object.keys(entries)
  if (names.length === 0) return

  await tsupBuild({
    ...baseBuildOptions({
      minify,
      serverOnly,
      clientOnly,
      entryNames: names
    }),
    entry: entries,
    name: `${groupName}:esm`,
    format: "esm",
    splitting: true,
    metafile: analyze,
    esbuildPlugins: [
      ...(serverOnly ? [nodeStaticMarkupSourcePlugin()] : []),
      ...esbuildPlugins
    ],
    // Public ESM entries retain the package's historical `.module.min.js`
    // names, while private content-hashed chunks use the shorter `.min.js`
    // suffix. Both remain covered by package.json's `dist/*.min.js` file glob.
    outExtension: () => ({ js: ".js" }),
    esbuildOptions(esbuildOptions) {
      esbuildOptions.entryNames = "[name].module.min"
      // Private filenames do not need a descriptive basename: the content
      // hash is their cache identity, and shorter specifiers recur throughout
      // every separately-compressed entry graph.
      esbuildOptions.chunkNames = "c-[hash].min"
      esbuildOptions.conditions = ["module", "import", "default"]
    }
  })

  console.log(
    `\u2705 ESM group "${groupName}" (${names.length} entries, shared chunks)${minify ? " (minified)" : ""}`
  )
  if (analyze) {
    console.log("\ud83d\udcca Bundle metafile saved under dist/ (tsup default)")
  }
}

function externalizeExperimentalBridgeStoresPlugin() {
  return {
    name: "externalize-experimental-bridge-stores",
    setup(build) {
      build.onResolve(
        {
          filter: /^\.\.\/store\/(?:ObservationStore|SelectionStore)$/
        },
        (args) => {
          if (!/[\\/]ai[\\/]SemioticVACPBridge\.tsx$/.test(args.importer)) {
            return null
          }
          return {
            path: "./semiotic-client-shared.module.min.js",
            external: true
          }
        }
      )
    }
  }
}

/**
 * Geo remains a lazy CommonJS implementation so importing an ordinary chart
 * does not eagerly load d3-geo. Its React contexts and module-scoped stores,
 * however, must be the same instances used by the shared client namespaces.
 */
function externalizeSharedClientModulesForCjsPlugin() {
  const sharedModules = [
    "CategoryColors",
    "ThemeProvider",
    "store/ThemeStore",
    "store/SelectionStore",
    "store/useSelection",
    "store/ObservationStore",
    "store/LinkedCrosshairStore",
    "store/TooltipStore",
    "stream/customLayoutSelection",
  ]
  return {
    name: "externalize-shared-client-modules-for-cjs",
    setup(build) {
      build.onResolve({ filter: /^\.\.?\// }, (args) => {
        const request = args.path.replace(/\\/g, "/")
        if (request.endsWith("stream/customLayoutSelection")) {
          return {
            path: "./semiotic-custom-layout-selection-cjs-shared.min.js",
            external: true,
          }
        }
        if (!sharedModules.some((module) => request.endsWith(module))) {
          return null
        }
        return {
          path: "./semiotic-client-cjs-shared.min.js",
          external: true,
        }
      })
    },
  }
}

/**
 * `semiotic/recipes/react` must share this context with Stream Frames, but
 * routing the small recipe entry through the complete client namespace makes
 * a recipes-only `require()` load the AI/geo graph. Keep this bridge small
 * and use it from both bundles instead.
 */
function externalizeCustomLayoutSelectionForCjsPlugin() {
  return {
    name: "externalize-custom-layout-selection-for-cjs",
    setup(build) {
      build.onResolve({ filter: /^\.\.?\// }, (args) => {
        const request = args.path.replace(/\\/g, "/")
        if (!request.endsWith("stream/customLayoutSelection")) return null
        return {
          path: "./semiotic-custom-layout-selection-cjs-shared.min.js",
          external: true,
        }
      })
    },
  }
}

async function createCjsBundlesWithConcurrency(bundles, concurrency) {
  const workers = Array.from(
    { length: Math.min(concurrency, bundles.length) },
    async (_, workerIndex) => {
      for (let i = workerIndex; i < bundles.length; i += concurrency) {
        const b = bundles[i]
        await createCjsBundle(b)
        console.log(
          `\u2705 ${b.name} CJS created${b.minify ? " (minified)" : ""}`
        )
      }
    }
  )
  await Promise.all(workers)
}

const clientCjsNamespaces = {
  semiotic: "semiotic",
  xy: "xy",
  "semiotic-line": "line",
  ordinal: "ordinal",
  network: "network",
  realtime: "realtime",
  "semiotic-realtime-core": "realtimeCore",
  "semiotic-realtime-react": "realtimeReact",
  physics: "physics",
  "semiotic-ai": "ai",
  "semiotic-access": "access",
  controls: "controls",
  "semiotic-themes-react": "themesReact",
  "semiotic-utils": "utils",
  "semiotic-utils-react": "utilsReact",
  "semiotic-experimental": "experimental",
  "semiotic-value": "value"
}

function writeClientCjsFacades(clientBundles) {
  for (const bundle of clientBundles) {
    const namespace = clientCjsNamespaces[bundle.name]
    if (!namespace) {
      throw new Error(`Missing shared CommonJS namespace for ${bundle.name}`)
    }
    writeFileSync(
      `dist/${bundle.name}.min.js`,
      `"use client";\nmodule.exports=require("./semiotic-client-cjs-shared.min.js").${namespace};\n`
    )
  }
  console.log(
    `✅ ${clientBundles.length} shared CommonJS client facades created`
  )
}

/**
 * The geographic dot-grid recipe is the only recipe that imports d3-geo.
 * The normal ESM graph already keeps that module in a separate chunk, but a
 * CJS bundle cannot split synchronously. Build the recipe core against a
 * tiny placeholder and expose the two geographic-dot exports through lazy
 * getters below; requiring a non-geographic recipe then remains d3-geo-free.
 */
function stubRecipeGeoForCjsPlugin() {
  return {
    name: "stub-recipe-geo-for-cjs",
    setup(build) {
      build.onResolve({ filter: /^d3-geo$/ }, () => {
        return {
          path: "semiotic-recipes-cjs-d3-geo-stub",
          namespace: "semiotic-recipes-cjs-stub",
        }
      })
      build.onLoad(
        { filter: /.*/, namespace: "semiotic-recipes-cjs-stub" },
        () => ({
          contents: `
            export function geoBounds() {
              throw new Error("geographicDotGrid requires the geo recipe bundle")
            }
            export function geoContains() {
              throw new Error("geographicDotGrid requires the geo recipe bundle")
            }
          `,
          loader: "js",
        }),
      )
    },
  }
}

function writeRecipesCjsFacades() {
  writeFileSync(
    "dist/semiotic-recipes-core.min.js",
    `const base=require("./semiotic-recipes-core-cjs-base.min.js");
const geo=()=>require("./semiotic-recipes-geo-cjs.min.js");
const out={};
const descriptors=Object.getOwnPropertyDescriptors(base);
delete descriptors.geographicDotGridLayout;
delete descriptors.sampleGeographicDotGrid;
Object.defineProperties(out,descriptors);
for(const name of ["geographicDotGridLayout","sampleGeographicDotGrid"]){Object.defineProperty(out,name,{enumerable:true,configurable:true,get:()=>geo()[name]})}
module.exports=out;
`,
  )
  writeFileSync(
    "dist/semiotic-recipes.min.js",
    `"use client";
const core=require("./semiotic-recipes-core.min.js");
const react=require("./semiotic-recipes-react.min.js");
const out={};
Object.defineProperties(out,Object.getOwnPropertyDescriptors(core));
Object.defineProperties(out,Object.getOwnPropertyDescriptors(react));
module.exports=out;
`,
  )
  console.log("✅ lazy CommonJS recipe facades created")
}

const generatedBundleMetadata = {
  semiotic: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
  loading: "eager"
  },
  "semiotic-line": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-access": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-evidence": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  xy: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  ordinal: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  network: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  realtime: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-realtime-core": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-realtime-react": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  physics: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "physics-matter": {
    platform: "neutral",
    rsc: false,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "physics-rapier": {
    platform: "neutral",
    rsc: false,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  server: {
    platform: "node",
    rsc: false,
    edge: false,
    native: true,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-server-node": {
    platform: "node",
    rsc: false,
    edge: false,
    native: true,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-server-edge": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-ai": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-artifact": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-artifact-react": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-ai-core": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-data": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  geo: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  rough: {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-themes": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-themes-core": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-themes-react": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-utils": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-utils-core": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-utils-react": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-recipes": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-recipes-core": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-recipes-react": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  },
  "semiotic-experimental": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "experimental",
    loading: "eager"
  },
  "semiotic-experimental-vacp": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "experimental",
    loading: "eager"
  },
  "semiotic-value": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager"
  }
}

function assertGeneratedBundleMetadata() {
  const errors = []
  const allowedPlatforms = new Set(["browser", "neutral", "node"])
  const allowedStability = new Set(["stable", "experimental"])
  const allowedLoading = new Set(["eager", "lazy"])

  for (const [name, metadata] of Object.entries(generatedBundleMetadata)) {
    if (!allowedPlatforms.has(metadata.platform))
      errors.push(`${name}.platform`)
    if (!allowedStability.has(metadata.stability))
      errors.push(`${name}.stability`)
    if (!allowedLoading.has(metadata.loading)) errors.push(`${name}.loading`)
    for (const capability of ["rsc", "edge", "native"]) {
      if (typeof metadata[capability] !== "boolean") {
        errors.push(`${name}.${capability}`)
      }
    }
  }

  const edgeServer = generatedBundleMetadata["semiotic-server-edge"]
  if (
    edgeServer?.platform !== "neutral" ||
    edgeServer?.rsc !== true ||
    edgeServer?.edge !== true ||
    edgeServer?.native !== false
  ) {
    errors.push(
      "semiotic-server-edge must be neutral, RSC-safe, edge-compatible, and native-free"
    )
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid generated bundle metadata:\n - ${errors.join("\n - ")}`
    )
  }
}

assertGeneratedBundleMetadata()

function applyGeneratedMetadata(bundle) {
  const metadata = generatedBundleMetadata[bundle.name]
  return metadata ? { ...bundle, ...metadata } : bundle
}

async function createForceLayoutWorkerBundle({ minify = false } = {}) {
  await tsupBuild({
    entry: {
      forceLayoutWorker: "src/components/stream/layouts/forceLayoutWorker.js"
    },
    outDir: "dist",
    target: "es2020",
    platform: "browser",
    format: "esm",
    splitting: false,
    bundle: true,
    clean: false,
    dts: false,
    sourcemap: false,
    minify: minify ? "terser" : false,
    outExtension: () => ({ js: ".js" }),
    external: explicitExternals,
    silent: true
  })
  console.log(`✅ force-layout worker created${minify ? " (minified)" : ""}`)
}

async function createPhysicsWorkerBundle({ minify = false } = {}) {
  await tsupBuild({
    entry: { physicsWorker: "src/components/stream/physics/physicsWorker.js" },
    outDir: "dist",
    target: "es2020",
    platform: "browser",
    format: "esm",
    splitting: false,
    bundle: true,
    clean: false,
    dts: false,
    sourcemap: false,
    minify: minify ? "terser" : false,
    outExtension: () => ({ js: ".js" }),
    external: explicitExternals,
    silent: true
  })
  console.log(`✅ physics worker created${minify ? " (minified)" : ""}`)
}

async function createProcessSankeyLayoutWorkerBundle({ minify = false } = {}) {
  await tsupBuild({
    entry: {
      processSankeyLayoutWorker:
        "src/components/charts/network/processSankey/processSankeyLayoutWorker.js"
    },
    outDir: "dist",
    target: "es2020",
    platform: "browser",
    format: "esm",
    splitting: false,
    bundle: true,
    clean: false,
    dts: false,
    sourcemap: false,
    minify: minify ? "terser" : false,
    outExtension: () => ({ js: ".js" }),
    external: explicitExternals,
    silent: true
  })
  console.log(
    `✅ process-sankey layout worker created${minify ? " (minified)" : ""}`
  )
}

function buildDeclarations() {
  try {
    execSync("npx tsc -p tsconfig.declarations.json", { stdio: "inherit" })
  } catch (err) {
    console.error("❌ Declaration generation failed")
    throw err
  }
  // Copy entry-point declarations from dist/components/ to dist/ so package.json
  // "types" fields resolve correctly (tsc emits into dist/components/ due to
  // rootDir). The copy moves the file up one directory, so any `./foo` import
  // that previously resolved relative to `dist/components/foo` would resolve
  // to `dist/foo` — which doesn't exist. Rewrite each relative specifier to
  // include the missing `components/` segment so consumers using Node-style
  // module resolution (TypeScript with `moduleResolution: "node"`) can follow
  // the re-export graph through the leaf declaration files.
  const entryPoints = publicJavaScriptEntrypoints(pkg).map((entry) => entry.sourceName)
  for (const name of entryPoints) {
    const src = `dist/components/${name}.d.ts`
    const dst = `dist/${name}.d.ts`
    let text
    try {
      text = readFileSync(src, "utf8")
    } catch (err) {
      // ENOENT is the only expected failure here — declaration generation
      // can legitimately skip an entry (e.g. a future entry point not yet
      // exported). Anything else (permission error, partial read) should
      // surface so packaging doesn't silently emit incomplete types.
      if (err?.code !== "ENOENT") throw err
      continue
    }
    // Match `from "./..."` and `from '../...'` in import/export specifiers.
    // Only the leading `./` form needs adjusting — the file moves up one
    // level, so `./X` becomes `./components/X`. `../` (parent-relative)
    // forms aren't expected at the entry-point level, but if any appear
    // they're left alone.
    const rewritten = text.replace(
      /(from\s+['"])\.\/([^'"]+)(['"])/g,
      (_m, lead, path, trail) => `${lead}./components/${path}${trail}`
    )
    writeFileSync(dst, rewritten)
  }
  console.log("\u2705 declarations emitted")
}

function assertPublicBuildEntryParity(bundles) {
  const expected = new Map(
    publicJavaScriptEntrypoints(pkg).map((entry) => [entry.bundleName, entry])
  )
  const actual = new Map(bundles.map((bundle) => [bundle.name, bundle]))
  const problems = []

  for (const [name, entry] of expected) {
    const bundle = actual.get(name)
    if (!bundle) {
      problems.push(`missing build entry ${name} for ${entry.specifier}`)
    } else if (bundle.input !== entry.sourcePath) {
      problems.push(
        `${name} builds ${bundle.input}, expected ${entry.sourcePath} for ${entry.specifier}`
      )
    }
  }
  for (const name of actual.keys()) {
    if (!expected.has(name)) problems.push(`build entry ${name} has no package export`)
  }

  if (problems.length > 0) {
    throw new Error(
      "Public entry-point inventory drift:\n" + problems.map((problem) => `  - ${problem}`).join("\n")
    )
  }
  console.log(`✅ public entry points aligned (${expected.size} package exports)`)
}

function assertPublicExportArtifacts() {
  const required = new Map()
  for (const entry of publicJavaScriptEntrypoints(pkg)) {
    for (const artifact of entry.artifactTargets) {
      if (!required.has(artifact.path)) {
        required.set(artifact.path, [])
      }
      required.get(artifact.path).push(`${entry.specifier} (${artifact.condition})`)
    }
  }

  const missing = [...required]
    .filter(([path]) => !existsSync(path))
    .map(([path, owners]) => `${path} required by ${owners.join(", ")}`)
  if (missing.length > 0) {
    throw new Error(
      "Published JavaScript export artifacts are missing:\n" +
        missing.map((entry) => `  - ${entry}`).join("\n")
    )
  }
  console.log(`✅ public export artifacts verified (${required.size} files)`)
}

function cleanDist() {
  rmSync("dist", { recursive: true, force: true })
  console.log("\u2705 dist cleaned")
}

function cleanDeclarationArtifacts(directory = "dist") {
  if (!existsSync(directory)) return
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) cleanDeclarationArtifacts(path)
    else if (entry.isFile() && entry.name.endsWith(".d.ts")) rmSync(path)
  }
}

function writeClientPassThroughFacades() {
  const facades = {
    "realtime.module.min.js":
      '"use client";\nexport*from"./semiotic-realtime-core.module.min.js";export*from"./semiotic-realtime-react.module.min.js";\n',
    "semiotic-themes-react.module.min.js":
      '"use client";\nexport{ThemeProvider,useTheme}from"./semiotic-client-shared.module.min.js";\n',
    "semiotic-utils-react.module.min.js":
      '"use client";\nexport{ThemeProvider,useTheme,useReducedMotion,useHighContrast}from"./semiotic-client-shared.module.min.js";export{useResponsiveSize,resolveResponsiveDimension}from"./semiotic-client-responsive.module.min.js";\n',
    "semiotic-recipes-react.module.min.js":
      '"use client";\nexport{useCustomLayoutSelection}from"./semiotic-client-shared.module.min.js";export{Glyph}from"./semiotic-client-glyph.module.min.js";\n',
    "semiotic-utils.module.min.js":
      '"use client";\nexport*from"./semiotic-utils-core.module.min.js";export{ThemeProvider,useTheme,useReducedMotion,useHighContrast,useResponsiveSize}from"./semiotic-utils-react.module.min.js";\n',
    "semiotic-recipes.module.min.js":
      '"use client";\nexport*from"./semiotic-recipes-core.module.min.js";export*from"./semiotic-recipes-react.module.min.js";\n',
    // Keep the unstable catch-all out of the stable client graph: its broad
    // combination of otherwise unrelated modules creates another chunk
    // reachability partition for every stable family. Identity-sensitive
    // exports come from their canonical public graph; the remaining stateless
    // adapters live in one auxiliary projection. Packed runtime-key parity is
    // checked in smoke-pack.mjs so this hand-authored projection cannot drift.
    "semiotic-experimental.module.min.js":
      '"use client";\n' +
      'export*from"./semiotic-experimental-auxiliary.module.min.js";' +
      'export*from"./semiotic-experimental-vacp.module.min.js";' +
      'export{SemioticVACPBridge as unstable_SemioticVACPBridge}from"./semiotic-experimental-react-shared.module.min.js";' +
      'export{BuiltInPhysicsEngineAdapter as unstable_BuiltInPhysicsEngineAdapter,createDefaultPhysicsEngineAdapter as unstable_createDefaultPhysicsEngineAdapter,PhysicsPipelineStore as unstable_PhysicsPipelineStore,evaluatePhysicsBodyBudget as unstable_evaluatePhysicsBodyBudget,PhysicsSedimentAccumulator as unstable_PhysicsSedimentAccumulator,sedimentHeightfield as unstable_sedimentHeightfield,StreamPhysicsFrame as unstable_StreamPhysicsFrame,PhysicsCustomChart as unstable_PhysicsCustomChart}from"./physics.module.min.js";\n'
  }

  for (const [fileName, code] of Object.entries(facades)) {
    writeFileSync(`dist/${fileName}`, code)
  }
  console.log("\u2705 client pass-through facades created")
}

function writeNodeExperimentalFacade() {
  writeFileSync(
    "dist/semiotic-experimental-node.module.min.js",
    '"use client";\n' +
      'export*from"./semiotic-experimental-node-auxiliary.module.min.js";' +
      'export*from"./semiotic-experimental-vacp.module.min.js";' +
      'export{SemioticVACPBridge as unstable_SemioticVACPBridge}from"./semiotic-experimental-react-shared.module.min.js";' +
      'export{BuiltInPhysicsEngineAdapter as unstable_BuiltInPhysicsEngineAdapter,createDefaultPhysicsEngineAdapter as unstable_createDefaultPhysicsEngineAdapter,PhysicsPipelineStore as unstable_PhysicsPipelineStore,evaluatePhysicsBodyBudget as unstable_evaluatePhysicsBodyBudget,PhysicsSedimentAccumulator as unstable_PhysicsSedimentAccumulator,sedimentHeightfield as unstable_sedimentHeightfield,StreamPhysicsFrame as unstable_StreamPhysicsFrame,PhysicsCustomChart as unstable_PhysicsCustomChart}from"./physics.module.min.js";\n'
  )
  console.log("\u2705 Node experimental facade created")
}

function assertNoEmptyJavaScriptArtifacts() {
  const emptyArtifacts = readdirSync("dist")
    .filter((name) => /\.(?:cjs|js|mjs)$/.test(name))
    .filter((name) => statSync(`dist/${name}`).size === 0)

  if (emptyArtifacts.length > 0) {
    throw new Error(
      `Empty JavaScript build artifacts detected:\n${emptyArtifacts
        .map((name) => `   - dist/${name}`)
        .join("\n")}\n` +
        "This usually means one bundled entry imports another public facade entry. " +
        "Point internal imports at the facade's core implementation instead."
    )
  }

  console.log("\u2705 JavaScript artifacts verified (no empty bundles)")
}

async function build() {
  cleanDist()

  const minify = isProduction
  const analyze = isAnalyze
  const requestedConcurrency = Number.parseInt(
    process.env.SEMIOTIC_BUILD_CONCURRENCY ?? "2",
    10
  )
  const bundleConcurrency =
    Number.isFinite(requestedConcurrency) && requestedConcurrency > 0
      ? requestedConcurrency
      : 2

  // Three categories drive the post-build directive-placement gate:
  //   serverOnly: true   — must NOT carry "use client" (semiotic/server)
  //   clientOnly: true   — must carry "use client" (Stream-Frame-based
  //                        chart bundles + theming + AI / utils that
  //                        wrap React hooks or providers)
  //   neither            — agnostic pure-function bundle (data, recipes/core)
  const bundles = [
    {
      input: "src/components/semiotic.ts",
      name: "semiotic",
      analyze,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-xy.ts",
      name: "xy",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-line.ts",
      name: "semiotic-line",
      analyze: false,
      minify,
      clientOnly: true,
    },
    {
      input: "src/components/semiotic-access.ts",
      name: "semiotic-access",
      analyze: false,
      minify,
      clientOnly: true,
    },
    {
      input: "src/components/semiotic-ordinal.ts",
      name: "ordinal",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-network.ts",
      name: "network",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-realtime.ts",
      name: "realtime",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-realtime-core.ts",
      name: "semiotic-realtime-core",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-realtime-react.ts",
      name: "semiotic-realtime-react",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-physics.ts",
      name: "physics",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-physics-matter.ts",
      name: "physics-matter",
      analyze: false,
      minify
    },
    {
      input: "src/components/semiotic-physics-rapier.ts",
      name: "physics-rapier",
      analyze: false,
      minify
    },
    // `serverOnly: true` keeps the `"use client"` directive off the
    // server bundle. Without this, transitive imports of client-tagged
    // Stream Frame source files leak the directive into a Node-only
    // entry point, which Next.js then refuses to call from a Server
    // Component (`renderChart` throws "X is on the client").
    {
      input: "src/components/semiotic-server.ts",
      name: "server",
      analyze: false,
      minify,
      serverOnly: true
    },
    {
      input: "src/components/semiotic-server-node.ts",
      name: "semiotic-server-node",
      analyze: false,
      minify,
      serverOnly: true
    },
    {
      input: "src/components/semiotic-server-edge.ts",
      name: "semiotic-server-edge",
      analyze: false,
      minify
    },
    {
      input: "src/components/semiotic-ai.ts",
      name: "semiotic-ai",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-ai-core.ts",
      name: "semiotic-ai-core",
      analyze: false,
      minify,
      serverOnly: true
    },
    {
      input: "src/components/semiotic-artifact.ts",
      name: "semiotic-artifact",
      analyze: false,
      minify
    },
    {
      input: "src/components/semiotic-artifact-react.ts",
      name: "semiotic-artifact-react",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-data.ts",
      name: "semiotic-data",
      analyze: false,
      minify
    },
    {
      input: "src/components/semiotic-geo.ts",
      name: "geo",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-rough.ts",
      name: "rough",
      analyze: false,
      minify
    },
    {
      input: "src/components/semiotic-controls.ts",
      name: "controls",
      analyze: false,
      minify,
      clientOnly: true
    },
    // `semiotic-themes`, `semiotic-utils`, and `semiotic-recipes` are split
    // into core and react slices so pure-only consumers can avoid React-hook
    // imports while preserving old mixed facades. The utils/recipes facades
    // still re-export their React slices, so they must retain the client
    // boundary; only their `/core` entries are RSC-safe.
    {
      input: "src/components/semiotic-themes.ts",
      name: "semiotic-themes",
      analyze: false,
      minify
    },
    {
      input: "src/components/semiotic-themes-core.ts",
      name: "semiotic-themes-core",
      analyze: false,
      minify
    },
    {
      input: "src/components/semiotic-themes-react.ts",
      name: "semiotic-themes-react",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-utils.ts",
      name: "semiotic-utils",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-utils-core.ts",
      name: "semiotic-utils-core",
      analyze: false,
      minify
    },
    {
      input: "src/components/semiotic-utils-react.ts",
      name: "semiotic-utils-react",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-recipes.ts",
      name: "semiotic-recipes",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-recipes-core.ts",
      name: "semiotic-recipes-core",
      analyze: false,
      minify
    },
    {
      input: "src/components/semiotic-recipes-react.ts",
      name: "semiotic-recipes-react",
      analyze: false,
      minify,
      clientOnly: true
    },
    // Unstable browser preview surface for adapters and React components.
    // The pure VACP subpath stays in the neutral graph for headless/server
    // hosts without making the mixed experimental facade RSC-callable.
    {
      input: "src/components/semiotic-experimental.ts",
      name: "semiotic-experimental",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-experimental-vacp.ts",
      name: "semiotic-experimental-vacp",
      analyze: false,
      minify
    },
    // `semiotic-value` is a plain-React HOC bundle — single component
    // (BigNumber) plus pure formatting/threshold helpers. Client-only
    // because BigNumber uses useState/useEffect/useImperativeHandle.
    {
      input: "src/components/semiotic-value.ts",
      name: "semiotic-value",
      analyze: false,
      minify,
      clientOnly: true
    },
    {
      input: "src/components/semiotic-evidence.ts",
      name: "semiotic-evidence",
      analyze: false,
      minify
    }
  ]

  assertPublicBuildEntryParity(bundles)

  const bundledEntries = bundles.map(applyGeneratedMetadata)

  buildDeclarations()

  // ── ESM: multi-entry groups with shared chunks ─────────────────────────
  // Client chart/AI entries share Stream frames; server entries share SSR
  // helpers; neutral pure entries share light utilities. Mixing client and
  // server into one graph would either leak "use client" into Node or drop
  // it from browser charts, so keep three graphs.
  const clientEntries = Object.fromEntries(
    bundledEntries.filter((b) => b.clientOnly).map((b) => [b.name, b.input])
  )
  const serverEntries = Object.fromEntries(
    bundledEntries.filter((b) => b.serverOnly).map((b) => [b.name, b.input])
  )
  const neutralEntries = Object.fromEntries(
    bundledEntries
      .filter((b) => !b.clientOnly && !b.serverOnly)
      .map((b) => [b.name, b.input])
  )
  const isolatedNeutralEntryNames = new Set([
    "semiotic-artifact",
    "semiotic-evidence",
    "semiotic-utils-core"
  ])
  const sharedNeutralEntries = Object.fromEntries(
    Object.entries(neutralEntries).filter(
      ([name]) => !isolatedNeutralEntryNames.has(name)
    )
  )
  const isolatedNeutralEntries = Object.fromEntries(
    Object.entries(neutralEntries).filter(([name]) =>
      isolatedNeutralEntryNames.has(name)
    )
  )

  console.log(
    `Bundling ESM shared groups (client=${Object.keys(clientEntries).length}, ` +
      `server=${Object.keys(serverEntries).length}, neutral=${Object.keys(neutralEntries).length})`
  )
  // Keep interoperable chart/AI/React exports in one graph so ThemeProvider,
  // selection hooks, and other stateful modules retain a single identity for
  // multi-subpath consumers. Small standalone client entries get a separate
  // graph. Mixed and React-only utility facades are written below as static
  // pass-through modules to canonical client entries; treating every facade as
  // independent bundle entries would fragment the primary graph by every
  // possible entry-reachability combination and inflate cold gzip cost.
  const auxiliaryClientEntryNames = new Set([
    "controls",
    "semiotic-access",
    "semiotic-artifact-react",
    "semiotic-realtime-react",
    "semiotic-value"
  ])
  const passThroughClientEntryNames = new Set([
    "realtime",
    "semiotic-themes-react",
    "semiotic-utils",
    "semiotic-utils-react",
    "semiotic-recipes",
    "semiotic-recipes-react",
    "semiotic-experimental"
  ])
  const primaryClientEntries = Object.fromEntries(
    Object.entries(clientEntries).filter(
      ([name]) =>
        !auxiliaryClientEntryNames.has(name) &&
        !passThroughClientEntryNames.has(name)
    )
  )
  primaryClientEntries["semiotic-client-shared"] =
    "src/components/semiotic-client-shared.ts"
  primaryClientEntries["semiotic-ai-artifact-policy-constants"] =
    "src/components/internal/semioticAiArtifactPolicyConstants.ts"
  primaryClientEntries["semiotic-ai-hash-primitives"] =
    "src/components/evidence/stableJsonHash.ts"
  const auxiliaryClientEntries = Object.fromEntries(
    Object.entries(clientEntries).filter(([name]) =>
      auxiliaryClientEntryNames.has(name)
    )
  )
  // Stateless React helpers do not belong in the context-identity anchor.
  // Auxiliary entries keep public facades small without fragmenting every
  // chart-family graph by another entry-reachability combination.
  auxiliaryClientEntries["semiotic-client-responsive"] =
    "src/components/stream/useResponsiveSize.ts"
  auxiliaryClientEntries["semiotic-client-glyph"] =
    "src/components/recipes/recipeGlyph.tsx"
  auxiliaryClientEntries["semiotic-experimental-auxiliary"] =
    "src/components/internal/semioticExperimentalEsmAuxiliary.ts"
  // The bridge itself is experimental and otherwise partitions every stable
  // chart/AI chunk. Bundle it with auxiliary clients, but resolve its two
  // context-bearing selectors through the canonical primary client anchor so
  // it still observes the nearest LinkedCharts providers.
  auxiliaryClientEntries["semiotic-experimental-react-shared"] =
    "src/components/ai/SemioticVACPBridge.tsx"
  await createSharedEsmGroup({
    entries: primaryClientEntries,
    minify,
    clientOnly: true,
    groupName: "client-primary",
    analyze
  })
  await createSharedEsmGroup({
    entries: auxiliaryClientEntries,
    minify,
    clientOnly: true,
    groupName: "client-auxiliary",
    esbuildPlugins: [externalizeExperimentalBridgeStoresPlugin()]
  })
  await createSharedEsmGroup({
    entries: serverEntries,
    minify,
    serverOnly: true,
    groupName: "server"
  })
  // Node can resolve the public edge entry while running package smoke tests
  // or universal build tooling. Keep that condition on the Node renderer so
  // React 19's browser static renderer cannot retain a MessagePort there;
  // browser and worker conditions still select the regular edge artifact.
  await createSharedEsmGroup({
    entries: {
      "semiotic-server-edge-node": "src/components/semiotic-server-edge.ts"
    },
    minify,
    serverOnly: true,
    groupName: "edge-server-node"
  })
  await createSharedEsmGroup({
    entries: sharedNeutralEntries,
    minify,
    groupName: "neutral"
  })
  // These opt-in tooling entries overlap at the source level but expose very
  // different public slices. In the broad neutral graph, esbuild placed their
  // union in a shared chunk, so importing evidence alone also downloaded
  // unrelated contract builders and chart-config helpers. Keep each boundary
  // self-contained: none owns React/store identity, and the shared chart-recipe
  // registry deliberately coordinates bundle copies through a global key.
  for (const [name, input] of Object.entries(isolatedNeutralEntries)) {
    await createSharedEsmGroup({
      entries: { [name]: input },
      minify,
      groupName: name
    })
  }
  writeClientPassThroughFacades()
  // The browser experimental facade includes the browser static-markup
  // renderer for its unstable settled-physics serializer. Node resolves a
  // companion facade whose auxiliary slice uses React's normal server entry,
  // retaining the same physics export identities without keeping Node alive.
  await createSharedEsmGroup({
    entries: {
      "semiotic-experimental-node-auxiliary":
        "src/components/internal/semioticExperimentalEsmAuxiliary.ts"
    },
    minify,
    clientOnly: true,
    groupName: "experimental-node",
    esbuildPlugins: [nodeStaticMarkupSourcePlugin()]
  })
  writeNodeExperimentalFacade()

  // ── CJS: one client namespace graph + independent non-client entries ─────
  // CommonJS cannot split chunks. Building every browser subpath separately
  // duplicates module-scoped React contexts, so a provider from one `require`
  // path cannot reach a chart from another. Bundle all client namespaces once
  // and emit tiny public facades that select the requested namespace.
  const isolatedClientCjsNames = new Set([
    "geo",
    "semiotic-artifact-react",
    "semiotic-recipes",
    "semiotic-recipes-core",
    "semiotic-recipes-react",
  ])
  const clientCjsBundles = bundledEntries.filter(
    (bundle) => bundle.clientOnly && !isolatedClientCjsNames.has(bundle.name),
  )
  const standaloneCjsBundles = bundledEntries.filter(
    (bundle) => !bundle.clientOnly && !isolatedClientCjsNames.has(bundle.name)
  )
  await createCjsBundle({
    input: "src/components/stream/customLayoutSelection.tsx",
    name: "semiotic-custom-layout-selection-cjs-shared",
    minify,
    clientOnly: true,
  })
  await createCjsBundle({
    input: "src/components/internal/semioticClientCjsShared.ts",
    name: "semiotic-client-cjs-shared",
    minify,
    esbuildPlugins: [externalizeCustomLayoutSelectionForCjsPlugin()],
  })
  writeClientCjsFacades(clientCjsBundles)
  const geoBundle = bundledEntries.find((bundle) => bundle.name === "geo")
  const artifactReactBundle = bundledEntries.find(
    (bundle) => bundle.name === "semiotic-artifact-react",
  )
  const recipesCoreBundle = bundledEntries.find(
    (bundle) => bundle.name === "semiotic-recipes-core",
  )
  const recipesReactBundle = bundledEntries.find(
    (bundle) => bundle.name === "semiotic-recipes-react",
  )
  if (
    !geoBundle ||
    !artifactReactBundle ||
    !recipesCoreBundle ||
    !recipesReactBundle
  ) {
    throw new Error("Missing isolated CommonJS client build entries")
  }
  await createCjsBundle({
    ...geoBundle,
    name: "geo",
    esbuildPlugins: [externalizeSharedClientModulesForCjsPlugin()],
  })
  await createCjsBundle({
    ...artifactReactBundle,
  })
  await createCjsBundle({
    input: "src/components/recipes/geographicDotGrid.tsx",
    name: "semiotic-recipes-geo-cjs",
    minify,
  })
  await createCjsBundle({
    ...recipesCoreBundle,
    name: "semiotic-recipes-core-cjs-base",
    clientOnly: false,
    esbuildPlugins: [stubRecipeGeoForCjsPlugin()],
  })
  await createCjsBundle({
    ...recipesReactBundle,
    esbuildPlugins: [externalizeCustomLayoutSelectionForCjsPlugin()],
  })
  writeRecipesCjsFacades()
  console.log(
    `Bundling ${standaloneCjsBundles.length} standalone CJS entry points with concurrency ${bundleConcurrency}`
  )
  await createCjsBundlesWithConcurrency(standaloneCjsBundles, bundleConcurrency)

  await createForceLayoutWorkerBundle({ minify })
  await createPhysicsWorkerBundle({ minify })
  await createProcessSankeyLayoutWorkerBundle({ minify })

  assertPublicExportArtifacts()
  assertNoEmptyJavaScriptArtifacts()
  assertDirectivePlacement(bundledEntries)
  assertBrowserCompatibleStaticMarkupImports()
}

/**
 * Browser consumers may intentionally use `semiotic/server` for synchronous
 * SVG export. React's bare `react-dom/server` condition defaults to the Node
 * renderer when a CommonJS bundle is processed, which forces downstream
 * shims/rewrite plugins. Production code must request React's explicit,
 * cross-version browser static renderer instead.
 */
function assertBrowserCompatibleStaticMarkupImports() {
  const emitted = readdirSync("dist")
    .filter((name) => name.endsWith(".js"))
    .map((name) => [name, readFileSync(`dist/${name}`, "utf8")])
  const codeByFile = new Map(emitted)
  const edgeArtifacts = emitted
    .filter(([, code]) => /["']react-dom\/server\.edge["']/.test(code))
    .map(([name]) => name)
  const browserRemap = pkg.browser?.["react-dom/server"]

  if (edgeArtifacts.length > 0) {
    throw new Error(
      `React-19-only react-dom/server.edge request in: ${edgeArtifacts.join(", ")}. ` +
        'Use "react-dom/server.browser" in browser/edge source paths.'
    )
  }
  if (browserRemap !== "react-dom/server.browser") {
    throw new Error(
      'package.json browser mapping must resolve react-dom/server to "react-dom/server.browser".'
    )
  }

  const requiredBrowserRenderer = "semiotic-server-edge.module.min.js"
  const requiredNodeRenderers = [
    "server.module.min.js",
    "semiotic-server-edge-node.module.min.js"
  ]
  const rendererRequests = (entryName) => {
    const visited = new Set()
    const visit = (name) => {
      if (visited.has(name)) return ""
      visited.add(name)
      const code = codeByFile.get(name) ?? ""
      const requests = [...code.matchAll(/["']\.\/([^"']+\.js)["']/g)]
      return (
        code +
        requests.map(([, imported]) => visit(imported)).join("")
      )
    }
    return visit(entryName)
  }
  if (
    !rendererRequests(requiredBrowserRenderer).includes(
      '"react-dom/server.browser"'
    )
  ) {
    throw new Error(
      `${requiredBrowserRenderer} must retain react-dom/server.browser for React 18 browser and edge consumers.`
    )
  }
  const nodeRendererDrift = requiredNodeRenderers.filter(
    (name) => !rendererRequests(name).includes('"react-dom/server"')
  )
  if (nodeRendererDrift.length > 0) {
    throw new Error(
      `Node static-render artifacts must use react-dom/server: ${nodeRendererDrift.join(", ")}`
    )
  }

  console.log(
    "\u2705 static markup imports verified (React 18-compatible browser mapping; Node bundles use react-dom/server)"
  )
}

/**
 * Post-build sanity check on `"use client"` directive placement.
 *
 * Three bundle categories:
 *
 * - **`serverOnly: true`** — MUST NOT carry the directive. A future
 *   change that pulls a client-tagged module into the server bundle
 *   would silently flip its top-line back to `"use client";` — Next.js
 *   would then refuse to call any of its exports from a Server
 *   Component, throwing "Attempted to call X() from the server but X
 *   is on the client" at runtime.
 *
 * - **`clientOnly: true`** — MUST carry the directive. Catches the
 *   inverse regression: if `useClientPlugin`'s detection silently
 *   dropped the directive from a chart-family bundle (e.g. the
 *   leading-directive check missing files that open with a JSDoc
 *   block), every Next.js Server Component importing from that
 *   sub-path would crash with browser-API errors at runtime ("window
 *   is not defined", etc.).
 *
 * - **Neither** — agnostic. Pure-function or preview bundles
 *   (`semiotic/data`, `semiotic/recipes/core`, `semiotic/experimental/vacp`) contain
 *   no client-only React component code, so they neither need nor harm from
 *   the directive. Skip them.
 *
 * Reading the file synchronously is cheap (we just wrote them) and
 * lets the build fail fast with a clear diagnostic.
 */
function assertDirectivePlacement(bundles) {
  const failures = []
  for (const b of bundles) {
    if (!b.serverOnly && !b.clientOnly) continue // agnostic bundle, skip
    // Both ESM and CJS variants must be checked — a missed directive
    // in either would still break the consumer that picks that
    // condition from the exports map.
    for (const suffix of [".module.min.js", ".min.js"]) {
      const path = `dist/${b.name}${suffix}`
      if (!existsSync(path)) continue
      const head = readFileSync(path, "utf8").slice(0, 64)
      const hasDirective = /^["']use client["'];/.test(head)
      if (b.serverOnly && hasDirective) {
        failures.push({
          path,
          problem: 'server-only bundle carries "use client"'
        })
      } else if (b.clientOnly && !hasDirective) {
        failures.push({
          path,
          problem: 'client-only bundle missing "use client" directive'
        })
      }
    }
  }
  if (failures.length === 0) {
    console.log(
      "\u2705 directive placement verified (server bundles clean, client bundles tagged)"
    )
    return
  }
  console.error("\u274c directive placement check failed:")
  for (const { path, problem } of failures)
    console.error(`   - ${path}: ${problem}`)
  console.error(
    "\nFor server-only bundle failures: a transitive import pulled a client-tagged source file in. Audit the entry point's import graph."
  )
  console.error(
    "For client-only bundle failures: useClientPlugin missed flagging a module — likely the leading-directive detection. Inspect hasLeadingUseClientDirective()."
  )
  process.exit(1)
}

const buildPromise = isDeclarationsOnly
  ? Promise.resolve().then(() => {
      // A scoped declaration build must not trust stale generated output: an
      // entry removed from source should become a hard missing-file failure in
      // API/package checks. Preserve JavaScript bundles while clearing only
      // declaration artifacts before tsc recreates the complete graph.
      cleanDeclarationArtifacts()
      buildDeclarations()
    })
  : build()

buildPromise
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
