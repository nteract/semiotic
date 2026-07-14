import type { Datum } from "../shared/datumTypes"

/**
 * Crossover-segmented record used by the area pipeline. One row per
 * vertex along either the upper or lower boundary; `__diffSegment` is a
 * group key per segment so the area scene builder produces one polygon
 * per id with the correct fill color.
 */
export interface SegmentRow {
  __x: number
  /** Upper boundary y value (max of A, B). The area pipeline reads this. */
  __y: number
  /** Lower boundary y value (min of A, B) — picked up as per-datum y0. */
  __y0: number
  /** Segment id. Format: `"seg-<index>-<winner>"`. */
  __diffSegment: string
  /** Which series is on top in this segment ("A" or "B"). Drives fill. */
  __diffWinner: "A" | "B"
  /** Original A value at this x (or interpolated at crossovers). */
  __valA: number
  /** Original B value at this x (or interpolated at crossovers). */
  __valB: number
  /** Original datum (for tooltip lookup at non-crossover vertices). */
  __sourceDatum?: Datum
}

/**
 * Walk sorted data, splitting at each A↔B crossover. Inserts an
 * interpolated vertex on BOTH sides of every crossover so adjacent
 * segments meet at a zero-width point (no jagged edges).
 *
 * Non-finite rows are skipped; the algorithm tracks the most recent
 * VALID non-tie row (not the index neighbor) for crossover detection,
 * so a non-finite gap doesn't drop a crossover that straddles it.
 *
 * Tie rows (a === b) are handled distinctly from non-tie rows:
 *
 *   - When a tie row sits BETWEEN two non-tie rows with the SAME
 *     winner, the tie is emitted in that winner's segment as a
 *     zero-width vertex.
 *   - When a tie row sits between non-tie rows with DIFFERENT winners,
 *     the FIRST tie of the run becomes the crossover vertex. The old
 *     segment closes at the tie's x, the new segment opens at the same
 *     point, and any subsequent tie rows (multi-tie runs) carry into
 *     the new segment as zero-width vertices.
 *
 * This preserves the data's actual zero-difference point: if the user
 * supplied a tie row explicitly, the fill switches color exactly at
 * that x rather than at a linear-interpolated x that ignored the tie.
 */
export function computeDifferenceSegments<TDatum extends Datum>(
  raw: TDatum[],
  getX: (d: TDatum) => number,
  getA: (d: TDatum) => number,
  getB: (d: TDatum) => number,
): SegmentRow[] {
  if (!raw.length) return []
  // Filter to finite-x rows BEFORE sorting. The comparator returns
  // `NaN - finite` for non-finite-x rows, and `Array.sort` treats NaN
  // returns as "equal", which can leave surrounding finite-x rows out
  // of order. The loop below already skips non-finite-x rows when
  // emitting; doing the filter first keeps the sort total-ordered so
  // crossover math against `lastNonTie` is anchored to truly-prior x
  // values.
  const sorted = raw
    .filter(d => Number.isFinite(getX(d)))
    .sort((p, q) => getX(p) - getX(q))
  const out: SegmentRow[] = []
  let segIdx = 0
  let currentWinner: "A" | "B" | null = null
  // Last row with a clear winner (a !== b). Crossover detection compares
  // against this — not the immediate prior index — so non-finite gaps
  // AND tie rows don't suppress a real winner switch.
  let lastNonTie: { x: number; a: number; b: number; w: "A" | "B" } | null = null
  // Buffered tie rows since the last non-tie. Held back from emission
  // until we know which segment they belong to: same-winner-continues
  // ⇒ flush into current segment; winner-switches ⇒ first tie becomes
  // the crossover boundary, remainder carry into the new segment.
  let pendingTies: { x: number; y: number; datum: Datum }[] = []
  const winnerAt = (a: number, b: number): "A" | "B" | null =>
    a > b ? "A" : b > a ? "B" : null
  const segKey = (w: "A" | "B") => `seg-${segIdx}-${w}`
  const pushRow = (row: SegmentRow) => out.push(row)

  // Helper: emit a buffered tie row as a zero-width vertex into the
  // given segment. Used for both leading-tie flush and mid-stream
  // same-winner flush; pulled out so the two call sites agree on shape.
  const emitTie = (t: { x: number; y: number; datum: Datum }, w: "A" | "B") => {
    pushRow({
      __x: t.x, __y: t.y, __y0: t.y,
      __diffSegment: segKey(w),
      __diffWinner: w,
      __valA: t.y, __valB: t.y,
      __sourceDatum: t.datum,
    })
  }

  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i]
    const x = getX(d), a = getA(d), b = getB(d)
    if (!Number.isFinite(x) || !Number.isFinite(a) || !Number.isFinite(b)) continue
    const w = winnerAt(a, b)

    if (w === null) {
      // Tie row: defer emission until the next non-tie row tells us
      // which segment owns it. Ties before any winner is known (the
      // dataset starts with one or more ties) sit in `pendingTies` and
      // get flushed into the first real segment below; mid-stream ties
      // either flush into the continuing segment or become the
      // crossover vertex for a winner switch.
      pendingTies.push({ x, y: a, datum: d })
      continue
    }

    if (currentWinner == null) {
      // First real winner of the dataset. Commit `currentWinner = w`
      // BEFORE emitting any leading ties so they paint in the correct
      // segment — the previous default-to-"A" path mis-colored the
      // segment when the actual first winner was "B".
      currentWinner = w
      for (const t of pendingTies) emitTie(t, currentWinner)
      pendingTies = []
      const upper = a >= b ? a : b
      const lower = a >= b ? b : a
      pushRow({
        __x: x, __y: upper, __y0: lower,
        __diffSegment: segKey(currentWinner),
        __diffWinner: currentWinner,
        __valA: a, __valB: b,
        __sourceDatum: d,
      })
      lastNonTie = { x, a, b, w }
      continue
    }

    // Real winner with a current segment in flight. If different from
    // the last non-tie row's winner, emit a crossover. The boundary
    // x/y is the first pending tie's position when one exists (the
    // data has an explicit zero-difference point); otherwise it's the
    // linear-interpolation crossover between the last non-tie row and
    // this one.
    if (lastNonTie && lastNonTie.w !== w) {
      let xc: number, yc: number
      if (pendingTies.length > 0) {
        xc = pendingTies[0].x
        yc = pendingTies[0].y
      } else {
        const denom = (a - lastNonTie.a) - (b - lastNonTie.b)
        if (denom !== 0) {
          const t = (lastNonTie.b - lastNonTie.a) / denom
          const tc = Math.max(0, Math.min(1, t))
          xc = lastNonTie.x + tc * (x - lastNonTie.x)
          yc = lastNonTie.a + tc * (a - lastNonTie.a)
        } else {
          // Parallel lines never cross — defensive fallback that
          // shouldn't fire for different-winner endpoints, but keeps
          // the algorithm well-defined.
          xc = lastNonTie.x
          yc = lastNonTie.a
        }
      }
      // Close old segment at crossover.
      pushRow({
        __x: xc, __y: yc, __y0: yc,
        __diffSegment: segKey(currentWinner),
        __diffWinner: currentWinner,
        __valA: yc, __valB: yc,
      })
      // Open new segment at the same vertex.
      segIdx++
      currentWinner = w
      pushRow({
        __x: xc, __y: yc, __y0: yc,
        __diffSegment: segKey(currentWinner),
        __diffWinner: currentWinner,
        __valA: yc, __valB: yc,
      })
      // Pending ties AFTER the boundary belong to the new segment as
      // zero-width vertices. The first one was the boundary itself, so
      // skip index 0.
      for (let p = 1; p < pendingTies.length; p++) emitTie(pendingTies[p], currentWinner)
    } else {
      // Same winner across the tie run — flush pending ties into the
      // current segment as-is.
      for (const t of pendingTies) emitTie(t, currentWinner)
    }
    pendingTies = []

    // Emit the current (non-tie) row.
    const upper = a >= b ? a : b
    const lower = a >= b ? b : a
    pushRow({
      __x: x, __y: upper, __y0: lower,
      __diffSegment: segKey(currentWinner),
      __diffWinner: currentWinner,
      __valA: a, __valB: b,
      __sourceDatum: d,
    })
    lastNonTie = { x, a, b, w }
  }

  // Trailing tie run with no subsequent non-tie row — flush into the
  // current segment as zero-width vertices. If the entire dataset was
  // ties (no winner ever determined), arbitrarily put them in an "A"
  // segment so consumers have a valid segment id to colour against.
  for (const t of pendingTies) emitTie(t, currentWinner ?? "A")
  return out
}
