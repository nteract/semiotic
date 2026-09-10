import React from "react"
import "./physicsStories.css"

interface ReplayEvent {
  id: string
  eventTime: number
  arrivalTime: number
  source: string
}

export function watermarkPolicySummary(
  events: readonly ReplayEvent[],
  windowSize: number,
  allowance: number,
) {
  const late = events.filter(
    (event) =>
      event.arrivalTime > (Math.floor(event.eventTime / windowSize) + 1) * windowSize + allowance,
  ).length
  return { accepted: events.length - late, late }
}

export function WatermarkExperiment({
  events,
  windowSize,
  allowance,
  currentTime,
  onPolicy,
  onFrontier,
}: {
  events: ReplayEvent[]
  windowSize: number
  allowance: number
  currentTime: number
  onPolicy: (allowance: number) => void
  onFrontier: (time: number) => void
}) {
  const finalArrival = Math.max(...events.map((event) => event.arrivalTime))
  const delayed = events.find((event) => event.source === "backfill")
  const end = delayed ? (Math.floor(delayed.eventTime / windowSize) + 1) * windowSize : 0
  const additional =
    watermarkPolicySummary(events, windowSize, 54).accepted -
    watermarkPolicySummary(events, windowSize, 18).accepted
  const arrived = events.filter((event) => event.arrivalTime <= currentTime)
  const snapshot = watermarkPolicySummary(arrived, windowSize, allowance)
  return (
    <section className="physics-story" aria-labelledby="watermark-question">
      <span className="physics-story__eyebrow">A decision about waiting</span>
      <h2 id="watermark-question">Now compare a whole stream</h2>
      <p>
        A delayed batch belongs to an earlier window. Closing sooner gives you an answer sooner;
        waiting longer admits more of that batch. Compare snapshots of the same {events.length}{" "}
        events under two policies. Previously accepted history starts beneath any lids that have
        since closed.
      </p>
      <div className="physics-story__choices" aria-label="Compare waiting policies">
        {[18, 54].map((delay) => {
          const result = watermarkPolicySummary(events, windowSize, delay)
          return (
            <button
              key={delay}
              type="button"
              aria-pressed={allowance === delay}
              onClick={() => onPolicy(delay)}
            >
              <span>{delay === 18 ? "Close sooner" : "Wait for the delayed batch"}</span>
              <strong>{delay}s watermark lag</strong>
              <small>
                {result.accepted} accepted · {result.late} late by the end of this tape
              </small>
            </button>
          )
        })}
      </div>
      <p data-testid="watermark-policy-tradeoff">
        Waiting <b>36 seconds longer</b> per window admits <b>{additional} additional events</b>{" "}
        from this tape. {additional === 0 && "Here, the extra wait adds no records to the count."}
      </p>
      {delayed && (
        <div className="physics-story__witness" data-testid="watermark-story-witness">
          <strong>Follow the event at {delayed.eventTime}s.</strong>
          <span>
            It arrives at {delayed.arrivalTime}s. Its window ends at {end}s; this policy closes it
            after {end + allowance}s.
            {delayed.arrivalTime > end + allowance
              ? " It arrives behind the watermark of a closed window and goes to the far-left bin."
              : " The window is still open when it arrives, so it joins the count."}
          </span>
          <div className="physics-story__actions">
            <button
              type="button"
              aria-pressed={currentTime === delayed.arrivalTime - 1}
              onClick={() => onFrontier(delayed.arrivalTime - 1)}
            >
              Before the batch
            </button>
            <button
              type="button"
              aria-pressed={currentTime === finalArrival}
              onClick={() => onFrontier(finalArrival)}
            >
              After the batch
            </button>
          </div>
          <output data-testid="watermark-snapshot-result" aria-live="polite">
            At {currentTime}s, with a {allowance}s lag:{" "}
            <b>
              {snapshot.accepted} accepted · {snapshot.late} late
            </b>
            .
            {currentTime === finalArrival &&
              snapshot.late === 0 &&
              " The batch arrived before its windows closed."}
          </output>
        </div>
      )}
      <p className="physics-story__reading">
        <b>Read the apparatus:</b> one ball is one event, horizontal position is event time, a lid
        is a closed window, and the far-left bin collects late arrivals for a separate correction.
        Numbers over event-time bins count accepted events; the far-left number counts late events.
        These are totals for the selected snapshot. The sequence above shows the moments of
        admission and closure.
      </p>
      <p className="physics-story__reading">
        Here the watermark trails the arrival clock by the chosen lag: it estimates how far event
        time is complete. A larger lag leaves more windows open. Late arrivals after closure go to a
        separate correction; this example has no extra grace period after closure.
      </p>
    </section>
  )
}
