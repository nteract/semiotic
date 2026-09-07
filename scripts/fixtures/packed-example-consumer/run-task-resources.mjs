import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { createInterface } from "node:readline"

// Resolve everything from the installed package. This fixture is copied into
// the throwaway consumer and cannot borrow generated files from the checkout.
const require = createRequire(import.meta.url)
const packagePath = require.resolve("semiotic/package.json")
const packageRoot = dirname(packagePath)
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"))
const packetDirectory = join(packageRoot, "ai/task-packets")
const readJSON = (name) =>
  JSON.parse(readFileSync(join(packetDirectory, name), "utf8"))
const index = readJSON("index.json")
const taskIds = [
  "compare-category-totals",
  "correct-published-chart",
  "update-live-chart"
]

assert.equal(index.schemaVersion, 1)
assert.deepEqual(index.tasks.map(({ id }) => id).sort(), taskIds)
const packets = new Map()
for (const task of index.tasks) {
  const packet = readJSON(`${task.id}.json`)
  const markdown = readFileSync(join(packetDirectory, `${task.id}.md`), "utf8")
  assert.equal(packet.schemaVersion, 1)
  assert.equal(packet.id, task.id)
  assert.equal(packet.identity.packageName, packageJson.name)
  assert.equal(packet.identity.packageVersion, packageJson.version)
  assert.equal(task.packageVersion, packageJson.version)
  assert.equal(packet.identity.channel, index.channel)
  assert.equal(packet.identity.sourceRevision, task.sourceRevision)
  assert.match(task.sourceRevision, /^sha256:[a-f0-9]{64}$/)
  assert.ok(
    markdown.includes(
      `Source package: semiotic@${packageJson.version}. Channel: ${index.channel}.`
    )
  )
  assert.ok(markdown.includes(`Source revision: ${task.sourceRevision}.`))
  assert.ok(
    packet.examples.length > 0,
    `${task.id} must include complete examples`
  )
  for (const example of packet.examples) {
    const digest = `sha256:${createHash("sha256").update(example.source).digest("hex")}`
    assert.equal(
      example.digest,
      digest,
      `${task.id}: embedded example content must match its identity`
    )
    assert.ok(
      markdown.includes(example.source.trim()),
      `${task.id}: markdown must preserve the example source`
    )
  }
  packets.set(task.id, packet)
}

/** Minimal newline-delimited MCP client; no optional SDK install is needed. */
function startServer(profile) {
  const executable = resolve(packageRoot, packageJson.bin["semiotic-mcp"])
  const child = spawn(process.execPath, [executable, "--profile", profile], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: packageRoot
  })
  const lines = createInterface({ input: child.stdout })
  const pending = new Map()
  let nextId = 0
  let stderr = ""
  let stopped = false
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-8000)
  })
  const rejectPending = (error) => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer)
      entry.reject(error)
    }
    pending.clear()
  }
  child.on("error", (error) => {
    stopped = true
    rejectPending(error)
  })
  child.stdin.on("error", rejectPending)
  child.on("exit", (code, signal) => {
    stopped = true
    rejectPending(
      new Error(`Packed MCP ${profile} exited (${code ?? signal}): ${stderr}`)
    )
  })
  lines.on("line", (line) => {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      return
    }
    const entry = pending.get(message.id)
    if (!entry) return
    clearTimeout(entry.timer)
    pending.delete(message.id)
    if (message.error)
      entry.reject(
        new Error(`Packed MCP ${entry.method}: ${message.error.message}`)
      )
    else entry.resolve(message.result)
  })

  return {
    request(method, params = {}) {
      if (stopped) {
        return Promise.reject(
          new Error(`Packed MCP ${profile} is no longer running: ${stderr}`)
        )
      }
      const id = ++nextId
      return new Promise((resolveRequest, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(
            new Error(
              `Packed MCP ${profile} timed out reading ${method}: ${stderr}`
            )
          )
        }, 10000)
        pending.set(id, { method, resolve: resolveRequest, reject, timer })
        child.stdin.write(
          `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`
        )
      })
    },
    notify(method) {
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method })}\n`)
    },
    async close() {
      lines.close()
      if (stopped) return
      await new Promise((resolveClosed) => {
        const timer = setTimeout(() => child.kill("SIGKILL"), 1000)
        child.once("exit", () => {
          clearTimeout(timer)
          resolveClosed()
        })
        child.kill()
      })
    }
  }
}

function resourceJSON(result, uri) {
  const content = result.contents.find((entry) => entry.uri === uri)
  assert.equal(content?.mimeType, "application/json")
  return JSON.parse(content.text)
}

for (const profile of ["public", "developer"]) {
  const server = startServer(profile)
  try {
    const initialized = await server.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "packed-task-consumer", version: "1.0.0" }
    })
    assert.ok(initialized.capabilities.resources)
    server.notify("notifications/initialized")
    const discovered = await server.request("resources/list")
    assert.ok(
      discovered.resources.some(({ uri }) => uri === "semiotic://tasks")
    )
    const templates = await server.request("resources/templates/list")
    assert.ok(
      templates.resourceTemplates.some(
        ({ uriTemplate }) => uriTemplate === "semiotic://tasks/{taskId}"
      )
    )
    const deliveredIndex = resourceJSON(
      await server.request("resources/read", { uri: "semiotic://tasks" }),
      "semiotic://tasks"
    )
    assert.equal(
      deliveredIndex.delivery.installedPackageVersion,
      packageJson.version
    )
    assert.deepEqual(deliveredIndex.tasks.map(({ id }) => id).sort(), taskIds)
    for (const task of deliveredIndex.tasks) {
      assert.equal(task.resourceUri, `semiotic://tasks/${task.id}`)
      const delivered = resourceJSON(
        await server.request("resources/read", { uri: task.resourceUri }),
        task.resourceUri
      )
      const { delivery, ...packet } = delivered
      assert.equal(delivery.installedPackageVersion, packageJson.version)
      assert.equal(delivery.versionCheck, "match")
      assert.deepEqual(
        packet,
        packets.get(task.id),
        "MCP must preserve the installed packet and its evidence limits"
      )
    }
    await assert.rejects(
      server.request("resources/read", {
        uri: "semiotic://tasks/unknown-task"
      }),
      /Unknown Semiotic task/
    )
    await assert.rejects(
      server.request("resources/read", {
        uri: "semiotic://tasks/%2e%2e%2fpackage"
      })
    )
    const tools = await server.request("tools/list")
    assert.equal(tools.tools.length, profile === "public" ? 5 : 23)
    assert.ok(
      !tools.tools.some(({ name }) => /task/i.test(name)),
      "Task discovery must not introduce another tool"
    )
  } finally {
    await server.close()
  }
}

console.log(
  "packed task delivery: 3 JSON/Markdown packets with matching example hashes; public/developer MCP resources preserve source identities, reject unknown/traversal reads, and keep existing tool counts"
)
