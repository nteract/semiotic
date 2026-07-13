import { execSync } from "child_process"
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs"
import { build as tsupBuild } from "tsup"

const args = process.argv.slice(2)
const isProduction = args.includes("--production")
const isAnalyze = args.includes("--analyze")

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
  "react/jsx-dev-runtime",
]

function useClientDirectivePlugin({ clientOnly = false } = {}) {
  return {
    name: "use-client-directive",
    buildEnd({ writtenFiles }) {
      if (!clientOnly) return
      for (const file of writtenFiles) {
        if (!file.name.endsWith(".js")) continue
        const code = readFileSync(file.name, "utf8")
        if (/^["']use client["'];/.test(code)) continue
        writeFileSync(file.name, `"use client";\n${code}`)
      }
    },
  }
}

async function createBundle(options = {}) {
  const {
    input = "src/components/semiotic.ts",
    name = "semiotic",
    analyze = false,
    minify = false,
    serverOnly = false,
    clientOnly = false,
  } = options

  const commonOptions = {
    entry: { [name]: input },
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
    terserOptions: {
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        drop_console: false,
        pure_funcs: ["console.log", "console.debug"],
        drop_debugger: true,
        passes: 2,
      },
      mangle: {
        properties: false,
      },
      format: {
        comments: false,
      },
    },
    external: explicitExternals,
    pure: ["console.log", "console.debug"],
    plugins: [useClientDirectivePlugin({ clientOnly })],
    esbuildOptions(esbuildOptions) {
      esbuildOptions.chunkNames = `${name}-[name]-[hash]`
      esbuildOptions.conditions = ["module", "import", "default"]
    },
    silent: true,
  }

  // CJS: single-file fallback for Node/CommonJS consumers.
  await tsupBuild({
    ...commonOptions,
    name: `${name}:cjs`,
    format: "cjs",
    splitting: false,
    outExtension: () => ({ js: ".min.js" }),
  })

  // ESM: preserve dynamic imports for lazy loading / code-splitting.
  await tsupBuild({
    ...commonOptions,
    name: `${name}:esm`,
    format: "esm",
    splitting: true,
    metafile: analyze && name === "semiotic",
    outExtension: () => ({ js: ".module.min.js" }),
  })

  console.log(`\u2705 ${name} bundle created${minify ? " (minified)" : ""}`)
  if (analyze && name === "semiotic") {
    console.log("\ud83d\udcca Bundle metafile saved to: dist/metafile-esm.json")
  }
}

async function createBundlesWithConcurrency(bundles, concurrency) {
  const workers = Array.from(
    { length: Math.min(concurrency, bundles.length) },
    async (_, workerIndex) => {
      for (let i = workerIndex; i < bundles.length; i += concurrency) {
        await createBundle(bundles[i])
      }
    }
  )
  await Promise.all(workers)
}

const generatedBundleMetadata = {
  semiotic: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  xy: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  ordinal: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  network: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-realtime": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-realtime-core": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-realtime-react": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  physics: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-physics-matter": {
    platform: "neutral",
    rsc: false,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-physics-rapier": {
    platform: "neutral",
    rsc: false,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  server: {
    platform: "node",
    rsc: false,
    edge: false,
    native: true,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-server-node": {
    platform: "node",
    rsc: false,
    edge: false,
    native: true,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-server-edge": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-ai": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-ai-core": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-data": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  geo: {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-themes": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-themes-core": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-themes-react": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-utils": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-utils-core": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-utils-react": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-recipes": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-recipes-core": {
    platform: "neutral",
    rsc: true,
    edge: true,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-recipes-react": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
  "semiotic-experimental": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "experimental",
    loading: "eager",
  },
  "semiotic-value": {
    platform: "browser",
    rsc: false,
    edge: false,
    native: false,
    stability: "stable",
    loading: "eager",
  },
}

function applyGeneratedMetadata(bundle) {
  const metadata = generatedBundleMetadata[bundle.name]
  return metadata ? { ...bundle, ...metadata } : bundle
}

async function createForceLayoutWorkerBundle({ minify = false } = {}) {
  await tsupBuild({
    entry: { forceLayoutWorker: "src/components/stream/layouts/forceLayoutWorker.js" },
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
    silent: true,
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
    silent: true,
  })
  console.log(`✅ physics worker created${minify ? " (minified)" : ""}`)
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
  const entryPoints = [
    "semiotic", "semiotic-ai", "semiotic-ai-core", "semiotic-data", "semiotic-xy",
    "semiotic-ordinal", "semiotic-network", "semiotic-realtime", "semiotic-realtime-core", "semiotic-realtime-react",
    "semiotic-server", "semiotic-server-node", "semiotic-server-edge", "semiotic-geo", "semiotic-controls", "semiotic-physics",
    "semiotic-physics-matter", "semiotic-physics-rapier", "semiotic-themes", "semiotic-themes-core", "semiotic-themes-react",
    "semiotic-utils", "semiotic-utils-core", "semiotic-utils-react", "semiotic-recipes", "semiotic-recipes-core", "semiotic-recipes-react",
    "semiotic-experimental", "semiotic-value"
  ]
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

function cleanDist() {
  rmSync("dist", { recursive: true, force: true })
  console.log("\u2705 dist cleaned")
}

async function build() {
  cleanDist()

  const minify = isProduction
  const analyze = isAnalyze
  const requestedConcurrency = Number.parseInt(process.env.SEMIOTIC_BUILD_CONCURRENCY ?? "2", 10)
  const bundleConcurrency = Number.isFinite(requestedConcurrency) && requestedConcurrency > 0
    ? requestedConcurrency
    : 2

  // Three categories drive the post-build directive-placement gate:
  //   serverOnly: true   — must NOT carry "use client" (semiotic/server)
  //   clientOnly: true   — must carry "use client" (Stream-Frame-based
  //                        chart bundles + theming + AI / utils that
  //                        wrap React hooks or providers)
  //   neither            — agnostic pure-function bundle (data, recipes)
  const bundles = [
    { input: "src/components/semiotic.ts", name: "semiotic", analyze, minify, clientOnly: true },
    { input: "src/components/semiotic-xy.ts", name: "xy", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-ordinal.ts", name: "ordinal", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-network.ts", name: "network", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-realtime.ts", name: "realtime", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-realtime-core.ts", name: "semiotic-realtime-core", analyze: false, minify },
    { input: "src/components/semiotic-realtime-react.ts", name: "semiotic-realtime-react", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-physics.ts", name: "physics", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-physics-matter.ts", name: "physics-matter", analyze: false, minify },
    { input: "src/components/semiotic-physics-rapier.ts", name: "physics-rapier", analyze: false, minify },
    // `serverOnly: true` keeps the `"use client"` directive off the
    // server bundle. Without this, transitive imports of client-tagged
    // Stream Frame source files leak the directive into a Node-only
    // entry point, which Next.js then refuses to call from a Server
    // Component (`renderChart` throws "X is on the client").
    { input: "src/components/semiotic-server.ts", name: "server", analyze: false, minify, serverOnly: true },
    { input: "src/components/semiotic-server-node.ts", name: "semiotic-server-node", analyze: false, minify, serverOnly: true },
    { input: "src/components/semiotic-server-edge.ts", name: "semiotic-server-edge", analyze: false, minify },
    { input: "src/components/semiotic-ai.ts", name: "semiotic-ai", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-ai-core.ts", name: "semiotic-ai-core", analyze: false, minify, serverOnly: true },
    { input: "src/components/semiotic-data.ts", name: "semiotic-data", analyze: false, minify },
    { input: "src/components/semiotic-geo.ts", name: "geo", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-controls.ts", name: "controls", analyze: false, minify, clientOnly: true },
    // `semiotic-themes`, `semiotic-utils`, and `semiotic-recipes` are split
    // into core and react slices so pure-only consumers can avoid React-hook
    // imports while preserving old facades.
    { input: "src/components/semiotic-themes.ts", name: "semiotic-themes", analyze: false, minify },
    { input: "src/components/semiotic-themes-core.ts", name: "semiotic-themes-core", analyze: false, minify },
    { input: "src/components/semiotic-themes-react.ts", name: "semiotic-themes-react", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-utils.ts", name: "semiotic-utils", analyze: false, minify },
    { input: "src/components/semiotic-utils-core.ts", name: "semiotic-utils-core", analyze: false, minify },
    { input: "src/components/semiotic-utils-react.ts", name: "semiotic-utils-react", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-recipes.ts", name: "semiotic-recipes", analyze: false, minify },
    { input: "src/components/semiotic-recipes-core.ts", name: "semiotic-recipes-core", analyze: false, minify },
    { input: "src/components/semiotic-recipes-react.ts", name: "semiotic-recipes-react", analyze: false, minify, clientOnly: true },
    // Unstable preview surface for adapters such as GoFish. It is packaged so
    // collaborators can test it, but CI/docs gates intentionally ignore it as a
    // stable API contract.
    { input: "src/components/semiotic-experimental.ts", name: "semiotic-experimental", analyze: false, minify },
    // `semiotic-value` is a plain-React HOC bundle — single component
    // (BigNumber) plus pure formatting/threshold helpers. Client-only
    // because BigNumber uses useState/useEffect/useImperativeHandle.
    { input: "src/components/semiotic-value.ts", name: "semiotic-value", analyze: false, minify, clientOnly: true }
  ]

  const bundledEntries = bundles.map(applyGeneratedMetadata)

  buildDeclarations()

  // Each tsup build keeps an esbuild graph plus post-processing state. Starting
  // every entry point at once can still spike CI memory when a temporary
  // preview bundle is added, so keep peak memory bounded while allowing local
  // callers to opt into more parallelism.
  console.log(`Bundling ${bundles.length} entry points with concurrency ${bundleConcurrency}`)
  await createBundlesWithConcurrency(bundledEntries, bundleConcurrency)
  await createForceLayoutWorkerBundle({ minify })
  await createPhysicsWorkerBundle({ minify })

  assertDirectivePlacement(bundledEntries)
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
 *   (`semiotic/data`, `semiotic/recipes`, `semiotic/experimental`) contain
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
        failures.push({ path, problem: 'server-only bundle carries "use client"' })
      } else if (b.clientOnly && !hasDirective) {
        failures.push({ path, problem: 'client-only bundle missing "use client" directive' })
      }
    }
  }
  if (failures.length === 0) {
    console.log("\u2705 directive placement verified (server bundles clean, client bundles tagged)")
    return
  }
  console.error("\u274c directive placement check failed:")
  for (const { path, problem } of failures) console.error(`   - ${path}: ${problem}`)
  console.error("\nFor server-only bundle failures: a transitive import pulled a client-tagged source file in. Audit the entry point's import graph.")
  console.error("For client-only bundle failures: useClientPlugin missed flagging a module — likely the leading-directive detection. Inspect hasLeadingUseClientDirective().")
  process.exit(1)
}

build()
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
