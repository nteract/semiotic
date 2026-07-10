import { describe, it, expect } from "vitest"
import { diagnoseConfig } from "./diagnoseConfig"
import type { Datum } from "./datumTypes"

describe("diagnoseConfig", () => {
  it("returns ok for a valid configuration", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
      xAccessor: "x",
      yAccessor: "y",
      title: "Revenue over time",
    })
    expect(result.ok).toBe(true)
    expect(result.diagnoses).toHaveLength(0)
  })

  it("detects empty data array", () => {
    const result = diagnoseConfig("LineChart", {
      data: [],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("EMPTY_DATA")
    expect(result.ok).toBe(false)
  })

  it("allows mechanical PhysicsPileChart without data", () => {
    const result = diagnoseConfig("PhysicsPileChart", {
      mode: "mechanical",
      mechanicalCount: 48,
      mechanicalCategories: ["Backlog", "Active", "Done"],
      title: "Mechanical pile",
    })
    expect(result.ok).toBe(true)
    expect(result.diagnoses).toHaveLength(0)
  })

  it("rejects unusable mechanical PhysicsPileChart settings", () => {
    const result = diagnoseConfig("PhysicsPileChart", {
      mode: "mechanical",
      mechanicalCount: 0,
      mechanicalCategories: [],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("PHYSICS_BAD_MECHANICAL_COUNT")
    expect(codes).toContain("PHYSICS_EMPTY_MECHANICAL_CATEGORIES")
    expect(result.ok).toBe(false)
  })

  it("flags missing data for accessor-only charts not listing data in required (C2)", () => {
    // CandlestickChart lists highAccessor/lowAccessor (not "data") in required,
    // so a dataless static config used to pass as OK and render blank.
    // diagnoseConfig merges validateProps, which now emits the data
    // requirement; the MCP/CLI usageMode filter keeps it in static and drops it
    // in push (see ai-behavior-contracts dataRequiredForUsageMode tests).
    const result = diagnoseConfig("CandlestickChart", {
      xAccessor: "day",
      highAccessor: "high",
      lowAccessor: "low",
    })
    expect(result.ok).toBe(false)
    expect(result.diagnoses.map(d => d.message)).toContain('"data" is required for CandlestickChart.')
  })

  it("warns on an unrecognized colorScheme name but not a known scheme or an array", () => {
    const base = { data: [{ category: "A", value: 1 }], categoryAccessor: "category", valueAccessor: "value" }
    const typo = diagnoseConfig("BarChart", { ...base, colorScheme: "viridisx" })
    expect(typo.diagnoses.map(d => d.code)).toContain("UNKNOWN_COLOR_SCHEME")

    const known = diagnoseConfig("BarChart", { ...base, colorScheme: "tableau10" })
    expect(known.diagnoses.map(d => d.code)).not.toContain("UNKNOWN_COLOR_SCHEME")

    const array = diagnoseConfig("BarChart", { ...base, colorScheme: ["#111", "#222"] })
    expect(array.diagnoses.map(d => d.code)).not.toContain("UNKNOWN_COLOR_SCHEME")
  })

  it("does not second-guess Heatmap's enum-validated colorScheme", () => {
    // Heatmap has its own colorScheme enum (incl. "custom") validated by
    // validateProps; the diagnoseConfig warning must not contradict it.
    const result = diagnoseConfig("Heatmap", {
      data: [{ x: "a", y: "b", value: 1 }],
      xAccessor: "x", yAccessor: "y", valueAccessor: "value",
      colorScheme: "custom",
    })
    expect(result.diagnoses.map(d => d.code)).not.toContain("UNKNOWN_COLOR_SCHEME")
  })

  it("recognizes every COLOR_SCHEMES name (KNOWN_COLOR_SCHEMES drift guard)", async () => {
    const { COLOR_SCHEMES } = await import("./colorUtils")
    const base = { data: [{ category: "A", value: 1 }], categoryAccessor: "category", valueAccessor: "value" }
    for (const name of Object.keys(COLOR_SCHEMES)) {
      const result = diagnoseConfig("BarChart", { ...base, colorScheme: name })
      expect(result.diagnoses.map(d => d.code)).not.toContain("UNKNOWN_COLOR_SCHEME")
    }
  })

  it("detects bad width", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      width: 0,
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("BAD_WIDTH")
  })

  it("detects accessor field not in data", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ name: "A", count: 10 }],
      categoryAccessor: "category",
      valueAccessor: "count",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("ACCESSOR_MISSING")
    // Should mention available fields
    const msg = result.diagnoses.find(d => d.code === "ACCESSOR_MISSING")!.message
    expect(msg).toContain("name")
    expect(msg).toContain("count")
  })

  it("detects hierarchy data as flat array", () => {
    const result = diagnoseConfig("Treemap", {
      data: [{ name: "A", value: 10 }],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("HIERARCHY_FLAT_ARRAY")
  })

  it("detects margin overflow", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      width: 200,
      margin: { left: 100, right: 120, top: 10, bottom: 10 },
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("MARGIN_OVERFLOW_H")
  })

  it("warns about linkedHover without selection", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      linkedHover: { name: "hl", fields: ["region"] },
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("LINKED_HOVER_NO_SELECTION")
    // This is a warning, not error — ok should still be true if no errors
    const warnings = result.diagnoses.filter(d => d.severity === "warning")
    expect(warnings.length).toBeGreaterThan(0)
  })

  it("includes tokenEncoding diagnostics when a config declares semantic tokens", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ category: "A", value: 3 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      tokenEncoding: {
        tokenType: "glyph",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized",
      },
    })

    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("TOKEN_MISSING_UNIT_VALUE")
    expect(codes).toContain("TOKEN_MISSING_UNIT_MEANING")
    expect(result.ok).toBe(true)
  })

  it("uses maxTokens as a visible token estimate for capped token encodings", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ category: "A", value: 3 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "Token chart",
      tokenEncoding: {
        tokenType: "glyph",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized",
        unitValue: 1,
        unitMeaning: "one sign = one unit",
        maxTokens: 120,
      },
    })

    expect(result.diagnoses.map(d => d.code)).toContain("TOKEN_TOO_MANY_VISIBLE_TOKENS")
  })

  it("points token diagnostic fixes at encoding when that is the source field", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ category: "A", value: 3 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "Token chart",
      encoding: {
        tokenType: "glyph",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized",
      },
    })

    expect(
      result.diagnoses.find(d => d.code === "TOKEN_MISSING_UNIT_VALUE")?.fix
    ).toBe("Set encoding.unitValue to the value represented by one full token.")
  })

  it("includes validation errors from validateProps", () => {
    const result = diagnoseConfig("FakeComponent", { data: [] })
    expect(result.ok).toBe(false)
    expect(result.diagnoses[0].code).toBe("VALIDATION")
    expect(result.diagnoses[0].message).toContain("Unknown component")
  })

  it("warns about non-zero baseline in bar charts", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ category: "A", value: 50 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      rExtent: [10, 100],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("NON_ZERO_BASELINE")
    const diag = result.diagnoses.find(d => d.code === "NON_ZERO_BASELINE")!
    expect(diag.severity).toBe("warning")
  })

  it("warns about non-zero baseline set through the ordinal valueExtent prop", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ category: "A", value: 94 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      valueExtent: [90, 98],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("NON_ZERO_BASELINE")
    expect(codes).not.toContain("VALIDATION")
  })

  it("does not warn about non-zero baseline for LineChart", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      rExtent: [10, 100],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("NON_ZERO_BASELINE")
  })

  it("does not warn when baseline is zero", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ category: "A", value: 50 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      rExtent: [0, 100],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("NON_ZERO_BASELINE")
  })

  it("warns about data gaps in LineChart", () => {
    const result = diagnoseConfig("LineChart", {
      data: [
        { x: 1, y: 10 },
        { x: 2, y: null },
        { x: 3, y: 30 },
      ],
      xAccessor: "x",
      yAccessor: "y",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("DATA_GAPS")
    const diag = result.diagnoses.find(d => d.code === "DATA_GAPS")!
    expect(diag.severity).toBe("warning")
  })

  it("does not warn about data gaps when gapStrategy is set", () => {
    const result = diagnoseConfig("LineChart", {
      data: [
        { x: 1, y: 10 },
        { x: 2, y: null },
        { x: 3, y: 30 },
      ],
      xAccessor: "x",
      yAccessor: "y",
      gapStrategy: "break",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("DATA_GAPS")
  })

  it("does not warn about data gaps in BarChart", () => {
    const result = diagnoseConfig("BarChart", {
      data: [
        { category: "A", value: 10 },
        { category: "B", value: null },
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("DATA_GAPS")
  })

  it("detects degenerate extent", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: "not a number" }, { x: 2, y: undefined }],
      xAccessor: "x",
      yAccessor: "y",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("DEGENERATE_EXTENT")
    const diag = result.diagnoses.find(d => d.code === "DEGENERATE_EXTENT")!
    expect(diag.severity).toBe("error")
  })

  it("detects invisible bar padding", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ category: "A", value: 50 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      barPadding: 0.99,
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("BAR_PADDING_INVISIBLE")
    const diag = result.diagnoses.find(d => d.code === "BAR_PADDING_INVISIBLE")!
    expect(diag.severity).toBe("warning")
  })

  it("detects bottom legend with insufficient margin", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      legendPosition: "bottom",
      margin: { bottom: 40 },
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("BOTTOM_MARGIN_WITH_LEGEND")
    const diag = result.diagnoses.find(d => d.code === "BOTTOM_MARGIN_WITH_LEGEND")!
    expect(diag.severity).toBe("warning")
  })

  it("detects tight legend margin", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      showLegend: true,
      margin: { right: 50 },
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("LEGEND_MARGIN_TIGHT")
    const diag = result.diagnoses.find(d => d.code === "LEGEND_MARGIN_TIGHT")!
    expect(diag.severity).toBe("warning")
  })

  it("warns about function accessors", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: (d: Datum) => d.x,
      yAccessor: (d: Datum) => d.y,
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("FUNCTION_ACCESSOR")
    const diag = result.diagnoses.find(d => d.code === "FUNCTION_ACCESSOR")!
    expect(diag.severity).toBe("warning")
    expect(diag.message).toContain("xAccessor")
    expect(diag.message).toContain("yAccessor")
    // ok should still be true since it's only a warning
    expect(result.ok).toBe(true)
  })

  it("does not warn about function accessors when only string accessors used", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("FUNCTION_ACCESSOR")
  })

  it("diagnoses invalid physics chart parameters", () => {
    const galton = diagnoseConfig("GaltonBoardChart", {
      data: [{ value: 1 }],
      valueAccessor: "value",
      bins: 1,
      branchProbability: 1.2,
      mechanicalCount: 0,
    })
    expect(galton.diagnoses.map(d => d.code)).toEqual(
      expect.arrayContaining([
        "PHYSICS_BAD_BINS",
        "PHYSICS_BAD_BRANCH_PROBABILITY",
        "PHYSICS_BAD_MECHANICAL_COUNT",
      ])
    )

    const eventDrop = diagnoseConfig("EventDropChart", {
      data: [{ time: 1, arrivalTime: 1 }],
      timeAccessor: "time",
      arrivalAccessor: "arrivalTime",
      windows: { size: 0 },
      timeScale: 0,
    })
    expect(eventDrop.diagnoses.map(d => d.code)).toEqual(
      expect.arrayContaining([
        "PHYSICS_BAD_WINDOW_SIZE",
        "PHYSICS_BAD_TIME_SCALE",
        "PHYSICS_EVENTDROP_NO_ARRIVAL_SPREAD",
      ])
    )
  })

  it("warns when physics piles exceed the live body budget", () => {
    const result = diagnoseConfig("PhysicsPileChart", {
      data: [{ category: "A", value: 1800 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      unitValue: 1,
    })
    expect(result.diagnoses.map(d => d.code)).toContain("PHYSICS_BODY_BUDGET")
  })

  it("diagnoses invalid collision swarm parameters", () => {
    const result = diagnoseConfig("CollisionSwarmChart", {
      data: Array.from({ length: 13 }, (_, index) => ({
        id: index,
        x: index,
        group: `group-${index}`,
      })),
      xAccessor: "x",
      groupAccessor: "group",
      pointRadius: 0,
      collisionIterations: 0,
      xExtent: ["low"],
    })

    expect(result.diagnoses.map(d => d.code)).toEqual(
      expect.arrayContaining([
        "PHYSICS_BAD_POINT_RADIUS",
        "PHYSICS_BAD_COLLISION_ITERATIONS",
        "PHYSICS_BAD_X_EXTENT",
        "PHYSICS_TOO_MANY_SWARM_LANES",
      ])
    )
  })

  it("diagnoses ProcessFlowChart missing stages and group/absorb mismatch", () => {
    const missing = diagnoseConfig("ProcessFlowChart", {
      data: [{ id: "a", stage: "coding" }],
    })
    expect(missing.diagnoses.map(d => d.code)).toContain("PROCESS_FLOW_MISSING_STAGES")

    const noAbsorb = diagnoseConfig("ProcessFlowChart", {
      data: [{ id: "a", stage: "coding", featureId: "f1" }],
      stages: [{ id: "coding", force: 10 }],
      groupBy: "featureId",
    })
    expect(noAbsorb.diagnoses.map(d => d.code)).toContain("PROCESS_FLOW_GROUP_NO_ABSORB")
  })

  it("warns when physics projection is disabled", () => {
    const result = diagnoseConfig("PhysicsPileChart", {
      data: [{ category: "A", value: 3 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      showProjection: false,
    })
    expect(result.diagnoses.map(d => d.code)).toContain("PHYSICS_NO_PROJECTION")
  })

  it("allows a negative-only GauntletChart without positive properties", () => {
    const result = diagnoseConfig("GauntletChart", {
      data: [{ id: "p1", negatives: ["cost"] }],
      negativeProperties: [{ id: "cost", label: "Cost", load: 1 }],
      title: "Review burden",
    })
    expect(result.ok).toBe(true)
    expect(result.diagnoses.map(d => d.code)).not.toContain(
      "GAUNTLET_MISSING_POSITIVE_PROPERTIES"
    )
  })

  it("warns about a single function accessor among strings", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ category: "A", value: 10 }],
      categoryAccessor: "category",
      valueAccessor: (d: Datum) => d.value,
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("FUNCTION_ACCESSOR")
    const diag = result.diagnoses.find(d => d.code === "FUNCTION_ACCESSOR")!
    expect(diag.message).toContain("valueAccessor")
    expect(diag.message).not.toContain("categoryAccessor")
  })

  it("warns when no title, description, or summary is provided", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("MISSING_DESCRIPTION")
    const diag = result.diagnoses.find(d => d.code === "MISSING_DESCRIPTION")!
    expect(diag.severity).toBe("warning")
  })

  it("does not warn when title is provided", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      title: "Revenue",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("MISSING_DESCRIPTION")
  })

  it("does not warn when description is provided", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      description: "Line chart showing revenue over time",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("MISSING_DESCRIPTION")
  })

  it("warns about low adjacent category contrast", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      title: "Test",
      colorScheme: ["#aaaaaa", "#aaaaab"],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("LOW_ADJACENT_CONTRAST")
  })

  it("does not warn about adjacent contrast with distinguishable colors", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      title: "Test",
      colorScheme: ["#000000", "#ffffff"],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("LOW_ADJACENT_CONTRAST")
  })

  it("detects string accessor on heatmap", () => {
    const result = diagnoseConfig("Heatmap", {
      data: [{ x: "Mon", y: 1, value: 10 }],
      xAccessor: "x",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("HEATMAP_STRING_ACCESSOR")
    const diag = result.diagnoses.find(d => d.code === "HEATMAP_STRING_ACCESSOR")!
    expect(diag.severity).toBe("warning")
  })

  describe("annotation connector necessity", () => {
    const base = { data: [{ x: 1, y: 2 }, { x: 3, y: 4 }], xAccessor: "x", yAccessor: "y", title: "t" }

    it("does not flag default-placed labels/callouts", () => {
      const result = diagnoseConfig("LineChart", {
        ...base,
        annotations: [
          { type: "callout", x: 1, label: "Peak", dx: 30, dy: -30 },
          { type: "label", x: 3, label: "Note" },
        ],
      })
      const codes = result.diagnoses.map(d => d.code)
      expect(codes).not.toContain("ANNOTATION_FAR_NO_CONNECTOR")
      expect(codes).not.toContain("ANNOTATION_LONG_CONNECTOR")
    })

    it("warns on a far note with no connector (text annotation)", () => {
      const result = diagnoseConfig("LineChart", {
        ...base,
        annotations: [{ type: "text", x: 1, y: 2, label: "Floating note", dx: 120, dy: 80 }],
      })
      const diag = result.diagnoses.find(d => d.code === "ANNOTATION_FAR_NO_CONNECTOR")
      expect(diag?.severity).toBe("warning")
      expect(diag?.message).toContain("Floating note")
      // Advisory — warnings don't break ok.
      expect(result.ok).toBe(true)
    })

    it("warns when a callout's connector is disabled and it's placed far", () => {
      const result = diagnoseConfig("LineChart", {
        ...base,
        annotations: [{ type: "callout", x: 1, label: "Detached", dx: 140, dy: 0, disable: ["connector"] }],
      })
      expect(result.diagnoses.map(d => d.code)).toContain("ANNOTATION_FAR_NO_CONNECTOR")
    })

    it("nudges toward adjacency on a very long connector", () => {
      const result = diagnoseConfig("LineChart", {
        ...base,
        annotations: [{ type: "callout", x: 1, label: "Way over there", dx: 260, dy: 60 }],
      })
      const diag = result.diagnoses.find(d => d.code === "ANNOTATION_LONG_CONNECTOR")
      expect(diag?.severity).toBe("warning")
    })
  })

  describe("annotation density (clutter)", () => {
    const base = { data: [{ x: 1, y: 2 }, { x: 3, y: 4 }], xAccessor: "x", yAccessor: "y", title: "t" }
    const notes = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ type: "label", x: 1, label: `n${i}` }))

    it("does not flag a comfortable number of notes", () => {
      const result = diagnoseConfig("LineChart", {
        ...base, width: 600, height: 400, annotations: notes(3),
      })
      expect(result.diagnoses.map(d => d.code)).not.toContain("ANNOTATION_DENSITY")
    })

    it("warns when notes exceed the area-derived budget", () => {
      const result = diagnoseConfig("LineChart", {
        ...base, width: 400, height: 400, annotations: notes(12),
      })
      const diag = result.diagnoses.find(d => d.code === "ANNOTATION_DENSITY")
      expect(diag?.severity).toBe("warning")
      expect(diag?.message).toContain("cluttered")
      // Advisory only — warnings don't fail ok.
      expect(result.ok).toBe(true)
    })

    it("does not count reference lines toward the budget", () => {
      const result = diagnoseConfig("LineChart", {
        ...base,
        width: 400,
        height: 400,
        annotations: [
          ...Array.from({ length: 12 }, (_, i) => ({ type: "y-threshold", value: i })),
          { type: "label", x: 1, label: "only note" },
        ],
      })
      expect(result.diagnoses.map(d => d.code)).not.toContain("ANNOTATION_DENSITY")
    })
  })

  describe("misleading-design checks (deception pack)", () => {
    const trendData = Array.from({ length: 20 }, (_, i) => ({
      x: i + 1,
      y: 50 + i * 2,
    }))
    const trendBase: Datum = {
      data: trendData,
      xAccessor: "x",
      yAccessor: "y",
      title: "Trend",
    }

    describe("INVERTED_AXIS", () => {
      it("flags a descending yExtent", () => {
        const result = diagnoseConfig("LineChart", {
          ...trendBase,
          yExtent: [100, 0],
        })
        const diag = result.diagnoses.find(d => d.code === "INVERTED_AXIS")
        expect(diag).toBeDefined()
        expect(diag?.severity).toBe("warning")
        expect(diag?.message).toContain("inverted")
      })

      it("flags a descending xExtent", () => {
        const result = diagnoseConfig("LineChart", {
          ...trendBase,
          xExtent: [20, 1],
        })
        expect(result.diagnoses.map(d => d.code)).toContain("INVERTED_AXIS")
      })

      it("accepts ascending extents", () => {
        const result = diagnoseConfig("LineChart", {
          ...trendBase,
          yExtent: [0, 100],
        })
        expect(result.diagnoses.map(d => d.code)).not.toContain("INVERTED_AXIS")
      })

      it("ignores partial extents with nulls", () => {
        const result = diagnoseConfig("LineChart", {
          ...trendBase,
          yExtent: [null, 100],
        })
        expect(result.diagnoses.map(d => d.code)).not.toContain("INVERTED_AXIS")
      })
    })

    describe("DUAL_AXIS_UNLABELED", () => {
      const dualData = Array.from({ length: 10 }, (_, i) => ({
        month: i + 1,
        revenue: 100 + i * 10,
        users: 1000 + i * 50,
      }))

      it("flags two-series config with unlabeled series", () => {
        const result = diagnoseConfig("MultiAxisLineChart", {
          data: dualData,
          xAccessor: "month",
          series: [{ yAccessor: "revenue" }, { yAccessor: "users" }],
          title: "Dual",
        })
        const diag = result.diagnoses.find(d => d.code === "DUAL_AXIS_UNLABELED")
        expect(diag).toBeDefined()
        expect(diag?.message).toContain("false equivalence")
      })

      it("accepts two labeled series", () => {
        const result = diagnoseConfig("MultiAxisLineChart", {
          data: dualData,
          xAccessor: "month",
          series: [
            { yAccessor: "revenue", label: "Revenue ($)" },
            { yAccessor: "users", label: "Users" },
          ],
          title: "Dual",
        })
        expect(result.diagnoses.map(d => d.code)).not.toContain("DUAL_AXIS_UNLABELED")
      })

      it("ignores three-series configs (multi-line fallback, single scale)", () => {
        const result = diagnoseConfig("MultiAxisLineChart", {
          data: dualData,
          xAccessor: "month",
          series: [
            { yAccessor: "revenue" },
            { yAccessor: "users" },
            { yAccessor: "month" },
          ],
          title: "Triple",
        })
        expect(result.diagnoses.map(d => d.code)).not.toContain("DUAL_AXIS_UNLABELED")
      })
    })

    describe("CHERRY_PICKED_WINDOW", () => {
      it("flags an xExtent that crops most of the data", () => {
        const result = diagnoseConfig("LineChart", {
          ...trendBase,
          xExtent: [15, 20], // shows ~26% of x range 1..20
        })
        const diag = result.diagnoses.find(d => d.code === "CHERRY_PICKED_WINDOW")
        expect(diag).toBeDefined()
        expect(diag?.message).toContain("%")
      })

      it("accepts a window covering most of the data", () => {
        const result = diagnoseConfig("LineChart", {
          ...trendBase,
          xExtent: [2, 20], // ~95% coverage
        })
        expect(result.diagnoses.map(d => d.code)).not.toContain("CHERRY_PICKED_WINDOW")
      })

      it("does not fire without an explicit xExtent", () => {
        const result = diagnoseConfig("LineChart", trendBase)
        expect(result.diagnoses.map(d => d.code)).not.toContain("CHERRY_PICKED_WINDOW")
      })
    })

    describe("PART_TO_WHOLE_NEGATIVE", () => {
      it("errors on negative pie slice values", () => {
        const result = diagnoseConfig("PieChart", {
          data: [
            { category: "A", value: 40 },
            { category: "B", value: -10 },
            { category: "C", value: 70 },
          ],
          categoryAccessor: "category",
          valueAccessor: "value",
          title: "Mix",
        })
        const diag = result.diagnoses.find(d => d.code === "PART_TO_WHOLE_NEGATIVE")
        expect(diag).toBeDefined()
        expect(diag?.severity).toBe("error")
        expect(result.ok).toBe(false)
      })

      it("warns on normalized stacked bars with negatives", () => {
        const result = diagnoseConfig("StackedBarChart", {
          data: [
            { category: "A", group: "g1", value: 40 },
            { category: "A", group: "g2", value: -10 },
          ],
          categoryAccessor: "category",
          stackBy: "group",
          valueAccessor: "value",
          normalize: true,
          title: "Stack",
        })
        const diag = result.diagnoses.find(d => d.code === "PART_TO_WHOLE_NEGATIVE")
        expect(diag).toBeDefined()
        expect(diag?.severity).toBe("warning")
      })

      it("falls back to the component's default value accessor when omitted", () => {
        const result = diagnoseConfig("StackedBarChart", {
          data: [
            { category: "A", group: "g1", value: 40 },
            { category: "A", group: "g2", value: -10 },
          ],
          categoryAccessor: "category",
          stackBy: "group",
          normalize: true,
          title: "Stack",
        })
        const diag = result.diagnoses.find(d => d.code === "PART_TO_WHOLE_NEGATIVE")
        expect(diag).toBeDefined()
        expect(diag?.message).toContain('"value"')
      })

      it("does not flag un-normalized stacks (diverging stacks are legitimate)", () => {
        const result = diagnoseConfig("StackedBarChart", {
          data: [
            { category: "A", group: "g1", value: 40 },
            { category: "A", group: "g2", value: -10 },
          ],
          categoryAccessor: "category",
          stackBy: "group",
          valueAccessor: "value",
          title: "Diverging",
        })
        expect(result.diagnoses.map(d => d.code)).not.toContain("PART_TO_WHOLE_NEGATIVE")
      })

      it("accepts all-positive pie values", () => {
        const result = diagnoseConfig("PieChart", {
          data: [
            { category: "A", value: 40 },
            { category: "B", value: 60 },
          ],
          categoryAccessor: "category",
          valueAccessor: "value",
          title: "Shares",
        })
        expect(result.diagnoses.map(d => d.code)).not.toContain("PART_TO_WHOLE_NEGATIVE")
      })
    })

    describe("NON_PASSING_CURVE", () => {
      it("flags curve=basis on a line chart", () => {
        const result = diagnoseConfig("LineChart", {
          ...trendBase,
          curve: "basis",
        })
        const diag = result.diagnoses.find(d => d.code === "NON_PASSING_CURVE")
        expect(diag).toBeDefined()
        expect(diag?.message).toContain("does NOT pass through")
      })

      it("accepts interpolating curves", () => {
        for (const curve of ["monotoneX", "catmullRom", "linear"]) {
          const result = diagnoseConfig("LineChart", { ...trendBase, curve })
          expect(result.diagnoses.map(d => d.code)).not.toContain("NON_PASSING_CURVE")
        }
      })
    })

    describe("EXTREME_ASPECT_RATIO", () => {
      it("flags an extremely wide trend chart", () => {
        const result = diagnoseConfig("LineChart", {
          ...trendBase,
          width: 1200,
          height: 100,
        })
        const diag = result.diagnoses.find(d => d.code === "EXTREME_ASPECT_RATIO")
        expect(diag).toBeDefined()
        expect(diag?.message).toContain("flattens")
      })

      it("skips sparkline mode", () => {
        const result = diagnoseConfig("LineChart", {
          ...trendBase,
          width: 1200,
          height: 100,
          mode: "sparkline",
        })
        expect(result.diagnoses.map(d => d.code)).not.toContain("EXTREME_ASPECT_RATIO")
      })

      it("accepts conventional aspect ratios", () => {
        const result = diagnoseConfig("LineChart", {
          ...trendBase,
          width: 600,
          height: 400,
        })
        expect(result.diagnoses.map(d => d.code)).not.toContain("EXTREME_ASPECT_RATIO")
      })
    })

    describe("PIE_TOO_MANY_SLICES", () => {
      it("flags a pie with more than 8 categories", () => {
        const data = Array.from({ length: 12 }, (_, i) => ({
          category: `cat-${i}`,
          value: 10 + i,
        }))
        const result = diagnoseConfig("PieChart", {
          data,
          categoryAccessor: "category",
          valueAccessor: "value",
          title: "Crowded",
        })
        const diag = result.diagnoses.find(d => d.code === "PIE_TOO_MANY_SLICES")
        expect(diag).toBeDefined()
        expect(diag?.message).toContain("12 slices")
        expect(diag?.fix).toContain("BarChart")
      })

      it("accepts a pie with few categories", () => {
        const result = diagnoseConfig("DonutChart", {
          data: [
            { category: "A", value: 40 },
            { category: "B", value: 35 },
            { category: "C", value: 25 },
          ],
          categoryAccessor: "category",
          valueAccessor: "value",
          title: "Tidy",
        })
        expect(result.diagnoses.map(d => d.code)).not.toContain("PIE_TOO_MANY_SLICES")
      })
    })
  })
})
