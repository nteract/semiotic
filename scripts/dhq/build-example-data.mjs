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
const TAGS_FOR_TRENDS = [
  "media_studies",
  "collaboration",
  "dh",
  "project_report",
  "tools",
  "history",
  "race",
  "ethics"
]
const MEDIA_FIELD_TAG_IDS = [
  "media_studies",
  "media_history",
  "moving_images",
  "social_media",
  "games",
  "sound",
  "music",
  "comics"
]
const MEDIA_STUDIES_CONTEXTS = [
  { context: "All items", key: "allItems", tagId: null },
  { context: "Tools", key: "tools", tagId: "tools" },
  { context: "Project report", key: "projectReport", tagId: "project_report" },
  { context: "Digital humanities", key: "digitalHumanities", tagId: "dh" },
  {
    context: "Cultural criticism",
    key: "culturalCriticism",
    tagId: "cultural_criticism"
  }
]
const FIELD_RISER_DEFINITIONS = [
  { tagId: "race", tag: "Race" },
  { tagId: "ethics", tag: "Ethics" },
  { tagId: "minimal_computing", tag: "Minimal computing" },
  { tagId: "history", tag: "History" },
  { tagId: "social_justice", tag: "Social justice" },
  { tagId: "globalDH", tag: "Global DH" },
  { tagId: "archives", tag: "Archives" },
  { tagId: "gender", tag: "Gender" }
]
const CRITICAL_AI_TAG_DEFINITIONS = [
  { tagId: "tools", tag: "Tools" },
  { tagId: "code_studies", tag: "Code studies" },
  { tagId: "project_report", tag: "Project report" },
  { tagId: "cultural_criticism", tag: "Cultural criticism" },
  { tagId: "history", tag: "History" },
  { tagId: "literary_studies", tag: "Literary studies" },
  { tagId: "machine_learning", tag: "Machine learning" },
  { tagId: "media_studies", tag: "Media studies" }
]
const METHOD_TAG_IDS = [
  "machine_learning",
  "nlp",
  "data_analytics",
  "data_visualization"
]
const TAXONOMY_URL =
  "https://dhq.digitalhumanities.org/dhq/common/xml/taxonomy.xml"
const ABOUT_URL = "https://dhq.digitalhumanities.org/dhq/about/about.html"
const REPOSITORY_URL =
  "https://github.com/Digital-Humanities-Quarterly/dhq-journal"
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
    note: "DHQ’s reconstruction describes a hybrid human-machine process, including extensive keypunch and verification labor."
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
    note: "TEI answered incompatible and proprietary formats with governed, hardware- and software-independent encoding methods."
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
    note: "Its project history makes research, transcription, markup, databases, GIS, design, and programming visible as a joint production."
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
    note: "A statistical account of documents and topics becomes a reusable method that digital humanists will later adopt and argue with."
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
    note: "The journal is itself a software system: customized TEI, transforms, styles, scripts, validation, and publication workflows."
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
    note: "One route makes a method explorable behind an interface; the other teaches humanists to program. AI-assisted coding scrambles that distinction."
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
    note: "The essay names the authority that came with knowing code and asks humanists to build software that did not inherit the usual limits."
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
    note: "ORBIS treated an executable model as a scholarly claim and used an interface to let readers alter some of its assumptions."
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
    note: "The issue puts a model builder, practitioners, applications, critics, and tool reviews into the same editorial frame."
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
    note: "The cost of producing conventional code begins to fall without removing review, testing, maintenance, or the conventions absorbed from existing code."
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
    note: "Three methods expose different intellectual neighborhoods: controlled-keyword overlap, BM25 full text, and SPECTER title-and-abstract embeddings."
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
    note: "Implementation can begin in ordinary language and continue through file edits and tests. That is a change in access, not the disappearance of architecture."
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
    note: "The policy permits supportive uses while keeping direct human agency, accuracy, disclosure, and responsibility with the author."
  }
]

function parseArguments(argv) {
  const captureIndex = argv.indexOf("--capture")
  const repositoryIndex = argv.indexOf("--repository")
  const capture = captureIndex === -1 ? null : argv[captureIndex + 1]
  const repository = repositoryIndex === -1 ? null : argv[repositoryIndex + 1]
  if (!capture || !repository || argv.length !== 4) {
    throw new Error(
      "Usage: node scripts/dhq/build-example-data.mjs --capture <capture-id> --repository <dhq-repository-path>"
    )
  }
  return { capture, repository: path.resolve(repository) }
}

function readJsonLines(source) {
  return source
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

function yearFor(article) {
  return Number(article.publicationDate.slice(0, 4))
}

function cohortFor(article) {
  const year = yearFor(article)
  return (
    COHORTS.find((cohort) => year >= cohort.from && year <= cohort.through) ||
    null
  )
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

function controlledTagIds(article) {
  return new Set(controlledKeywords(article).map(tagId).filter(Boolean))
}

function percent(numerator, denominator) {
  return Number(((100 * numerator) / denominator).toFixed(1))
}

function collaborationTrend(articles) {
  const years = [...new Set(articles.map(yearFor))].sort(
    (left, right) => left - right
  )
  return years.flatMap((year) => {
    const records = articles.filter((article) => yearFor(article) === year)
    const multiByline = records.filter(
      (article) => article.authors.length >= 2
    ).length
    return [
      {
        year,
        bylinePattern: "2+ listed authors",
        share: percent(multiByline, records.length),
        items: records.length
      },
      {
        year,
        bylinePattern: "one listed author",
        share: percent(records.length - multiByline, records.length),
        items: records.length
      }
    ]
  })
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
  return TAGS_FOR_TRENDS.flatMap((id) =>
    COHORTS.map((cohort) => {
      const records = articles.filter(
        (article) => cohortFor(article)?.id === cohort.id
      )
      const tagged = records.filter((article) =>
        controlledTagIds(article).has(id)
      ).length
      return {
        tagId: id,
        tag: labels.get(id) || id,
        period: cohort.id,
        share: percent(tagged, records.length),
        items: records.length,
        taggedItems: tagged,
        sourceRecipe: `${tagged}/${records.length} published items have the multi-label, source-controlled #${id} tag.`
      }
    })
  )
}

function recordsInCohort(articles, cohort) {
  return articles.filter((article) => cohortFor(article)?.id === cohort.id)
}

function hasAnyTag(article, tagIds) {
  const tags = controlledTagIds(article)
  return tagIds.some((tagId) => tags.has(tagId))
}

function trendEndpoint(early, late) {
  return {
    earlyItems: early.taggedItems,
    earlyShare: early.share,
    lateItems: late.taggedItems,
    lateShare: late.share,
    delta: Number((late.share - early.share).toFixed(1))
  }
}

function mediaFieldTrends(articles) {
  const measures = [
    { measure: "Explicit media studies", tagIds: ["media_studies"] },
    { measure: "Any media field", tagIds: MEDIA_FIELD_TAG_IDS }
  ]
  return measures.flatMap(({ measure, tagIds }) =>
    COHORTS.map((cohort) => {
      const records = recordsInCohort(articles, cohort)
      const taggedItems = records.filter((article) =>
        hasAnyTag(article, tagIds)
      ).length
      return {
        measure,
        period: cohort.id,
        share: percent(taggedItems, records.length),
        taggedItems,
        items: records.length
      }
    })
  )
}

function mediaFieldSummary(rows) {
  const endpoint = (measure) =>
    trendEndpoint(
      rows.find(
        (row) => row.measure === measure && row.period === COHORTS[0].id
      ),
      rows.find(
        (row) => row.measure === measure && row.period === COHORTS.at(-1).id
      )
    )
  return {
    earlyPeriod: COHORTS[0].id,
    latePeriod: COHORTS.at(-1).id,
    explicit: endpoint("Explicit media studies"),
    anyMediaField: endpoint("Any media field"),
    tagIds: MEDIA_FIELD_TAG_IDS,
    note: "Any media field is a conservative article-level union of eight controlled tags; it is not a claim that every kind of media scholarship uses one of them."
  }
}

function mediaStudiesConnections(articles) {
  const comparisonCohorts = [COHORTS[0], COHORTS.at(-1)]
  return MEDIA_STUDIES_CONTEXTS.flatMap(({ context, tagId: contextTagId }) =>
    comparisonCohorts.map((cohort) => {
      const records = recordsInCohort(articles, cohort)
      const contextRecords = contextTagId
        ? records.filter((article) =>
            controlledTagIds(article).has(contextTagId)
          )
        : records
      const mediaItems = contextRecords.filter((article) =>
        controlledTagIds(article).has("media_studies")
      ).length
      return {
        context,
        period: cohort.id,
        share: percent(mediaItems, contextRecords.length),
        mediaItems,
        contextItems: contextRecords.length
      }
    })
  )
}

function mediaStudiesConnectionsSummary(rows) {
  const contexts = Object.fromEntries(
    MEDIA_STUDIES_CONTEXTS.map(({ context, key }) => {
      const early = rows.find(
        (row) => row.context === context && row.period === COHORTS[0].id
      )
      const late = rows.find(
        (row) => row.context === context && row.period === COHORTS.at(-1).id
      )
      return [
        key,
        {
          earlyMediaItems: early.mediaItems,
          earlyContextItems: early.contextItems,
          earlyShare: early.share,
          lateMediaItems: late.mediaItems,
          lateContextItems: late.contextItems,
          lateShare: late.share,
          delta: Number((late.share - early.share).toFixed(1))
        }
      ]
    })
  )
  return {
    earlyPeriod: COHORTS[0].id,
    latePeriod: COHORTS.at(-1).id,
    contexts,
    note: "Each percentage asks how often #media_studies appears within the named tag context; contexts overlap and the all-items row supplies the baseline."
  }
}

function toolsPracticeTrends(articles) {
  const measures = [
    { measure: "Tools", tagIds: ["tools"] },
    { measure: "Project report", tagIds: ["project_report"] },
    { measure: "Either", tagIds: ["tools", "project_report"] }
  ]
  return measures.flatMap(({ measure, tagIds }) =>
    COHORTS.map((cohort) => {
      const records = recordsInCohort(articles, cohort)
      const taggedItems = records.filter((article) =>
        hasAnyTag(article, tagIds)
      ).length
      return {
        measure,
        period: cohort.id,
        share: percent(taggedItems, records.length),
        taggedItems,
        items: records.length
      }
    })
  )
}

function toolsPracticeSummary(articles, rows) {
  const endpoint = (measure) =>
    trendEndpoint(
      rows.find(
        (row) => row.measure === measure && row.period === COHORTS[0].id
      ),
      rows.find(
        (row) => row.measure === measure && row.period === COHORTS.at(-1).id
      )
    )
  const auditRecords = articles.filter((article) => {
    const year = yearFor(article)
    return year >= 2024 && year <= 2025
  })
  const lateCaseStudies = auditRecords.filter(
    (article) => article.itemType === "case study"
  )
  const count = (records, tagIds) =>
    records.filter((article) => hasAnyTag(article, tagIds)).length
  return {
    earlyPeriod: COHORTS[0].id,
    latePeriod: COHORTS.at(-1).id,
    tools: endpoint("Tools"),
    projectReport: endpoint("Project report"),
    either: endpoint("Either"),
    audit2024To2025: {
      items: auditRecords.length,
      tools: count(auditRecords, ["tools"]),
      projectReport: count(auditRecords, ["project_report"]),
      methodItems: count(auditRecords, METHOD_TAG_IDS),
      methodAndTools: auditRecords.filter((article) => {
        const tags = controlledTagIds(article)
        return (
          tags.has("tools") && METHOD_TAG_IDS.some((tagId) => tags.has(tagId))
        )
      }).length
    },
    lateCaseStudies: {
      items: lateCaseStudies.length,
      tools: count(lateCaseStudies, ["tools"]),
      projectReport: count(lateCaseStudies, ["project_report"])
    },
    methodTagIds: METHOD_TAG_IDS,
    note: "The tools and project-report tags identify explicit classifications, not every article that builds, modifies, evaluates, or reflects on a technical method."
  }
}

function fieldRisers(articles) {
  const comparisonCohorts = [COHORTS[0], COHORTS.at(-1)]
  return FIELD_RISER_DEFINITIONS.flatMap(({ tagId, tag }) => {
    const endpoints = comparisonCohorts.map((cohort) => {
      const records = recordsInCohort(articles, cohort)
      const taggedItems = records.filter((article) =>
        controlledTagIds(article).has(tagId)
      ).length
      return {
        tagId,
        tag,
        period: cohort.id,
        share: percent(taggedItems, records.length),
        taggedItems,
        items: records.length
      }
    })
    const delta = Number((endpoints[1].share - endpoints[0].share).toFixed(1))
    return endpoints.map((row) => ({ ...row, delta }))
  })
}

function fieldRisersSummary(rows) {
  return {
    earlyPeriod: COHORTS[0].id,
    latePeriod: COHORTS.at(-1).id,
    leaders: FIELD_RISER_DEFINITIONS.map(({ tagId, tag }) => {
      const early = rows.find(
        (row) => row.tagId === tagId && row.period === COHORTS[0].id
      )
      const late = rows.find(
        (row) => row.tagId === tagId && row.period === COHORTS.at(-1).id
      )
      return {
        tagId,
        tag,
        earlyShare: early.share,
        lateShare: late.share,
        delta: late.delta
      }
    }),
    note: "These are the eight largest positive changes among controlled tags, comparing article-level shares in the first and last publication cohorts."
  }
}

function criticalAiIssueProfile(articles) {
  const issueRecords = articles.filter(
    (article) => article.volume === 17 && article.issue === 2
  )
  return CRITICAL_AI_TAG_DEFINITIONS.map(({ tagId, tag }) => {
    const count = issueRecords.filter((article) =>
      controlledTagIds(article).has(tagId)
    ).length
    return {
      tagId,
      tag,
      count,
      share: percent(count, issueRecords.length),
      items: issueRecords.length
    }
  })
}

function criticalAiIssueSummary(articles, rows) {
  const issueRecords = articles.filter(
    (article) => article.volume === 17 && article.issue === 2
  )
  const countFor = (tagId) => rows.find((row) => row.tagId === tagId).count
  return {
    volume: 17,
    issue: 2,
    publicationYear: 2023,
    items: issueRecords.length,
    tools: countFor("tools"),
    codeStudies: countFor("code_studies"),
    machineLearning: countFor("machine_learning"),
    mediaStudies: countFor("media_studies"),
    note: "Counts are deduplicated article-level controlled tags in volume 17, issue 2; because tagging is multi-label, shares do not sum to 100%."
  }
}

function sourceModule(data) {
  const encoded = Object.entries(data)
    .map(
      ([name, value]) =>
        `export const ${name} = Object.freeze(${JSON.stringify(value, null, 2)})`
    )
    .join("\n\n")
  return `/*\n * Generated by scripts/dhq/build-example-data.mjs.\n * Capture: ${data.DHQ_PROVENANCE.capture}. Do not edit by hand.\n */\n\n${encoded}\n`
}

async function main() {
  const { capture, repository } = parseArguments(process.argv.slice(2))
  const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.."
  )
  const derivedDirectory = path.join(
    projectRoot,
    "data",
    "dhq",
    "derived",
    capture
  )
  const outputPath = path.join(
    projectRoot,
    "docs",
    "src",
    "pages",
    "examples",
    "data",
    "dhqThunderdome.generated.js"
  )
  const [articleSource, provenanceSource] = await Promise.all([
    readFile(path.join(derivedDirectory, "articles.jsonl"), "utf8"),
    readFile(path.join(derivedDirectory, "provenance.json"), "utf8")
  ])
  const articles = readJsonLines(articleSource)
  const provenance = JSON.parse(provenanceSource)
  const repositoryEvidence = await buildRepositoryEvidence({
    repositoryPath: repository,
    articles
  })
  const mediaTrends = mediaFieldTrends(articles)
  const mediaConnections = mediaStudiesConnections(articles)
  const practiceTrends = toolsPracticeTrends(articles)
  const risers = fieldRisers(articles)
  const criticalAiProfile = criticalAiIssueProfile(articles)
  const data = {
    DHQ_PROVENANCE: {
      capture,
      source:
        "Official DHQ XML corpus, public journal pages, and public source repository",
      corpusUrl: provenance.corpusUrl,
      corpusSha256: provenance.zip.sha256,
      scope:
        "806 published items in volumes 1–19 with primary XML publication dates from 2007 through 2025",
      aboutUrl: ABOUT_URL,
      taxonomyUrl: TAXONOMY_URL,
      repositoryUrl: REPOSITORY_URL,
      repositoryCommit: repositoryEvidence.repositoryCommit
    },
    DHQ_DATA_NOTE: `Data snapshot: ${articles.length} validated DHQ items from 2007–2025. Cohort shares count each controlled tag at most once per item. Tags describe the current archive and include retrospective keywording; repository evidence is pinned to ${repositoryEvidence.repositoryCommit.slice(0, 7)}.`,
    DHQ_DOSSIER: {
      title: "Digital Humanities Quarterly",
      period: "2007–2025",
      sourceItems: articles.length,
      researchQuestion:
        "Has DHQ moved from media and tool-building toward a different kind of humanities, and does AI fit the field the journal now makes visible?"
    },
    DH_HISTORY_TIMELINE,
    PUBLICATION_STRUCTURE: repositoryEvidence.publicationStructure,
    EDITORIAL_STATISTICS: repositoryEvidence.editorialStatistics,
    COLLABORATION_TREND: collaborationTrend(articles),
    SOURCE_TAG_TRENDS: tagTrends(articles),
    MEDIA_FIELD_TRENDS: mediaTrends,
    MEDIA_FIELD_SUMMARY: mediaFieldSummary(mediaTrends),
    MEDIA_STUDIES_CONNECTIONS: mediaConnections,
    MEDIA_STUDIES_CONNECTIONS_SUMMARY:
      mediaStudiesConnectionsSummary(mediaConnections),
    TOOLS_PRACTICE_TRENDS: practiceTrends,
    TOOLS_PRACTICE_SUMMARY: toolsPracticeSummary(articles, practiceTrends),
    FIELD_RISERS: risers,
    FIELD_RISERS_SUMMARY: fieldRisersSummary(risers),
    CRITICAL_AI_ISSUE_PROFILE: criticalAiProfile,
    CRITICAL_AI_ISSUE_SUMMARY: criticalAiIssueSummary(
      articles,
      criticalAiProfile
    ),
    THUNDERDOME_SCENES_META: [
      {
        id: "long-view",
        order: 1,
        chart: "XYCustomChart",
        title: "A short history of executable interpretation",
        question: "What changes when the interface to implementation changes?"
      },
      {
        id: "editorial-shape",
        order: 2,
        chart: "SankeyDiagram",
        title: "A journal assembles a field",
        question:
          "How much of the published record is grouped through named editorial clusters?"
      },
      {
        id: "authorship",
        order: 3,
        chart: "LineChart",
        title: "More names appear on the work",
        question: "Does easier implementation imply more solitary production?"
      },
      {
        id: "subjects",
        order: 4,
        chart: "GroupedBarChart",
        title: "The current vocabulary describes the past",
        question:
          "What subject pattern does the current controlled vocabulary make visible?"
      },
      {
        id: "media-exit",
        order: 5,
        chart: "GroupedBarChart",
        title: "Media studies leaves the center",
        question:
          "What does DHQ’s retreat from media studies reveal about the field it now makes visible?"
      },
      {
        id: "tools-practice",
        order: 6,
        chart: "GroupedBarChart",
        title: "Tools remain, but practice exceeds the tag",
        question:
          "Does the explicit tools category capture the prominence of tools and project practice?"
      },
      {
        id: "field-risers",
        order: 7,
        chart: "GroupedBarChart",
        title: "A more recognizably humanities field rises",
        question:
          "What takes media studies’ place in DHQ’s controlled vocabulary?"
      },
      {
        id: "critical-ai",
        order: 8,
        chart: "GroupedBarChart",
        title: "AI enters a changed digital humanities",
        question:
          "Does AI conflict with DHQ’s present shape, and would it have conflicted with its earlier one?"
      }
    ]
  }
  await writeFile(outputPath, sourceModule(data))
  console.log(
    JSON.stringify(
      {
        capture,
        output: path.relative(projectRoot, outputPath),
        publishedItems: articles.length,
        repositoryCommit: data.DHQ_PROVENANCE.repositoryCommit,
        mediaStudiesEarlyShare: data.MEDIA_FIELD_SUMMARY.explicit.earlyShare,
        mediaStudiesLateShare: data.MEDIA_FIELD_SUMMARY.explicit.lateShare,
        toolsPracticeLateShare: data.TOOLS_PRACTICE_SUMMARY.either.lateShare,
        criticalAiIssueItems: data.CRITICAL_AI_ISSUE_SUMMARY.items
      },
      null,
      2
    )
  )
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
  })
}
