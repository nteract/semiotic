/**
 * Deterministic synthetic data for The Insight Forge.
 *
 * The fixture intentionally expands exact cohort totals instead of sampling
 * outcomes. Every exported chart aggregate can therefore be traced back to
 * the same 9,600 OrderRecord-shaped rows.
 */

export const SYNTHETIC_DATA_NOTICE =
  "Synthetic Wayfinder Supply Co. shipments; no customer or carrier records are real."

export const DAY_MS = 24 * 60 * 60 * 1000

export const DATASET_WINDOW = Object.freeze({
  start: "2025-04-01",
  end: "2025-06-29",
  days: 90,
})

export const INCIDENT_WINDOW = Object.freeze({
  start: "2025-05-15",
  end: "2025-05-29",
  label: "May 15–29",
})

export const PACKAGING_ROLLOUT_DATE = "2025-05-15"
export const MINIMUM_OPERATIONAL_VOLUME = 25

export const PRODUCTS = Object.freeze([
  {
    id: "starlight-lantern",
    name: "Starlight Lantern",
    category: "lighting",
    refundAmount: 78,
  },
  {
    id: "trail-flask",
    name: "Trail Flask",
    category: "hydration",
    refundAmount: 28,
  },
  {
    id: "storm-cloak",
    name: "Storm Cloak",
    category: "apparel",
    refundAmount: 96,
  },
  {
    id: "field-compass",
    name: "Field Compass",
    category: "navigation",
    refundAmount: 44,
  },
  {
    id: "canvas-pack",
    name: "Canvas Pack",
    category: "packs",
    refundAmount: 112,
  },
  {
    id: "camp-cook-kit",
    name: "Camp Cook Kit",
    category: "cooking",
    refundAmount: 64,
  },
])

export const WAREHOUSES = Object.freeze([
  { id: "reno", name: "Reno" },
  { id: "columbus", name: "Columbus" },
  { id: "newark", name: "Newark" },
])

export const CARRIERS = Object.freeze([
  { id: "swiftship", name: "SwiftShip Ground", serviceLevel: "ground" },
  { id: "northstar", name: "Northstar Express", serviceLevel: "expedited" },
  { id: "parcelpost", name: "ParcelPost", serviceLevel: "ground" },
])

export const PACKAGE_DESIGNS = Object.freeze([
  { id: "pulp-a", name: "Molded Pulp A" },
  { id: "insert-b", name: "Corrugated Insert B" },
  { id: "foam-c", name: "Foam Sleeve C" },
])

export const PRODUCT_BY_ID = Object.freeze(
  Object.fromEntries(PRODUCTS.map((product) => [product.id, product])),
)
export const WAREHOUSE_BY_ID = Object.freeze(
  Object.fromEntries(WAREHOUSES.map((warehouse) => [warehouse.id, warehouse])),
)
export const CARRIER_BY_ID = Object.freeze(
  Object.fromEntries(CARRIERS.map((carrier) => [carrier.id, carrier])),
)
export const PACKAGE_DESIGN_BY_ID = Object.freeze(
  Object.fromEntries(PACKAGE_DESIGNS.map((design) => [design.id, design])),
)

export const RETURN_REASON_LABELS = Object.freeze({
  damaged: "Damaged in transit",
  "wrong-item": "Wrong item",
  late: "Arrived late",
  "changed-mind": "Changed mind",
  "not-as-described": "Not as described",
})

const DESTINATION_REGIONS = ["west", "midwest", "northeast", "south"]
const OTHER_RETURN_REASONS = ["wrong-item", "changed-mind", "not-as-described"]

const PRE_INCIDENT_WINDOW = Object.freeze({
  start: DATASET_WINDOW.start,
  end: "2025-05-14",
  days: 44,
})
const POST_INCIDENT_WINDOW = Object.freeze({
  start: "2025-05-30",
  end: DATASET_WINDOW.end,
  days: 31,
})

function parseDate(date) {
  return new Date(`${date}T00:00:00.000Z`)
}

function addDays(date, days) {
  return new Date(parseDate(date).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

function datesBetween(start, end) {
  const dates = []
  for (
    let cursor = parseDate(start).getTime();
    cursor <= parseDate(end).getTime();
    cursor += DAY_MS
  ) {
    dates.push(new Date(cursor).toISOString().slice(0, 10))
  }
  return dates
}

function gcd(a, b) {
  let left = Math.abs(a)
  let right = Math.abs(b)
  while (right) {
    const remainder = left % right
    left = right
    right = remainder
  }
  return left
}

function coprimeStride(size, seed) {
  if (size <= 1) return 1
  let stride = (seed % (size - 1)) + 1
  while (gcd(stride, size) !== 1) {
    stride = (stride % (size - 1)) + 1
  }
  return stride
}

function stringSeed(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function distributeEvenly(total, count, offset = 0) {
  const values = Array(count).fill(Math.floor(total / count))
  const remainder = total % count
  for (let index = 0; index < remainder; index += 1) {
    values[(index + offset) % count] += 1
  }
  return values
}

function distributeUnits(total, count, offset, stride) {
  const values = Array(count).fill(0)
  for (let unit = 0; unit < total; unit += 1) {
    values[(offset + unit * stride) % count] += 1
  }
  return values
}

function splitCounts(values, targetFirst, ratio, offset, stride) {
  const first = values.map((value) => Math.floor(value * ratio))
  let remaining = targetFirst - first.reduce((sum, value) => sum + value, 0)
  let pass = 0

  while (remaining > 0) {
    let changed = false
    for (let step = 0; step < values.length && remaining > 0; step += 1) {
      const index = (offset + step * stride + pass) % values.length
      if (first[index] < values[index]) {
        first[index] += 1
        remaining -= 1
        changed = true
      }
    }
    if (!changed) throw new Error("Unable to split exact cohort totals")
    pass += 1
  }

  return [first, values.map((value, index) => value - first[index])]
}

function combinationKey(productId, warehouseId, carrierId, packageDesignId) {
  return [productId, warehouseId, carrierId, packageDesignId].join("|")
}

const FOCAL_PRODUCT_ID = "starlight-lantern"
const FOCAL_WAREHOUSE_ID = "reno"
const FOCAL_PACKAGE_ID = "insert-b"

export const TINY_NORTHSTAR_COHORT = Object.freeze({
  productId: "trail-flask",
  warehouseId: "newark",
  carrierId: "northstar",
  packageDesignId: "foam-c",
})

const tinyCohortKey = combinationKey(
  TINY_NORTHSTAR_COHORT.productId,
  TINY_NORTHSTAR_COHORT.warehouseId,
  TINY_NORTHSTAR_COHORT.carrierId,
  TINY_NORTHSTAR_COHORT.packageDesignId,
)

const backgroundCombinations = []
for (const product of PRODUCTS) {
  for (const warehouse of WAREHOUSES) {
    for (const carrier of CARRIERS) {
      for (const design of PACKAGE_DESIGNS) {
        const key = combinationKey(product.id, warehouse.id, carrier.id, design.id)
        const focal =
          product.id === FOCAL_PRODUCT_ID &&
          warehouse.id === FOCAL_WAREHOUSE_ID &&
          design.id === FOCAL_PACKAGE_ID
        if (!focal && key !== tinyCohortKey) {
          backgroundCombinations.push({
            key,
            productId: product.id,
            warehouseId: warehouse.id,
            carrierId: carrier.id,
            packageDesignId: design.id,
          })
        }
      }
    }
  }
}

function buildBaselineFixtures() {
  const combinationCount = backgroundCombinations.length
  const orders = distributeEvenly(7983, combinationCount, 19)
  const damaged = distributeUnits(166, combinationCount, 11, 53)
  const late = distributeUnits(54, combinationCount, 37, 47)
  const otherReturns = distributeUnits(75, combinationCount, 71, 43)
  const ratio = PRE_INCIDENT_WINDOW.days / 75

  const [preOrders, postOrders] = splitCounts(orders, 4683, ratio, 13, 59)
  const [preDamaged, postDamaged] = splitCounts(damaged, 97, ratio, 29, 61)
  const [preLate, postLate] = splitCounts(late, 32, ratio, 41, 67)
  const [preOther, postOther] = splitCounts(otherReturns, 44, ratio, 73, 71)

  const fixtures = []
  for (let index = 0; index < combinationCount; index += 1) {
    const combination = backgroundCombinations[index]
    const batchStem = `${combination.warehouseId.toUpperCase()}-${combination.packageDesignId.toUpperCase()}`
    fixtures.push({
      fixtureId: `baseline-pre-${index + 1}`,
      startDate: PRE_INCIDENT_WINDOW.start,
      endDate: PRE_INCIDENT_WINDOW.end,
      ...combination,
      orders: preOrders[index],
      damaged: preDamaged[index],
      late: preLate[index],
      otherReturns: preOther[index],
      packagingBatch: `${batchStem}-APR`,
      severeWeatherShare: 0,
    })
    fixtures.push({
      fixtureId: `baseline-post-${index + 1}`,
      startDate: POST_INCIDENT_WINDOW.start,
      endDate: POST_INCIDENT_WINDOW.end,
      ...combination,
      orders: postOrders[index],
      damaged: postDamaged[index],
      late: postLate[index],
      otherReturns: postOther[index],
      packagingBatch: `${batchStem}-JUN`,
      severeWeatherShare: 0,
    })
  }
  return fixtures
}

function buildIncidentFixtures() {
  const focalFixtures = [
    {
      fixtureId: "incident-lantern-reno-insert-b-swiftship",
      productId: FOCAL_PRODUCT_ID,
      warehouseId: FOCAL_WAREHOUSE_ID,
      carrierId: "swiftship",
      packageDesignId: FOCAL_PACKAGE_ID,
      orders: 340,
      damaged: 48,
      late: 2,
      otherReturns: 2,
    },
    {
      fixtureId: "incident-lantern-reno-insert-b-northstar",
      productId: FOCAL_PRODUCT_ID,
      warehouseId: FOCAL_WAREHOUSE_ID,
      carrierId: "northstar",
      packageDesignId: FOCAL_PACKAGE_ID,
      orders: 280,
      damaged: 37,
      late: 1,
      otherReturns: 1,
    },
    {
      fixtureId: "incident-lantern-reno-insert-b-parcelpost",
      productId: FOCAL_PRODUCT_ID,
      warehouseId: FOCAL_WAREHOUSE_ID,
      carrierId: "parcelpost",
      packageDesignId: FOCAL_PACKAGE_ID,
      orders: 300,
      damaged: 43,
      late: 1,
      otherReturns: 0,
    },
  ].map((fixture) => ({
    ...fixture,
    startDate: INCIDENT_WINDOW.start,
    endDate: INCIDENT_WINDOW.end,
    packagingBatch: "RNO-INSERT-B-0515",
    severeWeatherShare: 0.68,
  }))

  const combinationCount = backgroundCombinations.length
  const backgroundOrders = distributeEvenly(692, combinationCount, 31)
  const backgroundDamaged = distributeUnits(9, combinationCount, 17, 53)
  const backgroundLate = distributeUnits(3, combinationCount, 79, 47)
  const backgroundOther = distributeUnits(4, combinationCount, 101, 43)
  const backgroundFixtures = backgroundCombinations.map((combination, index) => ({
    fixtureId: `incident-background-${index + 1}`,
    startDate: INCIDENT_WINDOW.start,
    endDate: INCIDENT_WINDOW.end,
    ...combination,
    orders: backgroundOrders[index],
    damaged: backgroundDamaged[index],
    late: backgroundLate[index],
    otherReturns: backgroundOther[index],
    packagingBatch: `${combination.warehouseId.toUpperCase()}-${combination.packageDesignId.toUpperCase()}-MAY`,
    severeWeatherShare: 0.42,
  }))

  const tinyFixture = {
    fixtureId: "incident-northstar-tiny-alert",
    startDate: INCIDENT_WINDOW.start,
    endDate: INCIDENT_WINDOW.end,
    ...TINY_NORTHSTAR_COHORT,
    orders: 5,
    damaged: 1,
    late: 0,
    otherReturns: 0,
    packagingBatch: "NWK-FOAM-C-PILOT",
    severeWeatherShare: 0.4,
  }

  return [...focalFixtures, ...backgroundFixtures, tinyFixture]
}

/** Exact, deterministic cohort totals expanded into the public row fixture. */
export const COHORT_FIXTURES = Object.freeze(
  [...buildBaselineFixtures(), ...buildIncidentFixtures()].map((fixture) => Object.freeze(fixture)),
)

function returnReasonFor(fixture, outcomeIndex) {
  if (outcomeIndex < fixture.damaged) return "damaged"
  if (outcomeIndex < fixture.damaged + fixture.late) return "late"
  if (outcomeIndex < fixture.damaged + fixture.late + fixture.otherReturns) {
    return OTHER_RETURN_REASONS[
      (outcomeIndex - fixture.damaged - fixture.late) % OTHER_RETURN_REASONS.length
    ]
  }
  return null
}

function distanceFor(region, warehouseId, rowIndex) {
  const regionBase = {
    west: 420,
    midwest: 980,
    northeast: 1280,
    south: 1540,
  }[region]
  const warehouseOffset = { reno: 40, columbus: 130, newark: 210 }[warehouseId]
  return regionBase + warehouseOffset + (rowIndex % 17) * 23
}

/**
 * Expand exact cohort fixtures into OrderRecord-shaped objects.
 * No random source or ambient date is consulted.
 */
export function expandOrderCohorts(fixtures = COHORT_FIXTURES) {
  const rows = []
  let orderSequence = 1

  fixtures.forEach((fixture, fixtureIndex) => {
    const dates = datesBetween(fixture.startDate, fixture.endDate)
    const product = PRODUCT_BY_ID[fixture.productId]
    const warehouse = WAREHOUSE_BY_ID[fixture.warehouseId]
    const carrier = CARRIER_BY_ID[fixture.carrierId]
    const design = PACKAGE_DESIGN_BY_ID[fixture.packageDesignId]
    if (!product || !warehouse || !carrier || !design) {
      throw new Error(`Unknown fixture dimension in ${fixture.fixtureId}`)
    }

    const seed = stringSeed(fixture.fixtureId)
    const dateStride = coprimeStride(dates.length, seed + 17)
    const outcomeStride = coprimeStride(fixture.orders, seed + 31)
    const dateOffset = seed % dates.length
    const outcomeOffset = seed % fixture.orders

    for (let rowIndex = 0; rowIndex < fixture.orders; rowIndex += 1) {
      const shipDate = dates[(dateOffset + rowIndex * dateStride) % dates.length]
      const outcomeIndex = (outcomeOffset + rowIndex * outcomeStride) % fixture.orders
      const returnReason = returnReasonFor(fixture, outcomeIndex)
      const returned = returnReason !== null
      const region = DESTINATION_REGIONS[(rowIndex + fixtureIndex + (seed % 7)) % 4]
      const weatherEligible = shipDate >= "2025-05-20" && shipDate <= "2025-05-24"
      const weatherDraw = ((rowIndex * 37 + fixtureIndex * 11 + seed) % 100) / 100
      const severeWeather = weatherEligible && weatherDraw < (fixture.severeWeatherShare || 0)
      const transitBase = carrier.serviceLevel === "expedited" ? 2 : 4
      const transitDays = transitBase + ((rowIndex + fixtureIndex) % 2) + (severeWeather ? 1 : 0)
      const deliveredDate = addDays(shipDate, transitDays)
      const returnLag = 4 + ((rowIndex + fixtureIndex) % 13)

      rows.push({
        orderId: `WF-${String(orderSequence).padStart(5, "0")}`,
        orderDate: addDays(shipDate, -1 - ((rowIndex + fixtureIndex) % 2)),
        shipDate,
        deliveredDate,
        outcomeCompleteAt: addDays(shipDate, 30),
        productId: product.id,
        productName: product.name,
        category: product.category,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        carrierId: carrier.id,
        carrierName: carrier.name,
        serviceLevel: carrier.serviceLevel,
        packageDesignId: design.id,
        packageDesignName: design.name,
        packagingBatch: fixture.packagingBatch,
        destinationRegion: region,
        distanceKm: distanceFor(region, warehouse.id, rowIndex),
        transitDays,
        severeWeather,
        returned,
        returnReason,
        ...(returned
          ? {
              returnDay: addDays(deliveredDate, returnLag),
              refundAmount: product.refundAmount,
            }
          : {}),
      })
      orderSequence += 1
    }
  })

  return rows.sort(
    (left, right) =>
      left.shipDate.localeCompare(right.shipDate) || left.orderId.localeCompare(right.orderId),
  )
}

export const orderRecords = Object.freeze(expandOrderCohorts())
export const wayfinderOrders = orderRecords
export const insightForgeOrders = orderRecords
export const orders = orderRecords

export const FIELD_LABELS = Object.freeze({
  "order.id": "Order",
  "order.date": "Order date",
  "shipment.date": "Shipment date",
  "product.id": "Product",
  "product.name": "Product",
  "return.reason": "Return reason",
  "return.returned": "Returned",
  "fulfillment.warehouse": "Warehouse",
  "fulfillment.carrier": "Carrier",
  "fulfillment.service": "Service level",
  "package.design": "Package design",
  "package.batch": "Package batch",
  "destination.region": "Destination region",
  "weather.severe": "Severe weather",
  "shipment.transitDays": "Transit days",
})

export const fulfillmentDomain = Object.freeze({
  id: "wayfinder-returns-v1",
  rowId: "order.id",
  fields: Object.freeze({
    "order.id": (row) => row.orderId,
    "order.date": (row) => row.orderDate,
    "shipment.date": (row) => row.shipDate,
    "product.id": (row) => row.productId,
    "product.name": (row) => row.productName,
    "return.reason": (row) => row.returnReason,
    "return.returned": (row) => row.returned,
    "fulfillment.warehouse": (row) => row.warehouseId,
    "fulfillment.carrier": (row) => row.carrierId,
    "fulfillment.service": (row) => row.serviceLevel,
    "package.design": (row) => row.packageDesignId,
    "package.batch": (row) => row.packagingBatch,
    "destination.region": (row) => row.destinationRegion,
    "weather.severe": (row) => row.severeWeather,
    "shipment.transitDays": (row) => row.transitDays,
  }),
})

export const INCIDENT_PREDICATE = Object.freeze({
  op: "between",
  field: "shipment.date",
  min: INCIDENT_WINDOW.start,
  max: INCIDENT_WINDOW.end,
  inclusive: true,
})

export const FOCAL_INSERT_B_PREDICATE = Object.freeze({
  op: "and",
  clauses: Object.freeze([
    { op: "eq", field: "product.id", value: FOCAL_PRODUCT_ID },
    { op: "eq", field: "fulfillment.warehouse", value: FOCAL_WAREHOUSE_ID },
    { op: "eq", field: "package.design", value: FOCAL_PACKAGE_ID },
  ]),
})

export const SWIFTSHIP_WITHOUT_INSERT_B_PREDICATE = Object.freeze({
  op: "and",
  clauses: Object.freeze([
    { op: "eq", field: "fulfillment.carrier", value: "swiftship" },
    { op: "neq", field: "package.design", value: FOCAL_PACKAGE_ID },
  ]),
})

export const TINY_NORTHSTAR_PREDICATE = Object.freeze({
  op: "and",
  clauses: Object.freeze([
    {
      op: "eq",
      field: "product.id",
      value: TINY_NORTHSTAR_COHORT.productId,
    },
    {
      op: "eq",
      field: "fulfillment.warehouse",
      value: TINY_NORTHSTAR_COHORT.warehouseId,
    },
    {
      op: "eq",
      field: "fulfillment.carrier",
      value: TINY_NORTHSTAR_COHORT.carrierId,
    },
    {
      op: "eq",
      field: "package.design",
      value: TINY_NORTHSTAR_COHORT.packageDesignId,
    },
  ]),
})

function accessorFor(domain, field) {
  const accessor = domain?.fields?.[field]
  if (typeof accessor !== "function") {
    throw new Error(`Unknown predicate field: ${field}`)
  }
  return accessor
}

function assertPredicate(predicate) {
  if (!predicate || typeof predicate !== "object" || typeof predicate.op !== "string") {
    throw new TypeError("Predicate must be an object with an op")
  }
}

/** Compile a portable predicate AST into a row predicate. */
export function compilePredicate(domain, predicate) {
  assertPredicate(predicate)

  switch (predicate.op) {
    case "eq": {
      const accessor = accessorFor(domain, predicate.field)
      return (row) => accessor(row) === predicate.value
    }
    case "neq": {
      const accessor = accessorFor(domain, predicate.field)
      return (row) => accessor(row) !== predicate.value
    }
    case "in": {
      const accessor = accessorFor(domain, predicate.field)
      if (!Array.isArray(predicate.values)) {
        throw new TypeError("The in predicate requires a values array")
      }
      const values = new Set(predicate.values)
      return (row) => values.has(accessor(row))
    }
    case "between": {
      const accessor = accessorFor(domain, predicate.field)
      const inclusive = predicate.inclusive !== false
      return inclusive
        ? (row) => accessor(row) >= predicate.min && accessor(row) <= predicate.max
        : (row) => accessor(row) > predicate.min && accessor(row) < predicate.max
    }
    case "gte": {
      const accessor = accessorFor(domain, predicate.field)
      return (row) => accessor(row) >= predicate.value
    }
    case "lte": {
      const accessor = accessorFor(domain, predicate.field)
      return (row) => accessor(row) <= predicate.value
    }
    case "and": {
      if (!Array.isArray(predicate.clauses)) {
        throw new TypeError("The and predicate requires a clauses array")
      }
      const clauses = predicate.clauses.map((clause) => compilePredicate(domain, clause))
      return (row) => clauses.every((clause) => clause(row))
    }
    case "or": {
      if (!Array.isArray(predicate.clauses)) {
        throw new TypeError("The or predicate requires a clauses array")
      }
      const clauses = predicate.clauses.map((clause) => compilePredicate(domain, clause))
      return (row) => clauses.some((clause) => clause(row))
    }
    case "not": {
      const clause = compilePredicate(domain, predicate.clause)
      return (row) => !clause(row)
    }
    default:
      throw new Error(`Unsupported predicate op: ${predicate.op}`)
  }
}

function scalarKey(value) {
  return `${value === null ? "null" : typeof value}:${String(value)}`
}

function predicateKey(predicate) {
  switch (predicate.op) {
    case "and":
    case "or":
      return `${predicate.op}(${predicate.clauses.map(predicateKey).join(",")})`
    case "not":
      return `not(${predicateKey(predicate.clause)})`
    case "in":
      return `in:${predicate.field}:${predicate.values.map(scalarKey).join(",")}`
    case "between":
      return `between:${predicate.field}:${scalarKey(predicate.min)}:${scalarKey(predicate.max)}:${predicate.inclusive !== false}`
    default:
      return `${predicate.op}:${predicate.field}:${scalarKey(predicate.value)}`
  }
}

/** Flatten, deduplicate, and canonically order a predicate AST. */
export function normalizePredicate(predicate) {
  assertPredicate(predicate)

  if (predicate.op === "and" || predicate.op === "or") {
    if (!Array.isArray(predicate.clauses)) {
      throw new TypeError(`The ${predicate.op} predicate requires a clauses array`)
    }
    const flattened = predicate.clauses
      .map(normalizePredicate)
      .flatMap((clause) => (clause.op === predicate.op ? clause.clauses : [clause]))
    const byKey = new Map(flattened.map((clause) => [predicateKey(clause), clause]))
    const clauses = [...byKey.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, clause]) => clause)
    if (clauses.length === 1) return clauses[0]
    return { op: predicate.op, clauses }
  }

  if (predicate.op === "not") {
    const clause = normalizePredicate(predicate.clause)
    return clause.op === "not" ? normalizePredicate(clause.clause) : { op: "not", clause }
  }

  if (predicate.op === "in") {
    if (!Array.isArray(predicate.values)) {
      throw new TypeError("The in predicate requires a values array")
    }
    const values = [
      ...new Map(predicate.values.map((value) => [scalarKey(value), value])).entries(),
    ]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, value]) => value)
    return { op: "in", field: predicate.field, values }
  }

  if (predicate.op === "between") {
    return {
      op: "between",
      field: predicate.field,
      min: predicate.min,
      max: predicate.max,
      inclusive: predicate.inclusive !== false,
    }
  }

  if (["eq", "neq", "gte", "lte"].includes(predicate.op)) {
    return { op: predicate.op, field: predicate.field, value: predicate.value }
  }

  throw new Error(`Unsupported predicate op: ${predicate.op}`)
}

function displayDate(value) {
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function displayValue(field, value) {
  if (value === null) return "none"
  if (typeof value === "boolean") return value ? "yes" : "no"
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return displayDate(value)
  }
  if (field === "product.id") return PRODUCT_BY_ID[value]?.name || String(value)
  if (field === "fulfillment.warehouse") {
    return WAREHOUSE_BY_ID[value]?.name || String(value)
  }
  if (field === "fulfillment.carrier") {
    return CARRIER_BY_ID[value]?.name || String(value)
  }
  if (field === "package.design") {
    return PACKAGE_DESIGN_BY_ID[value]?.name || String(value)
  }
  if (field === "return.reason") return RETURN_REASON_LABELS[value] || String(value)
  if (field === "fulfillment.service" || field === "destination.region") {
    const text = String(value)
    return text.charAt(0).toUpperCase() + text.slice(1)
  }
  return String(value)
}

function summarizeClause(predicate, parentOp) {
  const fieldLabel = FIELD_LABELS[predicate.field] || predicate.field
  let summary
  switch (predicate.op) {
    case "eq":
      summary = `${fieldLabel} is ${displayValue(predicate.field, predicate.value)}`
      break
    case "neq":
      summary = `${fieldLabel} is not ${displayValue(predicate.field, predicate.value)}`
      break
    case "in":
      summary = `${fieldLabel} is one of ${predicate.values
        .map((value) => displayValue(predicate.field, value))
        .join(", ")}`
      break
    case "between":
      summary = `${fieldLabel} is ${predicate.inclusive === false ? "after" : "from"} ${displayValue(
        predicate.field,
        predicate.min,
      )} ${predicate.inclusive === false ? "and before" : "through"} ${displayValue(
        predicate.field,
        predicate.max,
      )}`
      break
    case "gte":
      summary = `${fieldLabel} is at least ${displayValue(predicate.field, predicate.value)}`
      break
    case "lte":
      summary = `${fieldLabel} is at most ${displayValue(predicate.field, predicate.value)}`
      break
    case "not":
      summary = `not (${summarizeClause(predicate.clause)})`
      break
    case "and":
    case "or": {
      const joiner = predicate.op === "and" ? " and " : " or "
      summary = predicate.clauses
        .map((clause) => summarizeClause(clause, predicate.op))
        .join(joiner)
      break
    }
    default:
      throw new Error(`Unsupported predicate op: ${predicate.op}`)
  }
  return parentOp && predicate.op !== parentOp && ["and", "or"].includes(predicate.op)
    ? `(${summary})`
    : summary
}

/** Render a predicate as compact, chart-independent prose. */
export function summarizePredicate(predicate) {
  return summarizeClause(normalizePredicate(predicate))
}

/** Return unique semantic fields in first-encounter order. */
export function fieldsUsedByPredicate(predicate) {
  assertPredicate(predicate)
  const fields = []
  const seen = new Set()

  function visit(clause) {
    assertPredicate(clause)
    if (clause.op === "and" || clause.op === "or") {
      if (!Array.isArray(clause.clauses)) {
        throw new TypeError(`The ${clause.op} predicate requires a clauses array`)
      }
      clause.clauses.forEach(visit)
      return
    }
    if (clause.op === "not") {
      visit(clause.clause)
      return
    }
    if (!["eq", "neq", "in", "between", "gte", "lte"].includes(clause.op)) {
      throw new Error(`Unsupported predicate op: ${clause.op}`)
    }
    if (!seen.has(clause.field)) {
      seen.add(clause.field)
      fields.push(clause.field)
    }
  }

  visit(predicate)
  return fields
}

export function rowsMatching(predicate, rowsToFilter = orderRecords, domain = fulfillmentDomain) {
  return rowsToFilter.filter(compilePredicate(domain, predicate))
}

function safeRate(numerator, denominator) {
  return denominator ? numerator / denominator : 0
}

function countReturns(rowsToCount) {
  return rowsToCount.reduce((sum, row) => sum + Number(row.returned), 0)
}

function countDamaged(rowsToCount) {
  return rowsToCount.reduce((sum, row) => sum + Number(row.returnReason === "damaged"), 0)
}

/** Build daily counts, rates, and a seven-calendar-day rolling rate. */
export function aggregateDailyReturnRates(rowsToAggregate = orderRecords) {
  const byDate = new Map()
  for (const row of rowsToAggregate) {
    const entry = byDate.get(row.shipDate) || {
      date: row.shipDate,
      orders: 0,
      returns: 0,
      damagedReturns: 0,
      severeWeatherOrders: 0,
    }
    entry.orders += 1
    entry.returns += Number(row.returned)
    entry.damagedReturns += Number(row.returnReason === "damaged")
    entry.severeWeatherOrders += Number(row.severeWeather)
    byDate.set(row.shipDate, entry)
  }

  const rows = [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date))
  return rows.map((row, index) => {
    const currentTime = parseDate(row.date).getTime()
    const rolling = rows
      .slice(0, index + 1)
      .filter((candidate) => currentTime - parseDate(candidate.date).getTime() < 7 * DAY_MS)
    const rollingOrders = rolling.reduce((sum, candidate) => sum + candidate.orders, 0)
    const rollingReturns = rolling.reduce((sum, candidate) => sum + candidate.returns, 0)
    return {
      ...row,
      dateValue: parseDate(row.date),
      returnRate: safeRate(row.returns, row.orders),
      damageRate: safeRate(row.damagedReturns, row.orders),
      rollingOrders,
      rollingReturns,
      rollingReturnRate: safeRate(rollingReturns, rollingOrders),
      severeWeather: row.severeWeatherOrders > 0,
    }
  })
}

function shelfDimensions(row, dimension) {
  const reasonLabel = RETURN_REASON_LABELS[row.returnReason] || row.returnReason
  if (dimension === "product") {
    return {
      category: row.productName,
      categoryId: row.productId,
      group: reasonLabel,
      groupId: row.returnReason,
      denominatorKey: `product:${row.productId}`,
    }
  }
  if (dimension === "warehouse") {
    return {
      category: row.warehouseName,
      categoryId: row.warehouseId,
      group: reasonLabel,
      groupId: row.returnReason,
      denominatorKey: `warehouse:${row.warehouseId}`,
    }
  }
  return {
    category: reasonLabel,
    categoryId: row.returnReason,
    group: row.productName,
    groupId: row.productId,
    denominatorKey: `product:${row.productId}`,
  }
}

function belongsToDenominator(row, key) {
  const [kind, id] = key.split(":")
  return kind === "warehouse" ? row.warehouseId === id : row.productId === id
}

/**
 * Build the Sorting Shelf's category × group rows.
 *
 * `dimension` may be reason, product, or warehouse. The raw return count is
 * exposed as both `returns` and `value`; `excessReturns` compares that cell to
 * its empirical nonincident reason rate.
 */
export function aggregateSortingShelf(rowsToAggregate = orderRecords, options = {}) {
  const resolvedOptions = typeof options === "string" ? { dimension: options } : options
  const dimension = resolvedOptions.dimension || "reason"
  if (!["reason", "product", "warehouse"].includes(dimension)) {
    throw new Error(`Unsupported Sorting Shelf dimension: ${dimension}`)
  }
  const baselineRows =
    resolvedOptions.baselineRows || rowsMatching({ op: "not", clause: INCIDENT_PREDICATE })
  const groups = new Map()

  for (const row of rowsToAggregate) {
    if (!row.returned) continue
    const dimensions = shelfDimensions(row, dimension)
    const key = `${dimensions.categoryId}|${dimensions.groupId}`
    const group = groups.get(key) || {
      id: `${dimension}:${key}`,
      dimension,
      ...dimensions,
      reason: row.returnReason,
      reasonLabel: RETURN_REASON_LABELS[row.returnReason],
      productId: row.productId,
      productName: row.productName,
      warehouseId: dimension === "warehouse" ? row.warehouseId : undefined,
      warehouseName: dimension === "warehouse" ? row.warehouseName : undefined,
      returns: 0,
      damagedReturns: 0,
    }
    group.returns += 1
    group.damagedReturns += Number(row.returnReason === "damaged")
    groups.set(key, group)
  }

  return [...groups.values()]
    .map((group) => {
      const scopedRows = rowsToAggregate.filter((row) =>
        belongsToDenominator(row, group.denominatorKey),
      )
      const baselineScope = baselineRows.filter(
        (row) =>
          belongsToDenominator(row, group.denominatorKey) && row.returnReason === group.reason,
      )
      const baselineDenominator = baselineRows.filter((row) =>
        belongsToDenominator(row, group.denominatorKey),
      ).length
      const baselineRate = safeRate(baselineScope.length, baselineDenominator)
      const expectedReturns = scopedRows.length * baselineRate
      return {
        ...group,
        orders: scopedRows.length,
        value: group.returns,
        returnRate: safeRate(group.returns, scopedRows.length),
        baselineRate,
        expectedReturns,
        excessReturns: group.returns - expectedReturns,
      }
    })
    .sort(
      (left, right) =>
        right.excessReturns - left.excessReturns ||
        left.category.localeCompare(right.category) ||
        left.group.localeCompare(right.group),
    )
}

const SANKEY_STAGES = Object.freeze([
  { id: "product", field: "product.id" },
  { id: "warehouse", field: "fulfillment.warehouse" },
  { id: "package", field: "package.design" },
  { id: "carrier", field: "fulfillment.carrier" },
  { id: "outcome", field: "return.reason" },
])

function sankeyPathFor(row) {
  const outcomeId = row.returned ? row.returnReason : "kept"
  const outcomeLabel = row.returned ? RETURN_REASON_LABELS[row.returnReason] : "Kept / not returned"
  // Nodes carry only identity (`id`) and display text (`label`). The magnitude
  // of a node is `valueCount`, accumulated in aggregateSankey — a node must NOT
  // define a scalar `value`, since d3-sankey derives node size from edge flow
  // and a categorical `value` here would shadow the numeric count in tooltips.
  return [
    { id: `product:${row.productId}`, label: row.productName },
    { id: `warehouse:${row.warehouseId}`, label: row.warehouseName },
    { id: `package:${row.packageDesignId}`, label: row.packageDesignName },
    { id: `carrier:${row.carrierId}`, label: row.carrierName },
    { id: `outcome:${outcomeId}`, label: outcomeLabel },
  ]
}

/** Build Product → Warehouse → Package → Carrier → Outcome nodes and edges. */
export function aggregateSankey(rowsToAggregate = orderRecords, options = {}) {
  const scopedRows = options.returnedOnly
    ? rowsToAggregate.filter((row) => row.returned)
    : rowsToAggregate
  const nodeMap = new Map()
  const edgeMap = new Map()

  for (const row of scopedRows) {
    const path = sankeyPathFor(row)
    path.forEach((node, stageIndex) => {
      const existing = nodeMap.get(node.id) || {
        ...node,
        stage: SANKEY_STAGES[stageIndex].id,
        stageIndex,
        valueCount: 0,
      }
      existing.valueCount += 1
      nodeMap.set(node.id, existing)
    })
    for (let stageIndex = 0; stageIndex < path.length - 1; stageIndex += 1) {
      const source = path[stageIndex]
      const target = path[stageIndex + 1]
      const id = `${source.id}->${target.id}`
      const edge = edgeMap.get(id) || {
        id,
        source: source.id,
        target: target.id,
        sourceLabel: source.label,
        targetLabel: target.label,
        sourceStage: SANKEY_STAGES[stageIndex].id,
        targetStage: SANKEY_STAGES[stageIndex + 1].id,
        value: 0,
      }
      edge.value += 1
      edgeMap.set(id, edge)
    }
  }

  const nodes = [...nodeMap.values()].sort(
    (left, right) => left.stageIndex - right.stageIndex || left.label.localeCompare(right.label),
  )
  const edges = [...edgeMap.values()].sort(
    (left, right) =>
      left.sourceStage.localeCompare(right.sourceStage) ||
      left.source.localeCompare(right.source) ||
      left.target.localeCompare(right.target),
  )
  return { nodes, edges }
}

export function aggregateSankeyNodes(rowsToAggregate = orderRecords, options = {}) {
  return aggregateSankey(rowsToAggregate, options).nodes
}

export function aggregateSankeyEdges(rowsToAggregate = orderRecords, options = {}) {
  return aggregateSankey(rowsToAggregate, options).edges
}

/** Build product × warehouse × package × carrier evidence points. */
export function aggregateCohortPoints(rowsToAggregate = orderRecords) {
  const groups = new Map()
  for (const row of rowsToAggregate) {
    const id = combinationKey(row.productId, row.warehouseId, row.carrierId, row.packageDesignId)
    const group = groups.get(id) || {
      id,
      productId: row.productId,
      productName: row.productName,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouseName,
      carrierId: row.carrierId,
      carrierName: row.carrierName,
      packageDesignId: row.packageDesignId,
      packageDesignName: row.packageDesignName,
      shipments: 0,
      damagedReturns: 0,
      returns: 0,
    }
    group.shipments += 1
    group.damagedReturns += Number(row.returnReason === "damaged")
    group.returns += Number(row.returned)
    groups.set(id, group)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      n: group.shipments,
      damageRate: safeRate(group.damagedReturns, group.shipments),
      returnRate: safeRate(group.returns, group.shipments),
      adequateVolume: group.shipments >= MINIMUM_OPERATIONAL_VOLUME,
      isFocalInsertB:
        group.productId === FOCAL_PRODUCT_ID &&
        group.warehouseId === FOCAL_WAREHOUSE_ID &&
        group.packageDesignId === FOCAL_PACKAGE_ID,
      isTinyNorthstar: group.id === tinyCohortKey,
      predicate: {
        op: "and",
        clauses: [
          { op: "eq", field: "product.id", value: group.productId },
          {
            op: "eq",
            field: "fulfillment.warehouse",
            value: group.warehouseId,
          },
          { op: "eq", field: "package.design", value: group.packageDesignId },
          {
            op: "eq",
            field: "fulfillment.carrier",
            value: group.carrierId,
          },
        ],
      },
    }))
    .sort(
      (left, right) =>
        right.damageRate - left.damageRate ||
        right.shipments - left.shipments ||
        left.id.localeCompare(right.id),
    )
}

/** Build product × package cells for the Knowledge Lab heatmap. */
export function aggregateProductPackageHeatmap(rowsToAggregate = orderRecords) {
  const groups = new Map()
  for (const row of rowsToAggregate) {
    const id = `${row.productId}|${row.packageDesignId}`
    const group = groups.get(id) || {
      id,
      productId: row.productId,
      productName: row.productName,
      packageDesignId: row.packageDesignId,
      packageDesignName: row.packageDesignName,
      shipments: 0,
      damagedReturns: 0,
      returns: 0,
    }
    group.shipments += 1
    group.damagedReturns += Number(row.returnReason === "damaged")
    group.returns += Number(row.returned)
    groups.set(id, group)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      orders: group.shipments,
      damageRate: safeRate(group.damagedReturns, group.shipments),
      returnRate: safeRate(group.returns, group.shipments),
      value: safeRate(group.damagedReturns, group.shipments),
      numeratorLabel: `${group.damagedReturns} / ${group.shipments}`,
      isFocus: group.productId === FOCAL_PRODUCT_ID && group.packageDesignId === FOCAL_PACKAGE_ID,
      predicate: {
        op: "and",
        clauses: [
          { op: "eq", field: "product.id", value: group.productId },
          { op: "eq", field: "package.design", value: group.packageDesignId },
        ],
      },
    }))
    .sort(
      (left, right) =>
        PRODUCTS.findIndex((product) => product.id === left.productId) -
          PRODUCTS.findIndex((product) => product.id === right.productId) ||
        PACKAGE_DESIGNS.findIndex((design) => design.id === left.packageDesignId) -
          PACKAGE_DESIGNS.findIndex((design) => design.id === right.packageDesignId),
    )
}

const incidentRows = rowsMatching(INCIDENT_PREDICATE)
const baselineRows = rowsMatching({ op: "not", clause: INCIDENT_PREDICATE })
const focalRows = rowsMatching(FOCAL_INSERT_B_PREDICATE)
const swiftShipWithoutInsertBRows = rowsMatching(SWIFTSHIP_WITHOUT_INSERT_B_PREDICATE)
const tinyNorthstarRows = rowsMatching(TINY_NORTHSTAR_PREDICATE)

const insertBByCarrier = CARRIERS.map((carrier) => {
  const rows = focalRows.filter((row) => row.carrierId === carrier.id)
  const damagedReturns = countDamaged(rows)
  return Object.freeze({
    carrierId: carrier.id,
    carrierName: carrier.name,
    orders: rows.length,
    damagedReturns,
    damageRate: safeRate(damagedReturns, rows.length),
  })
})

/** Exact evidence totals used by tutorial copy and audits. */
export const STORY_STATS = Object.freeze({
  totalOrders: orderRecords.length,
  completedShipments: orderRecords.length,
  totalReturns: countReturns(orderRecords),
  totalReturnRate: safeRate(countReturns(orderRecords), orderRecords.length),
  baselineOrders: baselineRows.length,
  baselineReturns: countReturns(baselineRows),
  baselineReturnRate: safeRate(countReturns(baselineRows), baselineRows.length),
  baselineDamagedReturns: countDamaged(baselineRows),
  baselineDamageRate: safeRate(countDamaged(baselineRows), baselineRows.length),
  incidentOrders: incidentRows.length,
  incidentReturns: countReturns(incidentRows),
  incidentDamagedReturns: countDamaged(incidentRows),
  incidentReturnRate: safeRate(countReturns(incidentRows), incidentRows.length),
  focalInsertBOrders: focalRows.length,
  focalInsertBDamagedReturns: countDamaged(focalRows),
  insertBDamageRate: safeRate(countDamaged(focalRows), focalRows.length),
  insertBByCarrier: Object.freeze(insertBByCarrier),
  insertBRateByCarrier: Object.freeze(insertBByCarrier.map((entry) => entry.damageRate)),
  swiftShipWithoutInsertBOrders: swiftShipWithoutInsertBRows.length,
  swiftShipWithoutInsertBDamagedReturns: countDamaged(swiftShipWithoutInsertBRows),
  swiftShipWithoutInsertBDamageRate: safeRate(
    countDamaged(swiftShipWithoutInsertBRows),
    swiftShipWithoutInsertBRows.length,
  ),
  lowVolumeNorthstarCohort: Object.freeze({
    n: tinyNorthstarRows.length,
    damagedReturns: countDamaged(tinyNorthstarRows),
    damageRate: safeRate(countDamaged(tinyNorthstarRows), tinyNorthstarRows.length),
  }),
  minimumOperationalVolume: MINIMUM_OPERATIONAL_VOLUME,
})

export const dailyReturnRates = Object.freeze(aggregateDailyReturnRates())
export const incidentRowsForStory = Object.freeze(incidentRows)
export const baselineRowsForStory = Object.freeze(baselineRows)
export const incidentSortingShelfRows = Object.freeze(aggregateSortingShelf(incidentRows))
export const incidentSankey = Object.freeze(aggregateSankey(incidentRows, { returnedOnly: true }))
export const cohortPoints = Object.freeze(aggregateCohortPoints())
export const productPackageHeatmap = Object.freeze(aggregateProductPackageHeatmap())
