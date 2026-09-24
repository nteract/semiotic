import type {
  NetworkViewTransform,
  NetworkViewportRect
} from "../networkViewportTypes"
import type {
  NetworkZoomChange,
  NetworkZoomOptions,
  NetworkZoomSource
} from "./types"
import { canPan, constrainZoom, panZoom, sameZoom, zoomAt } from "./geometry"

interface Host {
  getZoom(): NetworkViewTransform
  getPlot(): NetworkViewportRect
  getOptions(): NetworkZoomOptions
  change(zoom: NetworkViewTransform, event: NetworkZoomChange): void
}

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
  let idle: number | null = null
  let target: NetworkViewTransform | null = null
  let source: NetworkZoomSource = "control"
  let moving = false
  let suppressClickUntil = 0
  const pointers = new Map<number, { x: number; y: number }>()
  let origin: { x: number; y: number } | null = null
  let dragged = false
  let lastTap: { x: number; y: number; time: number } | null = null

  const cancelAnimation = () => {
    if (animation !== null) win.cancelAnimationFrame(animation)
    animation = null
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

  const moveTo = (
    requested: NetworkViewTransform,
    nextSource: NetworkZoomSource,
    duration?: number
  ) => {
    const options = host.getOptions()
    if (options.locked) return
    const from = host.getZoom()
    const plot = host.getPlot()
    const k = options.zoomEnabled === false ? from.k : requested.k
    const to = constrainZoom(
      {
        k,
        x: canPan(options, "x")
          ? requested.x
          : plot.width / 2 - ((plot.width / 2 - from.x) * k) / from.k,
        y: canPan(options, "y")
          ? requested.y
          : plot.height / 2 - ((plot.height / 2 - from.y) * k) / from.k
      },
      plot,
      options
    )
    cancelAnimation()
    if (idle !== null) win.clearTimeout(idle)
    source = nextSource
    if (sameZoom(from, to)) {
      settle()
      return
    }
    target = to
    const reduced = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const requestedDuration = duration ?? options.duration ?? 180
    const milliseconds = reduced
      ? 0
      : Number.isFinite(requestedDuration)
        ? Math.max(0, requestedDuration)
        : 180
    const start = win.performance.now()
    const tick = () => {
      const pending = animation
      // The shared rAF timestamp can predate input delivered late in a frame.
      // Use the start clock at execution time so tweens cannot run backward.
      const elapsed = Math.max(0, win.performance.now() - start)
      const t = milliseconds > 0 ? Math.min(1, elapsed / milliseconds) : 1
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
        point ?? { x: plot.width / 2, y: plot.height / 2 },
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
    // Map dragging must not start browser text selection. Interactive card
    // controls were filtered above and retain native focus/editing behavior.
    event.preventDefault()
    cancelAnimation()
    if (pointers.size === 0) {
      origin = point
      dragged = false
    }
    pointers.set(event.pointerId, point)
    element.setPointerCapture(event.pointerId)
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
    if (element.hasPointerCapture(event.pointerId))
      element.releasePointerCapture(event.pointerId)
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
    for (const id of pointers.keys())
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id)
    pointers.clear()
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
    if (
      host.getOptions().locked ||
      host.getOptions().keyboard === false ||
      ignores(event.target) ||
      event.ctrlKey ||
      event.metaKey
    )
      return
    if (["+", "=", "-", "_"].includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
      zoomBy(event.key === "+" || event.key === "=" ? 2 : 0.5, "keyboard")
    } else if (event.altKey && event.key.startsWith("Arrow")) {
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
