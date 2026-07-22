import { describe, expect, it } from "vitest"
import {
  DEBATE_CONCEPT_ASSAYS,
  DEBATE_CONCEPT_CRUCIBLES,
  DEBATE_CRUCIBLE_REASONS,
  DEBATE_CRUCIBLE_THRESHOLDS,
  DEBATE_PHASES,
  DEFAULT_FOLLOW_WORD,
  TRANSCRIPT_ARTIFACTS,
  compileDebateConceptAssay,
  compileDebateConceptCrucible,
  cosineSimilarity,
  ledgerSummary,
  trailRowsForWord,
} from "./debateConceptCrucible"
import { DEBATE_WORD_TRAILS, SEGMENTS } from "../../../examples/recipes/data/debateWordTrails"
import {
  compileCruciblePlan,
  replayCruciblePlan,
} from "../../../../../src/components/charts/physics/cruciblePhysics"

const expectedCandidates = {
  2012: ["Obama", "Romney"],
  2016: ["Clinton", "Trump"],
  2020: ["Biden", "Trump"],
}

function authoredEventTime(event) {
  let elapsed = 0
  for (const phase of DEBATE_PHASES) {
    if (phase.id === event.at.phaseId) return elapsed + phase.duration * event.at.progress
    elapsed += phase.duration
  }
  throw new Error(`Unknown event phase: ${event.at.phaseId}`)
}

describe("debate word-trail full profiles", () => {
  it("retains exact 20-bin profiles while display rows remain a peak-bin subset", () => {
    for (const debate of DEBATE_WORD_TRAILS) {
      expect(debate.profiles).toHaveLength(debate.columnOrder.length * 22)
      const profiles = new Map()
      for (const profile of debate.profiles) {
        expect(profile.bins).toHaveLength(SEGMENTS)
        expect(profile.bins.reduce((total, count) => total + count, 0)).toBe(profile.total)
        profiles.set(`${profile.speaker}|${profile.word}`, profile)
      }

      const displayTotals = new Map()
      for (const row of debate.words) {
        const key = `${row.speaker}|${row.word}`
        displayTotals.set(key, (displayTotals.get(key) ?? 0) + row.weight)
      }
      for (const [key, displayTotal] of displayTotals) {
        expect(displayTotal).toBeLessThanOrEqual(profiles.get(key).total)
      }
    }
  })
})

describe("debate concept crucible compiler", () => {
  it("compiles the three expected debates into two candidate charges without the host", () => {
    expect(DEBATE_CONCEPT_CRUCIBLES.map((debate) => debate.id)).toEqual(["2012", "2016", "2020"])
    for (const compilation of DEBATE_CONCEPT_CRUCIBLES) {
      expect(compilation.candidates.map((candidate) => candidate.speaker)).toEqual(
        expectedCandidates[compilation.id],
      )
      expect(compilation.candidates.every((candidate) => candidate.role !== "host")).toBe(true)
      expect(compilation.moderator.role).toBe("host")
    }
  })

  it("removes transcript artifacts before admission and records every exclusion", () => {
    for (let index = 0; index < DEBATE_WORD_TRAILS.length; index += 1) {
      const debate = DEBATE_WORD_TRAILS[index]
      const compilation = DEBATE_CONCEPT_CRUCIBLES[index]
      const sourceArtifacts = debate.profiles.filter((profile) =>
        TRANSCRIPT_ARTIFACTS.has(profile.word),
      )
      expect(compilation.excluded).toHaveLength(sourceArtifacts.length)
      expect(compilation.excluded.every((record) => record.disposition === "excluded")).toBe(true)
      expect(
        compilation.excluded.every((record) => record.reason === DEBATE_CRUCIBLE_REASONS.artifact),
      ).toBe(true)

      for (const candidate of compilation.candidates) {
        expect(
          candidate.charge.admitted.some((profile) => TRANSCRIPT_ARTIFACTS.has(profile.word)),
        ).toBe(false)
        expect(candidate.unalloyed.some((profile) => TRANSCRIPT_ARTIFACTS.has(profile.word))).toBe(
          false,
        )
        expect(candidate.ledger.some((entry) => TRANSCRIPT_ARTIFACTS.has(entry.word))).toBe(false)
      }
    }
  })

  it("admits the top 12 full totals with stable source-order ties", () => {
    for (const debate of DEBATE_WORD_TRAILS) {
      const compilation = compileDebateConceptCrucible(debate)
      for (const candidate of compilation.candidates) {
        const expected = debate.profiles
          .map((profile, sourceIndex) => ({ ...profile, sourceIndex }))
          .filter(
            (profile) =>
              profile.speaker === candidate.speaker && !TRANSCRIPT_ARTIFACTS.has(profile.word),
          )
          .sort((a, b) => b.total - a.total || a.sourceIndex - b.sourceIndex)
          .slice(0, DEBATE_CRUCIBLE_THRESHOLDS.admittedPerCandidate)
          .map((profile) => profile.word)
        expect(candidate.charge.admitted.map((profile) => profile.word)).toEqual(expected)
      }
    }
  })

  it("is deterministic for both the audit compiler and chart adapter", () => {
    for (const debate of DEBATE_WORD_TRAILS) {
      expect(compileDebateConceptCrucible(debate)).toEqual(compileDebateConceptCrucible(debate))
      expect(compileDebateConceptAssay(debate)).toEqual(compileDebateConceptAssay(debate))
    }
  })

  it("closes every admitted word exactly once in a product or unalloyed outlet", () => {
    for (const compilation of DEBATE_CONCEPT_CRUCIBLES) {
      for (const candidate of compilation.candidates) {
        const admittedIds = candidate.charge.admitted.map((profile) => profile.id)
        const productIds = candidate.products.flatMap((product) => product.memberIds)
        const unalloyedIds = candidate.unalloyed.map((profile) => profile.id)
        const destinations = [...productIds, ...unalloyedIds]

        expect(candidate.charge.admitted).toHaveLength(12)
        expect(new Set(destinations).size).toBe(destinations.length)
        expect(new Set(destinations)).toEqual(new Set(admittedIds))
        expect(candidate.ledger).toHaveLength(admittedIds.length)
        expect(new Set(candidate.ledger.map((entry) => entry.wordId))).toEqual(new Set(admittedIds))
        expect(ledgerSummary(candidate).admitted).toBe(
          ledgerSummary(candidate).alloyed + ledgerSummary(candidate).unalloyed,
        )
        expect(
          candidate.unalloyed.every((profile) =>
            [DEBATE_CRUCIBLE_REASONS.noOpeningPair, DEBATE_CRUCIBLE_REASONS.productLimit].includes(
              profile.reason,
            ),
          ),
        ).toBe(true)
      }
    }
  })

  it("uses full-vector cosine thresholds for disjoint, neutrally named products", () => {
    for (const compilation of DEBATE_CONCEPT_CRUCIBLES) {
      for (const candidate of compilation.candidates) {
        expect(candidate.relations).toHaveLength((12 * 11) / 2)
        expect(
          candidate.eligibleRelations.every(
            (relation) => relation.score >= DEBATE_CRUCIBLE_THRESHOLDS.openingPair,
          ),
        ).toBe(true)
        for (const relation of candidate.relations) {
          const source = candidate.charge.admitted.find(
            (profile) => profile.id === relation.sourceId,
          )
          const target = candidate.charge.admitted.find(
            (profile) => profile.id === relation.targetId,
          )
          expect(relation.score).toBeCloseTo(cosineSimilarity(source.bins, target.bins), 12)
        }

        expect(candidate.products.length).toBeLessThanOrEqual(3)
        for (const product of candidate.products) {
          expect(product.members.length).toBeGreaterThanOrEqual(2)
          expect(product.members.length).toBeLessThanOrEqual(4)
          expect(product.openingScore).toBeGreaterThanOrEqual(
            DEBATE_CRUCIBLE_THRESHOLDS.openingPair,
          )
          expect(
            product.members
              .filter((member) => member.route.kind === "mean-affinity")
              .every((member) => member.route.score >= DEBATE_CRUCIBLE_THRESHOLDS.alloyAddition),
          ).toBe(true)
          const expectedLabel = [...product.members]
            .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id))
            .slice(0, product.members.length === 2 ? 2 : 3)
            .map((member) => member.word.toUpperCase())
            .join(" + ")
          expect(product.label).toBe(expectedLabel)
          expect(product.label).toMatch(/^[A-Z]+(?: \+ [A-Z]+){1,2}$/)
        }
      }
    }
  })

  it("provides a shared default followed word and honest moderator context", () => {
    for (const compilation of DEBATE_CONCEPT_CRUCIBLES) {
      expect(compilation.defaultFollowWord).toBe(DEFAULT_FOLLOW_WORD[compilation.id])
      expect(
        compilation.sharedWordOptions.some(
          (option) => option.word === compilation.defaultFollowWord,
        ),
      ).toBe(true)
      for (const candidate of compilation.candidates) {
        expect(
          candidate.charge.admitted.some(
            (profile) => profile.word === compilation.defaultFollowWord,
          ),
        ).toBe(true)
      }
      const rows = trailRowsForWord(compilation)
      expect(
        new Set(rows.filter((row) => row.context === "candidate").map((row) => row.speaker)),
      ).toEqual(new Set(compilation.candidates.map((candidate) => candidate.speaker)))
      expect(compilation.moderatorContextRows.length).toBeGreaterThan(0)
      expect(compilation.moderatorContextRows.every((row) => row.context === "moderator")).toBe(
        true,
      )
    }
  })

  it("keeps five contiguous phases and all profile, product, and trail peaks in bounds", () => {
    expect(DEBATE_PHASES).toHaveLength(5)
    expect(
      DEBATE_PHASES.flatMap((phase) =>
        Array.from({ length: phase.end - phase.start + 1 }, (_, index) => phase.start + index),
      ),
    ).toEqual(Array.from({ length: SEGMENTS }, (_, index) => index))

    for (const compilation of DEBATE_CONCEPT_CRUCIBLES) {
      for (const profile of compilation.profiles) {
        expect(profile.peak.segment).toBeGreaterThanOrEqual(0)
        expect(profile.peak.segment).toBeLessThan(SEGMENTS)
      }
      for (const candidate of compilation.candidates) {
        for (const product of candidate.products) {
          expect(product.peak.segment).toBeGreaterThanOrEqual(0)
          expect(product.peak.segment).toBeLessThan(SEGMENTS)
        }
      }
      for (const rows of Object.values(compilation.trailRowsByWord)) {
        expect(rows.every((row) => row.segment >= 0 && row.segment < SEGMENTS)).toBe(true)
      }
    }
  })
})

describe("debate concept chart adapter", () => {
  it("provides stable chart rows, products, outlets, and accretive event tapes", () => {
    expect(DEBATE_CONCEPT_ASSAYS).toHaveLength(3)
    for (const assay of DEBATE_CONCEPT_ASSAYS) {
      for (const candidate of assay.candidates) {
        expect(candidate.data).toHaveLength(12)
        expect(candidate.outlets.map((outlet) => outlet.label)).toEqual([
          "Temporal alloys",
          "Unalloyed",
        ])
        expect(candidate.phases).toEqual(DEBATE_PHASES)
        expect(
          candidate.data.every((row) => row.productId || row.disposition === "unalloyed"),
        ).toBe(true)

        for (const product of candidate.products) {
          const relationIndex = candidate.events.findIndex(
            (event) => event.id === `${product.id}-relation`,
          )
          const openIndex = candidate.events.findIndex((event) => event.id === `${product.id}-open`)
          const completeIndex = candidate.events.findIndex(
            (event) => event.id === `${product.id}-complete`,
          )
          const openEffect = candidate.events[openIndex].effects[0]
          const contributions = candidate.events.filter((event) =>
            event.id.startsWith(`${product.id}-contribute-`),
          )

          expect(relationIndex).toBeLessThan(openIndex)
          expect(openIndex).toBeLessThan(completeIndex)
          expect(openEffect).toMatchObject({
            type: "combine",
            productId: product.id,
            complete: false,
          })
          expect(openEffect.product).toBeUndefined()
          expect(contributions).toHaveLength(
            candidate.data.filter((row) => row.productId === product.id).length - 2,
          )
          expect(
            contributions.every(
              (event) =>
                event.effects[0].type === "contribute" &&
                Array.isArray(event.effects[0].sourceIds) &&
                event.effects[0].sourceIds.length === 1,
            ),
          ).toBe(true)
          expect(candidate.events[completeIndex].effects[0]).toEqual({
            type: "complete-product",
            productId: product.id,
            outletId: `${candidate.id}-alloys`,
          })
        }

        const ejections = candidate.events.filter((event) => event.effects[0].type === "eject")
        expect(ejections).toHaveLength(
          candidate.data.filter((row) => row.disposition === "unalloyed").length,
        )
        expect(ejections.every((event) => event.effects[0].reason)).toBe(true)
      }
    }
  })

  it("gives every alloy a visible forming interval and every outlet route a settling tail", () => {
    const duration = DEBATE_PHASES.reduce((total, phase) => total + phase.duration, 0)

    for (const assay of DEBATE_CONCEPT_ASSAYS) {
      for (const candidate of assay.candidates) {
        for (const product of candidate.products) {
          const relation = candidate.events.find((event) => event.id === `${product.id}-relation`)
          const open = candidate.events.find((event) => event.id === `${product.id}-open`)
          const complete = candidate.events.find((event) => event.id === `${product.id}-complete`)
          const contributions = candidate.events.filter((event) =>
            event.id.startsWith(`${product.id}-contribute-`),
          )
          const lifecycle = [relation, open, ...contributions, complete].map(authoredEventTime)

          expect(lifecycle).toEqual([...lifecycle].sort((left, right) => left - right))
          expect(authoredEventTime(open) - authoredEventTime(relation)).toBeGreaterThan(0.3)
          expect(authoredEventTime(complete) - authoredEventTime(open)).toBeGreaterThan(0.6)
        }

        const transformations = candidate.events.filter((event) =>
          event.effects.some((effect) =>
            ["combine", "contribute", "complete-product", "eject"].includes(effect.type),
          ),
        )
        expect(Math.max(...transformations.map(authoredEventTime))).toBeLessThanOrEqual(
          duration - 1.3,
        )
      }
    }
  })

  it("replays every candidate tape through the public core without diagnostics", () => {
    for (const assay of DEBATE_CONCEPT_ASSAYS) {
      for (const candidate of assay.candidates) {
        const plan = compileCruciblePlan({
          data: candidate.data,
          phases: candidate.phases,
          products: candidate.products,
          outlets: candidate.outlets,
          events: candidate.events,
          idAccessor: "id",
          labelAccessor: "label",
          categoryAccessor: "disposition",
          amountAccessor: "amount",
        })
        const replay = replayCruciblePlan(plan, plan.duration)

        expect(plan.diagnostics).toEqual([])
        expect(replay.diagnostics).toEqual([])
        expect(replay.state.complete).toBe(true)
        for (const product of candidate.products) {
          expect(replay.state.products[product.id].sourceIds).toHaveLength(
            candidate.data.filter((row) => row.productId === product.id).length,
          )
        }
      }
    }
  })
})
