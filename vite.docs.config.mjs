import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { browserProcessDefines, semioticSourceAliases } from "./vite.shared.mjs"

const repoRoot = dirname(fileURLToPath(import.meta.url))
const docsRoot = resolve(repoRoot, "docs/public")
const outDir = resolve(repoRoot, "docs/build")

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
          cpSync(source, target, { recursive: true })
        } else {
          copyFileSync(source, target)
        }
      }
    },
  }
}

function docsDevEntrypoint() {
  const entryUrl = `/@fs/${resolve(repoRoot, "docs/src/index.jsx")}`
  return {
    name: "docs-dev-entrypoint",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace('src="../src/index.jsx"', `src="${entryUrl}"`)
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
  },
}))
