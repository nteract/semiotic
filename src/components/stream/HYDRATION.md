# Stream Frame hydration

Five Stream Frames participate in React hydration: `StreamXYFrame`,
`StreamOrdinalFrame`, `StreamNetworkFrame`, `StreamGeoFrame`, and
`physics/StreamPhysicsFrame`. The chart HOCs use their frame's SVG branch on the
server and on the first hydration render, then switch to canvas and interaction.
Pure client mounts start with canvas.

Realtime charts use `StreamXYFrame` too. Supplying `data` renders a controlled
snapshot through React SSR or `renderChart`; omitting `data` selects React push
mode, whose rows arrive through a ref after mounting. `data={[]}` is an empty
controlled snapshot. Static and serialized requests need real data and cannot
consume a live ref.

## Adding a frame

1. Call `useHydration()` and `useWasHydratingFromSSR()` after `useFrame()`:

   ```ts
   const hydrated = useHydration()
   const wasHydratingFromSSR = useWasHydratingFromSSR()
   ```

2. Keep the SVG branch active for the server pass and initial hydration render:

   ```ts
   if (isServerEnvironment || (!hydrated && wasHydratingFromSSR)) {
     // Ingest the initial data, compute the scene, and return its SVG layers.
   }
   ```

   `useWasHydratingFromSSR` captures React's server snapshot on first render.
   Fresh client mounts skip this branch even while `hydrated` is false.

3. Attach the same `responsiveRef` to the outer wrapper in both branches.
   `useResponsiveSize` must observe the wrapper at the first commit. Keep its
   accessible table target, summary, and title/description available during SSR
   and hydration. Expanded table content may load on demand.

4. Connect the frame through `useFrameCanvasHost` in `useCanvasFrameHost.tsx`.
   The host wires `useHydrationLifecycle`, scheduler cancellation, and canvas
   setup. A custom host can call the lifecycle hook directly:

   ```ts
   useHydrationLifecycle({
     hydrated,
     wasHydratingFromSSR,
     storeRef,
     dirtyRef,
     renderFnRef,
     cancelRender,
     cleanup: () => adapterRef.current?.clear(),
   })
   ```

   After `hydrated` becomes true, the layout effect cancels any intro state
   from SSR, invalidates the scene, cancels a queued paint, and paints
   synchronously before the browser displays the canvas. A pure client mount
   with an already-built scene can request a style repaint instead of rebuilding.
   This effect runs when its hydration signals change, not on every commit.
   The separate unmount cleanup releases XY/ordinal data adapters and
   geographic tile caches. Physics owns worker/store cleanup in its simulation
   lifecycle.

5. If the store has intro transitions, implement idempotent
   `cancelIntroAnimation()`. Clear transition maps and per-node intro geometry,
   including XY `_introClipFraction` and network edge `_introFromZero` and
   circular-route state. Physics uses a settled SVG snapshot and its own
   simulation lifecycle; its store does not implement this optional method.

6. Register any new package entry in `scripts/build.mjs`. React component
   entries use `clientOnly: true`; static renderer entries are server entries.
   `assertDirectivePlacement` checks the output directives during the build.

## SVG layers and the canvas handoff

XY, ordinal, network, and geographic React SSR branches layer the SVG scene
beneath a separate SVG overlay for axes, labels, legends, and annotations.
Physics serializes a settled scene with its chrome overlay. Keep layer order,
plot translation, accessible naming, and responsive wrapper dimensions aligned
with the live frame. `renderChart` builds a standalone SVG through the server
renderer; that SVG is an export or manual placeholder, not the React frame tree
to pass directly to `hydrateRoot`.

Before hydration:

- Marks are SVG. Pointer hover, hit testing, dragging, and canvas keyboard
  navigation become active after the client handoff; semantic summaries and
  table controls are present in the initial tree.
- Responsive frames use their supplied/default dimensions until the container
  is measured. Plot dimensions retain a one-pixel minimum when margins exhaust
  the available space, including in standalone SVG and render evidence.
- Empty explicit time scales use a fixed epoch-day domain. Supplied domains
  and observed timestamps determine nonempty scales; the wall clock does not
  supply an empty snapshot's time range.
- SVG and canvas rasterize edges and text differently. Browser fonts and
  computed CSS can change measurements after load. Provide explicit theme,
  font, and size inputs when those must agree across hosts.
- Physics SVG is a settled snapshot; live physics can continue advancing.
- The React XY SVG scene currently has no plot clip around its marks, while
  standalone XY SVG and live canvas clip the data layer. Marks crossing an
  authored extent can therefore differ before hydration. This is tracked in
  [#1469](https://github.com/nteract/semiotic/issues/1469).

## Verification

- Extend the appropriate `charts/<family>/hydration.test.tsx` matrix and frame
  hydration tests. Assert real SVG marks before hydration, no recoverable React
  errors, and painted canvas plus working interaction afterward. Physics has
  focused hydration coverage in `physics/StreamPhysicsFrame.test.tsx` and its
  theme/chrome suites.
- Cover intro cancellation in the relevant pipeline-store tests, including
  per-node state. Cover unmount cleanup in `useHydrationLifecycle.cleanup.test.tsx`.
- Check controlled realtime snapshots in `server/realtimeSSR.test.ts` and the
  temporal-accessor tests; cover push ingestion separately.
- `integration-tests/ssr-parity.spec.ts` compares current SVG and canvas output
  with a color-aware tolerance and reviews a side-by-side snapshot. Structural
  cases use semantic assertions where a pixel comparison is inappropriate.
- Run `npm run dist:prod` for directive checks and test the affected published
  server/browser entries when changing shared scene or sizing behavior.

See `useHydration.ts`, `useCanvasFrameHost.tsx`, and
`docs/src/pages/UsingSSRPage.jsx` for the hooks, host lifecycle, and public guide.
