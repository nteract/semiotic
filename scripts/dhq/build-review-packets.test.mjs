import assert from "node:assert/strict"
import test from "node:test"

import { COHORTS, SAMPLE_PLAN, selectSubjectReviewSample } from "./build-review-packets.mjs"

function article({ id, year, itemType }) {
  return {
    articleId: id,
    publicationDate: `${year}-01-01`,
    itemType,
    title: id,
    authors: [],
    abstractText: null,
    keywordSchemes: {},
    articleUrl: `https://example.test/${id}`,
    xmlUrl: `https://example.test/${id}.xml`,
    sourcePath: `${id}.xml`,
    sourceHash: id
  }
}

function fullFixture() {
  return COHORTS.flatMap(cohort => SAMPLE_PLAN.flatMap(plan =>
    Array.from({ length: plan.count + 2 }, (_, index) => article({
      id: `${cohort.id}-${plan.itemTypeFamily}-${index + 1}`,
      year: cohort.from,
      itemType: plan.itemTypeFamily === "article" ? "article" : "review"
    }))
  ))
}

test("selects a stable, complete, no-replacement stratified subject sample", () => {
  const records = fullFixture()
  const first = selectSubjectReviewSample(records, "capture-a")
  const second = selectSubjectReviewSample(records, "capture-a")

  assert.deepEqual(first, second)
  assert.equal(first.length, 48)
  assert.equal(new Set(first.map(record => record.articleId)).size, first.length)
  for (const cohort of COHORTS) {
    for (const plan of SAMPLE_PLAN) {
      assert.equal(
        first.filter(record => record.cohort === cohort.id && record.itemTypeFamily === plan.itemTypeFamily).length,
        plan.count
      )
    }
  }
})

test("fails loudly when a required subject-review stratum is incomplete", () => {
  const records = fullFixture().filter(record => record.itemType !== "review")
  assert.throws(() => selectSubjectReviewSample(records, "capture-a"), /has 0; needs 4/)
})
