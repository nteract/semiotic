#!/usr/bin/env node

/**
 * Produce descriptive, source-metadata-only DHQ baselines. It intentionally
 * does not resolve people, infer subjects from prose, or make causal claims
 * about editorial structure. Those are separate reviewed steps.
 *
 * Usage:
 *   node scripts/dhq/analyze-baseline.mjs --capture dhq-2007-to-2025-20260729
 */

import console from "node:console"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const COHORTS = [
  { id: "2007-2011", from: 2007, through: 2011 },
  { id: "2012-2016", from: 2012, through: 2016 },
  { id: "2017-2021", from: 2017, through: 2021 },
  { id: "2022-2025", from: 2022, through: 2025 }
]

function captureFrom(argv) {
  const captureIndex = argv.indexOf("--capture")
  const capture = captureIndex === -1 ? null : argv[captureIndex + 1]
  if (!capture || argv.length !== 2) {
    throw new Error("Usage: node scripts/dhq/analyze-baseline.mjs --capture <capture-id>")
  }
  return capture
}

function yearFor(article) {
  return Number(article.publicationDate.slice(0, 4))
}

function cohortFor(year) {
  return COHORTS.find(cohort => year >= cohort.from && year <= cohort.through) || null
}

function countBy(records, accessor) {
  return records.reduce((counts, record) => {
    const key = accessor(record) || "(missing)"
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
}

function controlledKeywords(article) {
  return article.keywordSchemes["#dhq_keywords"] || []
}

function summaryFor(records) {
  const keywordCounts = countBy(
    records.flatMap(article => controlledKeywords(article)),
    keyword => keyword.corresp?.replace(/^#/, "") || keyword.text
  )
  const totalAuthors = records.reduce((sum, article) => sum + article.authors.length, 0)
  const withControlledKeywords = records.filter(article => controlledKeywords(article).length > 0)
  const sortedKeywords = Object.entries(keywordCounts)
    .map(([keyword, count]) => ({
      keyword,
      count,
      shareOfPublishedItems: Number((count / records.length).toFixed(4)),
      shareOfItemsWithControlledKeywords: Number((count / withControlledKeywords.length).toFixed(4))
    }))
    .sort((left, right) => right.count - left.count || left.keyword.localeCompare(right.keyword))

  return {
    publishedItems: records.length,
    itemTypes: countBy(records, article => article.itemType),
    metadataCoverage: {
      controlledKeywords: withControlledKeywords.length,
      authorialKeywords: records.filter(article => article.keywordSchemes["#authorial_keywords"]?.length).length,
      abstracts: records.filter(article => article.abstractPresent).length
    },
    authorship: {
      singleBylineItems: records.filter(article => article.authors.length === 1).length,
      multipleBylineItems: records.filter(article => article.authors.length > 1).length,
      meanBylinesPerItem: Number((totalAuthors / records.length).toFixed(3))
    },
    controlledKeywordIncidence: sortedKeywords
  }
}

async function main() {
  const capture = captureFrom(process.argv.slice(2))
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
  const derivedDirectory = path.join(projectRoot, "data", "dhq", "derived", capture)
  const source = await readFile(path.join(derivedDirectory, "articles.jsonl"), "utf8")
  const articles = source.trim().split("\n").map(line => JSON.parse(line))
  const annual = Object.groupBy(articles, article => yearFor(article))
  const cohortGroups = Object.groupBy(articles, article => cohortFor(yearFor(article))?.id || "outside-scope")
  const all = summaryFor(articles)
  const baseline = {
    capture,
    scope: "Published DHQ items, 2007–2025 (volumes 1–19); source metadata only.",
    interpretiveLimit: "Controlled keyword incidence is a source-metadata measure. It is multi-label, not a mutually exclusive topic distribution or evidence of editorial causation.",
    all,
    cohorts: COHORTS.map(cohort => ({
      ...cohort,
      ...summaryFor(cohortGroups[cohort.id] || [])
    })),
    annual: Object.entries(annual)
      .map(([year, records]) => ({ year: Number(year), ...summaryFor(records) }))
      .sort((left, right) => left.year - right.year)
  }

  await mkdir(derivedDirectory, { recursive: true })
  await writeFile(path.join(derivedDirectory, "baseline-analysis.json"), `${JSON.stringify(baseline, null, 2)}\n`)
  console.log(JSON.stringify({
    capture,
    articles: articles.length,
    topControlledKeywords: all.controlledKeywordIncidence.slice(0, 12),
    cohorts: baseline.cohorts.map(cohort => ({
      id: cohort.id,
      publishedItems: cohort.publishedItems,
      multipleBylineItems: cohort.authorship.multipleBylineItems,
      meanBylinesPerItem: cohort.authorship.meanBylinesPerItem
    }))
  }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
  })
}
