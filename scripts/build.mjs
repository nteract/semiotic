import { execSync } from "child_process"
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs"
import { rollup } from "rollup"
import resolve from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import terser from "@rollup/plugin-terser"
import { visualizer } from "rollup-plugin-visualizer"
import external from "rollup-plugin-auto-external"

const args = process.argv.slice(2)
const isProduction = args.includes("--production")
const isAnalyze = args.includes("--analyze")

function useClientPlugin() {
  const clientModules = new Set()
  return {
    name: "use-client",
    transform(code, id) {
      if (code.startsWith('"use client"') || code.startsWith("'use client'")) {
        clientModules.add(id)
      }
      return null
    },
    renderChunk(code, chunk) {
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
    minify = false
  } = options

  const plugins = [
    external({
      dependencies: true,
      peerDependencies: true
    }),

    useClientPlugin(),

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

  const bundles = [
    { input: "src/components/semiotic.ts", name: "semiotic", analyze, minify },
    { input: "src/components/semiotic-xy.ts", name: "xy", analyze: false, minify },
    { input: "src/components/semiotic-ordinal.ts", name: "ordinal", analyze: false, minify },
    { input: "src/components/semiotic-network.ts", name: "network", analyze: false, minify },
    { input: "src/components/semiotic-realtime.ts", name: "realtime", analyze: false, minify },
    { input: "src/components/semiotic-server.ts", name: "server", analyze: false, minify },
    { input: "src/components/semiotic-ai.ts", name: "semiotic-ai", analyze: false, minify },
    { input: "src/components/semiotic-data.ts", name: "semiotic-data", analyze: false, minify },
    { input: "src/components/semiotic-geo.ts", name: "geo", analyze: false, minify },
    { input: "src/components/semiotic-themes.ts", name: "semiotic-themes", analyze: false, minify },
    { input: "src/components/semiotic-utils.ts", name: "semiotic-utils", analyze: false, minify },
    { input: "src/components/semiotic-recipes.ts", name: "semiotic-recipes", analyze: false, minify }
  ]

  await Promise.all([
    ...bundles.map(b => createBundle(b)),
    buildDeclarations()
  ])

  createLegacyAliases(bundles)
}

build().catch(err => {
  console.error(err)
  process.exit(1)
})
