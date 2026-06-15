// ─────────────────────────────────────────────────────────────────────────
// Grounded in real `describe()` structure:
//   • Topics and processors are both nodes (a KSTREAM-SOURCE processor reads
//     a topic node; a KSTREAM-SINK processor writes one).
//   • Processor names follow the real auto-generated convention:
//     `<PREFIX>-<10-digit monotonic counter>` (e.g. KSTREAM-AGGREGATE-0000000007),
//     drawn from a single counter that increases across the whole build and
//     is shared with state stores.
//   • State stores attach only to the processor that owns them
//     (KSTREAM-AGGREGATE-STATE-STORE-NNNN, KSTREAM-JOINTHIS-NNNN-store,
//     KTABLE-SUPPRESS-STATE-STORE-NNNN, or user-named like "hourly-revenue").
//   • Re-keying before a stateful op inserts a repartition bridge: a Sink to
//     an internal `<app>-…-repartition` topic in one sub-topology, re-read by
//     a Source in the next — the topic-bridge node is the join between them.
//   • A stream-stream join expands to two KSTREAM-WINDOWED sides whose stores
//     cross-reference, a JOINTHIS / JOINOTHER pair, and a KSTREAM-MERGE fan-in.
//
// App: `ecommerce-analytics` — clickstream / order analytics, ~10 sub-topologies.
// ─────────────────────────────────────────────────────────────────────────

const APP_ID = "ecommerce-analytics"

// Map an auto-name prefix (or role) to the ProcessorSemantic that drives the
// node's glyph icon. Mirrors the research catalog.
const SEMANTIC_BY_PREFIX = {
  "KSTREAM-SOURCE": "source",
  "KTABLE-SOURCE": "source",
  "KSTREAM-GLOBALTABLE": "source",
  "KSTREAM-SINK": "sink",
  "KSTREAM-FILTER": "filter",
  "KTABLE-FILTER": "filter",
  "KSTREAM-MAP": "map",
  "KSTREAM-MAPVALUES": "map",
  "KSTREAM-FLATMAPVALUES": "map",
  "KTABLE-MAPVALUES": "map",
  "KSTREAM-KEY-SELECT": "select",
  "KSTREAM-BRANCH": "processor",
  "KSTREAM-BRANCHCHILD": "processor",
  "KSTREAM-MERGE": "merge",
  "KTABLE-MERGE": "merge",
  "KSTREAM-WINDOWED": "processor",
  "KSTREAM-JOINTHIS": "join-this",
  "KSTREAM-OUTERTHIS": "join-this",
  "KSTREAM-JOINOTHER": "join-other",
  "KSTREAM-OUTEROTHER": "join-other",
  "KSTREAM-JOIN": "join-this",
  "KSTREAM-AGGREGATE": "aggregate",
  "KTABLE-AGGREGATE": "aggregate",
  "KSTREAM-REDUCE": "reduce",
  "KTABLE-JOINTHIS": "join-this",
  "KTABLE-JOINOTHER": "join-other",
  "KTABLE-SUPPRESS": "suppress",
  "KTABLE-TOSTREAM": "tostream",
  "KSTREAM-PROCESSOR": "processor",
  "KSTREAM-PEEK": "processor",
}

/**
 * Builder that accumulates GraphNode[] / GraphEdge[] with a shared,
 * monotonically increasing 10-digit counter (the real Streams convention).
 */
function createBuilder() {
  let counter = 0
  const next = () => String(counter++).padStart(10, "0")

  /** name -> node (topics are de-duplicated; processors are unique) */
  const nodeById = new Map()
  const edges = []
  let edgeSeq = 0

  function ensureTopic(name, partition) {
    let n = nodeById.get(name)
    if (!n) {
      n = {
        id: name,
        label: name,
        partition, // topic-source | topic-sink | topic-bridge
        semantic:
          partition === "topic-source"
            ? "source"
            : partition === "topic-sink"
              ? "sink"
              : "processor",
        subtopologyId: null,
        subtopologyIds: [],
        stores: [],
        topicName: name,
        inDegree: 0,
        outDegree: 0,
        depth: 0,
        height: 0,
      }
      nodeById.set(name, n)
    }
    // A repartition topic is written by one sub-topology and read by another;
    // keep the most "internal" classification once it's seen as a bridge.
    if (partition === "topic-bridge") n.partition = "topic-bridge"
    return n
  }

  function addProcessor(prefix, subtopologyId, opts = {}) {
    const id = opts.name || `${prefix}-${next()}`
    // A user-named/Materialized node still consumes a counter slot.
    if (opts.name) next()
    const node = {
      id,
      label: opts.label || id,
      partition: "processor",
      semantic: opts.semantic || SEMANTIC_BY_PREFIX[prefix] || "processor",
      subtopologyId,
      subtopologyIds: [subtopologyId],
      stores: opts.stores || [],
      inDegree: 0,
      outDegree: 0,
      depth: 0,
      height: 0,
    }
    nodeById.set(id, node)
    return node
  }

  function connect(sourceId, targetId, subtopologyId, edgeType) {
    edges.push({
      id: `e${edgeSeq++}`,
      source: sourceId,
      target: targetId,
      edgeType: edgeType || "internal",
      subtopologyId: subtopologyId ?? null,
      weight: 1,
    })
  }

  /** Reserve a state-store name off the counter, matching the auto convention. */
  function aggStore() {
    return `KSTREAM-AGGREGATE-STATE-STORE-${next()}`
  }
  function suppressStore() {
    return `KTABLE-SUPPRESS-STATE-STORE-${next()}`
  }

  return { ensureTopic, addProcessor, connect, aggStore, suppressStore, next, nodeById, edges }
}

/**
 * Emit a linear chain of processors through a sub-topology, returning the
 * first and last processor node so callers can wire bridges/joins.
 *
 * `steps` is an array of { prefix, semantic?, stores?, name?, label? }.
 */
function chain(b, subId, steps) {
  let prev = null
  let first = null
  for (const step of steps) {
    const node = b.addProcessor(step.prefix, subId, step)
    if (prev) b.connect(prev.id, node.id, subId)
    else first = node
    prev = node
  }
  return { first, last: prev }
}

/** A source topic → KSTREAM-SOURCE processor. Returns the source processor. */
function sourceFromTopic(b, subId, topicName, partition = "topic-source") {
  const topic = b.ensureTopic(topicName, partition)
  const src = b.addProcessor("KSTREAM-SOURCE", subId)
  b.connect(topic.id, src.id, subId, partition === "topic-bridge" ? "topic-bridge" : "internal")
  return src
}

/** KSTREAM-SINK processor → sink/bridge topic. Returns the sink topic node. */
function sinkToTopic(b, subId, fromNode, topicName, partition = "topic-sink") {
  const sink = b.addProcessor("KSTREAM-SINK", subId)
  b.connect(fromNode.id, sink.id, subId)
  const topic = b.ensureTopic(topicName, partition)
  b.connect(sink.id, topic.id, subId, partition === "topic-bridge" ? "topic-bridge" : "internal")
  return topic
}

// ── The application ────────────────────────────────────────────────────────

/**
 * Build the full `ecommerce-analytics` topology. `variant: 2` produces a
 * second snapshot (a topology evolution) for the animated-diff control:
 * it adds a fraud-scoring sub-topology and a suppress step, and drops the
 * legacy peek processor — so nodes/edges enter, move, and exit.
 */
export function buildEcommerceTopology(variant = 1) {
  const b = createBuilder()

  // 0 — Pageview enrichment + sessionization (rekey → repartition → aggregate)
  {
    const src = sourceFromTopic(b, 0, "pageviews")
    const pre = chain(b, 0, [
      { prefix: "KSTREAM-FILTER", label: "drop-bots" },
      { prefix: "KSTREAM-MAPVALUES", label: "normalize" },
      { prefix: "KSTREAM-KEY-SELECT", label: "by-user" },
    ])
    b.connect(src.id, pre.first.id, 0)
    sinkToTopic(b, 0, pre.last, `${APP_ID}-pageview-sessions-repartition`, "topic-bridge")

    const rsrc = sourceFromTopic(b, 1, `${APP_ID}-pageview-sessions-repartition`, "topic-bridge")
    const agg = b.addProcessor("KSTREAM-AGGREGATE", 1, {
      stores: ["pageview-sessions"],
      label: "sessionize",
    })
    b.connect(rsrc.id, agg.id, 1)
    const toStream = b.addProcessor("KTABLE-TOSTREAM", 1)
    b.connect(agg.id, toStream.id, 1)
    sinkToTopic(b, 1, toStream, "enriched-pageviews")
  }

  // 2 — Click ⋈ pageview windowed stream-stream join
  {
    const leftSrc = sourceFromTopic(b, 2, "clicks")
    const leftKey = b.addProcessor("KSTREAM-KEY-SELECT", 2, { label: "by-page" })
    b.connect(leftSrc.id, leftKey.id, 2)
    const rightSrc = sourceFromTopic(b, 2, "enriched-pageviews")
    const rightKey = b.addProcessor("KSTREAM-KEY-SELECT", 2, { label: "by-page" })
    b.connect(rightSrc.id, rightKey.id, 2)

    // Two windowed sides whose stores cross-reference, JOINTHIS/JOINOTHER, MERGE.
    const thisStore = `KSTREAM-JOINTHIS-${b.next()}-store`
    const otherStore = `KSTREAM-JOINOTHER-${b.next()}-store`
    const wThis = b.addProcessor("KSTREAM-WINDOWED", 2, { stores: [thisStore] })
    const wOther = b.addProcessor("KSTREAM-WINDOWED", 2, { stores: [otherStore] })
    b.connect(leftKey.id, wThis.id, 2)
    b.connect(rightKey.id, wOther.id, 2)
    const jThis = b.addProcessor("KSTREAM-JOINTHIS", 2, { stores: [otherStore] })
    const jOther = b.addProcessor("KSTREAM-JOINOTHER", 2, { stores: [thisStore] })
    b.connect(wThis.id, jThis.id, 2)
    b.connect(wOther.id, jOther.id, 2)
    const merge = b.addProcessor("KSTREAM-MERGE", 2)
    b.connect(jThis.id, merge.id, 2)
    b.connect(jOther.id, merge.id, 2)
    const mv = b.addProcessor("KSTREAM-MAPVALUES", 2, { label: "click-context" })
    b.connect(merge.id, mv.id, 2)
    sinkToTopic(b, 2, mv, "click-context")
  }

  // 3 — Cart enrichment (KStream-KTable join with user-profiles)
  {
    const tableSrc = sourceFromTopic(b, 3, "user-profiles")
    const ktSource = b.addProcessor("KTABLE-SOURCE", 3, {
      stores: ["user-profiles-store"],
      label: "user-profiles",
    })
    b.connect(tableSrc.id, ktSource.id, 3)

    const src = sourceFromTopic(b, 3, "add-to-cart")
    const key = b.addProcessor("KSTREAM-KEY-SELECT", 3, { label: "by-user" })
    b.connect(src.id, key.id, 3)
    sinkToTopic(b, 3, key, `${APP_ID}-cart-by-user-repartition`, "topic-bridge")

    const rsrc = sourceFromTopic(b, 4, `${APP_ID}-cart-by-user-repartition`, "topic-bridge")
    const join = b.addProcessor("KSTREAM-JOIN", 4, {
      stores: ["user-profiles-store"],
      label: "enrich-cart",
    })
    b.connect(rsrc.id, join.id, 4)
    b.connect(ktSource.id, join.id, 4, "cross-subtopology")
    const mv = b.addProcessor("KSTREAM-MAPVALUES", 4)
    b.connect(join.id, mv.id, 4)
    sinkToTopic(b, 4, mv, "enriched-cart")
  }

  // 5 — Checkout funnel branching
  {
    const src = sourceFromTopic(b, 5, "checkout")
    const branch = b.addProcessor("KSTREAM-BRANCH", 5, { label: "funnel-split" })
    b.connect(src.id, branch.id, 5)
    for (const [name, topic] of [
      ["completed", "funnel-completed"],
      ["abandoned", "funnel-abandoned"],
      ["payment-failed", "funnel-failed"],
    ]) {
      const child = b.addProcessor("KSTREAM-BRANCHCHILD", 5, { label: name })
      b.connect(branch.id, child.id, 5)
      const mv = b.addProcessor("KSTREAM-MAPVALUES", 5)
      b.connect(child.id, mv.id, 5)
      sinkToTopic(b, 5, mv, topic)
    }
  }

  // 6 — Hourly revenue aggregation with suppress (tumbling window)
  {
    const src = sourceFromTopic(b, 6, "orders")
    const filt = b.addProcessor("KSTREAM-FILTER", 6, { label: "confirmed-only" })
    b.connect(src.id, filt.id, 6)
    const key = b.addProcessor("KSTREAM-KEY-SELECT", 6, { label: "by-category" })
    b.connect(filt.id, key.id, 6)
    sinkToTopic(b, 6, key, `${APP_ID}-revenue-by-category-repartition`, "topic-bridge")

    const rsrc = sourceFromTopic(b, 7, `${APP_ID}-revenue-by-category-repartition`, "topic-bridge")
    const agg = b.addProcessor("KSTREAM-AGGREGATE", 7, {
      stores: ["hourly-revenue"],
      label: "sum-revenue",
    })
    b.connect(rsrc.id, agg.id, 7)
    if (variant === 2) {
      // V2 adds a suppress stage before emitting (window-close semantics).
      const sup = b.addProcessor("KTABLE-SUPPRESS", 7, {
        stores: [b.suppressStore()],
        label: "until-close",
      })
      b.connect(agg.id, sup.id, 7)
      const toStream = b.addProcessor("KTABLE-TOSTREAM", 7)
      b.connect(sup.id, toStream.id, 7)
      sinkToTopic(b, 7, toStream, "hourly-revenue-out")
    } else {
      const toStream = b.addProcessor("KTABLE-TOSTREAM", 7)
      b.connect(agg.id, toStream.id, 7)
      sinkToTopic(b, 7, toStream, "hourly-revenue-out")
    }
  }

  // 8 — Order validation (inventory reservation, persistent store)
  {
    const tableSrc = sourceFromTopic(b, 8, "inventory")
    const ktSource = b.addProcessor("KTABLE-SOURCE", 8, {
      stores: ["inventory-store"],
      label: "inventory",
    })
    b.connect(tableSrc.id, ktSource.id, 8)

    const src = sourceFromTopic(b, 8, "orders")
    const key = b.addProcessor("KSTREAM-KEY-SELECT", 8, { label: "by-product" })
    b.connect(src.id, key.id, 8)
    const filt = b.addProcessor("KSTREAM-FILTER", 8, { label: "created-only" })
    b.connect(key.id, filt.id, 8)
    sinkToTopic(b, 8, filt, `${APP_ID}-orders-by-product-repartition`, "topic-bridge")

    const rsrc = sourceFromTopic(b, 9, `${APP_ID}-orders-by-product-repartition`, "topic-bridge")
    const join = b.addProcessor("KSTREAM-JOIN", 9, {
      stores: ["inventory-store"],
      label: "check-stock",
    })
    b.connect(rsrc.id, join.id, 9)
    b.connect(ktSource.id, join.id, 9, "cross-subtopology")
    const proc = b.addProcessor("KSTREAM-PROCESSOR", 9, {
      stores: ["store-of-reserved-stock"],
      label: "reserve-stock",
    })
    b.connect(join.id, proc.id, 9)
    sinkToTopic(b, 9, proc, "order-validations")

    // Static-graph cycle (allowed: edges still move forward in event time).
    // A reconciliation path repartitions reserved-stock adjustments back into
    // the upstream "created-only" filter — closing a bridge-topic loop that
    // dagLayoutFromGraph flags as a back-edge and the recipe renders distinctly.
    const reconcile = b.addProcessor("KSTREAM-MAPVALUES", 9, { label: "reconcile-stock" })
    b.connect(proc.id, reconcile.id, 9)
    const rsink = b.addProcessor("KSTREAM-SINK", 9)
    b.connect(reconcile.id, rsink.id, 9)
    const recTopic = b.ensureTopic(`${APP_ID}-stock-reconcile-repartition`, "topic-bridge")
    b.connect(rsink.id, recTopic.id, 9, "topic-bridge")
    const fbSrc = b.addProcessor("KSTREAM-SOURCE", 8)
    b.connect(recTopic.id, fbSrc.id, 8, "topic-bridge")
    b.connect(fbSrc.id, filt.id, 8, "cross-subtopology") // closes the cycle
  }

  // 10 — Payments ⋈ orders outer join (anomaly detection)
  {
    const leftSrc = sourceFromTopic(b, 10, "payments")
    const leftKey = b.addProcessor("KSTREAM-KEY-SELECT", 10, { label: "by-order" })
    b.connect(leftSrc.id, leftKey.id, 10)
    const rightSrc = sourceFromTopic(b, 10, "orders")
    const rightKey = b.addProcessor("KSTREAM-KEY-SELECT", 10, { label: "by-order" })
    b.connect(rightSrc.id, rightKey.id, 10)
    const thisStore = `KSTREAM-OUTERTHIS-${b.next()}-store`
    const otherStore = `KSTREAM-OUTEROTHER-${b.next()}-store`
    const wThis = b.addProcessor("KSTREAM-WINDOWED", 10, { stores: [thisStore] })
    const wOther = b.addProcessor("KSTREAM-WINDOWED", 10, { stores: [otherStore] })
    b.connect(leftKey.id, wThis.id, 10)
    b.connect(rightKey.id, wOther.id, 10)
    const jThis = b.addProcessor("KSTREAM-OUTERTHIS", 10, { stores: [otherStore] })
    const jOther = b.addProcessor("KSTREAM-OUTEROTHER", 10, { stores: [thisStore] })
    b.connect(wThis.id, jThis.id, 10)
    b.connect(wOther.id, jOther.id, 10)
    const merge = b.addProcessor("KSTREAM-MERGE", 10)
    b.connect(jThis.id, merge.id, 10)
    b.connect(jOther.id, merge.id, 10)
    const filt = b.addProcessor("KSTREAM-FILTER", 10, { label: "unmatched" })
    b.connect(merge.id, filt.id, 10)
    if (variant === 1) {
      // V1-only diagnostic peek; removed in V2.
      const peek = b.addProcessor("KSTREAM-PEEK", 10, { label: "log-anomaly" })
      b.connect(filt.id, peek.id, 10)
      sinkToTopic(b, 10, peek, "payment-anomalies")
    } else {
      sinkToTopic(b, 10, filt, "payment-anomalies")
    }
  }

  // 11 — Top-N products (V2 only: a new fraud/popularity sub-topology)
  if (variant === 2) {
    const src = sourceFromTopic(b, 11, "enriched-pageviews")
    const map = b.addProcessor("KSTREAM-MAP", 11, { label: "by-product" })
    b.connect(src.id, map.id, 11)
    sinkToTopic(b, 11, map, `${APP_ID}-product-views-repartition`, "topic-bridge")
    const rsrc = sourceFromTopic(b, 12, `${APP_ID}-product-views-repartition`, "topic-bridge")
    const count = b.addProcessor("KSTREAM-AGGREGATE", 12, {
      stores: ["product-view-count"],
      label: "count",
    })
    b.connect(rsrc.id, count.id, 12)
    const top = b.addProcessor("KSTREAM-AGGREGATE", 12, {
      stores: ["top-ten-products"],
      label: "top-ten",
    })
    b.connect(count.id, top.id, 12)
    const toStream = b.addProcessor("KTABLE-TOSTREAM", 12)
    b.connect(top.id, toStream.id, 12)
    sinkToTopic(b, 12, toStream, "top-products")
  }

  const nodes = Array.from(b.nodeById.values())

  // Degree bookkeeping (the data model carries inDegree/outDegree).
  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (const e of b.edges) {
    const s = byId.get(e.source)
    const t = byId.get(e.target)
    if (s) s.outDegree++
    if (t) t.inDegree++
  }

  return { nodes, edges: b.edges }
}

/** A synthetic large topology (~N processor nodes) for the perf note. */
export function buildSyntheticTopology(targetNodes = 1000) {
  const b = createBuilder()
  const perSub = 10
  const subs = Math.ceil(targetNodes / perSub)
  let prevSinkTopic = null
  for (let s = 0; s < subs; s++) {
    const inTopic = prevSinkTopic || `synthetic-input-${s}`
    const src = sourceFromTopic(b, s, inTopic, prevSinkTopic ? "topic-bridge" : "topic-source")
    const c = chain(b, s, [
      { prefix: "KSTREAM-FILTER" },
      { prefix: "KSTREAM-MAPVALUES" },
      { prefix: "KSTREAM-KEY-SELECT" },
      { prefix: "KSTREAM-AGGREGATE", stores: [b.aggStore()] },
      { prefix: "KTABLE-TOSTREAM" },
    ])
    b.connect(src.id, c.first.id, s)
    const outTopic = `${APP_ID}-stage-${s}-repartition`
    sinkToTopic(b, s, c.last, outTopic, "topic-bridge")
    prevSinkTopic = outTopic
    if (b.nodeById.size >= targetNodes) break
  }
  const nodes = Array.from(b.nodeById.values())
  return { nodes, edges: b.edges }
}

export const topologyV1 = buildEcommerceTopology(1)
export const topologyV2 = buildEcommerceTopology(2)
export { APP_ID }
