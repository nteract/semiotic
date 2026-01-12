import { pipeline } from "node:stream/promises"
import { join, relative } from "node:path"
import { readFileSync } from "node:fs"
import { series, parallel, src, dest } from "gulp"
import Vinyl from "vinyl"
import { rollup } from "rollup"
import ts from "typescript"

// Modern Rollup plugins
import commonjs from "@rollup/plugin-commonjs"
import typescript from "rollup-plugin-typescript2"
import terser from "@rollup/plugin-terser"
import { visualizer } from "rollup-plugin-visualizer"
import external from "rollup-plugin-auto-external"

/**
 * Build individual frame bundles
 */
export const xy = () => createBundle({
  input: "src/components/semiotic-xy.ts",
  name: "xy",
  analyze: false,
  minify: false
})

export const ordinal = () => createBundle({
  input: "src/components/semiotic-ordinal.ts",
  name: "ordinal",
  analyze: false,
  minify: false
})

export const network = () => createBundle({
  input: "src/components/semiotic-network.ts",
  name: "network",
  analyze: false,
  minify: false
})

/**
 * Build all frame-specific bundles + main bundle
 */
export const bundleAll = parallel(
  () => createMainBundle({ analyze: false, minify: false }),
  xy,
  ordinal,
  network
)

export function bundleWithAnalysis() {
  return createMainBundle({ analyze: true, minify: false })
}

export const bundleProduction = parallel(
  () => createMainBundle({ analyze: true, minify: true }),
  () => createBundle({ input: "src/components/semiotic-xy.ts", name: "xy", analyze: false, minify: true }),
  () => createBundle({ input: "src/components/semiotic-ordinal.ts", name: "ordinal", analyze: false, minify: true }),
  () => createBundle({ input: "src/components/semiotic-network.ts", name: "network", analyze: false, minify: true })
)

async function createMainBundle(options = {}) {
  return createBundle({
    input: "src/components/semiotic.ts",
    name: "semiotic",
    ...options
  })
}

async function createBundle(options = {}) {
  const {
    input = "src/components/semiotic.ts",
    name = "semiotic",
    analyze = false,
    minify = false
  } = options

  const plugins = [
    // Automatically externalize dependencies from package.json
    external({
      dependencies: true,
      peerDependencies: true
    }),

    // TypeScript compilation
    typescript({
      tsconfig: "tsconfig.json",
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

    // Convert CommonJS modules to ES6
    commonjs({
      include: "node_modules/**",
      sourceMap: false
    })
  ]

  // Add minification for production
  if (minify) {
    plugins.push(
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false,
          drop_console: false,
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

  // Add bundle visualization (only for main bundle)
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
      // Suppress D3 dependency resolution info messages
      if (log.message && typeof log.message === 'string') {
        const d3Patterns = ["d3-", "internmap", "delaunator"]
        if (d3Patterns.some(pattern => log.message.includes(pattern))) {
          return
        }
      }
      handler(level, log)
    },
    onwarn(warning, warn) {
      // Skip certain warnings
      if (warning.code === "THIS_IS_UNDEFINED") return

      // Skip D3 module resolution warnings (they're correctly externalized)
      if (warning.code === "UNRESOLVED_IMPORT") {
        const d3Modules = ["d3-", "internmap", "delaunator"]
        if (d3Modules.some(mod => warning.source?.includes(mod))) {
          return
        }
      }

      if (warning.code === "CIRCULAR_DEPENDENCY") {
        // Only log circular dependencies once
        if (!warning.message.includes("d3-")) {
          console.warn(`⚠️  Circular: ${warning.ids?.join(" -> ") || warning.message}`)
        }
        return
      }
      if (warning.code === "UNUSED_EXTERNAL_IMPORT") return
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

  // Write CJS bundle
  await bundle.write({
    ...outputOptions,
    format: "cjs",
    file: `dist/${name}${suffix}.js`
  })

  // Write ESM bundle
  await bundle.write({
    ...outputOptions,
    format: "esm",
    file: `dist/${name}.module${suffix}.js`
  })

  await bundle.close()

  // Log bundle sizes
  console.log(`✅ ${name} bundle created${minify ? " (minified)" : ""}`)
  if (analyze && name === "semiotic") {
    console.log("📊 Bundle analysis saved to: bundle-analysis.html")
  }
}

/** Emit publish-ready TypeScript declaration files to the dist folder. */
export function decls() {
  return pipeline(
    src(["src/components/**/*.ts", "src/components/**/*.tsx"]),
    declarations,
    // flatten folder structure before writing to file system
    async function* stripPath(source) {
      const root = join(process.cwd(), "src", "components")
      for await (const file of source) {
        const clone = file.clone({ contents: false })
        yield Object.assign(clone, { path: relative(root, file.path) })
      }
    },
    dest("dist")
  )
}

/**
 * Stream transformer that uses TypeScript compiler to extract DTS contents.
 * Produces Vinyl files that can be consumed afterwards.
 */
async function* declarations(source) {
  const config = {
    allowJs: true,
    declaration: true,
    emitDeclarationOnly: true
  }
  const host = ts.createCompilerHost(config)
  const roots = new Map()
  const output = new Set()
  host.writeFile = (fileName, contents) => {
    const path = relative(process.cwd(), fileName)
    output.add(new Vinyl({ path, contents: Buffer.from(contents) }))
  }
  host.readFile = (fileName) => {
    return (
      roots.get(fileName)?.contents.toString() ?? readFileSync(fileName, "utf8")
    )
  }
  for await (const file of source) {
    roots.set(relative(process.cwd(), file.path), file)
  }
  ts.createProgram(Array.from(roots.keys()), config, host).emit()
  for (const file of output) yield file
}

/**
 * Main build task - builds all bundles
 */
export const build = series(bundleAll, decls)

/**
 * Bundle with analysis - creates bundle + visualization
 */
export const analyze = series(bundleWithAnalysis, decls)

/**
 * Production build - minified with analysis
 */
export const production = series(bundleProduction, decls)

// Export default task
export { bundleAll as default }
