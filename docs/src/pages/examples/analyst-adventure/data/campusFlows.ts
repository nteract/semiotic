export interface CampusPoint {
  id: string
  name: string
  coordinates: [number, number]
  kind: "building" | "relay" | "bunker" | "tunnel" | "projector"
}

export interface BadgePacketFlow {
  id: string
  source: string
  target: string
  packets: number
  latencyMs: number
  firstObservedAt: Date
  lastObservedAt: Date
}

const observed = (time: string) => new Date(`1984-06-04T${time}:00.000Z`)

export function createCampusArea(
  id: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
): GeoJSON.Feature<GeoJSON.Polygon, { id: string; label: string }> {
  return {
    type: "Feature",
    id,
    properties: { id, label },
    geometry: {
      type: "Polygon",
      // d3-geo treats clockwise exterior rings as the bounded region. Keeping
      // this winding prevents the projection from fitting the globe-sized
      // complement of these small fictional districts.
      coordinates: [
        [
          [x - width / 2, y - height / 2],
          [x - width / 2, y + height / 2],
          [x + width / 2, y + height / 2],
          [x + width / 2, y - height / 2],
          [x - width / 2, y - height / 2],
        ],
      ],
    },
  }
}

export const campusAreas = [
  createCampusArea("hq-campus", "Zorkcorp campus", 28, 52, 24, 30),
  createCampusArea("continuity-zone", "Continuity zone", 76, 24, 18, 14),
  createCampusArea("display-district", "Display-service district", 88, 47, 12, 18),
]

export const campusPoints: CampusPoint[] = [
  {
    id: "zorkcorp-hq",
    name: "Zorkcorp HQ",
    coordinates: [22, 48],
    kind: "building",
  },
  {
    id: "b2-maintenance-relay",
    name: "B2 Maintenance Relay",
    coordinates: [24, 61],
    kind: "relay",
  },
  {
    id: "hq-router",
    name: "HQ Router",
    coordinates: [36, 45],
    kind: "relay",
  },
  {
    id: "offsite-continuity-bunker",
    name: "Offsite Continuity Bunker",
    coordinates: [76, 24],
    kind: "bunker",
  },
  {
    id: "badge-display-service",
    name: "Badge Display Service",
    coordinates: [88, 47],
    kind: "projector",
  },
  {
    id: "service-tunnel-marker",
    name: "Unlabeled maintenance marker",
    coordinates: [31, 72],
    kind: "tunnel",
  },
]

export const badgePacketFlows: BadgePacketFlow[] = [
  {
    id: "b2-to-hq",
    source: "b2-maintenance-relay",
    target: "hq-router",
    packets: 14,
    latencyMs: 12,
    firstObservedAt: observed("09:12"),
    lastObservedAt: observed("09:18"),
  },
  {
    id: "hq-to-bunker",
    source: "hq-router",
    target: "offsite-continuity-bunker",
    packets: 14,
    latencyMs: 86,
    firstObservedAt: observed("09:12"),
    lastObservedAt: observed("09:18"),
  },
  {
    id: "bunker-to-display",
    source: "offsite-continuity-bunker",
    target: "badge-display-service",
    packets: 14,
    latencyMs: 31,
    firstObservedAt: observed("09:12"),
    lastObservedAt: observed("09:18"),
  },
  {
    id: "cafeteria-heartbeat",
    source: "zorkcorp-hq",
    target: "hq-router",
    packets: 3,
    latencyMs: 4,
    firstObservedAt: observed("09:10"),
    lastObservedAt: observed("09:18"),
  },
]

export function traceRouteToDisplay(
  flows: readonly BadgePacketFlow[] = badgePacketFlows,
  displayId = "badge-display-service",
): BadgePacketFlow[] {
  const reversedRoute: BadgePacketFlow[] = []
  const seen = new Set<string>()
  let cursor = displayId

  while (!seen.has(cursor)) {
    seen.add(cursor)
    const incoming = flows.find(
      (flow) => flow.target === cursor && flow.id !== "cafeteria-heartbeat",
    )
    if (!incoming) break
    reversedRoute.push(incoming)
    cursor = incoming.source
  }

  return reversedRoute.reverse()
}

export function deriveCampusFlowFacts(
  points: readonly CampusPoint[] = campusPoints,
  flows: readonly BadgePacketFlow[] = badgePacketFlows,
) {
  const route = traceRouteToDisplay(flows)
  const originId = route[0]?.source
  const displayedEndpointId = route.at(-1)?.source
  const origin = points.find((point) => point.id === originId)
  const displayedEndpoint = points.find((point) => point.id === displayedEndpointId)
  const serviceTunnel = points.find((point) => point.id === "service-tunnel-marker")

  if (!origin || !displayedEndpoint || !serviceTunnel) {
    throw new Error("Campus flow fixture is missing its decisive route")
  }

  return {
    route,
    origin,
    displayedEndpoint,
    displayServiceId: "badge-display-service",
    serviceTunnel,
  }
}

export const campusFlowFacts = deriveCampusFlowFacts()
