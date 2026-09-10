export const WATERMARK_SCENARIOS = [
  {
    id: "calm",
    label: "Calm stream",
    seed: 31,
    description:
      "mostly ordered arrivals with a few old events still visible as the watermark advances",
    events: [
      { id: "calm-01", eventTime: 3, arrivalTime: 4, source: "frontend", value: 1 },
      { id: "calm-02", eventTime: 8, arrivalTime: 9, source: "api", value: 1 },
      { id: "calm-03", eventTime: 15, arrivalTime: 16, source: "api", value: 1 },
      { id: "calm-04", eventTime: 19, arrivalTime: 20, source: "billing", value: 1 },
      { id: "calm-05", eventTime: 28, arrivalTime: 29, source: "frontend", value: 1 },
      { id: "calm-06", eventTime: 36, arrivalTime: 37, source: "api", value: 1 },
      { id: "calm-07", eventTime: 42, arrivalTime: 43, source: "billing", value: 1 },
      { id: "calm-08", eventTime: 50, arrivalTime: 52, source: "frontend", value: 1 },
    ],
  },
  {
    id: "backfill",
    label: "Backfill burst",
    seed: 47,
    description: "a batch replay injects old event times after newer windows have already moved on",
    events: [
      // Event times select windows; each arrival is tested against the
      // watermark at that moment. The three "backfill"
      // rows carry old event times but arrive last — the burst that lands
      // behind an already-advanced watermark.
      { id: "backfill-01", eventTime: 6, arrivalTime: 7, source: "api", value: 1 },
      { id: "backfill-04", eventTime: 39, arrivalTime: 40, source: "sensor", value: 1 },
      { id: "backfill-02", eventTime: 12, arrivalTime: 13, source: "api", value: 1 },
      { id: "backfill-05", eventTime: 45, arrivalTime: 46, source: "sensor", value: 1 },
      { id: "backfill-03", eventTime: 24, arrivalTime: 25, source: "frontend", value: 1 },
      { id: "backfill-06", eventTime: 58, arrivalTime: 59, source: "api", value: 1 },
      { id: "backfill-07", eventTime: 63, arrivalTime: 64, source: "frontend", value: 1 },
      { id: "backfill-08", eventTime: 11, arrivalTime: 62, source: "backfill", value: 1 },
      { id: "backfill-09", eventTime: 17, arrivalTime: 66, source: "backfill", value: 1 },
      { id: "backfill-10", eventTime: 28, arrivalTime: 70, source: "backfill", value: 1 },
    ],
  },
  {
    id: "skew",
    label: "Sensor skew",
    seed: 59,
    description:
      "one source reports old event times while the rest of the stream keeps progressing",
    events: [
      { id: "skew-01", eventTime: 4, arrivalTime: 5, source: "edge-a", value: 1 },
      { id: "skew-02", eventTime: 18, arrivalTime: 19, source: "edge-b", value: 1 },
      { id: "skew-03", eventTime: 31, arrivalTime: 32, source: "edge-a", value: 1 },
      { id: "skew-04", eventTime: 47, arrivalTime: 48, source: "edge-b", value: 1 },
      { id: "skew-05", eventTime: 54, arrivalTime: 55, source: "edge-a", value: 1 },
      { id: "skew-06", eventTime: 66, arrivalTime: 67, source: "edge-b", value: 1 },
      { id: "skew-07", eventTime: 16, arrivalTime: 69, source: "skewed", value: 1 },
      { id: "skew-08", eventTime: 22, arrivalTime: 72, source: "skewed", value: 1 },
      { id: "skew-09", eventTime: 33, arrivalTime: 75, source: "skewed", value: 1 },
      { id: "skew-10", eventTime: 78, arrivalTime: 79, source: "edge-a", value: 1 },
    ],
  },
]
