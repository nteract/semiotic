# Update a live chart by record ID

`LiveChartExample.tsx` is the complete browser example. `live-chart.ts` contains the five-event
synthetic fixture and the source-to-chart subscription. Runtime code imports only React and
`LineChart` from `semiotic/line`. Authoring tests import `prepareChart` from `semiotic/ai/core`;
that module never enters the page.

## Task, fit and limits

Use this pattern when an existing React application needs a live chart that can correct retained
records without replacing the whole component. Check the application's existing charting stack
before adding a dependency. This fixture demonstrates the browser lifecycle and retained data
behavior. It does not test network delivery, server retention, authentication, or a production
reconnect protocol. A real source needs an atomic snapshot/revision-cursor handoff and a policy for
out-of-order events and corrections to observations already evicted.

The x axis is observation time: minutes after 09:00. The numbered event counter is processing order.
Corrections keep their event time and stable record ID. The app retains the four latest observations
by event time and removes older records from the chart store. The fixed axes make a correction move
the point without rescaling the visual context. This is a finite, explicitly synthetic fixture, not
a continuous sensor feed or a claim of automatic time-windowing.

## Exact public APIs and behavior contracts

- `LineChart` from `semiotic/line`, with `xAccessor="minute"`, `yAccessor="value"`,
  `pointIdAccessor="id"`, `showPoints`, `showGrid`, `title`, `description`, `summary`, and
  `accessibleTable`.
- `ref.current.clear()`, `pushMany(rows)`, `push(row)`, `update(id, updater)`, `remove(id)`, and
  `getData()`. The ref type is derived with `React.ComponentRef<typeof LineChart>`; a second runtime
  entry is unnecessary.
- `streaming.push-mode-data`: the browser JSX omits `data` entirely. Initial records enter through
  `pushMany` after the ref is available. Control state re-renders preserve the retained buffer.
- `streaming.ref-mutations-require-id-accessors`: correcting obs-02 uses `update("obs-02", updater)`
  and retains its minute and ID. Retention explicitly calls `remove(id)`; it is an application
  policy in this example.
- `streaming.serialized-proposal-snapshot`: the authoring test validates a JSON proposal with the
  three initial rows in `props.data`. A generated packet must likewise contain data; the React ref
  and subscription are separate source.
- `rendering.renderchart-static-props`: a static validation or render cannot establish replay,
  cleanup, disconnect, or reconnect behavior. The browser test reads actual chart-store values and
  checks rendered canvas changes over time.

## Deterministic expected outcome

Initial observations: obs-01 at 09:00 = 12; obs-02 at 09:01 = 18; obs-03 at 09:02 = 15. All readings
use synthetic units.

1. Correct obs-02 to 14; keep three records.
2. Add obs-04 at 09:03 = 20; retain four records.
3. Add obs-05 at 09:04 = 16; remove obs-01.
4. Correct obs-03 to 17.
5. Add obs-06 at 09:05 = 19; remove obs-02.

Final records, in event-time order: obs-03 = 17, obs-04 = 20, obs-05 = 16, obs-06 = 19. Disconnect
after event 3 and advance twice: the source moves to event 5, the chart stays at event 3, and the
page reports two unapplied events. Reconnect clears the old chart store and pushes the source's
current four-row snapshot. It produces the same final records as uninterrupted replay, without
duplicates. Restart remounts the chart with the original three readings.

## Checks and repairs

Run `npx vitest run docs/src/pages/tasks/examples/live-chart.test.tsx` for schema validation, real
chart-store corrections and eviction, reconnect, restart, and subscription/timer cleanup under React
StrictMode. Unit canvas methods are stubbed, so that run establishes retained state and lifecycle.

Run
`npx playwright test --config playwright.docs-examples.config.ts integration-tests/docs-examples-task-live.spec.ts`
for a browser execution: changed canvas pixels after a correction, stable pixels while disconnected,
the exact retained IDs/values, and recovery on reconnect. That demonstrates this fixture, not
general network reliability or assistive technology usability. The record table reads `getData()`
rather than copying the source, so a failed chart mutation cannot silently pass by updating a label.

When a live chart clears on a button click, check for an accidental `data={[]}`. When a correction
fails, check the stable-ID accessor and whether the ID remains inside the retained window. If
reconnect duplicates points, replace the current window before applying its snapshot. When replay
speeds up after remount, inspect subscription and timer cleanup. This example returns both cleanup
functions from effects and tests StrictMode's setup/cleanup/setup sequence.
