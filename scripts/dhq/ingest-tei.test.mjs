import assert from "node:assert/strict"
import test from "node:test"

import { parseArticleXml } from "./ingest-tei.mjs"

const EARLY_XML = `<?xml version="1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xmlns:dhq="http://www.digitalhumanities.org/ns/dhq">
  <teiHeader><fileDesc>
    <titleStmt>
      <title>Welcome to DHQ</title>
      <author>Example Founder</author>
      <dhq:authorInfo><dhq:author_name>Example Founder</dhq:author_name><dhq:affiliation>Example University</dhq:affiliation></dhq:authorInfo>
    </titleStmt>
    <publicationStmt>
      <idno type="DHQarticle-id">000007</idno><idno type="volume">001</idno><idno type="issue">1</idno>
      <dhq:articleType>editorial</dhq:articleType><date when="2007-04-03">3 April 2007</date><availability status="CC-BY-ND"/>
    </publicationStmt><sourceDesc><p>fixture</p></sourceDesc>
  </fileDesc><profileDesc><langUsage><language ident="en"/></langUsage><textClass>
    <keywords scheme="#dhq_keywords"><term corresp="#publishing"/></keywords>
  </textClass></profileDesc></teiHeader>
  <text xml:lang="en"><front><dhq:abstract><p>An early editorial.</p></dhq:abstract></front></text>
</TEI>`

const RECENT_XML = `<?xml version="1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xmlns:dhq="http://www.digitalhumanities.org/ns/dhq">
  <teiHeader><fileDesc>
    <titleStmt><title type="article"><title rend="quotes">Recent</title>: research</title>
      <dhq:authorInfo><dhq:author_name>Recent Scholar</dhq:author_name><idno type="ORCID">https://orcid.org/0000-0000-0000-0000</idno></dhq:authorInfo>
    </titleStmt>
    <publicationStmt>
      <idno type="DHQarticle-id">000660</idno><idno type="volume">017</idno><idno type="issue">1</idno>
      <dhq:articleType>article</dhq:articleType><date when="2023-05-26"/><availability status="CC-BY"/>
    </publicationStmt><sourceDesc><p>fixture</p></sourceDesc>
  </fileDesc><profileDesc><textClass>
    <keywords scheme="#dhq_keywords"><term corresp="#data_curation">data curation</term></keywords>
    <keywords scheme="#authorial_keywords"><term>resiliency</term></keywords>
    <keywords scheme="#project_keywords"><list/></keywords>
  </textClass></profileDesc></teiHeader>
  <text xml:lang="en"><front><dhq:abstract><p>A recent article.</p></dhq:abstract></front></text>
</TEI>`

test("prefers early DHQ authorInfo over duplicate direct author tags", () => {
  const article = parseArticleXml(EARLY_XML, "dhq-articles/000007.xml")

  assert.equal(article.articleId, "000007")
  assert.equal(article.itemType, "editorial")
  assert.equal(article.authors.length, 1)
  assert.deepEqual(article.authors[0], {
    authorOccurrenceId: "000007:1",
    displayName: "Example Founder",
    affiliationRaw: "Example University",
    orcid: null
  })
  assert.equal(article.keywordSchemes["#dhq_keywords"][0].corresp, "#publishing")
  assert.equal(article.articleUrl, "https://dhq.digitalhumanities.org/dhq/vol/1/1/000007/000007.html")
})

test("retains newer optional metadata schemes without making them required", () => {
  const article = parseArticleXml(RECENT_XML, "dhq-articles/000660.xml")

  assert.equal(article.title, "Recent: research")
  assert.equal(article.authors[0].orcid, "https://orcid.org/0000-0000-0000-0000")
  assert.equal(article.keywordSchemes["#authorial_keywords"][0].text, "resiliency")
  assert.deepEqual(article.keywordSchemes["#project_keywords"], [])
  assert.equal(article.license, "CC-BY")
  assert.equal(article.abstractPresent, true)
  assert.equal(article.abstractText, "A recent article.")
})

test("rejects XML that is not TEI", () => {
  assert.throws(() => parseArticleXml("<html><body>Not TEI</body></html>", "not-tei.xml"), /Not a TEI XML document/)
})
