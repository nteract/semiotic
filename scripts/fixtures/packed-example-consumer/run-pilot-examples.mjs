import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  EventDropChart,
  GauntletChart,
  StreamPhysicsFrame,
} from "semiotic/physics"

/**
 * Representative public consumers for the incremental ExampleDefinition
 * pilot: Watermarks (EventDropChart), Stakeholder Journey
 * (StreamPhysicsFrame), and Merge Pressure (GauntletChart). Keep their
 * fixtures small and deterministic: the contract is that a clean install of
 * the tarball can execute the public imports and produce meaningful SSR
 * output, not that this fixture recreates each docs story's UI shell.
 */
const PILOT_EXAMPLES = [
  {
    id: "watermarks",
    component: EventDropChart,
    props: {
      chartId: "packed-watermarks",
      data: [
        { id: "event-1", eventTime: 4, arrivalTime: 4, source: "api" },
        { id: "event-2", eventTime: 12, arrivalTime: 14, source: "worker" },
      ],
      timeAccessor: "eventTime",
      arrivalAccessor: "arrivalTime",
      windows: { size: 10 },
      watermark: { value: 9 },
      timeExtent: [0, 20],
      size: [320, 180],
      paused: true,
    },
  },
  {
    id: "stakeholder-journey",
    component: StreamPhysicsFrame,
    props: {
      chartId: "packed-stakeholder-journey",
      initialSpawns: [
        {
          id: "participant-1",
          x: 52,
          y: 84,
          shape: { type: "circle", radius: 8 },
          datum: { id: "participant-1", stage: "discovery" },
        },
      ],
      size: [320, 180],
      paused: true,
      title: "Stakeholder journey",
      summary: "A deterministic participant starts at discovery.",
    },
  },
  {
    id: "merge-pressure",
    component: GauntletChart,
    props: {
      chartId: "packed-merge-pressure",
      data: [
        {
          id: "pr-1",
          positives: ["feature"],
          negatives: ["tests"],
          metrics: { points: 3 },
        },
      ],
      idAccessor: "id",
      positiveAccessor: "positives",
      negativeAccessor: "negatives",
      metricsAccessor: "metrics",
      positiveProperties: [{ id: "feature", label: "Feature", value: 3 }],
      negativeProperties: [{ id: "tests", label: "Tests", load: 1.2 }],
      gates: [{ id: "review", label: "Review" }],
      size: [320, 180],
      paused: true,
    },
  },
]

const rendered = []
for (const example of PILOT_EXAMPLES) {
  const markup = renderToStaticMarkup(createElement(example.component, example.props))
  if (markup.length < 80 || !markup.includes("stream-physics-frame")) {
    throw new Error(`${example.id} did not produce a recognizable physics frame during SSR`)
  }
  rendered.push(`${example.id}:${markup.length}`)
}

console.log(`packed pilot examples SSR-rendered (${rendered.join(", ")})`)
