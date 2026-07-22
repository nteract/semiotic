import { describe, expect, it } from "vitest"
import {
  compileCruciblePlan,
  replayCruciblePlan,
} from "../../../../../src/components/charts/physics/cruciblePhysics"
import {
  LDA_CHECKPOINTS,
  LDA_DEFAULT_CONFIG,
  LDA_MINIATURE_CORPUS,
  LDA_TOPIC_CRUCIBLE_MODEL,
  runCollapsedGibbsLDA,
  tokenizeLDADocument,
} from "./ldaTopicCrucible"

const sum = (values) => values.reduce((total, value) => total + value, 0)

describe("inspectable collapsed-Gibbs LDA trace", () => {
  it("tokenizes the purpose-written corpus deterministically", () => {
    expect(LDA_MINIATURE_CORPUS).toHaveLength(12)
    expect(tokenizeLDADocument("The map, and the ARCHIVE's page.")).toEqual([
      "map",
      "archive's",
      "page",
    ])
    expect(LDA_TOPIC_CRUCIBLE_MODEL.tokenCount).toBeGreaterThan(200)
    expect(LDA_TOPIC_CRUCIBLE_MODEL.vocabularySize).toBeGreaterThan(50)
    expect(LDA_TOPIC_CRUCIBLE_MODEL.warning).toContain("too small")
    expect(LDA_TOPIC_CRUCIBLE_MODEL.source.editorNames).toEqual([
      "Elijah Meeks",
      "Scott B. Weingart",
    ])
  })

  it("is exactly reproducible for one seed and changes for another", () => {
    const repeat = runCollapsedGibbsLDA()
    expect(repeat).toEqual(LDA_TOPIC_CRUCIBLE_MODEL)

    const alternate = runCollapsedGibbsLDA(LDA_MINIATURE_CORPUS, {
      ...LDA_DEFAULT_CONFIG,
      seed: "a-deliberately-different-chain",
    })
    expect(alternate.iterations.at(-1).assignmentTopicIds).not.toEqual(
      LDA_TOPIC_CRUCIBLE_MODEL.iterations.at(-1).assignmentTopicIds,
    )
  })

  it("retains the requested iteration checkpoints and a real token assignment per checkpoint", () => {
    const model = LDA_TOPIC_CRUCIBLE_MODEL
    expect(model.iterations.map((snapshot) => snapshot.iteration)).toEqual(LDA_CHECKPOINTS)
    expect(model.algorithm.id).toBe("collapsed-gibbs-lda")
    expect(model.algorithm.formula).toContain("n_dk^-i")
    expect(model.algorithm.anonymousTopics).toBe(true)
    expect(model.trackedToken.checkpoints.map((visit) => visit.iteration)).toEqual(LDA_CHECKPOINTS)
    expect(model.trackedToken.checkpoints[0].sampled).toBe(false)
    expect(model.trackedToken.checkpoints.slice(1).every((visit) => visit.sampled)).toBe(true)
  })

  it("records categorical draws rather than silently taking the largest conditional", () => {
    const model = LDA_TOPIC_CRUCIBLE_MODEL

    for (const visit of model.trackedToken.checkpoints.filter((checkpoint) => checkpoint.sampled)) {
      let lowerBound = 0
      let upperBound = 0
      for (const topic of model.topics) {
        upperBound += visit.conditionalProbabilities[topic.id]
        if (topic.id === visit.assignmentTopicId) break
        lowerBound = upperBound
      }
      expect(visit.sampledUnit).toBeGreaterThanOrEqual(lowerBound)
      expect(visit.sampledUnit).toBeLessThan(upperBound)
    }

    const surprisingDraw = model.trackedToken.checkpoints.find(
      (checkpoint) => checkpoint.iteration === 2,
    )
    const largestTopicId = Object.entries(surprisingDraw.conditionalProbabilities).sort(
      (left, right) => right[1] - left[1],
    )[0][0]
    expect(surprisingDraw.assignmentTopicId).toBe("topic-2")
    expect(largestTopicId).toBe("topic-4")
  })

  it("conserves every token in topic-word and document-topic count tables", () => {
    const model = LDA_TOPIC_CRUCIBLE_MODEL
    for (const snapshot of model.iterations) {
      expect(snapshot.assignmentTopicIds).toHaveLength(model.tokenCount)
      expect(sum(Object.values(snapshot.topicTokenTotals))).toBe(model.tokenCount)

      for (const topic of model.topics) {
        expect(sum(Object.values(snapshot.topicWordCounts[topic.id]))).toBe(
          snapshot.topicTokenTotals[topic.id],
        )
      }
      for (const document of model.documents) {
        expect(sum(Object.values(snapshot.documentTopicCounts[document.id]))).toBe(
          document.tokenCount,
        )
      }
    }
  })

  it("normalizes topic-word, document-topic, and tracked-token probabilities", () => {
    const model = LDA_TOPIC_CRUCIBLE_MODEL
    for (const snapshot of model.iterations) {
      expect(snapshot.trainingPerplexityProxy).toBeGreaterThan(1)
      expect(Number.isFinite(snapshot.tokenLogScore)).toBe(true)
      for (const topic of model.topics) {
        expect(sum(Object.values(snapshot.topicWordProbabilities[topic.id]))).toBeCloseTo(1, 9)
        expect(snapshot.topicWords[topic.id]).toHaveLength(12)
      }
      for (const document of model.documents) {
        expect(sum(Object.values(snapshot.documentMixtures[document.id]))).toBeCloseTo(1, 9)
      }
      expect(sum(Object.values(snapshot.trackedTokenVisit.conditionalProbabilities))).toBeCloseTo(
        1,
        9,
      )
    }
  })

  it("supplies one ranked Word Trails column for every topic at every checkpoint", () => {
    const model = LDA_TOPIC_CRUCIBLE_MODEL
    expect(model.wordTrails).toHaveLength(
      model.iterations.length * model.topics.length * LDA_DEFAULT_CONFIG.trailWordsPerTopic,
    )
    for (const snapshot of model.iterations) {
      for (const topic of model.topics) {
        const rows = model.wordTrails.filter(
          (row) => row.iteration === snapshot.iteration && row.topicId === topic.id,
        )
        expect(rows).toHaveLength(LDA_DEFAULT_CONFIG.trailWordsPerTopic)
        expect(rows.map((row) => row.rank)).toEqual(
          Array.from({ length: LDA_DEFAULT_CONFIG.trailWordsPerTopic }, (_, index) => index + 1),
        )
        expect(rows.every((row) => row.segment === snapshot.iteration)).toBe(true)
        expect(rows.every((row) => row.weight === row.probability)).toBe(true)
      }
    }
  })

  it("adapts the terminal Gibbs state to a conservative, bounded Crucible quench", () => {
    const model = LDA_TOPIC_CRUCIBLE_MODEL
    const { crucible } = model
    const sourceIds = crucible.data.map((row) => row.id)
    const productSourceIds = crucible.events
      .flatMap((event) => event.effects)
      .filter((effect) => effect.type === "combine")
      .flatMap((effect) => effect.sourceIds)

    expect(crucible.phases.map((phase) => phase.id)).toEqual([
      "recorded-terminal-charge",
      "allocate-terminal-topics",
      "quench-terminal-projection",
    ])
    expect(crucible.phases[0].description).toContain("no token is resampled")
    expect(crucible.note).toContain("does not replay Gibbs inference")
    expect(new Set(productSourceIds)).toEqual(new Set(sourceIds))
    expect(productSourceIds).toHaveLength(new Set(productSourceIds).size)
    expect(sum(crucible.data.map((row) => row.amount))).toBe(model.tokenCount)
    expect(sum(crucible.products.map((product) => product.amount))).toBe(model.tokenCount)

    const plan = compileCruciblePlan({
      data: crucible.data,
      phases: crucible.phases,
      products: crucible.products,
      outlets: crucible.outlets,
      events: crucible.events,
      ...crucible.accessors,
    })
    const replay = replayCruciblePlan(plan, plan.duration)
    const allocationEvents = plan.events.filter((event) =>
      event.effects.some((effect) => effect.type === "combine"),
    )
    const wallClockAllocationTimes = allocationEvents.map(
      (event) => event.authoredAt / crucible.playbackRate,
    )
    const wallClockDuration = plan.duration / crucible.playbackRate
    const wallClockTail =
      (plan.duration - allocationEvents.at(-1).authoredAt) / crucible.playbackRate

    expect(allocationEvents).toHaveLength(model.topics.length)
    expect(wallClockAllocationTimes[0]).toBeGreaterThanOrEqual(1)
    expect(wallClockAllocationTimes[0]).toBeLessThanOrEqual(1.5)
    expect(wallClockDuration).toBeGreaterThanOrEqual(5)
    expect(wallClockDuration).toBeLessThanOrEqual(7)
    expect(wallClockTail).toBeGreaterThan(2)

    const justBeforeFirstAllocation = replayCruciblePlan(
      plan,
      allocationEvents[0].authoredAt - 0.001,
    )
    const justAfterFirstAllocation = replayCruciblePlan(
      plan,
      allocationEvents[0].authoredAt + 0.001,
    )
    expect(Object.values(justBeforeFirstAllocation.state.products)).toHaveLength(0)
    expect(Object.values(justAfterFirstAllocation.state.products)).toHaveLength(1)
    expect(plan.diagnostics).toEqual([])
    expect(replay.diagnostics).toEqual([])
    expect(replay.state.complete).toBe(true)
    expect(replay.state.outcome).toBe("terminal-chain-state")
    expect(Object.values(replay.state.products)).toHaveLength(model.topics.length)
    expect(
      Object.values(replay.state.products).every((product) => product.status === "complete"),
    ).toBe(true)
    expect(sum(Object.values(replay.state.products).map((product) => product.amount))).toBe(
      model.tokenCount,
    )
  })
})
