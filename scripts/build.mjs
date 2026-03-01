import { execSync } from "child_process"
import { rollup } from "rollup"
import resolve from "@rollup/plugin-node-resolve"
import typescript from "rollup-plugin-typescript2"
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
      check: false,
      useTsconfigDeclarationDir: false,
      tsconfigOverride: {
        compilerOptions: {
          declaration: false,
          target: "ES2015",
          module: "ESNext"
        },
        exclude: ["node_modules", "**/*.test.ts", "**/*.test.tsx", "**/*.test.js"]
      }
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

  const suffix = minify ? ".min" : ""

  await bundle.write({
    ...outputOptions,
    format: "cjs",
    file: `dist/${name}${suffix}.js`
  })

  await bundle.write({
    ...outputOptions,
    format: "esm",
    file: `dist/${name}.module${suffix}.js`
  })

  await bundle.close()

  console.log(`\u2705 ${name} bundle created${minify ? " (minified)" : ""}`)
  if (analyze && name === "semiotic") {
    console.log("\ud83d\udcca Bundle analysis saved to: bundle-analysis.html")
  }
}

function buildDeclarations() {
  execSync("npx tsc -p tsconfig.declarations.json", { stdio: "inherit" })
  console.log("\u2705 declarations emitted")
}

async function build() {
  const minify = isProduction
  const analyze = isProduction || isAnalyze

  const bundles = [
    { input: "src/components/semiotic.ts", name: "semiotic", analyze, minify },
    { input: "src/components/semiotic-xy.ts", name: "xy", analyze: false, minify },
    { input: "src/components/semiotic-ordinal.ts", name: "ordinal", analyze: false, minify },
    { input: "src/components/semiotic-network.ts", name: "network", analyze: false, minify },
    { input: "src/components/semiotic-realtime.ts", name: "realtime", analyze: false, minify },
    { input: "src/components/semiotic-server.ts", name: "server", analyze: false, minify }
  ]

  await Promise.all([
    ...bundles.map(b => createBundle(b)),
    buildDeclarations()
  ])
}

build().catch(err => {
  console.error(err)
  process.exit(1)
})
