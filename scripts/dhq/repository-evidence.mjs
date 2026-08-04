#!/usr/bin/env node

/**
 * Derive the small, public-only repository evidence used by the DHQ
 * Thunderdome example.
 *
 * The source repository contains editorial and preview material alongside
 * published issues. This module never emits those records. TOC evidence is
 * restricted to non-preview, non-editorial journals and then intersected with
 * the already validated 2007–2025 corpus.
 */

import { execFile as execFileCallback } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { JSDOM } from "jsdom"

const execFile = promisify(execFileCallback)

const RECOMMENDATION_FILES = Object.freeze({
  keywords: "dhq-recs-zfill-kwd.tsv",
  bm25: "dhq-recs-zfill-bm25.tsv",
  specter: "dhq-recs-zfill-spctr.tsv",
})

const RECOMMENDATION_LABELS = Object.freeze({
  keywords: "Controlled keywords",
  bm25: "BM25 full text",
  specter: "SPECTER embeddings",
})

const PAIRS = Object.freeze([
  ["keywords", "bm25"],
  ["bm25", "specter"],
  ["keywords", "specter"],
])

const PAIR_IDS = Object.freeze({
  "keywords-bm25": "K/B",
  "bm25-specter": "B/S",
  "keywords-specter": "K/S",
})

function directChildren(element, tagName) {
  return [...element.children].filter(
    (child) => child.tagName.toLowerCase() === tagName.toLowerCase(),
  )
}

function recommendationIds(row, limit = 10) {
  return Array.from({ length: limit }, (_, index) => row[`Recommendation ${index + 1}`])
    .filter(Boolean)
}

function splitAuthors(row) {
  return String(row.Authors || "")
    .split(" | ")
    .map((name) => name.trim())
    .filter(Boolean)
}

function periodForYear(year) {
  if (year <= 2011) return "2007–11"
  if (year <= 2016) return "2012–16"
  if (year <= 2021) return "2017–21"
  return "2022–25"
}

function parseCount(value) {
  const match = String(value || "").match(/\d+/)
  return match ? Number(match[0]) : 0
}

export function parsePublicationStatistics(source) {
  const document = new JSDOM(source).window.document
  const table = document.querySelector("#general")
  if (!table) throw new Error("DHQ statistics page is missing #general")

  const headers = [...table.querySelectorAll("tr:first-child th")].map((cell) =>
    cell.textContent.trim(),
  )
  const sections = {}
  let section = null

  for (const row of table.querySelectorAll("tr")) {
    if (row.classList.contains("sectionhead")) {
      const label = row.textContent.trim().toLowerCase()
      section = label.includes("regular")
        ? "regular"
        : label.includes("special")
          ? "special"
          : null
      if (section) sections[section] = {}
      continue
    }
    if (!section) continue
    const cells = [...row.querySelectorAll("td")].map((cell) => cell.textContent.trim())
    if (!cells.length) continue
    const metric = cells[0].toLowerCase()
    if (!["decisions", "published"].includes(metric)) continue
    sections[section][metric] = Object.fromEntries(
      cells.slice(1).map((value, index) => [headers[index + 1], parseCount(value)]),
    )
  }

  if (!sections.regular?.published || !sections.special?.published) {
    throw new Error("DHQ statistics page is missing regular/special publication rows")
  }

  const regularPublished = sections.regular.published.Total
  const specialPublished = sections.special.published.Total
  const regularDecisions = sections.regular.decisions.Total
  const specialDecisions = sections.special.decisions.Total
  const totalPublished = regularPublished + specialPublished

  return {
    peerReviewedPublished: totalPublished,
    regularPublished,
    specialPublished,
    specialShare: Number(((100 * specialPublished) / totalPublished).toFixed(1)),
    regularPublishedPerDecision: Number((regularPublished / regularDecisions).toFixed(2)),
    specialPublishedPerDecision: Number((specialPublished / specialDecisions).toFixed(2)),
    note:
      "DHQ states that regular and special-issue submissions have different selection histories; the two published-per-decision ratios are not interchangeable acceptance rates.",
  }
}

export function parsePublicToc(source, articles) {
  const document = new JSDOM(source, { contentType: "text/xml" }).window.document
  const articleById = new Map(articles.map((article) => [article.articleId, article]))
  const placementById = new Map()
  let namedClusterCount = 0

  for (const journal of document.querySelectorAll("journal")) {
    if (journal.getAttribute("editorial") === "true") continue
    if (journal.getAttribute("preview") === "true") continue
    const volume = Number(journal.getAttribute("vol"))
    if (!Number.isFinite(volume) || volume < 1 || volume > 19) continue

    for (const cluster of directChildren(journal, "cluster")) {
      const publishedIds = [...cluster.querySelectorAll("item[id]")]
        .map((item) => item.getAttribute("id"))
        .filter((id) => articleById.has(id))
      if (publishedIds.length) namedClusterCount += 1
      for (const id of publishedIds) placementById.set(id, "named public cluster")
    }

    for (const list of directChildren(journal, "list")) {
      for (const item of list.querySelectorAll("item[id]")) {
        const id = item.getAttribute("id")
        if (articleById.has(id) && !placementById.has(id)) {
          placementById.set(id, "outside named cluster")
        }
      }
    }
  }

  const placements = ["named public cluster", "outside named cluster"]
  const periods = ["2007–11", "2012–16", "2017–21", "2022–25"]
  const nodes = [
    { id: "all", label: `${articles.length} published corpus items`, type: "all" },
    ...placements.map((placement) => ({
      id: `placement:${placement}`,
      label: placement === "named public cluster" ? "In named cluster" : "Outside named cluster",
      type: "placement",
    })),
    ...periods.map((period) => ({
      id: `period:${period}`,
      label: period,
      type: "period",
    })),
  ]
  const counts = new Map()

  for (const article of articles) {
    const placement = placementById.get(article.articleId) || "outside named cluster"
    const period = periodForYear(Number(article.publicationDate.slice(0, 4)))
    counts.set(
      `${placement}\t${period}`,
      (counts.get(`${placement}\t${period}`) || 0) + 1,
    )
  }

  const edges = []
  for (const placement of placements) {
    const total = periods.reduce(
      (sum, period) => sum + (counts.get(`${placement}\t${period}`) || 0),
      0,
    )
    edges.push({
      source: "all",
      target: `placement:${placement}`,
      value: total,
      kind: "public TOC placement",
    })
    for (const period of periods) {
      const value = counts.get(`${placement}\t${period}`) || 0
      if (!value) continue
      edges.push({
        source: `placement:${placement}`,
        target: `period:${period}`,
        value,
        kind: "publication window",
      })
    }
  }

  return {
    namedClusterCount,
    placedInNamedClusters: edges.find(
      (edge) => edge.target === "placement:named public cluster",
    ).value,
    unit:
      "validated 2007–2025 corpus items intersected with non-preview, non-editorial public TOC journals",
    nodes,
    edges,
  }
}

export function parsePublishedTocIds(source) {
  const document = new JSDOM(source, { contentType: "text/xml" }).window.document
  const ids = new Set()

  for (const journal of document.querySelectorAll("journal")) {
    if (journal.getAttribute("editorial") === "true") continue
    if (journal.getAttribute("preview") === "true") continue
    for (const item of journal.querySelectorAll("item[id]")) {
      ids.add(item.getAttribute("id"))
    }
  }

  return ids
}

async function git(repositoryPath, args) {
  const { stdout } = await execFile("git", ["-C", repositoryPath, ...args], {
    maxBuffer: 32 * 1024 * 1024,
  })
  return stdout
}

export async function buildMetadataClock(repositoryPath, articles) {
  const log = await git(repositoryPath, [
    "log",
    "--since=2023-07-10",
    "--until=2023-07-13",
    "--date=short",
    "--pretty=format:%H\t%ad\t%s",
    "--",
    "articles",
  ])
  const commits = log
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, date, ...subjectParts] = line.split("\t")
      return { hash, date, subject: subjectParts.join("\t") }
    })
    .filter((commit) => /keyword/i.test(commit.subject))

  const touched = new Map()
  for (const commit of commits) {
    const names = await git(repositoryPath, [
      "diff-tree",
      "--no-commit-id",
      "--name-only",
      "-r",
      commit.hash,
    ])
    for (const file of names.trim().split("\n").filter(Boolean)) {
      const match = file.match(/^articles\/(\d{6})\/\1\.xml$/)
      if (!match) continue
      const articleId = match[1]
      const previous = touched.get(articleId)
      if (!previous || commit.date < previous.date) {
        touched.set(articleId, {
          articleId,
          date: commit.date,
          commit: commit.hash,
          subject: commit.subject,
        })
      }
    }
  }

  const articleById = new Map(articles.map((article) => [article.articleId, article]))
  const items = [...touched.values()]
    .filter((touch) => articleById.has(touch.articleId))
    .map((touch) => {
      const article = articleById.get(touch.articleId)
      const publicationYear = Number(article.publicationDate.slice(0, 4))
      return {
        id: touch.articleId,
        publicationYear,
        observedChangeDate: touch.date,
        sourceUrl: article.articleUrl,
      }
    })
    .sort((left, right) => left.publicationYear - right.publicationYear || left.id.localeCompare(right.id))

  return {
    repositoryFilesTouched: touched.size,
    inScopeItems: items.length,
    observedOn: "2023-07-11 to 2023-07-12",
    items,
    note:
      "Observed Git changes in keyword-named commits. This is not a claim that Git records the first assignment date of every controlled term.",
  }
}

async function readRecommendationTables(repositoryPath) {
  const directory = path.join(repositoryPath, "data", "dhq-recs")
  const entries = await Promise.all(
    Object.entries(RECOMMENDATION_FILES).map(async ([method, filename]) => {
      const source = await readFile(path.join(directory, filename), "utf8")
      const rows = parseRecommendationTsv(source)
      return [method, rows]
    }),
  )
  return Object.fromEntries(entries)
}

export function parseRecommendationTsv(source) {
  // The recommendation exports contain titles that begin with literal
  // quotation marks but are not RFC-style quoted TSV fields. A strict DSV
  // parser shifts those rows by one column. Tabs themselves are not used
  // inside fields, so preserve the journal export's actual convention.
  const [headerLine, ...lines] = source.trimEnd().split(/\r?\n/)
  const headers = headerLine.replace(/^\uFEFF/, "").split("\t")
  return lines.map((line) =>
    Object.fromEntries(
      line.split("\t").map((value, index) => [headers[index], value]),
    ),
  )
}

export function filterRecommendationTables(tables, publishedIds) {
  const eligibleIds = new Set(
    [...publishedIds].filter((id) =>
      Object.values(tables).every((rows) =>
        rows.some((row) => row["Article ID"] === id),
      ),
    ),
  )

  return Object.fromEntries(
    Object.entries(tables).map(([method, rows]) => [
      method,
      rows
        .filter((row) => eligibleIds.has(row["Article ID"]))
        .map((row) => {
          const filtered = { ...row }
          for (let index = 1; index <= 10; index += 1) {
            const key = `Recommendation ${index}`
            if (!eligibleIds.has(filtered[key])) filtered[key] = ""
          }
          return filtered
        }),
    ]),
  )
}

function buildRecommendationWalk(method, rows, seedId, branch = 3, depthLimit = 2) {
  const byId = new Map(rows.map((row) => [row["Article ID"], row]))
  if (!byId.has(seedId)) throw new Error(`Recommendation seed ${seedId} missing from ${method}`)

  const depthByArticle = new Map([[seedId, 0]])
  const queue = [seedId]
  const transitions = []
  while (queue.length) {
    const sourceId = queue.shift()
    const depth = depthByArticle.get(sourceId)
    if (depth >= depthLimit) continue
    const row = byId.get(sourceId)
    recommendationIds(row, branch).forEach((targetId, rank) => {
      if (!byId.has(targetId)) return
      transitions.push({ sourceId, targetId, rank: rank + 1, depth: depth + 1 })
      if (!depthByArticle.has(targetId)) {
        depthByArticle.set(targetId, depth + 1)
        queue.push(targetId)
      }
    })
  }

  const authorDepth = new Map()
  for (const [articleId, depth] of depthByArticle) {
    for (const author of splitAuthors(byId.get(articleId))) {
      authorDepth.set(author, Math.min(authorDepth.get(author) ?? Number.POSITIVE_INFINITY, depth))
    }
  }

  const edgeMap = new Map()
  function addEdge(source, target, relation, route) {
    if (!source || !target || source === target) return
    const ordered = relation === "shared DHQ byline"
      ? [source, target].sort((left, right) => left.localeCompare(right))
      : [source, target]
    const key = `${relation}\t${ordered[0]}\t${ordered[1]}`
    const edge = edgeMap.get(key) || {
      source: `author:${ordered[0]}`,
      target: `author:${ordered[1]}`,
      value: 0,
      relation,
      method,
      routes: [],
      sourceIds: [],
    }
    edge.value += 1
    edge.routes.push(route)
    edge.sourceIds.push(...route.articleIds)
    edge.sourceIds = [...new Set(edge.sourceIds)]
    edge.sourceUrl ||= route.sourceUrl
    edgeMap.set(key, edge)
  }

  for (const transition of transitions) {
    const sourceRow = byId.get(transition.sourceId)
    const targetRow = byId.get(transition.targetId)
    const route = {
      sourceTitle: sourceRow.Title,
      targetTitle: targetRow.Title,
      rank: transition.rank,
      articleIds: [transition.sourceId, transition.targetId],
      sourceUrl: targetRow.url,
    }
    for (const sourceAuthor of splitAuthors(sourceRow)) {
      for (const targetAuthor of splitAuthors(targetRow)) {
        addEdge(sourceAuthor, targetAuthor, `${RECOMMENDATION_LABELS[method]} reading route`, route)
      }
    }
  }

  for (const articleId of depthByArticle.keys()) {
    const row = byId.get(articleId)
    const authors = splitAuthors(row)
    for (let index = 0; index < authors.length - 1; index += 1) {
      addEdge(authors[index], authors[index + 1], "shared DHQ byline", {
        sourceTitle: row.Title,
        targetTitle: row.Title,
        rank: null,
        articleIds: [articleId],
        sourceUrl: row.url,
      })
    }
  }

  const degree = new Map()
  for (const edge of edgeMap.values()) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1)
  }
  const seedAuthors = new Set(splitAuthors(byId.get(seedId)))
  const nodes = [...authorDepth.entries()]
    .map(([author, depth]) => ({
      id: `author:${author}`,
      label: author,
      type: seedAuthors.has(author)
        ? "focal author"
        : depth === 1
          ? "one recommendation away"
          : "two recommendations away",
      depth,
      degree: Math.max(1, degree.get(`author:${author}`) || 0),
      sourceIds: [...depthByArticle.keys()].filter((articleId) =>
        splitAuthors(byId.get(articleId)).includes(author),
      ),
      sourceUrl: [...depthByArticle.keys()]
        .map((articleId) => byId.get(articleId))
        .find((row) => splitAuthors(row).includes(author))?.url,
    }))
    .sort((left, right) => left.depth - right.depth || left.label.localeCompare(right.label))

  return {
    method,
    label: RECOMMENDATION_LABELS[method],
    seedId,
    branch,
    depthLimit,
    unit:
      "exact printed author names connected by two top-three recommendation steps; adjacent names on a shared byline are retained",
    articleCount: depthByArticle.size,
    nodes,
    edges: [...edgeMap.values()],
  }
}

export function buildRecommendationEvidence(tables, seedId = "000847") {
  const maps = Object.fromEntries(
    Object.entries(tables).map(([method, rows]) => [
      method,
      new Map(rows.map((row) => [row["Article ID"], row])),
    ]),
  )
  const commonIds = [...maps.keywords.keys()]
    .filter((id) => maps.bm25.has(id) && maps.specter.has(id))
    .sort()
  const overlaps = []
  const pairSummary = []

  for (const [left, right] of PAIRS) {
    const label = `${RECOMMENDATION_LABELS[left]} / ${RECOMMENDATION_LABELS[right]}`
    const pairId = PAIR_IDS[`${left}-${right}`]
    const values = commonIds.map((articleId) => {
      const leftIds = new Set(recommendationIds(maps[left].get(articleId)))
      const rightIds = new Set(recommendationIds(maps[right].get(articleId)))
      const overlap = [...leftIds].filter((id) => rightIds.has(id)).length
      overlaps.push({
        articleId,
        pairId,
        overlap,
      })
      return overlap
    })
    pairSummary.push({
      pair: label,
      pairId,
      mean: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
      zeroOverlap: values.filter((value) => value === 0).length,
      maxOverlap: Math.max(...values),
      articles: values.length,
    })
  }

  const distinctCounts = commonIds.map((articleId) => {
    const ids = new Set(
      Object.keys(RECOMMENDATION_FILES).flatMap((method) =>
        recommendationIds(maps[method].get(articleId)),
      ),
    )
    return ids.size
  })
  const sourcesWithNoAllThreeTarget = commonIds.filter((articleId) => {
    const methodSets = Object.keys(RECOMMENDATION_FILES).map(
      (method) => new Set(recommendationIds(maps[method].get(articleId))),
    )
    return [...methodSets[0]].every(
      (target) => !methodSets[1].has(target) || !methodSets[2].has(target),
    )
  }).length

  const edgeMethods = new Map()
  for (const [method, rows] of Object.entries(tables)) {
    for (const row of rows) {
      for (const target of recommendationIds(row)) {
        const edgeId = `${row["Article ID"]}>${target}`
        if (!edgeMethods.has(edgeId)) edgeMethods.set(edgeId, new Set())
        edgeMethods.get(edgeId).add(method)
      }
    }
  }

  const allThreeEdges = [...edgeMethods.values()].filter((methods) => methods.size === 3).length
  const seedRow = maps.keywords.get(seedId)
  const articleIndex = Object.fromEntries(
    commonIds.map((articleId) => {
      const row = maps.keywords.get(articleId)
      return [
        articleId,
        [row.Title, row.url],
      ]
    }),
  )
  const seedTargetMethods = new Map()
  for (const method of Object.keys(RECOMMENDATION_FILES)) {
    recommendationIds(maps[method].get(seedId)).forEach((targetId, rank) => {
      if (!seedTargetMethods.has(targetId)) seedTargetMethods.set(targetId, [])
      seedTargetMethods.get(targetId).push({ method, rank: rank + 1 })
    })
  }
  const walks = Object.fromEntries(
    Object.entries(tables).map(([method, rows]) => [
      method,
      buildRecommendationWalk(method, rows, seedId),
    ]),
  )

  return {
    seed: {
      articleId: seedId,
      title: seedRow.Title,
      authors: splitAuthors(seedRow),
      year: Number(seedRow["Pub. Year"]),
      sourceUrl: seedRow.url,
      distinctTopTenTargets: seedTargetMethods.size,
      targetsInAnyTwo: [...seedTargetMethods.values()].filter(
        (methods) => methods.length >= 2,
      ).length,
      targetsInAllThree: [...seedTargetMethods.values()].filter(
        (methods) => methods.length === 3,
      ).length,
      distinctTopFiveTargets: new Set(
        Object.keys(RECOMMENDATION_FILES).flatMap((method) =>
          recommendationIds(maps[method].get(seedId), 5),
        ),
      ).size,
    },
    indexedArticles: commonIds.length,
    unionDirectedEdges: edgeMethods.size,
    allThreeDirectedEdges: allThreeEdges,
    allThreeDirectedShare: Number(((100 * allThreeEdges) / edgeMethods.size).toFixed(2)),
    meanDistinctRecommendations: Number(
      (distinctCounts.reduce((sum, value) => sum + value, 0) / distinctCounts.length).toFixed(2),
    ),
    thirtyDistinctArticles: distinctCounts.filter((value) => value === 30).length,
    sourcesWithNoAllThreeTarget,
    pairSummary,
    overlaps,
    articleIndex,
    walks,
    note:
      "Recommendation edges describe changing navigation systems, not citation, influence, endorsement, or person-level identity.",
  }
}

export async function buildRepositoryEvidence({ repositoryPath, articles }) {
  const repositoryCommit = (await git(repositoryPath, ["rev-parse", "HEAD"])).trim()
  const [tocSource, statisticsSource, recommendationTables, metadataClock] =
    await Promise.all([
      readFile(path.join(repositoryPath, "toc", "toc.xml"), "utf8"),
      readFile(path.join(repositoryPath, "submissions", "statistics.html"), "utf8"),
      readRecommendationTables(repositoryPath),
      buildMetadataClock(repositoryPath, articles),
    ])

  const publishedIds = parsePublishedTocIds(tocSource)
  const filteredRecommendationTables = filterRecommendationTables(
    recommendationTables,
    publishedIds,
  )

  return {
    repositoryCommit,
    publicationStructure: parsePublicToc(tocSource, articles),
    editorialStatistics: parsePublicationStatistics(statisticsSource),
    metadataClock,
    recommendations: buildRecommendationEvidence(filteredRecommendationTables),
  }
}
