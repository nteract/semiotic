import { createRequire } from "node:module"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { writeFileSync } from "node:fs"
import type { Browser } from "playwright-chromium"
import type { InlineConfig } from "vite"
import {
  assertCleanCompilation,
  assertNoDiagnostics,
  consumerEntries,
  isExpectedClientDirective,
  type Bundler,
  type CompilationStats,
  type Mode
} from "./contracts.ts"
import { checkBrowser, serveOutput } from "./browser-check.ts"

interface Compiler {
  run(callback: (error: Error | null, stats?: CompilationStats) => void): void
  close(callback: (error?: Error | null) => void): void
}
type Compile = (config: Record<string, unknown>) => Compiler

export async function runCompiler(
  compile: Compile,
  config: Record<string, unknown>,
  label: string
) {
  const compiler = compile(config)
  try {
    const stats = await new Promise<CompilationStats>((done, reject) => {
      compiler.run((error, stats) => {
        if (error) reject(error)
        else if (!stats)
          reject(new Error(`${label}: no compilation statistics`))
        else done(stats)
      })
    })
    assertCleanCompilation(label, stats)
  } finally {
    await new Promise<void>((done, reject) =>
      compiler.close((error) => (error ? reject(error) : done()))
    )
  }
}

export async function checkBundler({
  bundler,
  mode,
  root,
  browser
}: {
  bundler: Bundler
  mode: Mode
  root: string
  browser: Browser
}) {
  const require = createRequire(join(root, "package.json"))
  const outDir = join(root, "output", `${bundler}-${mode}`)
  if (bundler === "vite") return checkVite(root, outDir, mode, browser)
  const compile: Compile =
    bundler === "webpack" ? require("webpack") : require("@rspack/core").rspack
  await runCompiler(
    compile,
    {
      context: root,
      mode,
      target: "web",
      entry: { browser: "./browser.mjs", surface: "./surface.mjs" },
      output: {
        path: outDir,
        filename: "[name].js",
        publicPath: "auto",
        clean: true
      },
      devtool: false,
      node: { __filename: "warn-mock", __dirname: "warn-mock" },
      // This census intentionally retains the entire API. Transfer budgets are
      // separately enforced by npm run size; module diagnostics remain fatal.
      performance: { hints: false }
    },
    `${bundler}/${mode}/browser`
  )
  writeFileSync(join(outDir, "index.html"), html("./browser.js"))
  const server = await serveOutput(outDir)
  let evidence
  try {
    evidence = await checkBrowser(browser, server.url)
  } finally {
    await server.close()
  }

  await runCompiler(
    compile,
    {
      context: root,
      mode,
      target: "node22",
      entry: "./server.mjs",
      output: {
        path: outDir,
        filename: "server.cjs",
        library: { type: "commonjs2" }
      },
      devtool: false,
      // Inspect Semiotic itself but leave native/optional Node dependencies in
      // their installed packages, as a normal SSR consumer would.
      externals: [
        (
          { request }: { request?: string },
          callback: (error: null, result?: string) => void
        ) => {
          callback(
            null,
            request &&
              !request.startsWith(".") &&
              !request.startsWith("/") &&
              !/^semiotic(?:\/|$)/.test(request)
              ? `commonjs ${request}`
              : undefined
          )
        }
      ],
      performance: { hints: false }
    },
    `${bundler}/${mode}/server`
  )
  return { ...evidence, serverFile: join(outDir, "server.cjs") }
}

export function html(script: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Semiotic consumer</title></head><body><div id="root"></div><script type="module" src="${script}"></script></body></html>`
}

async function checkVite(
  root: string,
  outDir: string,
  mode: Mode,
  browser: Browser
) {
  const require = createRequire(join(root, "package.json"))
  const vite: typeof import("vite") = await import(
    pathToFileURL(require.resolve("vite")).href
  )
  const diagnostics: string[] = []
  const expectedWarnings: string[] = []
  const logger = vite.createLogger("warn", { allowClearScreen: false })
  logger.warn = (message) => {
    diagnostics.push(`warning: ${message}`)
  }
  logger.warnOnce = logger.warn
  logger.error = (message) => {
    diagnostics.push(`error: ${message}`)
  }
  const base: InlineConfig = {
    configFile: false,
    root,
    mode,
    customLogger: logger,
    logLevel: "warn",
    define: { "process.env.NODE_ENV": JSON.stringify(mode) },
    build: {
      rolldownOptions: {
        onwarn(warning, defaultHandler) {
          if (isExpectedClientDirective(warning))
            expectedWarnings.push(warning.message)
          else defaultHandler(warning)
        }
      }
    },
    clearScreen: false
  }
  let evidence
  if (mode === "development") {
    const server = await vite.createServer({
      ...base,
      // Discover the complete census before loading the page, rather than
      // invalidating the optimizer's first graph with late test-only imports.
      optimizeDeps: {
        include: consumerEntries(require("semiotic/package.json")).browser.map(
          (entry) => entry.specifier
        )
      },
      server: { host: "127.0.0.1", port: 0 }
    })
    try {
      await server.listen()
      const url = server.resolvedUrls?.local[0]
      if (!url) throw new Error("Vite did not provide a development URL")
      evidence = await checkBrowser(browser, url, `${url}surface.mjs`)
    } finally {
      await server.close()
    }
  } else {
    // The namespace census is deliberately library-sized. Compile it as a
    // library, then separately exercise an ordinary HTML application with
    // named imports and Vite's default application diagnostics/budgets.
    await vite.build({
      ...base,
      build: {
        ...base.build,
        outDir: join(outDir, "census"),
        emptyOutDir: true,
        lib: {
          entry: join(root, "surface.mjs"),
          formats: ["es"],
          fileName: "surface"
        }
      }
    })
    await vite.build({
      ...base,
      build: {
        ...base.build,
        outDir,
        emptyOutDir: false
      }
    })
    const server = await serveOutput(outDir)
    try {
      evidence = await checkBrowser(browser, server.url)
    } finally {
      await server.close()
    }
  }
  await vite.build({
    ...base,
    ssr: { noExternal: ["semiotic"] },
    build: {
      ...base.build,
      outDir: join(outDir, "ssr"),
      emptyOutDir: true,
      ssr: join(root, "server.mjs"),
      minify: mode === "production",
      rolldownOptions: {
        ...base.build?.rolldownOptions,
        output: { entryFileNames: "server.mjs" }
      }
    }
  })
  assertNoDiagnostics(`vite/${mode}`, diagnostics)
  return {
    ...evidence,
    serverFile: join(outDir, "ssr", "server.mjs"),
    expectedWarnings
  }
}
