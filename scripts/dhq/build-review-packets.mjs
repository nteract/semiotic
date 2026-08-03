#!/usr/bin/env node

/**
 * Build deterministic, internal review packets for the DHQ Thunderdome work.
 *
 * This script does not classify subjects or resolve people. It makes those
 * remaining judgments explicit and reviewable before any browser fixture is
 * built. It reads only the offline DHQ derivations made by ingest-tei.mjs and
 * capture-mastheads.mjs.
 *
 * Usage:
 *   node scripts/dhq/build-review-packets.mjs --capture dhq-2007-to-2025-20260729
 */

import console from "node:console"
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

export const COHORTS = Object.freeze([
  { id: "2007-2011", from: 2007, through: 2011 },
  { id: "2012-2016", from: 2012, through: 2016 },
  { id: "2017-2021", from: 2017, through: 2021 },
  { id: "2022-2025", from: 2022, through: 2025 }
])

export const SAMPLE_PLAN = Object.freeze([
  { itemTypeFamily: "article", count: 8 },
  { itemTypeFamily: "nonarticle", count: 4 }
])

function parseArguments(argv) {
  const captureIndex = argv.indexOf("--capture")
  const capture = captureIndex === -1 ? null : argv[captureIndex + 1]
  if (!capture || argv.length !== 2) {
    throw new Error("Usage: node scripts/dhq/build-review-packets.mjs --capture <capture-id>")
  }
  return capture
}

function readJsonLines(source) {
  return source.trim().split("\n").filter(Boolean).map(line => JSON.parse(line))
}

function normalizedText(value) {
  return value?.replace(/\s+/g, " ").trim() || null
}

function cohortFor(article) {
  const year = Number(article.publicationDate?.slice(0, 4))
  return COHORTS.find(cohort => year >= cohort.from && year <= cohort.through) || null
}

function itemTypeFamily(article) {
  return article.itemType === "article" ? "article" : "nonarticle"
}

function stableRank(seed) {
  return createHash("sha256").update(seed).digest("hex")
}

function keywordValues(article, scheme) {
  return (article.keywordSchemes[scheme] || []).map(keyword => ({
    id: keyword.corresp?.replace(/^#/, "") || null,
    label: keyword.text || null
  }))
}

function authorsForReview(article) {
  return article.authors.map(author => ({
    displayName: author.displayName,
    affiliationRaw: author.affiliationRaw,
    orcid: author.orcid
  }))
}

function sampleRecord(article, cohort, rank) {
  return {
    reviewId: `subject:${article.articleId}`,
    articleId: article.articleId,
    cohort: cohort.id,
    itemType: article.itemType,
    itemTypeFamily: itemTypeFamily(article),
    publicationDate: article.publicationDate,
    title: article.title,
    authors: authorsForReview(article),
    abstractText: article.abstractText,
    sourceControlledKeywords: keywordValues(article, "#dhq_keywords"),
    sourceAuthorialKeywords: keywordValues(article, "#authorial_keywords"),
    articleUrl: article.articleUrl,
    xmlUrl: article.xmlUrl,
    sourcePath: article.sourcePath,
    sourceHash: article.sourceHash,
    selectionRank: rank,
    coding: {
      codebookVersion: "pilot-0.1",
      status: "unreviewed",
      codes: [],
      ambiguity: null,
      rationale: null
    }
  }
}

export function selectSubjectReviewSample(articles, capture) {
  const selected = []

  for (const cohort of COHORTS) {
    for (const plan of SAMPLE_PLAN) {
      const stratum = articles
        .filter(article => cohortFor(article)?.id === cohort.id)
        .filter(article => itemTypeFamily(article) === plan.itemTypeFamily)
        .map(article => ({
          article,
          rank: stableRank(`${capture}:${cohort.id}:${plan.itemTypeFamily}:${article.articleId}`)
        }))
        .sort((left, right) => left.rank.localeCompare(right.rank))

      if (stratum.length < plan.count) {
        throw new Error(`Stratum ${cohort.id}/${plan.itemTypeFamily} has ${stratum.length}; needs ${plan.count}`)
      }
      selected.push(...stratum.slice(0, plan.count).map(({ article, rank }) => sampleRecord(article, cohort, rank)))
    }
  }

  return selected.sort((left, right) =>
    left.publicationDate.localeCompare(right.publicationDate)
    || left.articleId.localeCompare(right.articleId)
  )
}

function csvCell(value) {
  const rendered = value == null ? "" : String(value)
  return `"${rendered.replaceAll('"', '""')}"`
}

function reviewCsv(records) {
  const headers = [
    "review_id",
    "cohort",
    "item_type",
    "publication_date",
    "article_id",
    "title",
    "authors",
    "abstract",
    "article_url",
    "xml_url",
    "reviewer_codes",
    "coding_status",
    "ambiguity_or_overlap",
    "rationale"
  ]
  const rows = records.map(record => [
    record.reviewId,
    record.cohort,
    record.itemType,
    record.publicationDate,
    record.articleId,
    record.title,
    record.authors.map(author => author.displayName).join("; "),
    record.abstractText,
    record.articleUrl,
    record.xmlUrl,
    "",
    "unreviewed",
    "",
    ""
  ])
  return `${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\n")}\n`
}

function identityCandidates(articles, roleObservations) {
  const bylineOccurrences = new Map()
  for (const article of articles) {
    for (const author of article.authors) {
      const displayName = normalizedText(author.displayName)
      if (!displayName) continue
      const occurrences = bylineOccurrences.get(displayName) || []
      occurrences.push({
        articleId: article.articleId,
        publicationDate: article.publicationDate,
        itemType: article.itemType,
        title: article.title,
        articleUrl: article.articleUrl,
        xmlUrl: article.xmlUrl,
        sourcePath: article.sourcePath,
        sourceHash: article.sourceHash,
        affiliationRaw: author.affiliationRaw,
        orcid: author.orcid
      })
      bylineOccurrences.set(displayName, occurrences)
    }
  }

  const rolesByName = new Map()
  for (const observation of roleObservations) {
    const displayName = normalizedText(observation.personDisplayName)
    if (!displayName) continue
    const observations = rolesByName.get(displayName) || []
    observations.push({
      roleObservationId: observation.roleObservationId,
      observedOn: observation.observedOn,
      sectionLabelRaw: observation.sectionLabelRaw,
      roleLabelRaw: observation.roleLabelRaw,
      roleFamily: observation.roleFamily,
      affiliationRaw: observation.affiliationRaw,
      sourceUrl: observation.sourceUrl,
      sourcePath: observation.sourcePath,
      sourceHash: observation.sourceHash
    })
    rolesByName.set(displayName, observations)
  }

  return [...bylineOccurrences.keys()]
    .filter(displayName => rolesByName.has(displayName))
    .sort((left, right) => left.localeCompare(right))
    .map(displayName => ({
      candidateId: `author-editor:${createHash("sha256").update(displayName).digest("hex").slice(0, 12)}`,
      displayName,
      matchingRule: "Exact public display-name string after whitespace normalization; this is a review candidate, not a resolved person.",
      authorOccurrences: bylineOccurrences.get(displayName)
        .sort((left, right) => left.publicationDate.localeCompare(right.publicationDate) || left.articleId.localeCompare(right.articleId)),
      editorialRoleObservations: rolesByName.get(displayName)
        .sort((left, right) => left.observedOn.localeCompare(right.observedOn) || left.roleObservationId.localeCompare(right.roleObservationId)),
      decision: "unreviewed",
      allowedEvidence: [
        "shared ORCID or another persistent identifier",
        "an explicit public biography linking the byline and editorial role",
        "an explicit source statement from the individual or DHQ"
      ],
      prohibitedInference: "Do not resolve from name resemblance, likely affiliation, chronology, or an assumption that a listed role influenced a publication."
    }))
}

function identityCsv(candidates) {
  const headers = [
    "candidate_id",
    "display_name",
    "author_occurrences",
    "editorial_role_observations",
    "byline_articles",
    "role_sources",
    "decision",
    "review_evidence",
    "notes"
  ]
  const rows = candidates.map(candidate => [
    candidate.candidateId,
    candidate.displayName,
    candidate.authorOccurrences.length,
    candidate.editorialRoleObservations.length,
    candidate.authorOccurrences.map(occurrence => occurrence.articleUrl).join("; "),
    candidate.editorialRoleObservations.map(observation => observation.sourceUrl).join("; "),
    candidate.decision,
    "",
    ""
  ])
  return `${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\n")}\n`
}

function manifestFor(capture, sample, candidates) {
  const expectedStrata = COHORTS.flatMap(cohort => SAMPLE_PLAN.map(plan => ({
    cohort: cohort.id,
    itemTypeFamily: plan.itemTypeFamily,
    expectedRecords: plan.count,
    actualRecords: sample.filter(record => record.cohort === cohort.id && record.itemTypeFamily === plan.itemTypeFamily).length
  })))
  const uniqueArticleIds = new Set(sample.map(record => record.articleId))
  return {
    capture,
    generatedAt: new Date().toISOString(),
    subjectReview: {
      method: "Deterministic stratified sample, ranked by SHA-256(capture, cohort, item-type family, article ID).",
      records: sample.length,
      uniqueArticleIds: uniqueArticleIds.size,
      strata: expectedStrata,
      reviewRule: "Two readers code independently before the codebook is revised; disagreement is retained rather than overwritten."
    },
    authorEditorReview: {
      method: "Exact public display-name string equality after whitespace normalization.",
      candidates: candidates.length,
      reviewRule: "No candidate becomes a person-level node or author/editor overlap finding without explicit identity evidence."
    }
  }
}

async function main() {
  const capture = parseArguments(process.argv.slice(2))
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
  const derivedDirectory = path.join(projectRoot, "data", "dhq", "derived", capture)
  const [articleSource, roleSource] = await Promise.all([
    readFile(path.join(derivedDirectory, "articles.jsonl"), "utf8"),
    readFile(path.join(derivedDirectory, "editorial-roles.jsonl"), "utf8")
  ])
  const articles = readJsonLines(articleSource)
  const roleObservations = readJsonLines(roleSource)
  const sample = selectSubjectReviewSample(articles, capture)
  const candidates = identityCandidates(articles, roleObservations)
  const manifest = manifestFor(capture, sample, candidates)

  await mkdir(derivedDirectory, { recursive: true })
  await Promise.all([
    writeFile(path.join(derivedDirectory, "subject-codebook-review-sample.jsonl"), `${sample.map(record => JSON.stringify(record)).join("\n")}\n`),
    writeFile(path.join(derivedDirectory, "subject-codebook-reader-a.csv"), reviewCsv(sample)),
    writeFile(path.join(derivedDirectory, "subject-codebook-reader-b.csv"), reviewCsv(sample)),
    writeFile(path.join(derivedDirectory, "author-editor-identity-review.json"), `${JSON.stringify(candidates, null, 2)}\n`),
    writeFile(path.join(derivedDirectory, "author-editor-identity-review.csv"), identityCsv(candidates)),
    writeFile(path.join(derivedDirectory, "review-packets-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
  ])

  console.log(JSON.stringify({
    capture,
    subjectReviewRecords: sample.length,
    subjectReviewStrata: manifest.subjectReview.strata,
    authorEditorReviewCandidates: candidates.length,
    output: path.relative(projectRoot, derivedDirectory)
  }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
  })
}
