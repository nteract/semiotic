import type {
  NetworkViewTransform,
  NetworkViewportRect
} from "../networkViewportTypes"
import type {
  NetworkZoomChange,
  NetworkZoomOptions,
  NetworkZoomSource
} from "./types"
import {
  canPan,
  constrainZoom,
  panZoom,
  sameZoom,
  usableCenter,
  zoomAt
} from "./geometry"

interface Host {
  getZoom(): NetworkViewTransform
  getPlot(): NetworkViewportRect
  getOptions(): NetworkZoomOptions
  /** Moving changes arrive from an animation frame or a microtask, never from
   * inside a caller's React commit. */
  change(zoom: NetworkViewTransform, event: NetworkZoomChange): void
  /** A move made from inside the host's own commit (`jumpTo`): the host
   * applies it in place, with no flush of its own. */
  commit(zoom: NetworkViewTransform, event: NetworkZoomChange): void
}

// User input can arrive several times per frame, so it applies on the next
// animation frame. Zero-duration programmatic moves apply in a microtask.
const frameCoalesced = (source: NetworkZoomSource) =>
  source === "wheel" ||
  source === "drag" ||
  source === "pinch" ||
  source === "keyboard"

const interactive =
  "input,textarea,select,button,a,[contenteditable]:not([contenteditable=false]),[data-network-zoom-ignore]"
function ignores(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(interactive)
}

/** A frame-scoped Pointer Events driver. No document gesture listeners or
 * global registrations; every timer, capture and listener belongs to this host. */
export function bindNetworkZoom(element: HTMLElement, host: Host) {
  const win = element.ownerDocument.defaultView!
  let animation: number | null = null
  let immediate: object | null = null
  let idle: number | null = null
  let target: NetworkViewTransform | null = null
  let tweenEnd = 0
  let source: NetworkZoomSource = "control"
  let moving = false
  let suppressClickUntil = 0
  const pointers = new Map<number, { x: number; y: number }>()
  const captures = new Map<number, Element>()
  let origin: { x: number; y: number } | null = null
  let dragged = false
  let lastTap: { x: number; y: number; time: number } | null = null

  const cancelAnimation = () => {
    if (animation !== null) win.cancelAnimationFrame(animation)
    animation = null
    immediate = null
    target = null
  }
  const finish = () => {
    if (idle !== null) win.clearTimeout(idle)
    idle = null
    if (moving) {
      moving = false
      host.change(host.getZoom(), { source, phase: "idle" })
    }
  }
  const settle = () => {
    if (idle !== null) win.clearTimeout(idle)
    if (pointers.size || animation !== null) return
    const delay = host.getOptions().settleDelay
    idle = win.setTimeout(
      finish,
      Number.isFinite(delay) ? Math.max(0, delay!) : 160
    )
  }
  const emit = (view: NetworkViewTransform) => {
    moving = true
    host.change(view, { source, phase: "moving" })
  }
  const plotPoint = (event: { clientX: number; clientY: number }) => {
    const frame =
      element.querySelector<HTMLElement>(".stream-network-frame canvas") ??
      element.querySelector<HTMLElement>(".stream-network-frame") ??
      element
    const rect = frame.getBoundingClientRect()
    const plot = host.getPlot()
    return {
      x: event.clientX - rect.left - plot.x,
      y: event.clientY - rect.top - plot.y
    }
  }
  const inside = (p: { x: number; y: number }) => {
    const plot = host.getPlot()
    return p.x >= 0 && p.y >= 0 && p.x <= plot.width && p.y <= plot.height
  }

  /** The camera `requested` resolves to under the current options: the scale
   * and each axis held where the options lock them, then clamped to the bounds. */
  const resolve = (requested: NetworkViewTransform) => {
    const options = host.getOptions()
    const from = host.getZoom()
    const plot = host.getPlot()
    const pivot = usableCenter(plot, options)
    const k = options.zoomEnabled === false ? from.k : requested.k
    return constrainZoom(
      {
        k,
        x: canPan(options, "x")
          ? requested.x
          : pivot.x - ((pivot.x - from.x) * k) / from.k,
        y: canPan(options, "y")
          ? requested.y
          : pivot.y - ((pivot.y - from.y) * k) / from.k
      },
      plot,
      options
    )
  }
  const milliseconds = (requested: number | undefined) => {
    const reduced = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const duration = requested ?? host.getOptions().duration ?? 180
    return reduced ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 180
  }
  /** Begin a move: ends any move in flight, records `source`, and reports
   * whether `target` is reached already. */
  const begin = (to: NetworkViewTransform, nextSource: NetworkZoomSource) => {
    cancelAnimation()
    if (idle !== null) win.clearTimeout(idle)
    source = nextSource
    if (sameZoom(host.getZoom(), to)) {
      settle()
      return false
    }
    target = to
    return true
  }
  /** Run the move to `target` over `duration` from the visible camera. */
  const run = (duration: number) => {
    if (duration === 0 && !frameCoalesced(source)) {
      // Apply before the next paint without waiting for a frame. The
      // microtask runs after the caller, including a React effect, returns,
      // so the host can commit every layer synchronously. Moves chained in
      // this task build on `target`; a newer move or cancel supersedes this,
      // and a bounds change re-clamps `target` before it applies.
      const pending = (immediate = {})
      win.queueMicrotask(() => {
        if (immediate !== pending) return
        immediate = null
        const to = target!
        emit(to)
        if (target === to) target = null
        settle()
      })
      return
    }
    const from = host.getZoom()
    const to = target!
    const start = win.performance.now()
    tweenEnd = start + duration
    const tick = () => {
      const pending = animation
      // The shared rAF timestamp can predate input delivered late in a frame.
      // Use the start clock at execution time so tweens cannot run backward.
      const elapsed = Math.max(0, win.performance.now() - start)
      const t = duration > 0 ? Math.min(1, elapsed / duration) : 1
      const eased = 1 - (1 - t) ** 3
      emit({
        k: from.k + (to.k - from.k) * eased,
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased
      })
      // A synchronous host commit can lock, unmount or redirect this camera.
      if (animation !== pending) return
      if (t < 1) animation = win.requestAnimationFrame(tick)
      else {
        animation = null
        target = null
        settle()
      }
    }
    animation = win.requestAnimationFrame(tick)
  }
  const moveTo = (
    requested: NetworkViewTransform,
    nextSource: NetworkZoomSource,
    duration?: number
  ) => {
    if (host.getOptions().locked) return
    if (begin(resolve(requested), nextSource)) run(milliseconds(duration))
  }
  /** Apply `requested` now, from inside the host's own commit: no frame and no
   * microtask, so what that commit renders paints under this camera. */
  const jumpTo = (
    requested: NetworkViewTransform,
    nextSource: NetworkZoomSource
  ) => {
    if (host.getOptions().locked) return
    const to = resolve(requested)
    if (!begin(to, nextSource)) return
    moving = true
    host.commit(to, { source, phase: "moving" })
    if (target === to) target = null
    settle()
  }
  /** Keep a move in flight inside bounds that changed under it: its
   * destination is clamped again, and a running tween continues to it from the
   * visible camera over its remaining time. Nothing in flight, nothing moves. */
  const rebound = () => {
    if (target === null) return
    const to = constrainZoom(target, host.getPlot(), host.getOptions())
    if (sameZoom(to, target)) return
    if (immediate !== null) {
      target = to
      return
    }
    const remaining = Math.max(0, tweenEnd - win.performance.now())
    cancelAnimation()
    target = to
    run(remaining)
  }
  const zoomBy = (
    factor: number,
    nextSource: NetworkZoomSource = "control",
    point?: { x: number; y: number }
  ) => {
    const plot = host.getPlot()
    // Accumulate wheel deltas between paints, but interrupt a control tween
    // from its visible camera instead of jumping to its future destination.
    const from =
      (nextSource === "wheel" && source !== "wheel" ? null : target) ??
      host.getZoom()
    moveTo(
      zoomAt(
        from,
        from.k * factor,
        point ?? usableCenter(plot, host.getOptions()),
        plot,
        host.getOptions()
      ),
      nextSource,
      // Wheel input already supplies progressive fractional zoom. Repeatedly
      // restarting a tween here makes it lag until the user lifts their fingers.
      nextSource === "wheel" ? 0 : undefined
    )
  }
  const panBy = (
    x: number,
    y: number,
    nextSource: NetworkZoomSource = "control"
  ) => {
    moveTo(
      panZoom(
        target ?? host.getZoom(),
        x,
        y,
        host.getPlot(),
        host.getOptions()
      ),
      nextSource,
      0
    )
  }

  const wheel = (event: WheelEvent) => {
    const options = host.getOptions()
    if (
      options.locked ||
      options.zoomEnabled === false ||
      options.wheelZoom === false ||
      ignores(event.target)
    )
      return
    if (
      (options.wheelZoom ?? "modifier") === "modifier" &&
      !event.ctrlKey &&
      !event.metaKey
    )
      return
    const point = plotPoint(event)
    if (!inside(point) || !Number.isFinite(event.deltaY)) return
    event.preventDefault()
    const unit =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? host.getPlot().height
          : 1
    const delta = Math.max(-600, Math.min(600, event.deltaY * unit))
    zoomBy(Math.exp(-delta * (event.ctrlKey ? 0.008 : 0.002)), "wheel", point)
  }
  const down = (event: PointerEvent) => {
    const options = host.getOptions()
    if (options.locked || event.button !== 0 || ignores(event.target)) return
    if (
      (options.dragPan === false || options.pan === false) &&
      (options.pinchZoom === false ||
        options.zoomEnabled === false ||
        event.pointerType === "mouse")
    )
      return
    const point = plotPoint(event)
    if (!inside(point)) return
    // Mouse dragging must not select text. Touch/pen use the host's
    // touch-action policy; canceling touch pointerdown also cancels WebKit's
    // synthesized click, even when the pointer never moves.
    if (event.pointerType === "mouse") event.preventDefault()
    cancelAnimation()
    if (pointers.size === 0) {
      origin = point
      dragged = false
    }
    pointers.set(event.pointerId, point)
    // Capture on the original mark/canvas so a stationary pointer's click
    // still bubbles through the chart. Capturing on the outer zoom wrapper
    // retargets the browser's click outside the frame and loses activation.
    const capture = event.target instanceof Element ? event.target : element
    captures.set(event.pointerId, capture)
    capture.setPointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    const options = host.getOptions()
    if (options.locked) {
      cancel()
      return
    }
    const before = [...pointers.values()]
    const previous = pointers.get(event.pointerId)!
    const point = plotPoint(event)
    pointers.set(event.pointerId, point)
    if (
      !dragged &&
      origin &&
      Math.hypot(point.x - origin.x, point.y - origin.y) < 3 &&
      pointers.size === 1
    )
      return
    dragged = true
    lastTap = null
    let view = target ?? host.getZoom()
    if (
      pointers.size >= 2 &&
      options.pinchZoom !== false &&
      options.zoomEnabled !== false
    ) {
      const after = [...pointers.values()]
      const distance = (pts: typeof before) =>
        Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const center = (pts: typeof before) => ({
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2
      })
      const oldCenter = center(before),
        newCenter = center(after)
      if (distance(before) > 0)
        view = zoomAt(
          view,
          (view.k * distance(after)) / distance(before),
          oldCenter,
          host.getPlot(),
          options
        )
      if (options.dragPan !== false)
        view = panZoom(
          view,
          newCenter.x - oldCenter.x,
          newCenter.y - oldCenter.y,
          host.getPlot(),
          options
        )
      moveTo(view, "pinch", 0)
    } else if (options.dragPan !== false) {
      moveTo(
        panZoom(
          view,
          point.x - previous.x,
          point.y - previous.y,
          host.getPlot(),
          options
        ),
        "drag",
        0
      )
    }
  }
  const up = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    const point = pointers.get(event.pointerId)!
    pointers.delete(event.pointerId)
    const capture = captures.get(event.pointerId)
    captures.delete(event.pointerId)
    if (capture?.hasPointerCapture(event.pointerId))
      capture.releasePointerCapture(event.pointerId)
    if (dragged) suppressClickUntil = win.performance.now() + 400
    else if (
      event.type === "pointerup" &&
      event.pointerType === "touch" &&
      host.getOptions().doubleClickZoom !== false
    ) {
      const now = win.performance.now()
      if (
        lastTap &&
        now - lastTap.time < 300 &&
        Math.hypot(point.x - lastTap.x, point.y - lastTap.y) < 24
      ) {
        zoomBy(2, "control", point)
        lastTap = null
        suppressClickUntil = now + 400
      } else lastTap = { ...point, time: now }
    }
    origin = pointers.values().next().value ?? null
    settle()
  }
  const cancel = () => {
    pointers.clear()
    for (const [id, capture] of captures)
      if (capture.hasPointerCapture(id)) capture.releasePointerCapture(id)
    captures.clear()
    origin = null
    cancelAnimation()
    finish()
  }
  const click = (event: MouseEvent) => {
    if (win.performance.now() < suppressClickUntil && !ignores(event.target)) {
      event.preventDefault()
      event.stopPropagation()
      suppressClickUntil = 0
    }
  }
  const doubleClick = (event: MouseEvent) => {
    if (
      host.getOptions().locked ||
      host.getOptions().zoomEnabled === false ||
      host.getOptions().doubleClickZoom === false ||
      ignores(event.target) ||
      !inside(plotPoint(event))
    )
      return
    event.preventDefault()
    zoomBy(event.shiftKey ? 0.5 : 2, "control", plotPoint(event))
  }
  const key = (event: KeyboardEvent) => {
    const keyboard = host.getOptions().keyboard
    if (
      host.getOptions().locked ||
      keyboard === false ||
      ignores(event.target) ||
      event.ctrlKey ||
      event.metaKey
    )
      return
    if (["+", "=", "-", "_"].includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
      zoomBy(event.key === "+" || event.key === "=" ? 2 : 0.5, "keyboard")
    } else if (
      (event.altKey || (typeof keyboard === "object" && keyboard.arrowKeys === "pan")) &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault()
      event.stopPropagation()
      panBy(
        event.key === "ArrowLeft" ? 60 : event.key === "ArrowRight" ? -60 : 0,
        event.key === "ArrowUp" ? 60 : event.key === "ArrowDown" ? -60 : 0,
        "keyboard"
      )
    }
  }
  element.addEventListener("wheel", wheel, { passive: false })
  element.addEventListener("pointerdown", down)
  element.addEventListener("pointermove", move)
  element.addEventListener("pointerup", up)
  element.addEventListener("pointercancel", up)
  element.addEventListener("lostpointercapture", up)
  element.addEventListener("click", click, true)
  element.addEventListener("dblclick", doubleClick)
  element.addEventListener("keydown", key, true)
  win.addEventListener("blur", cancel)
  return {
    moveTo,
    jumpTo,
    rebound,
    zoomBy,
    panBy,
    cancel,
    destroy: () => {
      cancelAnimation()
      if (idle !== null) win.clearTimeout(idle)
      // Unmount does not notify React or consumers with an artificial idle event.
      moving = false
      cancel()
      element.removeEventListener("wheel", wheel)
      element.removeEventListener("pointerdown", down)
      element.removeEventListener("pointermove", move)
      element.removeEventListener("pointerup", up)
      element.removeEventListener("pointercancel", up)
      element.removeEventListener("lostpointercapture", up)
      element.removeEventListener("click", click, true)
      element.removeEventListener("dblclick", doubleClick)
      element.removeEventListener("keydown", key, true)
      win.removeEventListener("blur", cancel)
    }
  }
}
