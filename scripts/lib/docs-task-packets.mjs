import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"

const PACKET_DIRECTORY = "ai/task-packets"
const PUBLIC_PREFIX = "/tasks/"
const CONTENT_TYPES = {
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
}

/** Generated packet files, by the name they are served under. */
export function listTaskPacketFiles(root) {
  const directory = resolve(root, PACKET_DIRECTORY)
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:json|md)$/.test(entry.name)
    )
    .map((entry) => entry.name)
    .sort()
}

/**
 * Serve and publish `ai/task-packets` at `/tasks/` without a second committed
 * copy. Docs pages import the packets from `ai/task-packets` directly; this
 * plugin only supplies the machine-readable URLs (`/tasks/index.json`,
 * `/tasks/<id>.json`, `/tasks/<id>.md`) in development and in the build.
 */
export function docsTaskPackets({ root, outDir }) {
  const directory = resolve(root, PACKET_DIRECTORY)
  return {
    name: "docs-task-packets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0]
        if (
          (req.method !== "GET" && req.method !== "HEAD") ||
          !pathname?.startsWith(PUBLIC_PREFIX)
        )
          return next()
        // Only names read from the directory listing reach the filesystem.
        const name = listTaskPacketFiles(root).find(
          (file) => file === pathname.slice(PUBLIC_PREFIX.length)
        )
        if (!name) return next()
        const body = readFileSync(join(directory, name))
        res.statusCode = 200
        res.setHeader("Content-Type", CONTENT_TYPES[name.slice(name.lastIndexOf("."))])
        res.setHeader("Content-Length", body.byteLength)
        res.setHeader("Cache-Control", "no-cache")
        res.end(req.method === "HEAD" ? undefined : body)
      })
    },
    closeBundle() {
      const files = listTaskPacketFiles(root)
      if (!files.length) return
      const target = join(outDir, "tasks")
      mkdirSync(target, { recursive: true })
      for (const name of files) copyFileSync(join(directory, name), join(target, name))
    }
  }
}
