import * as React from "react"
import type {
  CircuitGeometry,
  CircuitModuleKind,
  CircuitReading,
  CircuitEdition
} from "./flowCircuitTypes"

const h = React.createElement
export const circuitColors = {
  observed: "#387e98",
  modeled: "#946344",
  residual: "#a56537",
  muted: "#778796",
  alarm: "#bb5149"
}
export const circuitNumber = (value: number | null) =>
  value === null
    ? "unmeasured"
    : value >= 1000000
      ? `${Number((value / 1000000).toFixed(2))}m`
      : value >= 1000
        ? `${Number((value / 1000).toFixed(1))}k`
        : String(value)

const symbols: Record<CircuitModuleKind, string> = {
  stage: "M-5,0 H5",
  distributor: "M-5,0 H0 M0,0 L6,-5 M0,0 H6 M0,0 L6,5",
  queue: "M-6,-5 V5 H6 V-5 M-3,2 H3",
  retry: "M-5,2 A5,5 0 1,1 4,3 M4,-1 V4 H0",
  "join-all": "M-6,-4 L0,0 L6,0 M-6,4 L0,0 M2,-5 V5",
  selector: "M-6,-4 L0,0 L6,0 M-6,4 L0,0 M1,-4 L5,0 L1,4",
  dependency: "M-5,-5 H5 V5 H-5 Z M-2,-2 L2,2 M-2,2 L2,-2",
  junction: "M0,-6 L6,0 L0,6 L-6,0 Z"
}
const names: Record<CircuitModuleKind, string> = {
  stage: "stage",
  distributor: "distributor",
  queue: "FIFO queue",
  retry: "retry episode",
  "join-all": "all-member join",
  selector: "first success",
  dependency: "dependency gate",
  junction: "unclassified junction"
}

export function circuitModuleChrome(
  geometry: CircuitGeometry,
  reading: CircuitReading,
  color: string,
  text: string,
  selected?: string
) {
  const queues = Object.values(reading.entry.nodes).map(
    (node) => node.queued ?? 0
  )
  const queueScale = Math.max(1, ...queues)
  return geometry.modules.map((region) => {
    const { module, x, y, width, height, queue } = region
    const value = reading.entry.nodes[module.nodeId]
    const accent =
      selected === module.nodeId
        ? color
        : (value.queued ?? 0) > 0
          ? circuitColors.alarm
          : circuitColors.muted
    const cx = x + width / 2
    const unit =
      module.semantics.unit === "records"
        ? "rec"
        : module.semantics.unit === "attempts"
          ? "att"
          : "roots"
    const rateLabel =
      value.capacity !== null
        ? `${circuitNumber(value.completions)} / ${circuitNumber(value.capacity)} ${unit}/s`
        : value.completions !== null
          ? `${circuitNumber(value.completions)} ${unit}/s complete`
          : `${circuitNumber(value.arrivals)} ${unit}/s offered`
    return h(
      "g",
      {
        key: module.id,
        "data-circuit-module": module.nodeId,
        "data-module-kind": module.kind,
        "data-queued": value.queued ?? "unmeasured"
      },
      h("rect", {
        x,
        y,
        width,
        height,
        fill: "none",
        stroke: accent,
        strokeWidth: selected === module.nodeId ? 2.5 : 1
      }),
      h("path", {
        d: symbols[module.kind],
        transform: `translate(${x + 10},${y + 12})`,
        stroke: accent,
        fill: "none",
        strokeWidth: 1.4
      }),
      h(
        "text",
        {
          x: cx + 5,
          y: y + 16,
          textAnchor: "middle",
          fontSize: width < 110 ? 9 : 11,
          fontWeight: 600,
          fill: text
        },
        module.semantics.label
      ),
      h(
        "text",
        { x: cx, y: y + 28, textAnchor: "middle", fontSize: 8, fill: text },
        names[module.kind]
      ),
      h(
        "text",
        {
          x: cx,
          y: y + 41,
          textAnchor: "middle",
          fontSize: width < 110 ? 7 : 9,
          fill: text
        },
        rateLabel
      ),
      h(
        "text",
        {
          x: cx,
          y: y + height - 13,
          textAnchor: "middle",
          fontSize: 8,
          fill: text
        },
        `Queue ${circuitNumber(value.queued)}`
      ),
      value.queued !== null
        ? h("rect", {
            ...queue,
            width: (queue.width * value.queued) / queueScale,
            fill: accent,
            "data-circuit-gauge": "queue"
          })
        : null,
      h("rect", {
        ...region.sensor,
        fill: color,
        "data-circuit-sensor": module.nodeId
      }),
      module.semantics.dependencyNodeIds?.length
        ? h(
            "text",
            {
              x: cx,
              y: y - 8,
              fontSize: 8,
              textAnchor: "middle",
              fill: text,
              "data-circuit-dependency": module.nodeId
            },
            `Requires ${module.semantics.dependencyNodeIds.join(", ")}`
          )
        : null
    )
  })
}

export function circuitHistoryChrome(
  geometry: CircuitGeometry,
  edition: CircuitEdition,
  reading: CircuitReading,
  color: string,
  text: string,
  selected?: string
) {
  const { history } = geometry
  const module = geometry.modules.find(
    (region) => region.module.nodeId === selected
  )?.module
  const metric = edition.unit === "records" ? "queued" : "attempts"
  const values = edition.entries.map((entry) =>
    module
      ? entry.nodes[module.nodeId][
          edition.unit === "records" ? "queued" : "arrivals"
        ]
      : entry.totals[metric]
  )
  const max = Math.max(1, ...values.map((value) => value ?? 0))
  const start = edition.entries[0].at
  const end = edition.entries[edition.entries.length - 1].at
  const x = (at: number) =>
    history.x + ((at - start) / Math.max(1, end - start)) * history.width
  let path = ""
  let connected = false
  for (const [index, entry] of edition.entries.entries()) {
    if (values[index] === null) {
      connected = false
      continue
    }
    const y =
      history.y + history.height - (values[index]! / max) * history.height
    path += `${connected ? " H" : "M"}${x(entry.at)}${connected ? ` V${y}` : `,${y}`}`
    connected = true
  }
  return h(
    "g",
    { "data-circuit-history": metric, "data-history-module": module?.nodeId },
    h(
      "text",
      { x: history.x, y: history.y - 9, fill: text, fontSize: 10 },
      module
        ? `${module.semantics.label} · ${metric === "queued" ? `queued ${module.semantics.unit}` : `offered ${module.semantics.unit}/s`} · aggregate observations`
        : metric === "queued"
          ? "Queued records · aggregate observations"
          : "Offered attempts/s · aggregate observations"
    ),
    h("path", { d: path, fill: "none", stroke: color, strokeWidth: 2 }),
    h("line", {
      x1: x(reading.observedAt),
      x2: x(reading.observedAt),
      y1: history.y,
      y2: history.y + history.height,
      stroke: text,
      strokeDasharray: "3 3",
      "data-circuit-cursor": reading.observedAt
    }),
    ...edition.entries.map((entry) =>
      h(
        "text",
        {
          key: entry.id,
          x: x(entry.at),
          y: history.y + history.height + 14,
          textAnchor: "middle",
          fontSize: 9,
          fill: text
        },
        `${entry.at}s`
      )
    )
  )
}
