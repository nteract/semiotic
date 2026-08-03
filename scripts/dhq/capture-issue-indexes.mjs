#!/usr/bin/env node

/**
 * Explicit, rate-limited capture of DHQ issue indexes for a previously
 * ingested corpus. The XML corpus remains the article source of record; index
 * pages provide a second-source completeness check and their published section
 * labels. This script is never run by builds or tests.
 *
 * Usage:
 *   node scripts/dhq/capture-issue-indexes.mjs --capture <capture-id> [--rate-limit-ms 750]
 */

import console from "node:console"
import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import https from "node:https"
import path from "node:path"
import process from "node:process"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath, URL } from "node:url"
import { JSDOM } from "jsdom"

const SOURCE_ROOT = "https://dhq.digitalhumanities.org/dhq"
const USER_AGENT = "Semiotic-DHQ-research/1.0 (derived-visualization-research; contact: dhqinfo@digitalhumanities.org)"

function parseArguments(argv) {
  const args = { capture: null, rateLimitMs: 750 }
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--capture") args.capture = argv[++index]
    else if (argv[index] === "--rate-limit-ms") args.rateLimitMs = Number(argv[++index])
    else throw new Error(`Unknown argument: ${argv[index]}`)
  }
  if (!args.capture || !Number.isFinite(args.rateLimitMs) || args.rateLimitMs < 250) {
    throw new Error("Usage: node scripts/dhq/capture-issue-indexes.mjs --capture <capture-id> [--rate-limit-ms 750]")
  }
  return args
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

function sleep(milliseconds) {
  return delay(milliseconds)
}

function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "user-agent": USER_AGENT } }, response => {
      const statusCode = response.statusCode || 0
      if (statusCode >= 300 && statusCode < 400 && response.headers.location && redirects < 3) {
        response.resume()
        resolve(fetchText(new URL(response.headers.location, url).toString(), redirects + 1))
        return
      }
      if (statusCode !== 200) {
        response.resume()
        reject(new Error(`${url} returned HTTP ${statusCode}`))
        return
      }
      const chunks = []
      response.on("data", chunk => chunks.push(chunk))
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      response.on("error", reject)
    })
    request.setTimeout(30_000, () => request.destroy(new Error(`Timed out fetching ${url}`)))
    request.on("error", reject)
  })
}

function issuePairs(articles) {
  return [...new Map(
    articles.map(article => [`${article.volume}.${article.issue}`, { volume: article.volume, issue: article.issue }])
  ).values()].sort((left, right) => left.volume - right.volume || left.issue - right.issue)
}

function issueUrl({ volume, issue }) {
  return `${SOURCE_ROOT}/vol/${volume}/${issue}/index.html`
}

function normalize(value) {
  return value?.replace(/\s+/g, " ").trim() || null
}

function recordsFromIndex(html, issue, url, sourcePath) {
  const document = new JSDOM(html).window.document
  const content = document.querySelector("#toc") || document.querySelector("#mainContent") || document.body
  let sectionLabelRaw = null
  const records = new Map()

  for (const element of content.querySelectorAll("h2, h3, .articleInfo")) {
    if (element.matches("h2, h3")) {
      sectionLabelRaw = normalize(element.textContent)
      continue
    }
    for (const link of element.querySelectorAll("a[href]")) {
      const match = link.getAttribute("href")?.match(/\/(\d{6})(?:\/\1)?\.html(?:[?#]|$)/)
      if (!match || records.has(match[1])) continue
      records.set(match[1], {
        articleId: match[1],
        volume: issue.volume,
        issue: issue.issue,
        sectionLabelRaw,
        issueUrl: url,
        sourcePath,
        sourceHash: sha256(html)
      })
    }
  }
  return [...records.values()]
}

async function main() {
  const { capture, rateLimitMs } = parseArguments(process.argv.slice(2))
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
  const rawDirectory = path.join(projectRoot, "data", "dhq", "raw", capture, "issue-indexes")
  const derivedDirectory = path.join(projectRoot, "data", "dhq", "derived", capture)
  const articles = (await readFile(path.join(derivedDirectory, "articles.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(line => JSON.parse(line))
  const excludedRecords = (await readFile(path.join(derivedDirectory, "excluded-records.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(line => JSON.parse(line))
  const issues = issuePairs(articles)
  const indexes = []
  const errors = []

  await mkdir(rawDirectory, { recursive: true })
  for (const [index, issue] of issues.entries()) {
    const url = issueUrl(issue)
    const file = `vol-${issue.volume}-${issue.issue}-index.html`
    const sourcePath = path.posix.join("issue-indexes", file)
    let fetched = false
    try {
      let html
      try {
        html = await readFile(path.join(rawDirectory, file), "utf8")
      } catch {
        html = await fetchText(url)
        await writeFile(path.join(rawDirectory, file), html)
        fetched = true
      }
      indexes.push(...recordsFromIndex(html, issue, url, sourcePath))
      console.log(`[${index + 1}/${issues.length}] ${issue.volume}.${issue.issue}`)
    } catch (error) {
      errors.push({
        volume: issue.volume,
        issue: issue.issue,
        url,
        error: error instanceof Error ? error.message : String(error)
      })
      console.error(`[${index + 1}/${issues.length}] failed ${issue.volume}.${issue.issue}`)
    }
    if (fetched && index < issues.length - 1) await sleep(rateLimitMs)
  }

  const xmlIds = new Set(articles.map(article => article.articleId))
  const excludedIds = new Set(excludedRecords.map(article => article.articleId))
  const indexIds = new Set(indexes.map(record => record.articleId))
  const indexedIdsAbsentFromScope = [...indexIds].filter(id => !xmlIds.has(id)).sort()
  const qualityReport = {
    capture,
    sourceRoot: SOURCE_ROOT,
    rateLimitMs,
    issueCount: issues.length,
    capturedIssueCount: issues.length - errors.length,
    errors,
    indexedRecordCount: indexes.length,
    uniqueIndexedArticleCount: indexIds.size,
    xmlArticleCount: xmlIds.size,
    xmlArticleIdsMissingFromIndexes: [...xmlIds].filter(id => !indexIds.has(id)).sort(),
    indexedArticleIdsOutsideSelectedScope: indexedIdsAbsentFromScope.filter(id => excludedIds.has(id)),
    indexedArticleIdsMissingFromCorpus: indexedIdsAbsentFromScope.filter(id => !excludedIds.has(id)),
    sectionLabelCoverage: indexes.filter(record => record.sectionLabelRaw).length
  }

  await mkdir(derivedDirectory, { recursive: true })
  await writeFile(path.join(derivedDirectory, "issue-indexes.jsonl"), `${indexes.map(record => JSON.stringify(record)).join("\n")}\n`)
  await writeFile(path.join(derivedDirectory, "issue-index-quality-report.json"), `${JSON.stringify(qualityReport, null, 2)}\n`)
  console.log(JSON.stringify({
    issues: qualityReport.issueCount,
    capturedIssues: qualityReport.capturedIssueCount,
    indexedRecords: qualityReport.indexedRecordCount,
    missingXmlInIndex: qualityReport.xmlArticleIdsMissingFromIndexes.length,
    indexedOutsideSelectedScope: qualityReport.indexedArticleIdsOutsideSelectedScope.length,
    missingIndexInCorpus: qualityReport.indexedArticleIdsMissingFromCorpus.length,
    errors: qualityReport.errors.length
  }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
  })
}
