#!/usr/bin/env node

/**
 * Create the compact, source-linked DHQ data module consumed by the Semiotic
 * Thunderdome example. It intentionally uses only facts available without
 * subject coding or person-level identity resolution.
 *
 * Usage:
 *   node scripts/dhq/build-example-data.mjs \
 *     --capture dhq-2007-to-2025-20260729 \
 *     --repository /path/to/dhq-journal
 */

import console from "node:console"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { buildRepositoryEvidence } from "./repository-evidence.mjs"

const COHORTS = [
  { id: "2007–11", from: 2007, through: 2011 },
  { id: "2012–16", from: 2012, through: 2016 },
  { id: "2017–21", from: 2017, through: 2021 },
  { id: "2022–25", from: 2022, through: 2025 }
]
const TAGS_FOR_TRENDS = ["media_studies", "collaboration", "dh", "project_report", "tools", "history", "race", "ethics"]
const TAXONOMY_URL = "https://dhq.digitalhumanities.org/dhq/common/xml/taxonomy.xml"
const ABOUT_URL = "https://dhq.digitalhumanities.org/dhq/about/about.html"
const REPOSITORY_URL = "https://github.com/Digital-Humanities-Quarterly/dhq-journal"
const ORIGINAL_ARTICLE_URL =
  "https://journalofdigitalhumanities.org/1-1/digital-humanities-as-thunderdome-by-elijah-meeks/"

const DH_HISTORY_TIMELINE = [
  {
    id: "index-thomisticus",
    order: 1949,
    date: "1949",
    title: "Busa and IBM begin the Index Thomisticus",
    shortTitle: "Index Thomisticus",
    interface: "punch cards and concordance",
    authority: "scholar, operators, IBM",
    kind: "formalization",
    sourceUrl: "https://dhq.digitalhumanities.org/vol/12/2/000380/000380.html",
    note:
      "DHQ’s reconstruction describes a hybrid human-machine process, including extensive keypunch and verification labor.",
  },
  {
    id: "tei",
    order: 1987,
    date: "1987",
    title: "The Text Encoding Initiative is established",
    shortTitle: "TEI",
    interface: "shared markup",
    authority: "standards community",
    kind: "infrastructure",
    sourceUrl: "https://tei-c.org/about/history/",
    note:
      "TEI answered incompatible and proprietary formats with governed, hardware- and software-independent encoding methods.",
  },
  {
    id: "valley",
    order: 1993,
    date: "1993",
    title: "The Valley of the Shadow reaches the web",
    shortTitle: "Valley of the Shadow",
    interface: "public web archive",
    authority: "distributed project team",
    kind: "publication",
    sourceUrl: "https://valley.newamericanhistory.org/about/staff",
    note:
      "Its project history makes research, transcription, markup, databases, GIS, design, and programming visible as a joint production.",
  },
  {
    id: "lda",
    order: 2003,
    date: "2003",
    title: "Latent Dirichlet Allocation is published",
    shortTitle: "LDA",
    interface: "probabilistic model",
    authority: "model builders",
    kind: "method",
    sourceUrl: "https://www.jmlr.org/papers/v3/blei03a.html",
    note:
      "A statistical account of documents and topics becomes a reusable method that digital humanists will later adopt and argue with.",
  },
  {
    id: "dhq-launch",
    order: 2007,
    date: "2007",
    title: "Digital Humanities Quarterly publishes volume 1",
    shortTitle: "DHQ",
    interface: "TEI transformed for the web",
    authority: "journal and maintainers",
    kind: "publication",
    sourceUrl: "https://www.digitalhumanities.org/dhq/vol/1/1/index.html",
    note:
      "The journal is itself a software system: customized TEI, transforms, styles, scripts, validation, and publication workflows.",
  },
  {
    id: "gephi-programming-historian",
    order: 2008,
    date: "2008",
    title: "Gephi and Programming Historian offer two routes into method",
    shortTitle: "GUI or code lesson",
    interface: "GUI and code tutorial",
    authority: "toolmaker or learning community",
    kind: "access",
    sourceUrl: "https://programminghistorian.org/en/about",
    note:
      "One route makes a method explorable behind an interface; the other teaches humanists to program. AI-assisted coding scrambles that distinction.",
  },
  {
    id: "thunderdome",
    order: 2011,
    date: "2011",
    title: "Digital Humanities as Thunderdome",
    shortTitle: "Thunderdome",
    interface: "lots of weird code",
    authority: "humanist toolbuilder",
    kind: "argument",
    sourceUrl: ORIGINAL_ARTICLE_URL,
    note:
      "The essay names the authority that came with knowing code and asks humanists to build software that did not inherit the usual limits.",
  },
  {
    id: "orbis",
    order: 2012,
    date: "2012",
    title: "ORBIS launches a contestable model of Roman transport",
    shortTitle: "ORBIS",
    interface: "interactive network model",
    authority: "scholarly project team",
    kind: "project",
    sourceUrl:
      "https://journalofdigitalhumanities.org/1-3/modeling-networks-and-scholarship-with-orbis-by-elijah-meeks-and-karl-grossner/",
    note:
      "ORBIS treated an executable model as a scholarly claim and used an interface to let readers alter some of its assumptions.",
  },
  {
    id: "lda-special-issue",
    order: 2013,
    date: "2012–13",
    title: "The Journal of Digital Humanities stages an argument around LDA",
    shortTitle: "LDA special issue",
    interface: "model, essays, tools, criticism",
    authority: "mixed scholarly and technical group",
    kind: "argument",
    sourceUrl:
      "https://journalofdigitalhumanities.org/2-1/dh-contribution-to-topic-modeling/",
    note:
      "The issue puts a model builder, practitioners, applications, critics, and tool reviews into the same editorial frame.",
  },
  {
    id: "copilot",
    order: 2021,
    date: "2021",
    title: "AI code completion enters the editor",
    shortTitle: "AI pair programmer",
    interface: "prompt and code completion",
    authority: "user, model, and platform",
    kind: "ai",
    sourceUrl:
      "https://github.blog/news-insights/product-news/introducing-github-copilot-ai-pair-programmer/",
    note:
      "The cost of producing conventional code begins to fall without removing review, testing, maintenance, or the conventions absorbed from existing code.",
  },
  {
    id: "dhq-recommenders",
    order: 2024,
    date: "2024",
    title: "DHQ adds three recommendation systems",
    shortTitle: "Three DHQ recommenders",
    interface: "keywords, BM25, embeddings",
    authority: "editors, ranking methods, interface",
    kind: "retrieval",
    sourceUrl: "https://dhq.digitalhumanities.org/dhq/explore/explore.html",
    note:
      "Three methods expose different intellectual neighborhoods: controlled-keyword overlap, BM25 full text, and SPECTER title-and-abstract embeddings.",
  },
  {
    id: "coding-agents",
    order: 2025,
    date: "2025",
    title: "Coding agents begin working across repositories",
    shortTitle: "Coding agents",
    interface: "delegated repository work",
    authority: "user, model, platform, tests",
    kind: "ai",
    sourceUrl: "https://openai.com/index/introducing-codex/",
    note:
      "Implementation can begin in ordinary language and continue through file edits and tests. That is a change in access, not the disappearance of architecture.",
  },
  {
    id: "dhq-ai-policy",
    order: 2026,
    date: "2026",
    title: "DHQ formalizes an AI agency policy",
    shortTitle: "DHQ AI policy",
    interface: "disclosure and responsibility",
    authority: "human author and journal",
    kind: "governance",
    sourceUrl:
      "https://github.com/Digital-Humanities-Quarterly/dhq-journal/blob/main/submissions/ai_policies.html",
    note:
      "The policy permits supportive uses while keeping direct human agency, accuracy, disclosure, and responsibility with the author.",
  },
]

function parseArguments(argv) {
  const captureIndex = argv.indexOf("--capture")
  const repositoryIndex = argv.indexOf("--repository")
  const capture = captureIndex === -1 ? null : argv[captureIndex + 1]
  const repository = repositoryIndex === -1 ? null : argv[repositoryIndex + 1]
  if (!capture || !repository || argv.length !== 4) {
    throw new Error(
      "Usage: node scripts/dhq/build-example-data.mjs --capture <capture-id> --repository <dhq-repository-path>",
    )
  }
  return { capture, repository: path.resolve(repository) }
}

function readJsonLines(source) {
  return source.trim().split("\n").filter(Boolean).map(line => JSON.parse(line))
}

function yearFor(article) {
  return Number(article.publicationDate.slice(0, 4))
}

function cohortFor(article) {
  const year = yearFor(article)
  return COHORTS.find(cohort => year >= cohort.from && year <= cohort.through) || null
}

function controlledKeywords(article) {
  return article.keywordSchemes["#dhq_keywords"] || []
}

function tagId(keyword) {
  return keyword.corresp?.replace(/^#/, "") || keyword.text
}

function tagLabel(keyword) {
  return keyword.text || tagId(keyword)
}

function percent(numerator, denominator) {
  return Number(((100 * numerator) / denominator).toFixed(1))
}

function collaborationTrend(articles) {
  const years = [...new Set(articles.map(yearFor))].sort((left, right) => left - right)
  return years.flatMap(year => {
    const records = articles.filter(article => yearFor(article) === year)
    const multiByline = records.filter(article => article.authors.length >= 2).length
    return [
      { year, bylinePattern: "2+ listed authors", share: percent(multiByline, records.length), items: records.length },
      { year, bylinePattern: "one listed author", share: percent(records.length - multiByline, records.length), items: records.length }
    ]
  })
}

function classificationCounts(articles) {
  const counts = { single: 0, multiple: 0, absent: 0 }
  for (const article of articles) {
    const tagCount = controlledKeywords(article).length
    if (tagCount === 0) counts.absent += 1
    else if (tagCount === 1) counts.single += 1
    else counts.multiple += 1
  }
  return counts
}

function tagIndex(articles) {
  const labels = new Map()
  for (const article of articles) {
    for (const keyword of controlledKeywords(article)) {
      labels.set(tagId(keyword), tagLabel(keyword))
    }
  }
  return labels
}

function tagTrends(articles) {
  const labels = tagIndex(articles)
  return TAGS_FOR_TRENDS.flatMap(id => COHORTS.map(cohort => {
    const records = articles.filter(article => cohortFor(article)?.id === cohort.id)
    const tagged = records.filter(article => controlledKeywords(article).some(keyword => tagId(keyword) === id)).length
    return {
      tagId: id,
      tag: labels.get(id) || id,
      period: cohort.id,
      share: percent(tagged, records.length),
      items: records.length,
      taggedItems: tagged,
      sourceRecipe: `${tagged}/${records.length} published items have the multi-label, source-controlled #${id} tag.`
    }
  }))
}

function sourceModule(data) {
  const encoded = Object.entries(data)
    .map(([name, value]) => `export const ${name} = Object.freeze(${JSON.stringify(value, null, 2)})`)
    .join("\n\n")
  return `/*\n * Generated by scripts/dhq/build-example-data.mjs.\n * Capture: ${data.DHQ_PROVENANCE.capture}. Do not edit by hand.\n */\n\n${encoded}\n\nconst classificationCounts = DHQ_CLASSIFICATION_COUNTS\n\nconst classificationBaseNodes = [\n  { id: "all", label: \`\${classificationCounts.total} published items\`, stage: 0, type: "source" },\n  { id: "single", label: "One source tag", stage: 1, type: "tag-state" },\n  { id: "multiple", label: "Multiple source tags", stage: 1, type: "tag-state" },\n  { id: "absent", label: "No source tag", stage: 1, type: "missing" },\n  { id: "single-display", label: "One displayed tag", stage: 2, type: "display" },\n  { id: "unclassified", label: "Unclassified", stage: 2, type: "missing" }\n]\n\nconst classificationBaseEdges = [\n  { source: "all", target: "single", value: classificationCounts.single, kind: "source metadata" },\n  { source: "all", target: "multiple", value: classificationCounts.multiple, kind: "source metadata" },\n  { source: "all", target: "absent", value: classificationCounts.absent, kind: "source metadata" },\n  { source: "single", target: "single-display", value: classificationCounts.single, kind: "direct" },\n  { source: "absent", target: "unclassified", value: classificationCounts.absent, kind: "metadata absent" }\n]\n\nexport function buildClassificationFlow(mode = "default") {\n  const canonicalMode = mode === "default" ? "default" : ["preserve", "uncertainty", "uncertainty-preserving"].includes(mode) ? "preserve" : null\n  if (!canonicalMode) throw new RangeError(\`Unknown classification mode "\${mode}".\`)\n  const preserve = canonicalMode === "preserve"\n  const nodes = preserve\n    ? [...classificationBaseNodes, { id: "multiple-retained", label: "Multiple tags retained", stage: 2, type: "preserved" }]\n    : classificationBaseNodes\n  const edges = [\n    ...classificationBaseEdges,\n    preserve\n      ? { source: "multiple", target: "multiple-retained", value: classificationCounts.multiple, kind: "preserved" }\n      : { source: "multiple", target: "single-display", value: classificationCounts.multiple, kind: "forced-display" }\n  ]\n  return {\n    nodes: nodes.map(node => ({ ...node })),\n    edges: edges.map(edge => ({ ...edge })),\n    summary: {\n      mode: canonicalMode,\n      total: classificationCounts.total,\n      single: classificationCounts.single,\n      multiple: classificationCounts.multiple,\n      absent: classificationCounts.absent,\n      finding: preserve\n        ? \`\${classificationCounts.multiple} published items retain their multiple source tags.\`\n        : \`\${classificationCounts.multiple} published items are reduced to one displayed tag.\`\n    }\n  }\n}\n`
}

async function main() {
  const { capture, repository } = parseArguments(process.argv.slice(2))
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
  const derivedDirectory = path.join(projectRoot, "data", "dhq", "derived", capture)
  const outputPath = path.join(projectRoot, "docs", "src", "pages", "examples", "data", "dhqThunderdome.generated.js")
  const [articleSource, provenanceSource] = await Promise.all([
    readFile(path.join(derivedDirectory, "articles.jsonl"), "utf8"),
    readFile(path.join(derivedDirectory, "provenance.json"), "utf8")
  ])
  const articles = readJsonLines(articleSource)
  const provenance = JSON.parse(provenanceSource)
  const classification = classificationCounts(articles)
  const repositoryEvidence = await buildRepositoryEvidence({
    repositoryPath: repository,
    articles,
  })
  const {
    overlaps: recommendationOverlaps,
    articleIndex: recommendationArticleIndex,
    walks: recommendationWalks,
    ...recommendationSummary
  } = repositoryEvidence.recommendations
  const data = {
    DHQ_PROVENANCE: {
      capture,
      source: "Official DHQ XML corpus, public journal pages, and public source repository",
      corpusUrl: provenance.corpusUrl,
      corpusSha256: provenance.zip.sha256,
      scope: "806 published items in volumes 1–19 with primary XML publication dates from 2007 through 2025",
      aboutUrl: ABOUT_URL,
      taxonomyUrl: TAXONOMY_URL,
      repositoryUrl: REPOSITORY_URL,
      repositoryCommit: repositoryEvidence.repositoryCommit,
    },
    DHQ_DATA_NOTE: `Data snapshot: ${articles.length} validated DHQ items from 2007–2025, plus 832 public articles in the journal’s May 2026 recommendation files. Controlled tags describe the current archive and include retrospective keywording; names are preserved as printed.`,
    DHQ_DOSSIER: {
      title: "Digital Humanities Quarterly",
      period: "2007–2025",
      sourceItems: articles.length,
      researchQuestion:
        "If AI-assisted coding redistributes implementation authority, which other decisions still shape the version of digital humanities a journal makes visible?",
    },
    DH_HISTORY_TIMELINE,
    PUBLICATION_STRUCTURE: repositoryEvidence.publicationStructure,
    EDITORIAL_STATISTICS: repositoryEvidence.editorialStatistics,
    METADATA_CLOCK_ITEMS: repositoryEvidence.metadataClock.items,
    METADATA_CLOCK_SUMMARY: {
      repositoryFilesTouched: repositoryEvidence.metadataClock.repositoryFilesTouched,
      inScopeItems: repositoryEvidence.metadataClock.inScopeItems,
      observedOn: repositoryEvidence.metadataClock.observedOn,
      note: repositoryEvidence.metadataClock.note,
    },
    RECOMMENDATION_WALKS: recommendationWalks,
    RECOMMENDATION_OVERLAPS: recommendationOverlaps,
    RECOMMENDATION_ARTICLE_INDEX: recommendationArticleIndex,
    RECOMMENDATION_SUMMARY: recommendationSummary,
    COLLABORATION_TREND: collaborationTrend(articles),
    DHQ_CLASSIFICATION_COUNTS: { total: articles.length, ...classification },
    SOURCE_TAG_TRENDS: tagTrends(articles),
    THUNDERDOME_SCENES_META: [
      { id: "long-view", order: 1, chart: "XYCustomChart", title: "A short history of executable interpretation", question: "What changes when the interface to implementation changes?" },
      { id: "editorial-shape", order: 2, chart: "SankeyDiagram", title: "A journal assembles a field", question: "How much of the published record is grouped through named editorial clusters?" },
      { id: "authorship", order: 3, chart: "LineChart", title: "More names appear on the work", question: "Does easier implementation imply more solitary production?" },
      { id: "subjects", order: 4, chart: "GroupedBarChart", title: "The current vocabulary describes the past", question: "What subject pattern does the current controlled vocabulary make visible?" },
      { id: "metadata-clock", order: 5, chart: "CollisionSwarmChart", title: "The archive has two clocks", question: "When did an old article acquire its current description?" },
      { id: "classification", order: 6, chart: "SankeyDiagram", title: "An interface still has to choose", question: "What changes when multiple source labels are forced to one display label?" },
      { id: "recommendation-walk", order: 7, chart: "ForceDirectedGraph", title: "Three machines, three walks", question: "Which authors become adjacent when the retrieval method changes?" },
      { id: "overlap", order: 8, chart: "SwarmPlot", title: "Relatedness is made, not found", question: "How often do the three recommendation methods agree?" },
    ]
  }
  await writeFile(outputPath, sourceModule(data))
  console.log(JSON.stringify({
    capture,
    output: path.relative(projectRoot, outputPath),
    publishedItems: articles.length,
    classification,
    repositoryCommit: data.DHQ_PROVENANCE.repositoryCommit,
    metadataClockItems: data.METADATA_CLOCK_ITEMS.length,
    recommendationArticles: data.RECOMMENDATION_SUMMARY.indexedArticles,
    recommendationUnionEdges: data.RECOMMENDATION_SUMMARY.unionDirectedEdges,
    recommendationAllThreeEdges: data.RECOMMENDATION_SUMMARY.allThreeDirectedEdges,
  }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
  })
}
