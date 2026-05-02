import { execSync } from "child_process"
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs"
import { rollup } from "rollup"
import resolve from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import terser from "@rollup/plugin-terser"
import { visualizer } from "rollup-plugin-visualizer"
import external from "rollup-plugin-auto-external"
import { hasLeadingUseClientDirective } from "./lib/useClientDirective.mjs"

const args = process.argv.slice(2)
const isProduction = args.includes("--production")
const isAnalyze = args.includes("--analyze")

function useClientPlugin({ serverOnly = false } = {}) {
  const clientModules = new Set()
  return {
    name: "use-client",
    transform(code, id) {
      if (hasLeadingUseClientDirective(code)) {
        clientModules.add(id)
      }
      return null
    },
    renderChunk(code, chunk) {
      // Server-only bundles (e.g. `semiotic/server`) must never carry
      // the `"use client"` directive — Next.js routes that import from
      // a server-only entry expect to call its functions from a Server
      // Component, but the directive flips every export into a client
      // boundary, throwing at runtime: "Attempted to call X() from the
      // server but X is on the client." A few transitive client-only
      // modules (Stream Frame source files, the React store
      // primitives) are pulled into the server bundle for the SSR-SVG
      // path, so the heuristic of "any client-tagged module in the
      // chunk → tag the chunk" produces a false positive here.
      // Server bundles set this flag to opt out unconditionally.
      if (serverOnly) return null
      for (const id of Object.keys(chunk.modules)) {
        if (clientModules.has(id)) {
          return { code: `"use client";\n${code}`, map: null }
        }
      }
      return null
    }
  }
}

async function createBundle(options = {}) {
  const {
    input = "src/components/semiotic.ts",
    name = "semiotic",
    analyze = false,
    minify = false,
    serverOnly = false,
  } = options

  // The `useClientPlugin` is split across two hook phases: `transform`
  // scans each module as it's parsed (recording which ones open with
  // `"use client"`), and `renderChunk` prepends the directive on the
  // final chunk output. The `transform` order doesn't matter — every
  // plugin's transform runs on every module — but `renderChunk` order
  // does. Terser's renderChunk parses the bundled chunk and re-emits
  // it through its compressor, which silently drops top-level string
  // expressions like `"use client";` even with default settings (the
  // statement isn't preserved through terser's parser → compress →
  // emit pipeline the way `"use strict"` is).
  //
  // Fix: append `useClientPlugin` AFTER terser so its `renderChunk`
  // is the LAST thing to run, prepending `"use client";` onto the
  // already-minified output. Terser never sees the directive, so it
  // can't strip it.
  const useClient = useClientPlugin({ serverOnly })

  const plugins = [
    external({
      dependencies: true,
      peerDependencies: true
    }),

    typescript({
      tsconfig: "tsconfig.json",
      declaration: false,
      declarationMap: false,
      target: "ES2015",
      module: "ESNext",
      outDir: "dist",
      exclude: ["node_modules", "**/*.test.ts", "**/*.test.tsx", "**/*.test.js"]
    }),

    resolve({
      extensions: [".ts", ".tsx", ".js", ".jsx"]
    })
  ]

  if (minify) {
    plugins.push(
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false,
          drop_console: false,
          pure_funcs: ['console.log', 'console.debug'],
          drop_debugger: true,
          passes: 2
        },
        mangle: {
          properties: false
        },
        format: {
          comments: false
        }
      })
    )
  }

  if (analyze && name === "semiotic") {
    plugins.push(
      visualizer({
        filename: "bundle-analysis.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: "treemap"
      })
    )
  }

  // Append last so `useClient.renderChunk` runs after `terser.renderChunk`.
  plugins.push(useClient)

  const bundle = await rollup({
    input,
    context: "window",
    plugins,
    // Mark world-atlas JSON subpath imports as external so they stay as
    // dynamic imports in the output bundle. The consumer's bundler (webpack,
    // vite, etc.) handles the JSON resolution at app build time.
    //
    // react-dom/server, react/jsx-runtime, and react/jsx-dev-runtime are all
    // subpaths of their host packages (react-dom / react), which auto-external
    // marks external only at the package-root level. Without these explicit
    // rules, rollup fails to resolve the subpath in the browser, tree-shakes
    // the namespace binding, and emits `(void 0)(...)` calls wherever
    // `ReactDOMServer.renderToStaticMarkup` or a JSX factory was invoked.
    // jsx-runtime entered the picture when tsconfig flipped to the automatic
    // JSX transform (`"jsx": "react-jsx"`) — every .tsx file now imports from
    // `react/jsx-runtime` instead of compiling JSX to `React.createElement`.
    external: (id) =>
      id.startsWith("world-atlas/")
      || id === "react-dom/server"
      || id === "react/jsx-runtime"
      || id === "react/jsx-dev-runtime",
    onLog(level, log, handler) {
      if (log.message && typeof log.message === 'string') {
        const d3Patterns = ["d3-", "internmap", "delaunator"]
        if (d3Patterns.some(pattern => log.message.includes(pattern))) {
          return
        }
      }
      handler(level, log)
    },
    onwarn(warning, warn) {
      if (warning.code === "THIS_IS_UNDEFINED") return

      if (warning.code === "UNRESOLVED_IMPORT") {
        const d3Modules = ["d3-", "internmap", "delaunator"]
        if (d3Modules.some(mod => warning.source?.includes(mod))) {
          return
        }
      }

      if (warning.code === "CIRCULAR_DEPENDENCY") {
        if (!warning.message.includes("d3-")) {
          console.warn(`\u26a0\ufe0f  Circular: ${warning.ids?.join(" -> ") || warning.message}`)
        }
        return
      }
      if (warning.code === "UNUSED_EXTERNAL_IMPORT") return
      if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message?.includes('"use client"')) return
      warn(warning)
    },
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false
    }
  })

  const outputOptions = {
    exports: "named",
    sourcemap: !minify,
    preserveModules: false,
    interop: "auto",
    generatedCode: {
      constBindings: true
    }
  }

  // Always use .min suffix so filenames match package.json exports map
  // (terser only runs for --production builds, but the filename stays consistent)
  const suffix = ".min"

  // CJS: must inline dynamic imports (no code-splitting support)
  await bundle.write({
    ...outputOptions,
    format: "cjs",
    file: `dist/${name}${suffix}.js`,
    inlineDynamicImports: true
  })

  // ESM: preserve dynamic imports for lazy loading / code-splitting
  await bundle.write({
    ...outputOptions,
    format: "esm",
    dir: "dist",
    entryFileNames: `${name}.module${suffix}.js`,
    chunkFileNames: `${name}-[name]-[hash].js`,
    inlineDynamicImports: false
  })

  await bundle.close()

  console.log(`\u2705 ${name} bundle created${minify ? " (minified)" : ""}`)
  if (analyze && name === "semiotic") {
    console.log("\ud83d\udcca Bundle analysis saved to: bundle-analysis.html")
  }
}

function buildDeclarations() {
  try {
    execSync("npx tsc -p tsconfig.declarations.json", { stdio: "inherit" })
  } catch {
    console.warn("⚠ Declaration generation failed (non-fatal — JS bundles are unaffected)")
    return
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
    "semiotic", "semiotic-ai", "semiotic-data", "semiotic-xy",
    "semiotic-ordinal", "semiotic-network", "semiotic-realtime", "semiotic-server",
    "semiotic-geo", "semiotic-themes", "semiotic-utils", "semiotic-recipes"
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

/** Sync CLAUDE.md to all AI instruction files */
function syncAIInstructions() {
  const source = "CLAUDE.md"
  const targets = [
    ".cursorrules",
    ".github/copilot-instructions.md",
    ".windsurfrules",
    "docs/public/llms-full.txt",
    ".clinerules",
  ]
  for (const target of targets) {
    try { copyFileSync(source, target) } catch { /* ignore if .github doesn't exist */ }
  }
  console.log("\u2705 AI instruction files synced from CLAUDE.md")
}

/** Copy .min.js → .js for backwards compatibility with consumers that
 *  reference the old (pre-.min) filenames (e.g. webpack aliases). */
function createLegacyAliases(bundles) {
  for (const b of bundles) {
    const minESM = `dist/${b.name}.module.min.js`
    const legacyESM = `dist/${b.name}.module.js`
    const minCJS = `dist/${b.name}.min.js`
    const legacyCJS = `dist/${b.name}.js`
    for (const [src, dst] of [[minESM, legacyESM], [minCJS, legacyCJS]]) {
      if (existsSync(src)) {
        try { copyFileSync(src, dst) } catch { /* non-fatal */ }
      }
    }
  }
  console.log("\u2705 legacy filename aliases created")
}

async function build() {
  syncAIInstructions()

  const minify = isProduction
  const analyze = isAnalyze

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
    // `serverOnly: true` keeps the `"use client"` directive off the
    // server bundle. Without this, transitive imports of client-tagged
    // Stream Frame source files leak the directive into a Node-only
    // entry point, which Next.js then refuses to call from a Server
    // Component (`renderChart` throws "X is on the client").
    { input: "src/components/semiotic-server.ts", name: "server", analyze: false, minify, serverOnly: true },
    { input: "src/components/semiotic-ai.ts", name: "semiotic-ai", analyze: false, minify, clientOnly: true },
    { input: "src/components/semiotic-data.ts", name: "semiotic-data", analyze: false, minify },
    { input: "src/components/semiotic-geo.ts", name: "geo", analyze: false, minify, clientOnly: true },
    // `semiotic-themes` and `semiotic-utils` are *mixed* bundles — most
    // of their exports are pure (theme constants, formatters, color
    // helpers, RingBuffer, IncrementalExtent, fromVegaLite) but they
    // also re-export React-flavored APIs (ThemeProvider, useTheme,
    // useReducedMotion, useHighContrast, MultiPointTooltip,
    // exportChart). The `"use client"` directive lands on the bundle
    // via the React-only re-exports' transitive imports, but
    // unconditionally asserting clientOnly would make Server Component
    // consumers think they can't import the pure exports — and they
    // can't, because the directive is file-level. Tracked as a
    // structural follow-up in OUTSTANDING_WORK; until then we don't
    // gate either way.
    { input: "src/components/semiotic-themes.ts", name: "semiotic-themes", analyze: false, minify },
    { input: "src/components/semiotic-utils.ts", name: "semiotic-utils", analyze: false, minify },
    { input: "src/components/semiotic-recipes.ts", name: "semiotic-recipes", analyze: false, minify }
  ]

  await Promise.all([
    ...bundles.map(b => createBundle(b)),
    buildDeclarations()
  ])

  createLegacyAliases(bundles)

  assertDirectivePlacement(bundles)
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
 * - **Neither** — agnostic. Pure-function bundles (`semiotic/data`,
 *   `semiotic/recipes`) contain no React component code, so they
 *   neither need nor harm from the directive. Skip them.
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
    for (const suffix of [".module.min.js", ".module.js", ".min.js", ".js"]) {
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

build().catch(err => {
  console.error(err)
  process.exit(1)
})
