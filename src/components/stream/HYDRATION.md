# Adding hydration support to a new Stream Frame

Each Stream Frame (`StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`, `StreamGeoFrame`) participates in React's hydration boundary the same way. If you're adding a fifth frame, follow this recipe — the four shipped frames are interchangeable proof that it works without modification.

## Recipe (six steps, ~10 lines of frame code)

**1. Import the hooks.**

```ts
import { useHydration, useWasHydratingFromSSR, useHydrationLifecycle } from "./useHydration"
```

**2. Call them at the top of the component body, after `useFrame`'s destructure.**

```ts
const hydrated = useHydration()
const wasHydratingFromSSR = useWasHydratingFromSSR()
```

**3. Gate the SSR branch on both signals.**

```ts
if (isServerEnvironment || (!hydrated && wasHydratingFromSSR)) {
  // Existing SSR-mode SVG render — call store.ingest / computeScene,
  // serialize the scene through SceneToSVG, return the JSX with the
  // <svg> tree.
}
```

The `wasHydratingFromSSR` half is the perf gate: pure CSR mounts skip the SVG branch entirely (no point producing SVG that gets immediately overwritten by canvas).

**4. Attach `responsiveRef` on the SVG branch's outer div.**

The same `responsiveRef` from `useFrame` already wraps the canvas branch. Attaching it on the SVG branch too means the `ResizeObserver` in `useResponsiveSize` latches at first commit. Without this, responsive charts would fall back to `baseSize` until the canvas branch eventually mounts.

```tsx
return (
  <div ref={responsiveRef} className={`stream-foo-frame${className ? ` ${className}` : ""}`} role="img" ...>
    {/* SVG content */}
  </div>
)
```

**5. Use `useHydrationLifecycle` to wire the post-hydration paint.**

```ts
useHydrationLifecycle({
  hydrated,
  wasHydratingFromSSR,
  storeRef,
  dirtyRef,
  renderFnRef,
  cleanup: () => adapterRef.current?.clear(), // optional, frame-specific
})
```

This single call replaces what was 12 lines of duplicated post-hydration effect across the four shipped frames. It does three things on every commit-after-hydration, inside an isomorphic layout effect (synchronous, before the browser paints):

- If we just rehydrated from SSR, calls `storeRef.current?.cancelIntroAnimation?.()` — server already painted the chart in its final state, so re-animating from blank when canvas takes over is a visual regression.
- Marks the scene dirty (`dirtyRef.current = true`) so the canvas paint pipeline rebuilds.
- Paints the canvas synchronously via `renderFnRef.current()`. **Synchronous, not rAF-deferred** — an rAF callback wouldn't fire until the *next* frame, leaving frame N painted with the canvas in DOM but blank. Calling `renderFnRef.current()` directly from the layout effect makes frame N's paint already include the canvas content; no flash.

The `cleanup` callback is your unmount hook — XY/Ordinal clear the streaming `DataSourceAdapter`, Geo clears the tile cache, Network has no extra cleanup. `useFrame` already handles rAF cancellation.

**6. Implement `cancelIntroAnimation()` on the frame's pipeline store.**

The hook calls `storeRef.current?.cancelIntroAnimation?.()` — the `?.` means a store without this method silently no-ops, but every shipped store implements it. A new frame's store should too. Three things to clear:

- `prevPositionMap` and any equivalent path / position maps used by the transition system.
- `activeTransition` (or the equivalent — `NetworkPipelineStore` calls it `transition`).
- **Per-node intro state.** Lines and areas store `_introClipFraction = 0` directly on scene nodes; that's invisible to `prevPositionMap` but the canvas renderer reads it and clips the path from the left. The cancel must walk the scene and reset the flag to `undefined`. Network nodes have similar per-node intro fields (`_prevX0`, `_prevY1`, `_introFromZero` on edges). See `PipelineStore.cancelIntroAnimation` and `NetworkPipelineStore.cancelIntroAnimation` for the full pattern.

Idempotent — a second call must be a no-op.

## Build categorization

When adding a new frame, also update `scripts/build.mjs`:

- If your frame produces a new sub-path bundle (e.g. `semiotic/foo`), add it to the `bundles` array.
- Mark the bundle `clientOnly: true` if it ships React components (i.e. always — Stream Frames are by definition client-side).
- The post-build `assertDirectivePlacement` will then verify the bundle carries `"use client"` on output.

## What's covered by tests automatically

If you follow the recipe correctly, these gates engage without extra test wiring:

- **`charts/<family>/hydration.test.tsx`** parametrized matrix — add a row in the `cases` array; the three assertions (no `<canvas>` in server output, no React mismatch warnings on hydrate, canvas live after hydration) run automatically.
- **`PipelineStore.cancelIntro.test.ts`** — add a per-store cancellation test mirroring the shipped XY / Ordinal / Network ones. Asserts `activeTransition === null` *and* per-node intro state is cleared.
- **Build-time `assertDirectivePlacement`** — runs on every `npm run dist`. Catches both directions: directive on serverOnly bundle, OR missing on clientOnly bundle.

## What's deliberately not in scope

- **Streaming charts opt out by design.** `RealtimeLineChart` etc. are canvas-only — server-rendering a live push-driven chart isn't a use case. They don't go through this recipe.
- **Pixel-level SSR-vs-CSR comparison.** SVG and canvas pipelines have inherent anti-aliasing differences. The Playwright test in `integration-tests/ssr-parity.spec.ts` baselines each side independently — not against each other — and a maintainer reviews snapshot diffs.

## See also

- `src/components/stream/useHydration.ts` — the three hooks (`useHydration`, `useWasHydratingFromSSR`, `useHydrationLifecycle`) plus full prose on the detection mechanism.
- `docs/strategy/roadmap.md` — roadmap and maintenance context, including the shipped SSR phases and future planning notes.
- `docs/src/pages/UsingSSRPage.js` — user-facing docs for the auto-hydration feature.
