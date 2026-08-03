import test from "node:test"
import assert from "node:assert/strict"
import {
  filterRecommendationTables,
  parsePublishedTocIds,
  parseRecommendationTsv,
} from "./repository-evidence.mjs"

test("parses literal title quotation marks without shifting recommendation columns", () => {
  const source = [
    "\uFEFFArticle ID\tPub. Year\tAuthors\tTitle\tRecommendation 1\turl",
    '000429\t2019\tCara Marta Messina\t"These Violent Delights": A Review\t000085\thttps://example.test/000429',
  ].join("\r\n")

  const [row] = parseRecommendationTsv(source)
  assert.equal(row["Article ID"], "000429")
  assert.equal(row.Title, '"These Violent Delights": A Review')
  assert.equal(row["Recommendation 1"], "000085")
  assert.equal(row.url, "https://example.test/000429")
})

test("filters recommendation sources and targets to published public TOC ids", () => {
  const rows = [
    {
      "Article ID": "000847",
      Title: "Facets of Friction",
      "Recommendation 1": "000800",
      "Recommendation 2": "000429",
    },
    {
      "Article ID": "000429",
      Title: '"These Violent Delights": A Review',
      "Recommendation 1": "000847",
    },
    {
      "Article ID": "000800",
      Title: "TEST",
      "Recommendation 1": "000847",
    },
  ]
  const tables = {
    keywords: rows,
    bm25: rows,
    specter: rows,
  }

  const filtered = filterRecommendationTables(
    tables,
    new Set(["000429", "000847"]),
  )

  for (const methodRows of Object.values(filtered)) {
    assert.deepEqual(
      methodRows.map((row) => row["Article ID"]),
      ["000847", "000429"],
    )
    assert.equal(methodRows[0]["Recommendation 1"], "")
    assert.equal(methodRows[0]["Recommendation 2"], "000429")
  }
})

test("rejects preview and editorial journals before collecting TOC ids", () => {
  const source = `<?xml version="1.0"?>
    <toc>
      <journal vol="19"><list><item id="000799"/></list></journal>
      <journal vol="20" preview="true"><list><item id="000871"/></list></journal>
      <journal editorial="true"><list><item id="editorial-queue"/></list></journal>
    </toc>`

  assert.deepEqual([...parsePublishedTocIds(source)], ["000799"])
})
