import type { Datum } from "../shared/datumTypes"

/**
 * Auto-fit the realtime ring buffer to bounded data.
 *
 * Realtime HOCs accept both a static `data` array (bounded use) and
 * ref-based `push()` (streaming use). The underlying ring buffer is
 * sized by `windowSize`, which has historically defaulted to 200.
 * That default is fine for streaming — the buffer scrolls — but
 * silently truncates static `data` arrays larger than 200 points
 * (the older entries fall off the back as new ones arrive during the
 * single bulk ingest, which looks like a bug from the consumer's
 * perspective).
 *
 * Resolution rule:
 *   - **Explicit user `windowSize` always wins** — they may want a
 *     specific cap regardless of the data size (e.g. preview the
 *     last 50 of a 1000-point archive).
 *   - **Otherwise** auto-fit to `max(data.length, 200)`. The 200
 *     floor preserves the streaming-default ring size when `data`
 *     is empty/undefined; data-size sets the floor when present so
 *     bounded ingestion never drops points.
 *
 * Replaces the historical `windowSize={data.length}` workaround that
 * appeared in our own theming docs and likely consumer code.
 */
export function resolveRealtimeWindowSize(
  windowSizeProp: number | undefined,
  data: Datum[] | undefined,
): number {
  if (windowSizeProp != null) return windowSizeProp
  return Math.max(data?.length ?? 0, 200)
}
