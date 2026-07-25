/**
 * Physics stage geography — the shared spatial vocabulary every physics chart
 * has been re-inventing.
 *
 * ## The observation
 *
 * Every physics chart in Semiotic is the same three-zone apparatus under a
 * different local name:
 *
 * | chart          | charge         | apparatus            | destinations          |
 * |----------------|----------------|----------------------|-----------------------|
 * | Galton         | hopper         | peg field            | bins                  |
 * | Pile           | drop point     | tubes                | category piles        |
 * | CollisionSwarm | x positions    | collision relaxation | settled x positions   |
 * | EventDrop      | arrivals       | watermark barrier    | windows + late gutter |
 * | ProcessFlow    | arrival        | capacitated stages   | absorb stages         |
 * | Gauntlet       | start          | gates                | socket / graveyard    |
 * | Crucible       | charge         | phases               | outlets               |
 * | ChainReaction  | completed task | dependency sockets   | armed tasks           |
 *
 * They also all conserve something, which is what the settled ledger checks.
 * `GauntletLayout` calls its zones `startX`/`socketX`/`graveyardX`;
 * `CrucibleLayout` calls them `chamber`/`mouth`/`outlets`; Galton and Pile
 * independently wrote the *same* lane formula
 * (`plot.x + (index + 0.5) * plot.width / count`). Naming the geography once
 * means the tenth physics chart costs less than the first.
 *
 * ## Scope
 *
 * This is authoring vocabulary, not a retrofit. Existing charts keep their own
 * layouts (their SSR baselines depend on them); `physicsStageGeography.test.ts`
 * proves this builder reproduces their lane math, so a new chart can adopt it
 * and land in the same visual family. Reach for it when building a new physics
 * chart or a `PhysicsCustomChart` layout.
 */
import type { PhysicsColliderSpec } from "../stream/physics/PhysicsKernel"

export interface PhysicsZone {
  x: number
  y: number
  width: number
  height: number
}

export interface PhysicsDestinationZone extends PhysicsZone {
  id: string
  label: string
  /** Reading order along the flow axis. */
  order: number
  /** Center of the zone — where a settled pile or bin count anchors. */
  centerX: number
  centerY: number
}

export interface PhysicsStageGeography {
  width: number
  height: number
  /** Direction the charge travels toward its destinations. */
  flow: "down" | "right"
  /** Where bodies enter the world. */
  charge: PhysicsZone
  /** Where the apparatus acts: pegs, gates, phases, stages, barriers. */
  apparatus: PhysicsZone
  /** Where bodies come to rest, in reading order. */
  destinations: PhysicsDestinationZone[]
  /** Strip reserved for the settled projection. Bodies never enter it. */
  projection: PhysicsZone
}

export interface PhysicsStageGeographyOptions {
  size: [number, number]
  /**
   * Destination bins/lanes/outlets. A number produces `bin-0…bin-n` ids, which
   * is the common case for a histogram-shaped board.
   */
  destinations: number | ReadonlyArray<{ id: string; label?: string }>
  /** Charge travels down (boards, piles) or right (process lanes, routes). */
  flow?: "down" | "right"
  /** Outer inset in px. */
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
  /** Fraction of the flow axis given to the entry zone. */
  chargeExtent?: number
  /** Fraction of the flow axis given to the settled destinations. */
  destinationExtent?: number
  /** Fraction of the flow axis reserved for the projection strip. */
  projectionExtent?: number
  /**
   * Fraction of each destination lane the body-holding channel occupies. `1`
   * means bins touch (a histogram); lower values leave visible gutters (tubes).
   */
  channelRatio?: number
}

const DEFAULTS = {
  flow: "down" as const,
  padding: 24,
  chargeExtent: 0.12,
  destinationExtent: 0.55,
  projectionExtent: 0.0,
  channelRatio: 1
}

function resolvePadding(
  padding: PhysicsStageGeographyOptions["padding"]
): { top: number; right: number; bottom: number; left: number } {
  if (padding == null) {
    const p = DEFAULTS.padding
    return { top: p, right: p, bottom: p, left: p }
  }
  if (typeof padding === "number") {
    return { top: padding, right: padding, bottom: padding, left: padding }
  }
  return {
    top: padding.top ?? 0,
    right: padding.right ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0
  }
}

function normalizeDestinations(
  destinations: PhysicsStageGeographyOptions["destinations"]
): Array<{ id: string; label: string }> {
  if (typeof destinations === "number") {
    const count = Math.max(1, Math.round(destinations))
    return Array.from({ length: count }, (_, index) => ({
      id: `bin-${index}`,
      label: String(index)
    }))
  }
  if (destinations.length === 0) return [{ id: "bin-0", label: "0" }]
  return destinations.map((destination, index) => ({
    id: destination.id,
    label: destination.label ?? destination.id ?? String(index)
  }))
}

/**
 * Build the charge → apparatus → destinations geography for a physics stage.
 *
 * The cross-axis lane math matches what Galton bins and Pile tubes already use,
 * so a chart built on this lands in the same visual family as the existing ones.
 */
export function physicsStageGeography(
  options: PhysicsStageGeographyOptions
): PhysicsStageGeography {
  const [width, height] = options.size
  const flow = options.flow ?? DEFAULTS.flow
  const pad = resolvePadding(options.padding)
  const channelRatio = Math.max(0.05, Math.min(1, options.channelRatio ?? DEFAULTS.channelRatio))

  const plot = {
    x: pad.left,
    y: pad.top,
    width: Math.max(1, width - pad.left - pad.right),
    height: Math.max(1, height - pad.top - pad.bottom)
  }

  // Split the flow axis into charge → apparatus → destinations → projection.
  const along = flow === "down" ? plot.height : plot.width
  const chargeAlong = along * Math.max(0, options.chargeExtent ?? DEFAULTS.chargeExtent)
  const projectionAlong = along * Math.max(0, options.projectionExtent ?? DEFAULTS.projectionExtent)
  const destinationAlong = along * Math.max(0, options.destinationExtent ?? DEFAULTS.destinationExtent)
  const apparatusAlong = Math.max(0, along - chargeAlong - destinationAlong - projectionAlong)

  const items = normalizeDestinations(options.destinations)
  const across = flow === "down" ? plot.width : plot.height
  const laneAcross = across / items.length

  const zoneDown = (start: number, extent: number): PhysicsZone => ({
    x: plot.x,
    y: plot.y + start,
    width: plot.width,
    height: extent
  })
  const zoneRight = (start: number, extent: number): PhysicsZone => ({
    x: plot.x + start,
    y: plot.y,
    width: extent,
    height: plot.height
  })
  const zone = flow === "down" ? zoneDown : zoneRight

  const charge = zone(0, chargeAlong)
  const apparatus = zone(chargeAlong, apparatusAlong)
  const destinationStart = chargeAlong + apparatusAlong
  const destinationBand = zone(destinationStart, destinationAlong)
  const projection = zone(destinationStart + destinationAlong, projectionAlong)

  const destinations: PhysicsDestinationZone[] = items.map((item, index) => {
    const laneStart = index * laneAcross
    const channel = laneAcross * channelRatio
    const gutter = (laneAcross - channel) / 2
    if (flow === "down") {
      const x = plot.x + laneStart + gutter
      return {
        id: item.id,
        label: item.label,
        order: index,
        x,
        y: destinationBand.y,
        width: channel,
        height: destinationBand.height,
        // Matches the lane formula Galton bins and Pile tubes already use.
        centerX: plot.x + (index + 0.5) * laneAcross,
        centerY: destinationBand.y + destinationBand.height / 2
      }
    }
    const y = plot.y + laneStart + gutter
    return {
      id: item.id,
      label: item.label,
      order: index,
      x: destinationBand.x,
      y,
      width: destinationBand.width,
      height: channel,
      centerX: destinationBand.x + destinationBand.width / 2,
      centerY: plot.y + (index + 0.5) * laneAcross
    }
  })

  return { width, height, flow, charge, apparatus, destinations, projection }
}

/** Look a destination up by id. */
export function physicsDestination(
  geography: PhysicsStageGeography,
  id: string
): PhysicsDestinationZone | undefined {
  return geography.destinations.find((destination) => destination.id === id)
}

/**
 * Where the nth of `count` bodies should enter the charge zone, spread evenly
 * across it so a burst does not spawn co-located and explode apart.
 */
export function physicsChargePoint(
  geography: PhysicsStageGeography,
  index: number,
  count: number
): { x: number; y: number } {
  const { charge, flow } = geography
  const safeCount = Math.max(1, count)
  const fraction = (index % safeCount + 0.5) / safeCount
  return flow === "down"
    ? { x: charge.x + charge.width * fraction, y: charge.y + charge.height / 2 }
    : { x: charge.x + charge.width / 2, y: charge.y + charge.height * fraction }
}

export interface PhysicsStageColliderOptions {
  /** Collider thickness in px. */
  thickness?: number
  /** Prefix for generated collider ids. */
  idPrefix?: string
  /** Add the outer boundary walls in addition to the destination dividers. */
  walls?: boolean
}

/**
 * Colliders that make the destinations physically real: a floor plus one
 * divider between each pair of adjacent destinations, so bodies land in the bin
 * the data says they should. This is the geometry every board/pile chart writes
 * by hand.
 */
export function physicsStageColliders(
  geography: PhysicsStageGeography,
  options: PhysicsStageColliderOptions = {}
): PhysicsColliderSpec[] {
  const thickness = options.thickness ?? 4
  const prefix = options.idPrefix ?? "stage"
  const { destinations, flow, width, height } = geography
  const colliders: PhysicsColliderSpec[] = []

  if (destinations.length > 0) {
    const band = destinations[0]
    if (flow === "down") {
      const floorY = band.y + band.height
      colliders.push({
        id: `${prefix}-floor`,
        shape: {
          type: "segment",
          x1: geography.charge.x,
          y1: floorY,
          x2: geography.charge.x + geography.charge.width,
          y2: floorY,
          thickness
        }
      })
      // One divider per interior boundary — n destinations need n-1 dividers.
      for (let index = 1; index < destinations.length; index += 1) {
        const x = destinations[index].centerX - (destinations[index].centerX - destinations[index - 1].centerX) / 2
        colliders.push({
          id: `${prefix}-divider-${index}`,
          shape: { type: "segment", x1: x, y1: band.y, x2: x, y2: floorY, thickness }
        })
      }
    } else {
      const wallX = band.x + band.width
      colliders.push({
        id: `${prefix}-floor`,
        shape: {
          type: "segment",
          x1: wallX,
          y1: geography.charge.y,
          x2: wallX,
          y2: geography.charge.y + geography.charge.height,
          thickness
        }
      })
      for (let index = 1; index < destinations.length; index += 1) {
        const y = destinations[index].centerY - (destinations[index].centerY - destinations[index - 1].centerY) / 2
        colliders.push({
          id: `${prefix}-divider-${index}`,
          shape: { type: "segment", x1: band.x, y1: y, x2: wallX, y2: y, thickness }
        })
      }
    }
  }

  if (options.walls !== false) {
    colliders.push(
      { id: `${prefix}-wall-left`, shape: { type: "segment", x1: 1, y1: 0, x2: 1, y2: height, thickness } },
      { id: `${prefix}-wall-right`, shape: { type: "segment", x1: width - 1, y1: 0, x2: width - 1, y2: height, thickness } }
    )
  }
  return colliders
}

/**
 * One sentence naming the apparatus, for accessible descriptions and agent
 * grounding. The reading protocol should be stateable in words, not only drawn.
 */
export function describePhysicsStageGeography(
  geography: PhysicsStageGeography,
  nouns: { charge?: string; apparatus?: string; destination?: string } = {}
): string {
  const charge = nouns.charge ?? "bodies"
  const apparatus = nouns.apparatus ?? "the apparatus"
  const destination = nouns.destination ?? "destinations"
  const count = geography.destinations.length
  const direction = geography.flow === "down" ? "downward" : "left to right"
  return (
    `${charge} enter at the ${geography.flow === "down" ? "top" : "left"}, travel ${direction} through ` +
    `${apparatus}, and come to rest in ${count} ${destination}: ` +
    `${geography.destinations.map((zone) => zone.label).join(", ")}.`
  )
}
