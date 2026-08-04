#!/usr/bin/env node

/**
 * Extract dated, public editorial-role observations from already-captured DHQ
 * People pages. This script deliberately does not infer appointment/end dates;
 * each output row says only what a source listed on its observed date.
 *
 * Usage:
 *   node scripts/dhq/capture-mastheads.mjs --capture dhq-2007-to-2025-20260729
 */

import console from "node:console"
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { JSDOM } from "jsdom"

const PEOPLE_URL = "https://dhq.digitalhumanities.org/dhq/people/people.html"
const ARCHIVED_PEOPLE_URL = "http://www.digitalhumanities.org/dhq/people/people.html"
const ACTIVE_SECTIONS = new Set([
  "DHQ Editors",
  "Managing Editors",
  "Contributing Reviewers",
  "Review Advisors",
  "Peer Review Advisors",
  "Development Staff",
  "Advisory Board"
])

const SNAPSHOTS = [
  {
    file: "people-2008-10-12.html",
    observedOn: "2008-10-12",
    sourceUrl: "https://web.archive.org/web/20081012035621id_/http://www.digitalhumanities.org/dhq/people/people.html",
    sourceKind: "internet-archive"
  },
  {
    file: "people-2012-01-03.html",
    observedOn: "2012-01-03",
    sourceUrl: "https://web.archive.org/web/20120103054235id_/http://www.digitalhumanities.org/dhq/people/people.html",
    sourceKind: "internet-archive"
  },
  {
    file: "people-2016-04-16.html",
    observedOn: "2016-04-16",
    sourceUrl: "https://web.archive.org/web/20160416044000id_/http://www.digitalhumanities.org/dhq/people/people.html",
    sourceKind: "internet-archive"
  },
  {
    file: "people-2020-10-01.html",
    observedOn: "2020-10-01",
    sourceUrl: "https://web.archive.org/web/20201001050733id_/http://www.digitalhumanities.org/dhq/people/people.html",
    sourceKind: "internet-archive"
  },
  {
    file: "people-2022-09-22.html",
    observedOn: "2022-09-22",
    sourceUrl: "https://web.archive.org/web/20220922081850id_/http://www.digitalhumanities.org/dhq/people/people.html",
    sourceKind: "internet-archive"
  },
  {
    file: "people-2024-09-15.html",
    observedOn: "2024-09-15",
    sourceUrl: "https://web.archive.org/web/20240915091718id_/https://www.digitalhumanities.org/dhq/people/people.html",
    sourceKind: "internet-archive"
  },
  {
    file: "people-2025-06-04.html",
    observedOn: "2025-06-04",
    sourceUrl: "https://web.archive.org/web/20250604221119id_/https://www.digitalhumanities.org/dhq/people/people.html",
    sourceKind: "internet-archive"
  },
  {
    file: "people-2026-07-29-live.html",
    observedOn: "2026-07-29",
    sourceUrl: PEOPLE_URL,
    sourceKind: "live-capture"
  }
]

function parseArguments(argv) {
  const captureIndex = argv.indexOf("--capture")
  const capture = captureIndex === -1 ? null : argv[captureIndex + 1]
  if (!capture || argv.length !== 2) {
    throw new Error("Usage: node scripts/dhq/capture-mastheads.mjs --capture <capture-id>")
  }
  return capture
}

function normalize(value) {
  return value?.replace(/\s+/g, " ").trim() || null
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

function sectionRole(section) {
  return {
    "Managing Editors": "Managing Editor",
    "Contributing Reviewers": "Contributing Reviewer",
    "Review Advisors": "Review Advisor",
    "Peer Review Advisors": "Peer Review Advisor",
    "Development Staff": "Development Staff",
    "Advisory Board": "Advisory Board"
  }[section] || section
}

function roleFamily(roleLabel) {
  const role = roleLabel.toLowerCase()
  if (role.includes("editor in chief") || role.includes("general editor")) return "senior-editorial"
  if (role.includes("managing")) return "managing"
  if (role.includes("review")) return "review"
  if (role.includes("advisory")) return "advisory"
  if (/(schema|technical|development|data analytics|indexing|metadata|language|collaborative)/.test(role)) {
    return "specialist-or-systems"
  }
  return "editorial-or-production"
}

function splitPersonAndAffiliation(value) {
  const [personDisplayName, ...affiliationParts] = value.split(/,\s+/)
  return {
    personDisplayName: normalize(personDisplayName),
    affiliationRaw: normalize(affiliationParts.join(", "))
  }
}

function editorLine(value) {
  const line = normalize(value)?.replace(/^\[\+\]\s*/, "") || null
  const divider = line?.indexOf(":") ?? -1
  if (divider < 1) return null
  const roleLabelRaw = normalize(line.slice(0, divider))
  const identity = splitPersonAndAffiliation(line.slice(divider + 1))
  return identity.personDisplayName ? { roleLabelRaw, ...identity, rawLine: line } : null
}

function entriesForSection(heading) {
  const section = normalize(heading.textContent)
  const entries = []
  for (let sibling = heading.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
    if (sibling.tagName.toLowerCase() === "h2") break
    if (section === "DHQ Editors" && sibling.tagName.toLowerCase() === "div") {
      const entry = editorLine(sibling.textContent)
      if (entry) entries.push(entry)
    }
    if (sibling.tagName.toLowerCase() === "ul") {
      for (const item of sibling.querySelectorAll(":scope > li")) {
        const rawLine = normalize(item.textContent)
        if (!rawLine) continue
        const roleLabelRaw = section === "Development Staff" && rawLine.includes(":")
          ? normalize(rawLine.slice(0, rawLine.indexOf(":")))
          : sectionRole(section)
        const identityText = section === "Development Staff" && rawLine.includes(":")
          ? rawLine.slice(rawLine.indexOf(":") + 1)
          : rawLine
        entries.push({
          roleLabelRaw,
          ...splitPersonAndAffiliation(identityText),
          rawLine
        })
      }
    }
  }
  return { section, entries }
}

function observationsForSnapshot(html, snapshot) {
  const document = new JSDOM(html).window.document
  const sourceHash = sha256(html)
  const observations = []
  const skippedSections = []
  for (const heading of document.querySelectorAll("#mainContent h2")) {
    const { section, entries } = entriesForSection(heading)
    if (!ACTIVE_SECTIONS.has(section)) {
      if (section) skippedSections.push(section)
      continue
    }
    entries.forEach((entry, index) => {
      observations.push({
        roleObservationId: `${snapshot.observedOn}:${section}:${index + 1}`,
        observedOn: snapshot.observedOn,
        sourceKind: snapshot.sourceKind,
        sourceUrl: snapshot.sourceUrl,
        originalUrl: ARCHIVED_PEOPLE_URL,
        sourcePath: path.posix.join("mastheads", snapshot.file),
        sourceHash,
        sectionLabelRaw: section,
        roleLabelRaw: entry.roleLabelRaw,
        roleFamily: roleFamily(entry.roleLabelRaw),
        personDisplayName: entry.personDisplayName,
        affiliationRaw: entry.affiliationRaw,
        rawLine: entry.rawLine,
        intervalStart: null,
        intervalEnd: null,
        intervalCertainty: "observed-on-only"
      })
    })
  }
  return { observations, skippedSections }
}

async function main() {
  const capture = parseArguments(process.argv.slice(2))
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
  const rawDirectory = path.join(projectRoot, "data", "dhq", "raw", capture, "mastheads")
  const derivedDirectory = path.join(projectRoot, "data", "dhq", "derived", capture)
  const allObservations = []
  const snapshotSummary = []

  for (const snapshot of SNAPSHOTS) {
    const html = await readFile(path.join(rawDirectory, snapshot.file), "utf8")
    const { observations, skippedSections } = observationsForSnapshot(html, snapshot)
    allObservations.push(...observations)
    snapshotSummary.push({
      observedOn: snapshot.observedOn,
      sourceKind: snapshot.sourceKind,
      sourceUrl: snapshot.sourceUrl,
      sourceFile: snapshot.file,
      observationCount: observations.length,
      skippedSections
    })
  }

  await mkdir(derivedDirectory, { recursive: true })
  await writeFile(
    path.join(derivedDirectory, "editorial-roles.jsonl"),
    `${allObservations.map(observation => JSON.stringify(observation)).join("\n")}\n`
  )
  await writeFile(
    path.join(derivedDirectory, "editorial-role-quality-report.json"),
    `${JSON.stringify({
      capture,
      source: PEOPLE_URL,
      methodology: "Dated public masthead observations only; no tenure dates inferred.",
      snapshots: snapshotSummary,
      totalObservations: allObservations.length,
      observationsByRoleFamily: Object.groupBy(allObservations, observation => observation.roleFamily),
      rawSourceHashing: true
    }, null, 2)}\n`
  )

  console.log(JSON.stringify({
    capture,
    snapshots: snapshotSummary.map(snapshot => ({
      observedOn: snapshot.observedOn,
      observations: snapshot.observationCount
    })),
    totalObservations: allObservations.length
  }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
  })
}
