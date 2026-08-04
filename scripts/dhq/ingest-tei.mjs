#!/usr/bin/env node

/**
 * Build a source-traceable, internal DHQ metadata snapshot from the official
 * corpus ZIP after it has been extracted into data/dhq/raw/<capture-id>/.
 *
 * This is deliberately an offline transform: it never makes network requests.
 * Full derivations stay ignored for repository hygiene; the reviewed,
 * browser-sized module is generated separately for the docs example.
 *
 * Usage:
 *   node scripts/dhq/ingest-tei.mjs --capture dhq-2007-to-2025-20260729
 */

import console from "node:console"
import { createHash } from "node:crypto"
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { JSDOM } from "jsdom"

const TEI_NS = "http://www.tei-c.org/ns/1.0"
const DHQ_NS = "http://www.digitalhumanities.org/ns/dhq"
const XML_NS = "http://www.w3.org/XML/1998/namespace"
const SOURCE_ROOT = "https://dhq.digitalhumanities.org/dhq"
const CORPUS_URL = "https://dhq.digitalhumanities.org/data/dhq-xml.zip"
const EXTRACTOR_VERSION = 2
const domParser = new (new JSDOM().window.DOMParser)()

function usage() {
  return "Usage: node scripts/dhq/ingest-tei.mjs --capture <capture-id> [--from-volume 1] [--through-volume 19] [--from-year 2007] [--through-year 2025]"
}

function parseArguments(argv) {
  const args = {
    capture: null,
    fromVolume: 1,
    throughVolume: 19,
    fromYear: 2007,
    throughYear: 2025
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--capture") args.capture = argv[++index]
    else if (value === "--from-volume") args.fromVolume = Number(argv[++index])
    else if (value === "--through-volume") args.throughVolume = Number(argv[++index])
    else if (value === "--from-year") args.fromYear = Number(argv[++index])
    else if (value === "--through-year") args.throughYear = Number(argv[++index])
    else throw new Error(`Unknown argument: ${value}`)
  }

  if (!args.capture || !Number.isInteger(args.fromVolume) || !Number.isInteger(args.throughVolume) || !Number.isInteger(args.fromYear) || !Number.isInteger(args.throughYear)) {
    throw new Error(usage())
  }

  return args
}

function normalizedText(node) {
  return node?.textContent?.replace(/\s+/g, " ").trim() || null
}

function elements(parent, namespace, localName) {
  return Array.from(parent.getElementsByTagNameNS(namespace, localName))
}

function firstElement(parent, namespace, localName) {
  return elements(parent, namespace, localName)[0] || null
}

function directChild(parent, namespace, localName) {
  return Array.from(parent?.children || []).find(
    child => child.namespaceURI === namespace && child.localName === localName
  ) || null
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

function valueForIdno(fileDesc, type) {
  return normalizedText(elements(fileDesc, TEI_NS, "idno")
    .find(idno => idno.getAttribute("type") === type))
}

function extractAuthors(titleStmt, articleId) {
  const authorInfos = elements(titleStmt, DHQ_NS, "authorInfo")
  if (authorInfos.length > 0) {
    return authorInfos.map((authorInfo, index) => {
      const orcid = elements(authorInfo, TEI_NS, "idno")
        .find(idno => idno.getAttribute("type") === "ORCID")
      return {
        authorOccurrenceId: `${articleId}:${index + 1}`,
        displayName: normalizedText(firstElement(authorInfo, DHQ_NS, "author_name")),
        affiliationRaw: normalizedText(firstElement(authorInfo, DHQ_NS, "affiliation")),
        orcid: normalizedText(orcid)
      }
    })
  }

  return Array.from(titleStmt.children)
    .filter(child => child.namespaceURI === TEI_NS && child.localName === "author")
    .map((author, index) => ({
      authorOccurrenceId: `${articleId}:${index + 1}`,
      displayName: normalizedText(author),
      affiliationRaw: null,
      orcid: null
    }))
}

function extractKeywordSchemes(profileDesc) {
  const result = {}
  for (const keywords of elements(profileDesc, TEI_NS, "keywords")) {
    const scheme = keywords.getAttribute("scheme") || "(unspecified)"
    result[scheme] = elements(keywords, TEI_NS, "term").map(term => ({
      text: normalizedText(term),
      corresp: term.getAttribute("corresp") || null
    }))
  }
  return result
}

export function parseArticleXml(xml, sourcePath) {
  const document = domParser.parseFromString(xml, "application/xml")
  const parserError = document.querySelector("parsererror")
  if (parserError) throw new Error(normalizedText(parserError) || "XML parse failure")
  if (document.documentElement.namespaceURI !== TEI_NS || document.documentElement.localName !== "TEI") {
    throw new Error("Not a TEI XML document")
  }

  const teiHeader = firstElement(document, TEI_NS, "teiHeader")
  const fileDesc = firstElement(teiHeader, TEI_NS, "fileDesc")
  const titleStmt = firstElement(fileDesc, TEI_NS, "titleStmt")
  const publicationStmt = firstElement(fileDesc, TEI_NS, "publicationStmt")
  const profileDesc = firstElement(teiHeader, TEI_NS, "profileDesc")
  if (!teiHeader || !fileDesc || !titleStmt || !publicationStmt) {
    throw new Error("Missing required TEI header structure")
  }

  const articleId = valueForIdno(fileDesc, "DHQarticle-id")
  const volumeRaw = valueForIdno(fileDesc, "volume")
  const issueRaw = valueForIdno(fileDesc, "issue")
  const volume = Number(volumeRaw)
  const issue = Number(issueRaw)
  const title = normalizedText(directChild(titleStmt, TEI_NS, "title"))
  const publicationDate = firstElement(publicationStmt, TEI_NS, "date")
  const language = firstElement(document, TEI_NS, "text")?.getAttributeNS(XML_NS, "lang")
    || firstElement(profileDesc, TEI_NS, "language")?.getAttribute("ident")
    || null
  const abstract = normalizedText(firstElement(document, DHQ_NS, "abstract"))
  const articleType = normalizedText(firstElement(publicationStmt, DHQ_NS, "articleType"))
  const availability = firstElement(publicationStmt, TEI_NS, "availability")

  return {
    articleId,
    volume: Number.isFinite(volume) ? volume : null,
    issue: Number.isFinite(issue) ? issue : null,
    volumeRaw,
    issueRaw,
    publicationDate: publicationDate?.getAttribute("when") || normalizedText(publicationDate),
    itemType: articleType,
    title,
    language,
    authors: extractAuthors(titleStmt, articleId),
    keywordSchemes: extractKeywordSchemes(profileDesc),
    abstractPresent: Boolean(abstract),
    abstractText: abstract,
    license: availability?.getAttribute("status") || null,
    sourcePath,
    sourceHash: sha256(xml),
    articleUrl: articleId && Number.isFinite(volume) && Number.isFinite(issue)
      ? `${SOURCE_ROOT}/vol/${volume}/${issue}/${articleId}/${articleId}.html`
      : null,
    xmlUrl: articleId && Number.isFinite(volume) && Number.isFinite(issue)
      ? `${SOURCE_ROOT}/vol/${volume}/${issue}/${articleId}.xml`
      : null
  }
}

async function xmlFiles(directory) {
  const names = await readdir(directory)
  return names
    .filter(name => name.endsWith(".xml"))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
}

function countBy(records, accessor) {
  return records.reduce((counts, record) => {
    const key = accessor(record) || "(missing)"
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
}

function missingFieldCounts(records) {
  const required = ["articleId", "volume", "issue", "publicationDate", "itemType", "title"]
  return Object.fromEntries(
    required.map(field => [field, records.filter(record => !record[field]).length])
  )
}

async function main() {
  const { capture, fromVolume, throughVolume, fromYear, throughYear } = parseArguments(process.argv.slice(2))
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
  const rawDirectory = path.join(projectRoot, "data", "dhq", "raw", capture)
  const articleDirectory = path.join(rawDirectory, "dhq-articles")
  const derivedDirectory = path.join(projectRoot, "data", "dhq", "derived", capture)
  const zipPath = path.join(rawDirectory, "dhq-xml.zip")
  const files = await xmlFiles(articleDirectory)
  const parsed = []
  const errors = []

  for (const file of files) {
    const sourcePath = path.posix.join("dhq-articles", file)
    try {
      const xml = await readFile(path.join(articleDirectory, file), "utf8")
      parsed.push(parseArticleXml(xml, sourcePath))
    } catch (error) {
      errors.push({ sourcePath, error: error instanceof Error ? error.message : String(error) })
    }
  }

  const isInVolumeScope = record => record.volume >= fromVolume && record.volume <= throughVolume
  const publicationYear = record => Number(record.publicationDate?.slice(0, 4))
  const isInDateScope = record => publicationYear(record) >= fromYear && publicationYear(record) <= throughYear
  const inVolumeScope = parsed.filter(isInVolumeScope)
  const excluded = parsed
    .filter(record => !isInVolumeScope(record) || !isInDateScope(record))
    .map(record => ({
      ...record,
      exclusionReasons: [
        !isInVolumeScope(record) ? "outside-volume-scope" : null,
        !isInDateScope(record) ? "outside-publication-date-scope" : null
      ].filter(Boolean)
    }))
  const included = inVolumeScope
    .filter(isInDateScope)
    .sort((left, right) =>
      left.volume - right.volume || left.issue - right.issue || left.publicationDate.localeCompare(right.publicationDate) || left.articleId.localeCompare(right.articleId)
    )
  const zip = await readFile(zipPath)
  const manifest = {
    capture,
    corpusUrl: CORPUS_URL,
    zipFile: "dhq-xml.zip",
    zipBytes: (await stat(zipPath)).size,
    zipSha256: sha256(zip),
    xmlFiles: files,
    parsedRecords: parsed.length,
    parseErrors: errors
  }
  const qualityReport = {
    capture,
    scope: { fromVolume, throughVolume, fromYear, throughYear },
    sourceFileCount: files.length,
    parsedRecordCount: parsed.length,
    includedRecordCount: included.length,
    excludedOutsideScopeCount: parsed.length - included.length,
    excludedOutsideVolumeScopeCount: parsed.length - inVolumeScope.length,
    excludedOutsidePublicationDateScopeCount: inVolumeScope.length - included.length,
    parseErrors: errors,
    missingRequiredFields: missingFieldCounts(included),
    articleTypes: countBy(included, record => record.itemType),
    volumes: countBy(included, record => `${record.volume}.${record.issue}`),
    authorship: {
      noByline: included.filter(record => record.authors.length === 0).length,
      oneByline: included.filter(record => record.authors.length === 1).length,
      multipleBylines: included.filter(record => record.authors.length > 1).length
    },
    metadataCoverage: {
      abstractPresent: included.filter(record => record.abstractPresent).length,
      controlledKeywords: included.filter(record => record.keywordSchemes["#dhq_keywords"]?.length).length,
      authorialKeywords: included.filter(record => record.keywordSchemes["#authorial_keywords"]?.length).length,
      projectKeywords: included.filter(record => record.keywordSchemes["#project_keywords"]?.length).length,
      orcidOccurrences: included.flatMap(record => record.authors).filter(author => author.orcid).length
    }
  }
  const provenance = {
    capture,
    extractor: "scripts/dhq/ingest-tei.mjs",
    extractorVersion: EXTRACTOR_VERSION,
    corpusUrl: CORPUS_URL,
    scope: { fromVolume, throughVolume, fromYear, throughYear },
    zip: {
      filename: manifest.zipFile,
      bytes: manifest.zipBytes,
      sha256: manifest.zipSha256
    },
    generatedAt: new Date().toISOString(),
    note: "Internal full-fidelity derivation; publish only a reviewed, browser-sized aggregate module with source attribution."
  }

  await mkdir(derivedDirectory, { recursive: true })
  await writeFile(path.join(rawDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(path.join(derivedDirectory, "articles.jsonl"), `${included.map(record => JSON.stringify(record)).join("\n")}\n`)
  await writeFile(path.join(derivedDirectory, "excluded-records.jsonl"), `${excluded.map(record => JSON.stringify(record)).join("\n")}\n`)
  await writeFile(path.join(derivedDirectory, "quality-report.json"), `${JSON.stringify(qualityReport, null, 2)}\n`)
  await writeFile(path.join(derivedDirectory, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`)

  console.log(JSON.stringify({
    capture,
    sourceFiles: files.length,
    parsed: parsed.length,
    included: included.length,
    parseErrors: errors.length,
    output: path.relative(projectRoot, derivedDirectory)
  }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
  })
}
