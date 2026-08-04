#!/usr/bin/env node

/**
 * Write the small, source-bound public-event ledger used to contextualize the
 * DHQ publication record. Events are observations, not causal explanations for
 * changes in subjects or authorship.
 *
 * Usage:
 *   node scripts/dhq/build-editorial-events.mjs --capture <capture-id>
 */

import console from "node:console"
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const EVENTS = [
  {
    eventId: "advisory-board-reestablishment-2022",
    eventDate: "2022-01-01",
    datePrecision: "year",
    eventKind: "masthead-statement",
    label: "Advisory Board re-establishment",
    evidenceSummary: "The September 2022 DHQ People page says the Advisory Board is being re-established starting in 2022.",
    sourcePath: "mastheads/people-2022-09-22.html",
    sourceUrl: "https://web.archive.org/web/20220922081850id_/http://www.digitalhumanities.org/dhq/people/people.html"
  },
  {
    eventId: "author-support-workshop-2023-01-12",
    eventDate: "2023-01-12",
    datePrecision: "day",
    eventKind: "author-support-workshop",
    label: "DHQ author-support orientation workshop",
    evidenceSummary: "DHQ records an orientation workshop for potential authors as part of the peer-review team's January 2023 workshop series.",
    sourcePath: "author-support-2026-07-29.html",
    sourceUrl: "https://dhq.digitalhumanities.org/submissions/author_support.html"
  },
  {
    eventId: "author-support-workshop-2023-01-13",
    eventDate: "2023-01-13",
    datePrecision: "day",
    eventKind: "author-support-workshop",
    label: "DHQ author-support orientation workshop",
    evidenceSummary: "DHQ records a second orientation workshop in the January 2023 author-support series.",
    sourcePath: "author-support-2026-07-29.html",
    sourceUrl: "https://dhq.digitalhumanities.org/submissions/author_support.html"
  }
]

function captureFrom(argv) {
  const captureIndex = argv.indexOf("--capture")
  const capture = captureIndex === -1 ? null : argv[captureIndex + 1]
  if (!capture || argv.length !== 2) {
    throw new Error("Usage: node scripts/dhq/build-editorial-events.mjs --capture <capture-id>")
  }
  return capture
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

async function main() {
  const capture = captureFrom(process.argv.slice(2))
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
  const rawDirectory = path.join(projectRoot, "data", "dhq", "raw", capture)
  const derivedDirectory = path.join(projectRoot, "data", "dhq", "derived", capture)
  const events = await Promise.all(EVENTS.map(async event => {
    const source = await readFile(path.join(rawDirectory, event.sourcePath), "utf8")
    return { ...event, sourceHash: sha256(source), causalStatus: "context-only" }
  }))

  await mkdir(derivedDirectory, { recursive: true })
  await writeFile(path.join(derivedDirectory, "editorial-events.json"), `${JSON.stringify({
    capture,
    interpretiveLimit: "These date public statements/programs. They do not explain or cause any observed publication trend.",
    events
  }, null, 2)}\n`)
  console.log(JSON.stringify({ capture, events: events.map(event => event.eventId) }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
  })
}
