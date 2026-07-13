#!/usr/bin/env node
/**
 * Isolated runners used by machine-baseline.mjs.
 *
 * Each mode writes exactly one JSON object to stdout. The parent command owns
 * artifact setup and comparison; keeping measurements in short-lived child
 * processes prevents module caches from turning an import/startup measurement
 * into a warm-process result.
 */
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { performance } from "node:perf_hooks"
import { Worker } from "node:worker_threads"
import vm from "node:vm"

const mode = process.argv[2]

function positiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function emit(value) {
  process.stdout.write(JSON.stringify(value) + "\n")
}

async function parseModule() {
  if (typeof vm.SourceTextModule !== "function") {
    throw new Error("vm.SourceTextModule requires --experimental-vm-modules")
  }

  const target = process.env.SEMIOTIC_MACHINE_BASELINE_TARGET
  if (!target) throw new Error("SEMIOTIC_MACHINE_BASELINE_TARGET is required for parse mode")

  const source = readFileSync(target, "utf8")
  const samples = []
  const sampleCount = positiveInteger(process.env.SEMIOTIC_MACHINE_BASELINE_SAMPLES, 15)
  for (let index = 0; index < sampleCount; index += 1) {
    const startedAt = performance.now()
    new vm.SourceTextModule(source, { identifier: target + "?sample=" + index })
    samples.push(performance.now() - startedAt)
  }

  emit({ sourceBytes: Buffer.byteLength(source), samplesMs: samples })
}

async function evaluateEntry() {
  const specifier = process.env.SEMIOTIC_MACHINE_BASELINE_SPECIFIER
  if (!specifier) throw new Error("SEMIOTIC_MACHINE_BASELINE_SPECIFIER is required for evaluation mode")

  const startedAt = performance.now()
  const module = await import(specifier)
  emit({
    elapsedMs: performance.now() - startedAt,
    exportCount: Object.keys(module).length,
  })
}

function ssrFixture() {
  return Array.from({ length: 500 }, (_, index) => ({
    x: index,
    y: Math.round(40 + Math.sin(index / 17) * 22 + (index % 19)),
    series: index % 2 === 0 ? "retained" : "baseline",
  }))
}

async function renderSsr() {
  const sampleCount = positiveInteger(process.env.SEMIOTIC_MACHINE_BASELINE_SAMPLES, 15)
  const warmupCount = positiveInteger(process.env.SEMIOTIC_MACHINE_BASELINE_WARMUPS, 2)
  const { renderChart } = await import("semiotic/server/edge")
  const props = {
    width: 640,
    height: 360,
    data: ssrFixture(),
    xAccessor: "x",
    yAccessor: "y",
    lineBy: "series",
    showGrid: true,
  }

  for (let index = 0; index < warmupCount; index += 1) {
    renderChart("LineChart", props)
  }

  const samples = []
  let svg = ""
  let hash = ""
  for (let index = 0; index < sampleCount; index += 1) {
    const startedAt = performance.now()
    const rendered = renderChart("LineChart", props)
    samples.push(performance.now() - startedAt)
    const renderedHash = createHash("sha256").update(rendered).digest("hex")
    if (index > 0 && renderedHash !== hash) {
      throw new Error("SSR fixture output was not deterministic across samples")
    }
    svg = rendered
    hash = renderedHash
  }

  emit({
    samplesMs: samples,
    svgBytes: Buffer.byteLength(svg),
    svgSha256: hash,
  })
}

function waitForWorkerReady(worker, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error("worker did not become ready within " + timeoutMs + "ms"))
    }, timeoutMs)

    const cleanup = () => {
      clearTimeout(timeout)
      worker.off("error", onError)
      worker.off("message", onMessage)
    }

    const onError = (error) => {
      cleanup()
      reject(error)
    }

    const onMessage = (message) => {
      if (!message || message.type !== "ready") return
      cleanup()
      resolve()
    }

    worker.once("error", onError)
    worker.on("message", onMessage)
  })
}

async function startWorker() {
  const target = process.env.SEMIOTIC_MACHINE_BASELINE_TARGET
  const wrapper = process.env.SEMIOTIC_MACHINE_BASELINE_WORKER_WRAPPER
  if (!target || !wrapper) {
    throw new Error("worker mode requires target and wrapper environment variables")
  }

  const sampleCount = positiveInteger(process.env.SEMIOTIC_MACHINE_BASELINE_SAMPLES, 7)
  const timeoutMs = positiveInteger(process.env.SEMIOTIC_MACHINE_BASELINE_TIMEOUT_MS, 10000)
  const samples = []

  for (let index = 0; index < sampleCount; index += 1) {
    const startedAt = performance.now()
    const worker = new Worker(wrapper, {
      type: "module",
      workerData: { target },
      // This runner may itself be invoked with experimental VM flags. A
      // browser worker must not inherit flags that make its module unusable.
      execArgv: [],
    })
    try {
      await waitForWorkerReady(worker, timeoutMs)
      samples.push(performance.now() - startedAt)
    } finally {
      await worker.terminate()
    }
  }

  emit({ samplesMs: samples })
}

function requestId(value) {
  return String(value)
}

async function measureMcpStdio() {
  const serverPath = process.env.SEMIOTIC_MACHINE_BASELINE_MCP_SERVER
  const cwd = process.env.SEMIOTIC_MACHINE_BASELINE_MCP_CWD
  if (!serverPath || !cwd) throw new Error("MCP mode requires server path and working directory")

  const timeoutMs = positiveInteger(process.env.SEMIOTIC_MACHINE_BASELINE_TIMEOUT_MS, 10000)
  const child = spawn(process.execPath, [serverPath, "--profile", "public"], {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, MCP_LOG_LEVEL: "silent", NODE_ENV: "production" },
  })

  let stderr = ""
  child.stderr.setEncoding("utf8")
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-4000)
  })

  let stdoutBuffer = ""
  const pending = new Map()
  const rejectPending = (error) => {
    for (const pendingRequest of pending.values()) pendingRequest.reject(error)
    pending.clear()
  }

  child.stdout.setEncoding("utf8")
  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk
    let newline
    while ((newline = stdoutBuffer.indexOf("\n")) >= 0) {
      const line = stdoutBuffer.slice(0, newline).trim()
      stdoutBuffer = stdoutBuffer.slice(newline + 1)
      if (!line) continue
      let message
      try {
        message = JSON.parse(line)
      } catch {
        continue
      }
      if (message.id === undefined || message.id === null) continue
      const pendingRequest = pending.get(requestId(message.id))
      if (!pendingRequest) continue
      pending.delete(requestId(message.id))
      pendingRequest.resolve(message)
    }
  })

  child.once("error", rejectPending)
  child.once("exit", (code, signal) => {
    if (pending.size > 0) {
      rejectPending(new Error("MCP process exited before responding (code " + code + ", signal " + signal + "): " + stderr))
    }
  })

  const call = (id, method, params) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId(id))
      reject(new Error("MCP " + method + " timed out after " + timeoutMs + "ms: " + stderr))
    }, timeoutMs)
    pending.set(requestId(id), {
      resolve: (message) => {
        clearTimeout(timer)
        resolve(message)
      },
      reject: (error) => {
        clearTimeout(timer)
        reject(error)
      },
    })
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n")
  })

  try {
    const initializeStartedAt = performance.now()
    const initialize = await call("machine-baseline-init", "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "semiotic-machine-baseline", version: "1.0.0" },
    })
    const initializeMs = performance.now() - initializeStartedAt
    if (!initialize.result || initialize.error) {
      throw new Error("MCP initialize returned an error: " + JSON.stringify(initialize.error || initialize))
    }

    child.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    }) + "\n")

    const toolsStartedAt = performance.now()
    const tools = await call("machine-baseline-tools", "tools/list", {})
    const toolsListMs = performance.now() - toolsStartedAt
    if (!tools.result || !Array.isArray(tools.result.tools) || tools.error) {
      throw new Error("MCP tools/list returned an invalid result")
    }

    emit({
      initializeMs,
      toolsListMs,
      toolCount: tools.result.tools.length,
      protocolVersion: initialize.result.protocolVersion || null,
    })
  } finally {
    child.kill("SIGTERM")
  }
}

async function main() {
  if (mode === "parse") return parseModule()
  if (mode === "evaluate") return evaluateEntry()
  if (mode === "ssr") return renderSsr()
  if (mode === "worker") return startWorker()
  if (mode === "mcp") return measureMcpStdio()
  throw new Error("Unknown machine baseline runner mode: " + String(mode))
}

main().catch((error) => {
  process.stderr.write((error && error.stack) || String(error))
  process.stderr.write("\n")
  process.exit(1)
})
