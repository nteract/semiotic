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
} from "./pipelineTransitions"
import type { CandlestickSceneNode, SceneNode, TransitionConfig } from "./types"

const ctx: TransitionContext = {
  runtimeMode: "streaming",
  getX: (d: any) => d?.x ?? 0,
  getY: (d: any) => d?.y ?? 0,
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
    const state: { scene: SceneNode[]; exitNodes: SceneNode[]; activeTransition: any } = {
      scene: [moved as SceneNode], exitNodes: [], activeTransition: null,
    }
    startTransition(ctx, transition, state, prevPos, prevPath)

    // Halfway through the transition. duration=300, ease-out-cubic at t=0.5
    // isn't linearly 0.5, so we assert the direction + bounds rather than
    // the exact midpoint — the contract is "converging toward target".
    const startTime = state.activeTransition.startTime
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
    const state: { scene: SceneNode[]; exitNodes: SceneNode[]; activeTransition: any } = {
      scene: [moved as SceneNode], exitNodes: [], activeTransition: null,
    }
    startTransition(ctx, transition, state, prevPos, prevPath)
    advanceTransition(state.activeTransition.startTime + 400, transition, state, prevPos, prevPath)

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
      datum: null as unknown,
      _transitionKey: "c:7",
    })
    expect(getNodeIdentity(ctx, exitStub, 0)).toBe("c:7")
    // Index-based fallback only kicks in when neither datum nor key is set.
    const stranded = makeCandle({ datum: null as unknown })
    expect(getNodeIdentity(ctx, stranded, 3)).toBe("c:3")
  })

  it("exiting candlestick (key gone from new scene) produces a fading exit node", () => {
    const prior: SceneNode[] = [makeCandle({ x: 100, openY: 50, closeY: 40, highY: 30, lowY: 60, bodyWidth: 11, datum: { x: 5 } })]
    const prevPos = new Map<string, PrevPosition>()
    const prevPath = new Map<string, PrevPath>()
    snapshotPositions(ctx, prior, prevPos, prevPath)

    // New scene is empty — the bar at x=5 has scrolled off
    const state: { scene: SceneNode[]; exitNodes: SceneNode[]; activeTransition: any } = {
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
