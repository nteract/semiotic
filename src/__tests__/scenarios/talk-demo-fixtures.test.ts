import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { bandFromAge } from "../../components/ai/annotationProvenance"
import type { ConversationArcEvent } from "../../components/ai/conversationArc"
import { prepareChart } from "../../components/ai/generativeChart"
import { suggestCharts } from "../../components/ai/suggestCharts"
import { renderChartWithEvidence } from "../../components/server/renderToStaticSVG"

const FIXTURE_ROOT = join(process.cwd(), "docs/public/talk-demo-fixtures")

function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURE_ROOT, name), "utf8")) as T
}

function stringsIn(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(stringsIn)
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(stringsIn)
  }
  return []
}

describe("talk demo offline fixtures", () => {
  it("contains the Stage C recovery arc's refusal, proof, scale, audience, variant, and grounding beats", () => {
    const events = readFixture<ConversationArcEvent[]>("conference-arc.json")
    const types = events.map(({ type }) => type)

    expect(types).toContain("proposal-refused")
    expect(types.filter((type) => type === "render-evidence")).toHaveLength(2)
    expect(types).toContain("audience-set")
    expect(types).toContain("interrogation-asked")
    expect(types).toContain("interrogation-answered")
    expect(types).toContain("nav-node-focused")
    expect(
      events.some(
        (event) =>
          event.type === "chart-edited" &&
          event.meta?.beat === "scale"
      )
    ).toBe(true)
    expect(
      events.some(
        (event) =>
          event.type === "chart-replaced" &&
          event.reason === "variant-discovery"
      )
    ).toBe(true)
    const groundingAnswer = events.find(
      (event): event is Extract<
        ConversationArcEvent,
        { type: "interrogation-answered" }
      > => event.type === "interrogation-answered"
    )
    expect(groundingAnswer).toMatchObject({
      meta: {
        source: "offline-grounding-replay",
        pixelsSeen: false,
      },
    })
    expect(groundingAnswer?.latencyMs ?? 0).toBeGreaterThan(0)
    expect(events.map(({ timestamp }) => timestamp)).toEqual(
      events.map(({ timestamp }) => timestamp).slice().sort((a, b) => a - b)
    )
  })

  it("pins the recovery arc's refusal, suggestions, and proof beats to engine output", () => {
    const events = readFixture<ConversationArcEvent[]>("conference-arc.json")
    const fixture = readFixture<{
      data: Array<Record<string, string | number>>
      categoryAccessor: string
      valueAccessor: string
    }>("bimodal-latency.json")

    const refused = events.find(({ type }) => type === "proposal-refused")
    expect(refused?.type).toBe("proposal-refused")
    if (!refused || refused.type !== "proposal-refused") return

    const prepared = prepareChart(
      {
        component: "Scatterplot",
        props: {
          data: fixture.data,
          xAccessor: fixture.categoryAccessor,
          yAccessor: fixture.valueAccessor,
        },
      },
      { data: fixture.data }
    )
    expect(prepared.ok).toBe(false)
    expect(refused.codes).toEqual(
      prepared.diagnostics
        .filter(({ severity }) => severity === "error")
        .map(({ code }) => code)
    )
    expect(refused.alternatives).toEqual(
      prepared.repair?.status === "alternative"
        ? prepared.repair.alternatives.map(({ component }) => component)
        : []
    )

    const shown = events.find(({ type }) => type === "suggestion-shown")
    expect(shown?.type).toBe("suggestion-shown")
    if (!shown || shown.type !== "suggestion-shown") return
    const suggestions = suggestCharts(fixture.data, {
      intent: ["distribution", "compare-categories"],
      includeVariants: false,
      maxResults: shown.components.length,
    })
    expect(shown.components).toEqual(
      suggestions.map(({ component }) => component)
    )
    expect(shown.topScore).toBe(suggestions[0]?.score)
    expect(shown.audience).toBe("general")

    const evidenceEvents = events.filter(
      (event): event is Extract<ConversationArcEvent, { type: "render-evidence" }> =>
        event.type === "render-evidence"
    )
    for (const event of evidenceEvents) {
      const { evidence } = renderChartWithEvidence(
        event.component as Parameters<typeof renderChartWithEvidence>[0],
        {
          data: fixture.data,
          categoryAccessor: fixture.categoryAccessor,
          valueAccessor: fixture.valueAccessor,
          width: 700,
          height: 320,
          ...(event.component === "RidgelinePlot"
            ? { bins: 40, amplitude: 1.5 }
            : {}),
        }
      )
      expect(event).toMatchObject({
        markCount: evidence.markCount,
        empty: evidence.empty,
        warnings: evidence.warnings,
      })
    }
  })

  it("pins accepted and refused trust-loop proposals", () => {
    const fixture = readFixture<{
      data: Array<Record<string, string | number>>
      proposals: Array<{
        label: string
        input: { component: string; props: Record<string, unknown> }
        expected: "accepted" | "refused"
      }>
    }>("trust-loop-proposals.json")

    expect(fixture.data).toHaveLength(4)
    expect(fixture.proposals.filter(({ expected }) => expected === "accepted")).toHaveLength(1)
    expect(fixture.proposals.filter(({ expected }) => expected === "refused")).toHaveLength(3)
    for (const proposal of fixture.proposals) {
      const result = prepareChart(
        {
          ...proposal.input,
          props: { ...proposal.input.props, data: fixture.data },
        },
        { data: fixture.data }
      )
      expect(result.ok, proposal.label).toBe(proposal.expected === "accepted")
    }
  })

  it("pins a bimodal model assessment and the full stale-note lifecycle", () => {
    const bimodal = readFixture<{
      modelAssessment: { shape: string }
      data: Array<{ service: string; latencyMs: number }>
    }>("bimodal-latency.json")
    const stale = readFixture<{
      stream: {
        tickMs: number
        annotationTtlMs: number
        annotationIndex: number
        values: number[]
      }
    }>("stale-notes.json")

    expect(bimodal.modelAssessment.shape).toBe("bimodal")
    expect(new Set(bimodal.data.map(({ service }) => service))).toEqual(
      new Set(["ingest", "query", "export"])
    )
    expect(stale.stream.values.length).toBeGreaterThan(stale.stream.annotationIndex + 6)
    expect(
      [0, 2, 3, 6].map(
        (ticks) =>
          bandFromAge(
            ticks * stale.stream.tickMs,
            stale.stream.annotationTtlMs
          )
      )
    ).toEqual(["fresh", "aging", "stale", "expired"])
  })

  it("contains no external request target in any JSON packet", () => {
    const fixtures = [
      "conference-arc.json",
      "trust-loop-proposals.json",
      "bimodal-latency.json",
      "stale-notes.json",
    ].map((name) => readFixture<unknown>(name))

    expect(
      stringsIn(fixtures).filter((value) => /^(?:https?|wss?):\/\//i.test(value))
    ).toEqual([])
  })
})
