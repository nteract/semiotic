#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildTaskPackets,
  compareOutputs,
  taskOutputs
} from "./lib/ai-task-packets.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
try {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== "--check"))
    throw new Error(
      "Usage: node scripts/generate-ai-task-packets.mjs [--check]"
    )
  const packets = buildTaskPackets(root)
  const outputs = taskOutputs(packets)
  if (args.includes("--check")) {
    const stale = compareOutputs(root, outputs)
    if (stale.length)
      throw new Error(
        `Task packets are stale; run npm run docs:ai-tasks:\n${stale.join("\n")}`
      )
    console.log(
      `Task packet gate passed (${packets.length} tasks; committed packets match their guidance sources and selected contract).`
    )
  } else {
    for (const [path, content] of outputs) {
      mkdirSync(dirname(resolve(root, path)), { recursive: true })
      writeFileSync(resolve(root, path), content)
    }
    console.log(
      `Generated ${outputs.size} human and machine task views from ${packets.length} definitions.`
    )
  }
  // Informational: runtime or harness edits make a recorded run stale without
  // changing any committed packet, so say when a re-run would refresh it.
  const notCurrent = packets.filter(
    (packet) => packet.evidence.status !== "supported-in-scope"
  )
  if (notCurrent.length)
    console.log(
      `Recorded evidence: ${notCurrent
        .map((packet) => `${packet.id} ${packet.evidence.status}`)
        .join(", ")}. npm run verify:ai-tasks re-runs the declared checks against the current sources.`
    )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
