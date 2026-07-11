import { readFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import Ajv2020 from "ajv/dist/2020.js"
import { describe, expect, it } from "vitest"
import { fromVegaLite, fromVegaLiteResult } from "../fromVegaLite"
import type { VegaLiteSpec } from "../fromVegaLite"
import {
  IDID_SPEC_VERSION,
  validatePortableAnnotation,
  validatePortableAudienceProfile,
  validatePortableCapability,
} from "./spec"
import {
  attachIDID,
  attachIDIDAnnotations,
  readIDID,
  readIDIDAnnotations,
  toVegaLite,
  toVegaLiteResult,
} from "./vegaLite"

function loadSchema(name: string): any {
  // vitest runs with cwd at the repo root, where /spec lives.
  const path = join(process.cwd(), "spec", "v0.1", name)
  return JSON.parse(readFileSync(path, "utf8"))
}

function createSchemaValidator() {
  const Constructor = (Ajv2020 as any).default ?? Ajv2020
  return new Constructor({ strict: false, allErrors: true, validateFormats: false })
}

// ── Published schemas: structure + sync with the runtime surface ─────────────

describe("published JSON Schemas (/spec/v0.1)", () => {
  const capability = loadSchema("chart-capability.schema.json")
  const audience = loadSchema("audience-profile.schema.json")
  const annotation = loadSchema("annotation-provenance.schema.json")

  it("declare the v0.1 spec ids and draft", () => {
    for (const schema of [capability, audience, annotation]) {
      expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
      expect(schema.$id).toMatch(/^https:\/\/semiotic\.dev\/spec\/v0\.1\//)
    }
  })

  it("compile as Draft 2020-12 schemas", () => {
    const ajv = createSchemaValidator()
    for (const schema of [capability, audience, annotation]) {
      expect(ajv.validateSchema(schema)).toBe(true)
      expect(() => ajv.compile(schema)).not.toThrow()
    }
  })

  it("agree with IDID_SPEC_VERSION on the declared specVersion const", () => {
    expect(IDID_SPEC_VERSION).toBe("0.1")
    expect(capability.properties.specVersion.const).toBe(IDID_SPEC_VERSION)
    expect(audience.properties.specVersion.const).toBe(IDID_SPEC_VERSION)
  })

  it("require the same fields the runtime validator requires (capability)", () => {
    expect(capability.required).toEqual(["component", "rubric"])
    // Validator and schema must agree: a doc missing these is invalid in both.
    expect(validatePortableCapability({ rubric: { familiarity: 5, accuracy: 5, precision: 4 } }).valid).toBe(false)
    expect(validatePortableCapability({ component: "BarChart" }).valid).toBe(false)
  })

  it("expose the 13 built-in intents and the closed lifecycle unions", () => {
    expect(capability.$defs.intentId.examples).toHaveLength(13)
    expect(annotation.$defs.lifecycle.properties.freshness.enum).toEqual([
      "fresh",
      "aging",
      "stale",
      "expired",
    ])
    expect(annotation.$defs.lifecycle.properties.status.enum).toEqual([
      "proposed",
      "accepted",
      "disputed",
      "retracted",
    ])
    expect(annotation.$defs.lifecycle.properties.anchor.enum).toEqual([
      "fixed",
      "latest",
      "sticky",
      "semantic",
    ])
  })

  it("label every domain field with x-idid-status", () => {
    const statuses = new Set(["shipped", "proposed", "spec"])
    const walk = (node: any) => {
      if (node && typeof node === "object") {
        if (node["x-idid-status"]) expect(statuses.has(node["x-idid-status"])).toBe(true)
        for (const v of Object.values(node)) walk(v)
      }
    }
    ;[capability, audience, annotation].forEach(walk)
  })

  it("agrees with runtime validators on scalar constraints", () => {
    const cases = [
      {
        schema: capability,
        validate: validatePortableCapability,
        values: [
          { component: "BarChart", rubric: { familiarity: 5, accuracy: 4, precision: 3 } },
          { component: "BarChart", rubric: { familiarity: 1.5, accuracy: 4, precision: 3 } },
          { component: "", rubric: { familiarity: 5, accuracy: 4, precision: 3 } },
          { component: "BarChart", rubric: { familiarity: 5, accuracy: 4, precision: 3 }, intentScores: { rank: 5.1 } },
        ],
      },
      {
        schema: audience,
        validate: validatePortableAudienceProfile,
        values: [
          { familiarity: { BarChart: 4 }, targets: { PieChart: { direction: "increase", weight: 2 } } },
          { familiarity: { BarChart: 4.5 } },
          { targets: { PieChart: { direction: "increase", weight: 1.5 } } },
          { exposureLevel: 1.5 },
        ],
      },
      {
        schema: annotation,
        validate: validatePortableAnnotation,
        values: [
          { provenance: { confidence: 0.7 }, lifecycle: { status: "accepted", ttlHint: "P7D" } },
          { provenance: { confidence: 1.1 } },
          { lifecycle: { status: "unknown" } },
        ],
      },
    ]

    for (const { schema, validate, values } of cases) {
      const ajv = createSchemaValidator()
      const validateSchema = ajv.compile(schema)
      for (const value of values) {
        expect(validate(value).valid).toBe(validateSchema(value))
      }
    }
  })
})

// ── Validators ───────────────────────────────────────────────────────────────

describe("validatePortableCapability", () => {
  it("accepts a well-formed capability", () => {
    const result = validatePortableCapability({
      component: "BarChart",
      family: "ordinal",
      rubric: { familiarity: 5, accuracy: 5, precision: 4 },
      intentScores: { "compare-categories": 5, rank: 4 },
      variants: [{ key: "sorted", label: "Sorted", intentDeltas: { rank: 1 } }],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("rejects out-of-range rubric and intent scores", () => {
    const result = validatePortableCapability({
      component: "BarChart",
      rubric: { familiarity: 9, accuracy: 5, precision: 4 },
      intentScores: { rank: 7 },
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("rubric.familiarity"),
        expect.stringContaining("intentScores.rank"),
      ])
    )
  })

  it("rejects a variant missing key/label", () => {
    const result = validatePortableCapability({
      component: "BarChart",
      rubric: { familiarity: 5, accuracy: 5, precision: 4 },
      variants: [{ label: "no key" } as any],
    })
    expect(result.valid).toBe(false)
  })

  it("rejects fractional rubric axes required to be integers by the schema", () => {
    expect(validatePortableCapability({
      component: "BarChart",
      rubric: { familiarity: 4.5, accuracy: 5, precision: 4 },
    }).valid).toBe(false)
  })
})

describe("validatePortableAudienceProfile", () => {
  it("accepts a well-formed profile", () => {
    expect(
      validatePortableAudienceProfile({
        name: "Exec review",
        familiarity: { BoxPlot: 2, BarChart: 5 },
        targets: { PieChart: { direction: "decrease", weight: 1 } },
        exposureLevel: 1,
        receptionModality: "visual",
      }).valid
    ).toBe(true)
  })

  it("rejects bad direction, weight, exposure, modality", () => {
    expect(validatePortableAudienceProfile({ targets: { X: { direction: "up" } as any } }).valid).toBe(false)
    expect(validatePortableAudienceProfile({ targets: { X: { direction: "increase", weight: 9 } } }).valid).toBe(false)
    expect(validatePortableAudienceProfile({ exposureLevel: 5 as any }).valid).toBe(false)
    expect(validatePortableAudienceProfile({ receptionModality: "telepathy" as any }).valid).toBe(false)
  })

  it("rejects fractional familiarity and target weights", () => {
    expect(validatePortableAudienceProfile({ familiarity: { BarChart: 2.5 } }).valid).toBe(false)
    expect(validatePortableAudienceProfile({ targets: { BarChart: { direction: "increase", weight: 1.5 } } }).valid).toBe(false)
  })
})

describe("validatePortableAnnotation", () => {
  it("accepts well-formed provenance + lifecycle", () => {
    expect(
      validatePortableAnnotation({
        type: "y-threshold",
        value: 1000,
        provenance: { source: "ai", basis: "statistical-test", confidence: 0.7, createdAt: "2026-06-20T14:00:00Z" },
        lifecycle: { ttlHint: "P7D", status: "proposed", anchor: "semantic" },
      }).valid
    ).toBe(true)
  })

  it("rejects bad confidence, createdAt, and closed-union values", () => {
    expect(validatePortableAnnotation({ provenance: { confidence: 2 } }).valid).toBe(false)
    expect(validatePortableAnnotation({ provenance: { createdAt: "last tuesday" } }).valid).toBe(false)
    expect(validatePortableAnnotation({ lifecycle: { freshness: "ancient" as any } }).valid).toBe(false)
    expect(validatePortableAnnotation({ lifecycle: { status: "maybe" as any } }).valid).toBe(false)
    expect(validatePortableAnnotation({ lifecycle: { anchor: "drifting" as any } }).valid).toBe(false)
  })

  it("preserves open-union source/basis strings (no false rejection)", () => {
    expect(validatePortableAnnotation({ provenance: { source: "my-pipeline", basis: "forecast" } }).valid).toBe(true)
  })
})

// ── Vega-Lite round-trips (fromVegaLite ↔ toVegaLite) ────────────────────────

describe("toVegaLite round-trips with fromVegaLite", () => {
  const cases: Array<{ name: string; spec: VegaLiteSpec; markType: string }> = [
    {
      name: "bar",
      markType: "bar",
      spec: {
        mark: "bar",
        data: { values: [{ cat: "A", val: 28 }, { cat: "B", val: 55 }] },
        encoding: {
          x: { field: "cat", type: "nominal" },
          y: { field: "val", type: "quantitative" },
        },
      },
    },
    {
      name: "stacked bar",
      markType: "bar",
      spec: {
        mark: "bar",
        data: { values: [{ cat: "A", series: "x", val: 1 }, { cat: "A", series: "y", val: 2 }] },
        encoding: {
          x: { field: "cat", type: "nominal" },
          y: { field: "val", type: "quantitative" },
          color: { field: "series", type: "nominal" },
        },
      },
    },
    {
      name: "line",
      markType: "line",
      spec: {
        mark: "line",
        data: { values: [{ t: 1, v: 10 }, { t: 2, v: 20 }] },
        encoding: {
          x: { field: "t", type: "quantitative" },
          y: { field: "v", type: "quantitative" },
        },
      },
    },
    {
      name: "scatter",
      markType: "point",
      spec: {
        mark: "point",
        data: { values: [{ x: 1, y: 2 }, { x: 3, y: 4 }] },
        encoding: {
          x: { field: "x", type: "quantitative" },
          y: { field: "y", type: "quantitative" },
        },
      },
    },
    {
      name: "pie",
      markType: "arc",
      spec: {
        mark: "arc",
        data: { values: [{ label: "A", amount: 30 }, { label: "B", amount: 70 }] },
        encoding: {
          theta: { field: "amount", type: "quantitative" },
          color: { field: "label", type: "nominal" },
        },
      },
    },
  ]

  for (const { name, spec, markType } of cases) {
    it(`preserves mark, accessors, and data through ${name} round-trip`, () => {
      const config = fromVegaLite(spec)
      const back = toVegaLite(config)
      expect(back).toBeDefined()
      const supportedBack = back!
      const backMark = typeof supportedBack.mark === "string" ? supportedBack.mark : supportedBack.mark.type
      expect(backMark).toBe(markType)
      // Data survives the round trip unchanged.
      expect(supportedBack.data?.values).toEqual(spec.data!.values)
      // Field references survive (the chart still reads the same columns).
      const originalFields = collectFields(spec.encoding)
      const roundTripFields = collectFields(supportedBack.encoding)
      for (const f of originalFields) {
        expect(roundTripFields).toContain(f)
      }
    })
  }

  it("carries title/width/height onto the spec", () => {
    const config = fromVegaLite({
      mark: "bar",
      title: "Q3 sales",
      width: 500,
      height: 300,
      data: { values: [{ cat: "A", val: 1 }] },
      encoding: { x: { field: "cat", type: "nominal" }, y: { field: "val", type: "quantitative" } },
    })
    const back = toVegaLite(config)
    expect(back).toBeDefined()
    expect(back!.title).toBe("Q3 sales")
    expect(back!.width).toBe(500)
    expect(back!.height).toBe(300)
  })

  it("refuses unsupported components instead of emitting a point placeholder", () => {
    const input = {
      component: "SankeyDiagram",
      props: { nodes: [], edges: [] },
      version: "1",
      createdAt: new Date().toISOString(),
    }
    const result = toVegaLiteResult(input)
    expect(result.status).toBe("refused")
    expect(result.spec).toBeUndefined()
    expect(result.diagnostics[0]).toMatchObject({ code: "UNSUPPORTED_COMPONENT", severity: "error" })
    expect(toVegaLite(input)).toBeUndefined()
  })

  it("requires an explicit opt-in for known grouped-bar loss", () => {
    const input = {
      component: "GroupedBarChart",
      props: { categoryAccessor: "category", valueAccessor: "value", groupBy: "group" },
      version: "1",
      createdAt: new Date().toISOString(),
    }
    expect(toVegaLiteResult(input).status).toBe("refused")
    const lossy = toVegaLiteResult(input, { allowLossy: true })
    expect(lossy.status).toBe("lossy")
    expect(lossy.spec?.mark).toBe("bar")
    expect(lossy.lossReport[0]?.code).toBe("GROUPED_BAR_APPROXIMATION")
  })

  it("refuses function accessors instead of placing runtime values in a wire spec", () => {
    const result = toVegaLiteResult({
      component: "LineChart",
      props: { xAccessor: (d: { x: number }) => d.x, yAccessor: "value" },
      version: "1",
      createdAt: new Date().toISOString(),
    })
    expect(result.status).toBe("refused")
    expect(result.spec).toBeUndefined()
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNSERIALIZABLE_ACCESSOR", path: "/props/xAccessor" }),
    ]))
  })
})

function collectFields(encoding?: Record<string, { field?: string }>): string[] {
  if (!encoding) return []
  return Object.values(encoding)
    .map((e) => e.field)
    .filter((f): f is string => typeof f === "string")
}

// ── IDID-over-Vega-Lite binding ──────────────────────────────────────────────

describe("attachIDID / readIDID", () => {
  it("round-trips capability + audience under usermeta.idid", () => {
    const spec: VegaLiteSpec = { mark: "bar", encoding: {} }
    const capability = {
      component: "BarChart",
      rubric: { familiarity: 5, accuracy: 5, precision: 4 },
      intentScores: { "compare-categories": 5 },
    }
    const audience = { name: "Exec", receptionModality: "visual" as const }
    const enriched = attachIDID(spec, { capability, audience })
    const meta = readIDID(enriched)
    expect(meta?.specVersion).toBe(IDID_SPEC_VERSION)
    expect(meta?.capability).toEqual(capability)
    expect(meta?.audience).toEqual(audience)
    // The original spec still renders as ordinary Vega-Lite.
    expect(enriched.mark).toBe("bar")
    // Input not mutated.
    expect((spec as any).usermeta).toBeUndefined()
  })

  it("returns undefined when no IDID metadata is present", () => {
    expect(readIDID({ mark: "bar" })).toBeUndefined()
  })
})

describe("attachIDIDAnnotations / readIDIDAnnotations", () => {
  const annotations = [
    {
      type: "y-threshold",
      value: 1000,
      label: "SLA floor",
      provenance: { source: "ai", basis: "rule", confidence: 0.7, createdAt: "2026-06-20T14:00:00Z" },
      lifecycle: { ttlHint: "P7D", status: "proposed" as const, anchor: "semantic" as const },
    },
  ]

  it("round-trips annotations verbatim and emits a courtesy mark", () => {
    const spec: VegaLiteSpec = {
      mark: "line",
      data: { values: [{ t: 1, v: 1 }] },
      encoding: { x: { field: "t" }, y: { field: "v" } },
    }
    const enriched = attachIDIDAnnotations(spec, annotations)
    expect(readIDIDAnnotations(enriched)).toEqual(annotations)
    // A representable threshold produced a layered spec with a rule mark.
    const layers = (enriched as any).layer
    expect(Array.isArray(layers)).toBe(true)
    const ruleLayer = layers.find((l: any) => l.usermeta?.idid?.role === "annotation-layer")
    expect(ruleLayer.mark).toBe("rule")
  })

  it("composes with attachIDID metadata under the same key", () => {
    const spec = attachIDID({ mark: "line", encoding: {} }, {
      capability: { component: "LineChart", rubric: { familiarity: 5, accuracy: 4, precision: 3 } },
    })
    const enriched = attachIDIDAnnotations(spec, annotations)
    const meta = readIDID(enriched)
    expect(meta?.capability?.component).toBe("LineChart")
    expect(meta?.annotations).toEqual(annotations)
  })

  it("preserves annotations when descriptor metadata is attached second", () => {
    const withAnnotations = attachIDIDAnnotations({ mark: "line", encoding: {} }, annotations)
    const enriched = attachIDID(withAnnotations, {
      capability: { component: "LineChart", rubric: { familiarity: 5, accuracy: 4, precision: 3 } },
    })
    expect(readIDIDAnnotations(enriched)).toEqual(annotations)
    expect(readIDID(enriched)?.capability?.component).toBe("LineChart")
  })

  it("adds no empty layer when no annotation is representable", () => {
    const spec: VegaLiteSpec = { mark: "line", encoding: {} }
    const enriched = attachIDIDAnnotations(spec, [
      { provenance: { source: "user" } }, // no type → no courtesy mark
    ])
    expect((enriched as any).layer).toBeUndefined()
    expect(enriched.mark).toBe("line")
    expect(readIDIDAnnotations(enriched)).toHaveLength(1)
  })

  it("does not mutate the input spec", () => {
    const spec: VegaLiteSpec = { mark: "line", encoding: {} }
    attachIDIDAnnotations(spec, annotations)
    expect((spec as any).usermeta).toBeUndefined()
    expect((spec as any).layer).toBeUndefined()
  })
})

describe("strict Vega-Lite import", () => {
  const base: VegaLiteSpec = {
    mark: "line",
    data: { values: [{ t: 1, value: 3 }, { t: 2, value: 5 }] },
    encoding: {
      x: { field: "t", type: "quantitative" },
      y: { field: "value", type: "quantitative" },
    },
  }
  const annotations = [{
    type: "y-threshold",
    value: 4,
    provenance: { source: "rule", stableId: "threshold-4" },
  }]

  it("recovers the base chart from an IDID-enriched annotation layer", () => {
    const enriched = attachIDIDAnnotations(
      attachIDID(base, { capability: { component: "LineChart", rubric: { familiarity: 5, accuracy: 4, precision: 3 } } }),
      annotations,
    )

    expect(() => fromVegaLite(enriched)).not.toThrow()
    const legacy = fromVegaLite(enriched)
    expect(legacy.component).toBe("LineChart")
    expect(legacy.props.data).toEqual(base.data?.values)
    expect(legacy.props.xAccessor).toBe("t")
    expect(legacy.props.yAccessor).toBe("value")

    const result = fromVegaLiteResult(enriched)
    expect(result.status).toBe("success")
    expect(result.config?.component).toBe("LineChart")
    expect(result.provenance.metadata?.idid).toMatchObject({ annotations })
  })

  it("refuses arbitrary layered composition rather than guessing a base view", () => {
    const result = fromVegaLiteResult({
      mark: "line",
      layer: [base, { mark: "point" }],
    } as VegaLiteSpec)
    expect(result.status).toBe("refused")
    expect(result.config).toBeUndefined()
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNSUPPORTED_COMPOSITION", severity: "error" }),
    ]))
  })

  it("can expose legacy fallback behavior only through an explicit lossy mode", () => {
    const result = fromVegaLiteResult({ mark: "geoshape" } as VegaLiteSpec, { mode: "lossy" })
    expect(result.status).toBe("lossy")
    expect(result.config?.component).toBe("Scatterplot")
    expect(result.lossReport[0]?.code).toBe("UNSUPPORTED_MARK")
  })
})

// ── Standalone library-neutral binding (/spec/bindings/vega-lite.mjs) ────────

describe("standalone /spec/bindings/vega-lite.mjs", () => {
  const load = () =>
    import(pathToFileURL(join(process.cwd(), "spec", "bindings", "vega-lite.mjs")).href)

  const capability = {
    component: "BarChart",
    rubric: { familiarity: 5, accuracy: 5, precision: 4 },
    intentScores: { "compare-categories": 5 },
  }
  const audience = { name: "Exec", receptionModality: "visual" as const }
  const note = {
    type: "y-threshold",
    value: 1000,
    label: "SLA",
    provenance: { source: "ai", basis: "rule", confidence: 0.7 },
    lifecycle: { ttlHint: "P7D", status: "proposed" as const },
  }

  it("round-trips capability/audience and annotations with no Semiotic import", async () => {
    const m = await load()
    const enriched = m.attachIdidAnnotations(
      m.attachIdid({ mark: "bar", encoding: {} }, { capability, audience }),
      [note],
    )
    const idid = m.readIdid(enriched)
    expect(idid.specVersion).toBe(IDID_SPEC_VERSION)
    expect(idid.capability).toEqual(capability)
    expect(idid.audience).toEqual(audience)
    expect(m.readIdidAnnotations(enriched)).toEqual([note])
    expect(m.suggestionInputFromSpec(enriched)).toEqual({ capability, audience })
  })

  it("is byte-compatible with the Semiotic TypeScript binding", async () => {
    const m = await load()
    const base: VegaLiteSpec = { mark: "bar", encoding: {} }
    expect(m.attachIdid(base, { capability, audience })).toEqual(
      attachIDID(base, { capability, audience }),
    )
    expect(m.IDID_SPEC_VERSION).toBe(IDID_SPEC_VERSION)
    // Annotation metadata reads identically across the two implementations.
    const a = m.attachIdidAnnotations(base, [note])
    expect(readIDIDAnnotations(a as VegaLiteSpec)).toEqual([note])

    const standaloneReverse = m.attachIdid(
      m.attachIdidAnnotations(base, [note]),
      { capability, audience },
    )
    const semioticReverse = attachIDID(
      attachIDIDAnnotations(base, [note]),
      { capability, audience },
    )
    expect(standaloneReverse).toEqual(semioticReverse)
    expect(m.readIdidAnnotations(standaloneReverse)).toEqual([note])
  })
})
