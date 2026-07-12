import { describe, expect, it } from "vitest"
import {
  CARRIERS,
  COHORT_FIXTURES,
  DATASET_WINDOW,
  FOCAL_INSERT_B_PREDICATE,
  INCIDENT_PREDICATE,
  INCIDENT_WINDOW,
  MINIMUM_OPERATIONAL_VOLUME,
  PACKAGE_DESIGNS,
  PRODUCTS,
  STORY_STATS,
  TINY_NORTHSTAR_PREDICATE,
  WAREHOUSES,
  aggregateCohortPoints,
  aggregateDailyReturnRates,
  aggregateProductPackageHeatmap,
  aggregateSankey,
  aggregateSortingShelf,
  compilePredicate,
  expandOrderCohorts,
  fieldsUsedByPredicate,
  fulfillmentDomain,
  normalizePredicate,
  orderRecords,
  rowsMatching,
  summarizePredicate,
} from "./insightForgeData"

const DAY_MS = 24 * 60 * 60 * 1000

describe("Insight Forge deterministic Wayfinder fixture", () => {
  it("expands exact cohort totals into 9,600 complete, unique order rows", () => {
    expect(COHORT_FIXTURES.reduce((sum, fixture) => sum + fixture.orders, 0)).toBe(9600)
    expect(orderRecords).toHaveLength(9600)
    expect(new Set(orderRecords.map((row) => row.orderId)).size).toBe(9600)
    expect(expandOrderCohorts()).toEqual(orderRecords)

    const shipmentDates = new Set(orderRecords.map((row) => row.shipDate))
    expect(shipmentDates.size).toBe(DATASET_WINDOW.days)
    expect([...shipmentDates].sort()[0]).toBe(DATASET_WINDOW.start)
    expect([...shipmentDates].sort().at(-1)).toBe(DATASET_WINDOW.end)

    for (const fixture of COHORT_FIXTURES) {
      expect(fixture.damaged + fixture.late + fixture.otherReturns).toBeLessThanOrEqual(
        fixture.orders,
      )
    }

    for (const row of orderRecords) {
      expect(PRODUCTS.some((product) => product.id === row.productId)).toBe(true)
      expect(WAREHOUSES.some((warehouse) => warehouse.id === row.warehouseId)).toBe(true)
      expect(CARRIERS.some((carrier) => carrier.id === row.carrierId)).toBe(true)
      expect(PACKAGE_DESIGNS.some((design) => design.id === row.packageDesignId)).toBe(true)
      expect(row.returned).toBe(row.returnReason !== null)
      expect(
        Date.parse(`${row.outcomeCompleteAt}T00:00:00Z`) - Date.parse(`${row.shipDate}T00:00:00Z`),
      ).toBeGreaterThanOrEqual(30 * DAY_MS)
      if (row.returned) {
        expect(row.returnDay).toMatch(/^2025-\d{2}-\d{2}$/)
        expect(row.refundAmount).toBeGreaterThan(0)
      }
    }
  })

  it("locks the incident and nonincident evidence to the tutorial copy", () => {
    const incidentRows = rowsMatching(INCIDENT_PREDICATE)
    const baselineRows = rowsMatching({ op: "not", clause: INCIDENT_PREDICATE })

    expect(INCIDENT_WINDOW).toMatchObject({
      start: "2025-05-15",
      end: "2025-05-29",
    })
    expect(incidentRows).toHaveLength(1617)
    expect(incidentRows.filter((row) => row.returned)).toHaveLength(152)
    expect(STORY_STATS.incidentReturnRate).toBeCloseTo(0.094, 3)

    expect(baselineRows).toHaveLength(7983)
    expect(baselineRows.filter((row) => row.returned)).toHaveLength(295)
    expect(STORY_STATS.baselineReturnRate).toBeCloseTo(0.037, 3)
    expect(STORY_STATS.totalReturns).toBe(447)
    expect(STORY_STATS.incidentDamagedReturns).toBeGreaterThan(STORY_STATS.incidentReturns * 0.8)
  })

  it("encodes the packaging signal across carriers and the two counterexamples", () => {
    const focalRows = rowsMatching(FOCAL_INSERT_B_PREDICATE)
    expect(focalRows).toHaveLength(920)
    expect(focalRows.filter((row) => row.returnReason === "damaged")).toHaveLength(128)
    expect(STORY_STATS.insertBDamageRate).toBeGreaterThan(0.13)
    expect(STORY_STATS.insertBRateByCarrier.every((rate) => rate > 0.11)).toBe(true)
    expect(STORY_STATS.insertBByCarrier.map((entry) => entry.carrierId)).toEqual(
      CARRIERS.map((carrier) => carrier.id),
    )

    expect(STORY_STATS.swiftShipWithoutInsertBDamageRate).toBeLessThan(0.05)

    const tinyRows = rowsMatching(TINY_NORTHSTAR_PREDICATE)
    expect(tinyRows).toHaveLength(5)
    expect(tinyRows.filter((row) => row.returnReason === "damaged")).toHaveLength(1)
    expect(STORY_STATS.lowVolumeNorthstarCohort).toEqual({
      n: 5,
      damagedReturns: 1,
      damageRate: 0.2,
    })
    expect(STORY_STATS.lowVolumeNorthstarCohort.n).toBeLessThan(MINIMUM_OPERATIONAL_VOLUME)
  })

  it("overlaps severe weather with only part of the incident", () => {
    const incidentRows = rowsMatching(INCIDENT_PREDICATE)
    const weatherDates = [
      ...new Set(incidentRows.filter((row) => row.severeWeather).map((row) => row.shipDate)),
    ].sort()
    expect(weatherDates[0]).toBe("2025-05-20")
    expect(weatherDates.at(-1)).toBe("2025-05-24")
    expect(weatherDates).not.toContain(INCIDENT_WINDOW.start)
    expect(weatherDates).not.toContain(INCIDENT_WINDOW.end)
  })
})

describe("Insight Forge portable predicates", () => {
  it("compiles every AST operator without dropping clauses", () => {
    const predicate = {
      op: "and",
      clauses: [
        INCIDENT_PREDICATE,
        {
          op: "or",
          clauses: [
            { op: "eq", field: "fulfillment.carrier", value: "swiftship" },
            {
              op: "in",
              field: "fulfillment.carrier",
              values: ["northstar", "parcelpost"],
            },
          ],
        },
        { op: "gte", field: "shipment.transitDays", value: 2 },
        { op: "lte", field: "shipment.transitDays", value: 7 },
        {
          op: "not",
          clause: { op: "eq", field: "return.reason", value: "late" },
        },
        { op: "neq", field: "product.id", value: "does-not-exist" },
      ],
    }
    const matches = orderRecords.filter(compilePredicate(fulfillmentDomain, predicate))
    expect(matches).toHaveLength(
      rowsMatching(INCIDENT_PREDICATE).filter((row) => row.returnReason !== "late").length,
    )

    const exclusive = compilePredicate(fulfillmentDomain, {
      op: "between",
      field: "shipment.date",
      min: INCIDENT_WINDOW.start,
      max: INCIDENT_WINDOW.end,
      inclusive: false,
    })
    expect(orderRecords.filter(exclusive).every((row) => row.shipDate > "2025-05-15")).toBe(true)
    expect(orderRecords.filter(exclusive).every((row) => row.shipDate < "2025-05-29")).toBe(true)
  })

  it("normalizes nested, duplicate, and reordered clauses canonically", () => {
    const product = {
      op: "eq",
      field: "product.id",
      value: "starlight-lantern",
    }
    const nested = {
      op: "and",
      clauses: [product, { op: "and", clauses: [INCIDENT_PREDICATE, product] }],
    }
    const normalized = normalizePredicate(nested)
    expect(normalized).toEqual({
      op: "and",
      clauses: [
        {
          op: "between",
          field: "shipment.date",
          min: "2025-05-15",
          max: "2025-05-29",
          inclusive: true,
        },
        product,
      ],
    })
    expect(normalizePredicate(normalized)).toEqual(normalized)
    expect(
      normalizePredicate({
        op: "not",
        clause: { op: "not", clause: product },
      }),
    ).toEqual(product)
    expect(
      normalizePredicate({
        op: "in",
        field: "package.design",
        values: ["foam-c", "pulp-a", "foam-c"],
      }).values,
    ).toEqual(["foam-c", "pulp-a"])
  })

  it("summarizes semantic names and reports each used field once", () => {
    const predicate = {
      op: "and",
      clauses: [
        INCIDENT_PREDICATE,
        { op: "eq", field: "product.id", value: "starlight-lantern" },
        { op: "eq", field: "package.design", value: "insert-b" },
        { op: "neq", field: "package.design", value: "foam-c" },
      ],
    }
    const summary = summarizePredicate(predicate)
    expect(summary).toContain("Shipment date is from May 15, 2025 through May 29, 2025")
    expect(summary).toContain("Product is Starlight Lantern")
    expect(summary).toContain("Package design is Corrugated Insert B")
    expect(fieldsUsedByPredicate(predicate)).toEqual([
      "shipment.date",
      "product.id",
      "package.design",
    ])
  })

  it("fails loudly for unknown fields and operators", () => {
    expect(() =>
      compilePredicate(fulfillmentDomain, {
        op: "eq",
        field: "missing.field",
        value: true,
      }),
    ).toThrow("Unknown predicate field")
    expect(() => normalizePredicate({ op: "maybe", field: "product.id" })).toThrow(
      "Unsupported predicate op",
    )
    expect(() => fieldsUsedByPredicate({ op: "maybe" })).toThrow("Unsupported predicate op")
  })
})

describe("Insight Forge chart aggregators", () => {
  it("builds exact daily and seven-day rolling evidence", () => {
    const daily = aggregateDailyReturnRates(orderRecords)
    expect(daily).toHaveLength(90)
    expect(daily.reduce((sum, row) => sum + row.orders, 0)).toBe(9600)
    expect(daily.reduce((sum, row) => sum + row.returns, 0)).toBe(447)
    expect(daily.every((row) => row.dateValue instanceof Date)).toBe(true)

    const daySeven = daily[6]
    expect(daySeven.rollingOrders).toBe(daily.slice(0, 7).reduce((sum, row) => sum + row.orders, 0))
    expect(daySeven.rollingReturns).toBe(
      daily.slice(0, 7).reduce((sum, row) => sum + row.returns, 0),
    )
  })

  it("makes damaged Starlight Lantern returns dominate the incident Sorting Shelf", () => {
    const incident = rowsMatching(INCIDENT_PREDICATE)
    const shelf = aggregateSortingShelf(incident, { dimension: "reason" })
    expect(shelf.reduce((sum, row) => sum + row.returns, 0)).toBe(152)
    const focalDamage = shelf.find(
      (row) => row.reason === "damaged" && row.productId === "starlight-lantern",
    )
    expect(focalDamage.returns).toBeGreaterThan(120)
    expect(focalDamage.excessReturns).toBeGreaterThan(100)
    expect(shelf[0].id).toBe(focalDamage.id)
    expect(aggregateSortingShelf(incident, "warehouse")[0].dimension).toBe("warehouse")
  })

  it("conserves flow at every Sankey stage", () => {
    const sankey = aggregateSankey(orderRecords)
    expect(new Set(sankey.nodes.map((node) => node.id)).size).toBe(sankey.nodes.length)
    expect(new Set(sankey.edges.map((edge) => edge.id)).size).toBe(sankey.edges.length)
    for (const sourceStage of ["product", "warehouse", "package", "carrier"]) {
      expect(
        sankey.edges
          .filter((edge) => edge.sourceStage === sourceStage)
          .reduce((sum, edge) => sum + edge.value, 0),
      ).toBe(9600)
    }

    const incidentReturns = aggregateSankey(rowsMatching(INCIDENT_PREDICATE), {
      returnedOnly: true,
    })
    expect(incidentReturns.nodes.some((node) => node.id === "outcome:kept")).toBe(false)
    expect(
      incidentReturns.edges
        .filter((edge) => edge.sourceStage === "carrier")
        .reduce((sum, edge) => sum + edge.value, 0),
    ).toBe(152)
  })

  it("gives every Sankey node a numeric count and no categorical `value`", () => {
    // Regression: nodes once carried `value: <categorical id string>`, which
    // shadowed the numeric count in the tooltip and rendered "NaN orders".
    // A node's magnitude is `valueCount`; it must not define a scalar `value`.
    const sankey = aggregateSankey(orderRecords)
    for (const node of sankey.nodes) {
      expect(node.value).toBeUndefined()
      expect(typeof node.valueCount).toBe("number")
      expect(Number.isFinite(node.valueCount)).toBe(true)
      expect(node.valueCount).toBeGreaterThan(0)
    }
    // Every source node's outbound count equals its accumulated valueCount —
    // proves valueCount is the true node magnitude, not a stray field.
    const productNodes = sankey.nodes.filter((node) => node.stage === "product")
    for (const node of productNodes) {
      const outbound = sankey.edges
        .filter((edge) => edge.source === node.id)
        .reduce((sum, edge) => sum + edge.value, 0)
      expect(outbound).toBe(node.valueCount)
    }
  })

  it("keeps risk/evidence cohorts and knowledge cells tied to raw denominators", () => {
    const points = aggregateCohortPoints(orderRecords)
    expect(points).toHaveLength(162)
    expect(points.reduce((sum, point) => sum + point.shipments, 0)).toBe(9600)

    const focalPoints = points.filter((point) => point.isFocalInsertB)
    expect(focalPoints).toHaveLength(3)
    expect(focalPoints.every((point) => point.damageRate > 0.11)).toBe(true)
    expect(focalPoints.map((point) => point.carrierId).sort()).toEqual(
      CARRIERS.map((carrier) => carrier.id).sort(),
    )

    const tiny = points.find((point) => point.isTinyNorthstar)
    expect(tiny).toMatchObject({
      shipments: 5,
      damagedReturns: 1,
      damageRate: 0.2,
      adequateVolume: false,
    })

    const cells = aggregateProductPackageHeatmap(orderRecords)
    expect(cells).toHaveLength(PRODUCTS.length * PACKAGE_DESIGNS.length)
    expect(cells.reduce((sum, cell) => sum + cell.shipments, 0)).toBe(9600)
    const focus = cells.find((cell) => cell.isFocus)
    expect(focus.damageRate).toBe(Math.max(...cells.map((cell) => cell.damageRate)))
    expect(focus.numeratorLabel).toBe(`${focus.damagedReturns} / ${focus.shipments}`)
  })
})
