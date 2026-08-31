import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { docsEntryContract } from "./scripts/check-docs-entry-contract.mjs"
import { browserProcessDefines, semioticSourceAliases } from "./vite.shared.mjs"

const repoRoot = dirname(fileURLToPath(import.meta.url))
const docsRoot = resolve(repoRoot, "docs/public")
const outDir = resolve(repoRoot, "docs/build")
const docsEntryPath = resolve(repoRoot, "docs/src/index.jsx")

function copyDocsPublicAssets() {
  return {
    name: "copy-docs-public-assets",
    closeBundle() {
      if (!existsSync(docsRoot)) return
      mkdirSync(outDir, { recursive: true })
      for (const entry of readdirSync(docsRoot)) {
        if (entry === "index.html" || entry === ".DS_Store") continue
        const source = join(docsRoot, entry)
        const target = join(outDir, entry)
        if (statSync(source).isDirectory()) {
          cpSync(source, target, {
            recursive: true,
            // Finder metadata is ignored by Git but must not leak into the
            // deployed asset tree or make local payload checks host-specific.
            filter: (path) => basename(path) !== ".DS_Store",
          })
        } else {
          copyFileSync(source, target)
        }
      }
    },
  }
}

function docsDevEntrypoint() {
  const entryUrl = `/@fs/${docsEntryPath}`
  const docsEntrypointRE = /^\/src\/index\.(?:js|jsx|ts|tsx)$/
  const rewriteHtml = (html) =>
    html
      .replace('href="./prism.css"', 'href="/prism.css"')
      .replace('href="./semiotic.css"', 'href="/semiotic.css"')
      .replace('href="./assets/img/favicon.png"', 'href="/assets/img/favicon.png"')
      .replace('src="./prism.js"', 'src="/prism.js"')
      .replace(
        /src=(["'])(?:\.\.\/src\/index\.jsx|\/src\/index\.jsx|\/src\/index\.tsx|\/src\/index\.ts|\/src\/index\.js)\1/g,
        `src="${entryUrl}"`,
      )

  return {
    name: "docs-dev-entrypoint",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = req.url?.split("?")[0]
        if (pathname && docsEntrypointRE.test(pathname)) {
          req.url = `${entryUrl}${req.url?.slice(pathname.length)}`
        }
        const acceptsHtml = req.headers.accept?.includes("text/html")
        if (req.method === "GET" && acceptsHtml && pathname && !pathname.includes(".")) {
          req.url = "/index.html"
        }
        next()
      })
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return rewriteHtml(html)
      },
    },
  }
}

export default defineConfig(({ mode }) => ({
  root: docsRoot,
  base: "./",
  publicDir: false,
  plugins: [
    docsDevEntrypoint(),
    react({
      include: [
        /docs\/src\/.*\.jsx$/,
        /src\/components\/.*\.tsx$/,
      ],
      exclude: [/dist\//, /node_modules\//],
    }),
    docsEntryContract({ entryPath: docsEntryPath }),
    copyDocsPublicAssets(),
  ],
  resolve: {
    alias: semioticSourceAliases(repoRoot),
  },
  define: browserProcessDefines(mode),
  server: {
    host: "127.0.0.1",
    port: 3000,
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    // Large Natural Earth and authored-example datasets are route-lazy and
    // compress well. The post-build docs asset gate enforces both raw and gzip
    // transfer budgets, so keep Vite's raw-only warning aligned with that
    // explicit 900 kB ceiling instead of emitting unactionable 500 kB noise.
    chunkSizeWarningLimit: 900,
  },
}))
