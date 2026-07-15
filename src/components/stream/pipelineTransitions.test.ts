/**
 * Transition pipeline tests — focused on the candlestick branches that were
 * added alongside the CandlestickChart HOC. Point/rect/heatcell/line/area
 * paths are exercised implicitly by higher-level pipeline tests.
 */
import { describe, it, expect } from "vitest"
import {
  snapshotPositions,
  startTransition,
  advanceTransition,
  getNodeIdentity,
  type TransitionContext,
  type PrevPosition,
  type PrevPath,
  type TransitionState,
} from "./pipelineTransitions"
import type { CandlestickSceneNode, GlyphSceneNode, PointSceneNode, RectSceneNode, SceneNode, TransitionConfig } from "./types"
import type { GlyphDef } from "./glyphDef"

const ctx: TransitionContext = {
  runtimeMode: "streaming",
  getX: (d) => d?.x ?? 0,
  getY: (d) => d?.y ?? 0,
}

const transition: TransitionConfig = { duration: 300 }

function makeCandle(overrides: Partial<CandlestickSceneNode> = {}): CandlestickSceneNode {
  return {
    type: "candlestick",
    x: 100,
    openY: 50,
    closeY: 40,
    highY: 30,
    lowY: 60,
    bodyWidth: 6,
    upColor: "#2e7d32",
    downColor: "#c62828",
    wickColor: "#333",
    wickWidth: 1,
    isUp: true,
    datum: { x: 5, y: 40 },
    style: { opacity: 1 },
    ...overrides,
  }
}

describe("pipelineTransitions — candlestick", () => {
  it("getNodeIdentity uses x-value so bars match across scene rebuilds", () => {
    const a = makeCandle({ datum: { x: 5, y: 10 } })
    const b = makeCandle({ datum: { x: 5, y: 99 } }) // same x, different y
    expect(getNodeIdentity(ctx, a, 0)).toBe(getNodeIdentity(ctx, b, 0))
  })

  it("snapshotPositions records all four y-coords and opacity", () => {
    const scene: SceneNode[] = [makeCandle({ x: 100, openY: 50, closeY: 40, highY: 30, lowY: 60 })]
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, scene, prevPos, prevPath)
    expect(prevPos.size).toBe(1)
    const [prev] = [...prevPos.values()]
    expect(prev.x).toBe(100)
    expect(prev.openY).toBe(50)
    expect(prev.closeY).toBe(40)
    expect(prev.highY).toBe(30)
    expect(prev.lowY).toBe(60)
    expect(prev.opacity).toBe(1)
  })

  it("startTransition on a moved bar seeds targets and resets node to prev", () => {
    // Prior scene: bar at x=100, price levels (open=50, close=40, high=30, low=60)
    const prior: SceneNode[] = [makeCandle({ x: 100, openY: 50, closeY: 40, highY: 30, lowY: 60 })]
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, prior, prevPos, prevPath)

    // New scene: same x-identity, different price levels
    const moved = makeCandle({ x: 100, openY: 70, closeY: 20, highY: 10, lowY: 80 })
    const state = { scene: [moved as SceneNode], exitNodes: [], activeTransition: null }
    startTransition(ctx, transition, state, prevPos, prevPath)

    // Targets captured
    expect(moved._targetOpenY).toBe(70)
    expect(moved._targetCloseY).toBe(20)
    expect(moved._targetHighY).toBe(10)
    expect(moved._targetLowY).toBe(80)
    // Node rolled back to prev coords so advanceTransition can lerp forward
    expect(moved.openY).toBe(50)
    expect(moved.highY).toBe(30)
    expect(state.activeTransition).not.toBeNull()
  })

  it("entering candlestick fades in from opacity 0 (bar added to a streaming chart)", () => {
    // startTransition short-circuits if prevPositionMap is empty (no prior
    // scene = initial render, no intro path for candlesticks). The fade-in
    // only kicks in when a NEW bar appears in a scene that already has
    // other bars — i.e. the streaming case.
    const existing: SceneNode[] = [makeCandle({ x: 100, datum: { x: 5 } })]
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, existing, prevPos, prevPath)

    const keptBar = makeCandle({ x: 100, datum: { x: 5 } })
    const newBar = makeCandle({ x: 150, datum: { x: 10 } })
    const state = { scene: [keptBar as SceneNode, newBar as SceneNode], exitNodes: [], activeTransition: null }
    startTransition(ctx, transition, state, prevPos, prevPath)

    expect(newBar.style?.opacity).toBe(0)
    expect(newBar._targetOpacity).toBe(1)
  })

  it("advanceTransition lerps all four y-coords to midpoint at t=0.5", () => {
    const prior: SceneNode[] = [makeCandle({ x: 100, openY: 50, closeY: 40, highY: 30, lowY: 60 })]
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, prior, prevPos, prevPath)

    const moved = makeCandle({ x: 100, openY: 70, closeY: 20, highY: 10, lowY: 80 })
    const state: TransitionState = {
      scene: [moved as SceneNode], exitNodes: [], activeTransition: null,
    }
    startTransition(ctx, transition, state, prevPos, prevPath)

    // Halfway through the transition. duration=300, ease-out-cubic at t=0.5
    // isn't linearly 0.5, so we assert the direction + bounds rather than
    // the exact midpoint — the contract is "converging toward target".
    const startTime = state.activeTransition!.startTime
    advanceTransition(startTime + 150, transition, state, prevPos, prevPath)
    expect(moved.openY).toBeGreaterThan(50)
    expect(moved.openY).toBeLessThan(70)
    expect(moved.highY).toBeLessThan(30)   // moving up (toward 10)
    expect(moved.highY).toBeGreaterThan(10)
    expect(moved.lowY).toBeGreaterThan(60) // moving down (toward 80)
    expect(moved.lowY).toBeLessThan(80)
  })

  it("advanceTransition snaps to targets and clears fields at t=1", () => {
    const prior: SceneNode[] = [makeCandle({ x: 100, openY: 50, closeY: 40, highY: 30, lowY: 60 })]
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, prior, prevPos, prevPath)

    const moved = makeCandle({ x: 100, openY: 70, closeY: 20, highY: 10, lowY: 80 })
    const state: TransitionState = {
      scene: [moved as SceneNode], exitNodes: [], activeTransition: null,
    }
    startTransition(ctx, transition, state, prevPos, prevPath)
    advanceTransition(state.activeTransition!.startTime + 400, transition, state, prevPos, prevPath)

    expect(moved.openY).toBe(70)
    expect(moved.closeY).toBe(20)
    expect(moved.highY).toBe(10)
    expect(moved.lowY).toBe(80)
    expect(moved._targetOpenY).toBeUndefined()
    expect(moved._targetHighY).toBeUndefined()
    expect(state.activeTransition).toBeNull()
  })

  it("getNodeIdentity prefers _transitionKey so exit stubs stay stable across re-snapshots", () => {
    // Exit nodes are created with datum: null but carry _transitionKey from
    // their pre-exit identity. If a new transition starts while the exit is
    // still in the scene, snapshotPositions must not reassign them an
    // index-based id (which would reshuffle which stub matches which key).
    const exitStub = makeCandle({
      datum: null,
      _transitionKey: "c:7",
    })
    expect(getNodeIdentity(ctx, exitStub, 0)).toBe("c:7")
    // Index-based fallback only kicks in when neither datum nor key is set.
    const stranded = makeCandle({ datum: null })
    expect(getNodeIdentity(ctx, stranded, 3)).toBe("c:3")
  })

  it("exiting candlestick (key gone from new scene) produces a fading exit node", () => {
    const prior: SceneNode[] = [makeCandle({ x: 100, openY: 50, closeY: 40, highY: 30, lowY: 60, bodyWidth: 11, datum: { x: 5 } })]
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, prior, prevPos, prevPath)

    // New scene is empty — the bar at x=5 has scrolled off
    const state: TransitionState = {
      scene: [], exitNodes: [], activeTransition: null,
    }
    startTransition(ctx, transition, state, prevPos, prevPath)

    expect(state.exitNodes.length).toBe(1)
    const exit = state.exitNodes[0] as CandlestickSceneNode
    expect(exit.type).toBe("candlestick")
    expect(exit.x).toBe(100)
    expect(exit.openY).toBe(50)
    expect(exit.highY).toBe(30)
    // bodyWidth flows from the snapshot so the fading-out bar doesn't jump to
    // the 6px fallback on the final frame.
    expect(exit.bodyWidth).toBe(11)
    expect(exit._targetOpacity).toBe(0)
    expect(state.scene).toContain(exit)
  })
})

// Point and rect are the most common scene-node types but their transition
// branches were only exercised "implicitly". These mirror the candlestick
// contract: snapshot → seed-target-and-rollback → enter-fade → lerp-and-snap.

function makePoint(overrides: Partial<PointSceneNode> = {}): PointSceneNode {
  return {
    type: "point",
    x: 100,
    y: 50,
    r: 4,
    style: { opacity: 1 },
    datum: { x: 5, y: 50 },
    pointId: "p1",
    ...overrides,
  }
}

describe("pipelineTransitions — point", () => {
  it("snapshotPositions records x/y/r and opacity", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makePoint({ x: 100, y: 50, r: 4 })], prevPos, prevPath)
    const [prev] = [...prevPos.values()]
    expect(prev.x).toBe(100)
    expect(prev.y).toBe(50)
    expect(prev.r).toBe(4)
    expect(prev.opacity).toBe(1)
  })

  it("startTransition on a moved point seeds _targetX/_targetY and rolls back to prev", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makePoint({ pointId: "p1", x: 100, y: 50 })], prevPos, prevPath)

    const moved = makePoint({ pointId: "p1", x: 200, y: 90 }) // same identity, new position
    const state = { scene: [moved as SceneNode], exitNodes: [] as SceneNode[], activeTransition: null }
    startTransition(ctx, transition, state, prevPos, prevPath)

    expect(moved._targetX).toBe(200)
    expect(moved._targetY).toBe(90)
    // Rolled back to prev coords so advanceTransition lerps forward.
    expect(moved.x).toBe(100)
    expect(moved.y).toBe(50)
    expect(state.activeTransition).not.toBeNull()
  })

  it("entering point fades in from opacity 0", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makePoint({ pointId: "p1" })], prevPos, prevPath)

    const kept = makePoint({ pointId: "p1" })
    const entering = makePoint({ pointId: "p2", x: 300, y: 70 })
    const state = { scene: [kept as SceneNode, entering as SceneNode], exitNodes: [] as SceneNode[], activeTransition: null }
    startTransition(ctx, transition, state, prevPos, prevPath)

    expect(entering.style?.opacity).toBe(0)
    expect(entering._targetOpacity).toBe(1)
  })

  it("advanceTransition lerps x/y toward target, then snaps and clears at t=1", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makePoint({ pointId: "p1", x: 100, y: 50 })], prevPos, prevPath)

    const moved = makePoint({ pointId: "p1", x: 200, y: 90 })
    const state: TransitionState = {
      scene: [moved as SceneNode], exitNodes: [], activeTransition: null,
    }
    startTransition(ctx, transition, state, prevPos, prevPath)
    const startTime = state.activeTransition!.startTime

    advanceTransition(startTime + 150, transition, state, prevPos, prevPath)
    expect(moved.x).toBeGreaterThan(100)
    expect(moved.x).toBeLessThan(200)
    expect(moved.y).toBeGreaterThan(50)
    expect(moved.y).toBeLessThan(90)

    advanceTransition(startTime + 400, transition, state, prevPos, prevPath)
    expect(moved.x).toBe(200)
    expect(moved.y).toBe(90)
    expect(moved._targetX).toBeUndefined()
    expect(moved._targetY).toBeUndefined()
    expect(state.activeTransition).toBeNull()
  })
})

function makeRect(overrides: Partial<RectSceneNode> = {}): RectSceneNode {
  return {
    type: "rect",
    x: 100,
    y: 50,
    w: 20,
    h: 80,
    style: { opacity: 1 },
    datum: { category: "A", value: 10 },
    ...overrides,
  }
}

describe("pipelineTransitions — rect", () => {
  it("snapshotPositions records x/y/w/h and opacity", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makeRect({ x: 100, y: 50, w: 20, h: 80 })], prevPos, prevPath)
    const [prev] = [...prevPos.values()]
    expect(prev.x).toBe(100)
    expect(prev.y).toBe(50)
    expect(prev.w).toBe(20)
    expect(prev.h).toBe(80)
    expect(prev.opacity).toBe(1)
  })

  it("startTransition on a moved (regrown) bar seeds _targetY/_targetH and rolls back", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makeRect({ datum: { category: "A" }, y: 50, h: 80 })], prevPos, prevPath)

    // Same category identity, taller bar (grew from the top).
    const moved = makeRect({ datum: { category: "A" }, y: 20, h: 110 })
    const state = { scene: [moved as SceneNode], exitNodes: [] as SceneNode[], activeTransition: null }
    startTransition(ctx, transition, state, prevPos, prevPath)

    expect(moved._targetY).toBe(20)
    expect(moved._targetH).toBe(110)
    // Rolled back to prev geometry.
    expect(moved.y).toBe(50)
    expect(moved.h).toBe(80)
    expect(state.activeTransition).not.toBeNull()
  })

  it("advanceTransition lerps height toward target, then snaps and clears at t=1", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makeRect({ datum: { category: "A" }, y: 50, h: 80 })], prevPos, prevPath)

    const moved = makeRect({ datum: { category: "A" }, y: 20, h: 110 })
    const state: TransitionState = {
      scene: [moved as SceneNode], exitNodes: [], activeTransition: null,
    }
    startTransition(ctx, transition, state, prevPos, prevPath)
    const startTime = state.activeTransition!.startTime

    advanceTransition(startTime + 150, transition, state, prevPos, prevPath)
    expect(moved.h).toBeGreaterThan(80)
    expect(moved.h).toBeLessThan(110)

    advanceTransition(startTime + 400, transition, state, prevPos, prevPath)
    expect(moved.y).toBe(20)
    expect(moved.h).toBe(110)
    expect(moved._targetH).toBeUndefined()
    expect(state.activeTransition).toBeNull()
  })
})

const GLYPH_DEF: GlyphDef = {
  viewBox: [40, 40],
  parts: [
    { d: "M0 0 H40 V40 H0 Z", fill: "color" },
    { d: "M10 10 H30 V30 H10 Z", fill: "accent" },
  ],
}

function makeGlyph(overrides: Partial<GlyphSceneNode> = {}): GlyphSceneNode {
  return {
    type: "glyph",
    x: 100,
    y: 50,
    size: 24,
    glyph: GLYPH_DEF,
    color: "#333",
    accent: "#c62828",
    style: { opacity: 1 },
    datum: { x: 5, y: 40 },
    ...overrides,
  }
}

describe("pipelineTransitions — glyph", () => {
  it("snapshotPositions records x/y, size (as r), opacity, and the glyph def", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makeGlyph({ x: 100, y: 50, size: 24 })], prevPos, prevPath)
    const [prev] = [...prevPos.values()]
    expect(prev.x).toBe(100)
    expect(prev.y).toBe(50)
    expect(prev.r).toBe(24) // size carried as r so scale interpolates
    expect(prev.opacity).toBe(1)
    expect(prev.glyph).toBe(GLYPH_DEF)
  })

  it("startTransition on a moved/resized glyph seeds targets and rolls back", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makeGlyph({ pointId: "g1", x: 100, y: 50, size: 24 })], prevPos, prevPath)

    const moved = makeGlyph({ pointId: "g1", x: 200, y: 90, size: 40 })
    const state = { scene: [moved as SceneNode], exitNodes: [] as SceneNode[], activeTransition: null }
    startTransition(ctx, transition, state, prevPos, prevPath)

    expect(moved._targetX).toBe(200)
    expect(moved._targetY).toBe(90)
    expect(moved._targetR).toBe(40)
    // Rolled back so advanceTransition lerps forward.
    expect(moved.x).toBe(100)
    expect(moved.y).toBe(50)
    expect(moved.size).toBe(24)
    expect(state.activeTransition).not.toBeNull()
  })

  it("entering glyph fades in from opacity 0", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makeGlyph({ pointId: "g1" })], prevPos, prevPath)

    const kept = makeGlyph({ pointId: "g1" })
    const entering = makeGlyph({ pointId: "g2", x: 300, y: 70 })
    const state = { scene: [kept as SceneNode, entering as SceneNode], exitNodes: [] as SceneNode[], activeTransition: null }
    startTransition(ctx, transition, state, prevPos, prevPath)

    expect(entering.style?.opacity).toBe(0)
    expect(entering._targetOpacity).toBe(1)
  })

  it("exiting glyph fades out as itself in neutral ink for both color and accent", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makeGlyph({ pointId: "g1", x: 120, y: 60, size: 30 })], prevPos, prevPath)

    // New scene omits g1 entirely → it should be scheduled as an exit node.
    const state = { scene: [] as SceneNode[], exitNodes: [] as SceneNode[], activeTransition: null }
    startTransition(ctx, transition, state, prevPos, prevPath)

    const exit = state.exitNodes.find((n) => n.type === "glyph") as GlyphSceneNode | undefined
    expect(exit).toBeDefined()
    expect(exit!.x).toBe(120)
    expect(exit!.y).toBe(60)
    expect(exit!.size).toBe(30)
    expect(exit!.glyph).toBe(GLYPH_DEF)
    // Both role paints neutral so accent parts fade too rather than vanishing.
    expect(exit!.color).toBe("#999")
    expect(exit!.accent).toBe("#999")
    expect(exit!._targetOpacity).toBe(0)
  })

  it("advanceTransition lerps x/y/size toward target, then snaps and clears at t=1", () => {
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, [makeGlyph({ pointId: "g1", x: 100, y: 50, size: 24 })], prevPos, prevPath)

    const moved = makeGlyph({ pointId: "g1", x: 200, y: 90, size: 40 })
    const state: TransitionState = {
      scene: [moved as SceneNode], exitNodes: [], activeTransition: null,
    }
    startTransition(ctx, transition, state, prevPos, prevPath)
    const startTime = state.activeTransition!.startTime

    advanceTransition(startTime + 150, transition, state, prevPos, prevPath)
    expect(moved.x).toBeGreaterThan(100)
    expect(moved.x).toBeLessThan(200)
    expect(moved.size).toBeGreaterThan(24)
    expect(moved.size).toBeLessThan(40)

    advanceTransition(startTime + 400, transition, state, prevPos, prevPath)
    expect(moved.x).toBe(200)
    expect(moved.y).toBe(90)
    expect(moved.size).toBe(40)
    expect(moved._targetX).toBeUndefined()
    expect(state.activeTransition).toBeNull()
  })
})
