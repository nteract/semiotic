#!/usr/bin/env node
/**
 * Lightweight smoke check for the docs dev server entrypoint. If the server is
 * serving `/src/index.jsx` from a real module, this catches the Vite
 * pre-transform failure before it reaches the browser.
 */

import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"
import http from "node:http"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const HOST = "127.0.0.1"
const PORT = Number(process.env.DOCS_CHECK_PORT ?? "4174")
const BASE = `http://${HOST}:${PORT}`

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function request(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let body = ""
      res.on("data", (chunk) => {
        body += chunk
      })
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, body, headers: res.headers })
      })
    }).on("error", (error) => {
      reject(error)
    })
  })
}

async function waitForServer() {
  const timeoutAt = Date.now() + 20_000
  while (Date.now() < timeoutAt) {
    try {
      const response = await request("/")
      if (response.statusCode === 200) return
    } catch {
      // no-op
    }
    await sleep(250)
  }
  throw new Error(`docs dev server did not come up on ${BASE} within 20s`)
}

async function run() {
  const logs = []
  const server = spawn(
    npmCommand,
    ["run", "docs:dev", "--", "--host", HOST, "--port", String(PORT)],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  )

  const cleanup = () => {
    if (!server.killed) {
      server.kill("SIGINT")
      setTimeout(() => {
        if (!server.killed) {
          server.kill("SIGKILL")
        }
      }, 500)
    }
  }

  server.stdout.on("data", (chunk) => {
    logs.push(chunk.toString())
  })
  server.stderr.on("data", (chunk) => {
    logs.push(chunk.toString())
  })

  try {
    await waitForServer()
    const entryResponse = await request("/src/index.jsx")
    if (
      entryResponse.statusCode !== 200 ||
      !String(entryResponse.headers["content-type"] || "").includes("javascript")
    ) {
      throw new Error(
        `Expected /src/index.jsx to resolve as JS, got ${entryResponse.statusCode} (${entryResponse.headers["content-type"]})`,
      )
    }
    console.log("✓ docs entrypoint resolves cleanly at", `${BASE}/src/index.jsx`)
    cleanup()
    process.exit(0)
  } catch (error) {
    console.error("✗ docs entrypoint check failed")
    console.error(`  - ${error instanceof Error ? error.message : String(error)}`)
    for (const line of logs.slice(-20)) {
      console.error(line.trimEnd())
    }
    cleanup()
    process.exit(1)
  }
}

run()
