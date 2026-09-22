// Authored presentation fixtures only. Nothing here is an execution record,
// evidence decision, identity, export, or approval produced by the P0 system.
export const renderingStory = [
  {
    id: "encounter",
    number: "01",
    label: "A useful encounter",
    headline: "Useful tools expose a missing capability",
    task: "A designer places a latency chart in a narrow service card; an application team needs the same chart in a browser panel.",
    staticDescription:
      "The static version substitutes short time labels for the browser’s full interval labels. Its tidy appearance hides a layout problem the application still has.",
    browserDescription:
      "Full interval labels crowd the narrow browser panel. A designer working from the simplified export cannot see or investigate the same problem.",
    finding:
      "The products need faithful rendering before feedback about shared visual behavior can reliably travel between them.",
    sharedChange:
      "Make relevant labels, dimensions, scales, and layout comparable across static and browser rendering.",
    downstreamBenefit:
      "A better export helps the designer immediately and makes later findings more useful to the application team.",
    status: "Illustrative reconstruction",
  },
  {
    id: "feedback",
    number: "02",
    label: "Feedback that travels",
    headline: "Make feedback useful across products",
    task: "Faithful rendering brings the full interval labels into the design task. The designer can now investigate the same narrow-panel problem as the application team.",
    staticDescription:
      "At the narrow width, full interval labels collide. The chart preserves its values and missing interval, but the time labels are difficult to distinguish.",
    browserDescription:
      "The same width and label layout reproduce the concern in the browser illustration. Widening either view gives the labels more room.",
    finding: "At this panel width, the time labels are difficult to distinguish.",
    sharedChange:
      "Turn the design observation into a reproducible width-and-label case for the shared chart behavior.",
    downstreamBenefit:
      "An engineer can investigate the same concern instead of guessing whether the report describes an export-only difference.",
    status: "Illustrative design finding",
  },
  {
    id: "improvement",
    number: "03",
    label: "A shared improvement",
    headline: "One finding improves the shared feature",
    task: "Keep the chart useful in the narrow card and carry the improvement into the application panel.",
    staticDescription:
      "The illustrated layout change uses fewer time labels at narrow widths. The designer can read the scale without enlarging the card.",
    browserDescription:
      "The same label-spacing rule benefits the browser panel and future static exports. Data, units, and the missing interval stay fixed.",
    finding:
      "A composition problem becomes a shared layout improvement, with a reason the next reviewer can inspect.",
    sharedChange:
      "Choose time ticks to suit the available width while preserving the scale and the full data series.",
    downstreamBenefit:
      "Design compositions, browser panels, and subsequent report exports all benefit where they use the shared behavior.",
    status: "Illustrative shared improvement",
  },
] as const

export type RenderingStep = (typeof renderingStory)[number]["id"]

export const surfaces = [
  {
    id: "browser",
    label: "Browser preview",
    recipient: "For the person exploring the chart",
    title: "The number has a time and a definition.",
    retained:
      "Mean request latency in milliseconds, the one-second window, two observations, and a provisional label.",
    limitation:
      "A browser result covers this preview. Behavior in another application requires that application’s checks.",
    next: "Replay the missing interval and late observation; check keyboard interaction separately.",
  },
  {
    id: "react",
    label: "React handoff",
    recipient: "For the engineer building the panel",
    title: "Keep the implementation with the intention.",
    retained:
      "The intended public component, mean rather than sum, units, and the same checkpoint data.",
    limitation:
      "A code sample is not an installed-package check. The actual build, resolved import, and adapter revision remain unknown.",
    next: "Compile and run the generated fixture against the identified installed package.",
  },
  {
    id: "svg",
    label: "SVG + context",
    recipient: "For the colleague receiving the snapshot",
    title: "A snapshot should say what it captured.",
    retained:
      "200 ms, as of replay time +5.2 s; window [0, 1) s; provisional; a companion explanation and reference to the original revision.",
    limitation:
      "Live updates, hover, and keyboard chart navigation do not travel in this static representation.",
    next: "Reopen the exported file and its companion context to check what actually arrived.",
  },
  {
    id: "stripped",
    label: "Context lost",
    recipient: "For the reviewer checking a copied image",
    title: "A plausible image can be an incomplete handoff.",
    retained: "The visible shape and 200 ms label survive in this deliberately incomplete mockup.",
    limitation:
      "As-of time, provisional status, and the source reference have been stripped. The recipient cannot tell whether this is the current reading.",
    next: "Request the companion context before using it as a current service-status report.",
  },
] as const

export const changes = [
  {
    id: "layout",
    label: "Space the time labels",
    before: "Every interval labeled",
    after: "Ticks chosen for the width",
    summary: "A shared layout change improves readability without changing the observations.",
    decisions: [
      [
        "Reuse",
        "Mean, count, and missing interval",
        "Arithmetic remains relevant only while its inputs and implementation are unchanged.",
      ],
      [
        "Regenerate",
        "Static and browser layout",
        "Compare the actual render paths at the same widths, fonts, theme, and checkpoint. Check the relevant labels, scale, and spacing.",
      ],
      [
        "Manual",
        "Application interaction and access",
        "Static output cannot establish hover or keyboard behavior. Check these in the receiving application.",
      ],
    ],
  },
  {
    id: "niche",
    label: "Change the intended use",
    before: "Explore a pattern",
    after: "Act on a live alert",
    summary: "Same app, same code, a different niche and a different obligation.",
    decisions: [
      [
        "Reuse",
        "Scoped arithmetic evidence",
        "The same input and implementation may still justify the mean. They do not establish fitness for an operational decision.",
      ],
      [
        "Regenerate",
        "Task and reception evidence",
        "Reassess the audience, intent, timeliness, accessible interpretation, and consequences of acting on provisional data.",
      ],
      [
        "Unknown",
        "Operational response commitment",
        "A staffed owner, currentness requirement, response window, and withdrawal path have not been accepted for the new use.",
      ],
    ],
  },
  {
    id: "color",
    label: "Change the color",
    before: "Teal line",
    after: "Violet line",
    summary: "The appearance changed. The arithmetic did not.",
    decisions: [
      [
        "Reuse",
        "Mean and count",
        "Only if data, window, accessor, and arithmetic implementation are unchanged.",
      ],
      [
        "Regenerate",
        "Color and contrast",
        "The changed token affects visual and contrast checks on each relevant surface.",
      ],
      [
        "Manual",
        "Readable in context?",
        "A reviewer still needs to judge emphasis in the intended application.",
      ],
    ],
  },
  {
    id: "meaning",
    label: "Change mean to sum",
    before: "Mean · 200 ms",
    after: "Sum · 400 ms",
    summary: "A beautiful chart still fails when it answers the wrong question.",
    decisions: [
      [
        "Regenerate",
        "Numeric meaning",
        "100 + 300 = 400 is a sum, not the requested mean of 200 ms. The old aggregate claim cannot carry forward.",
      ],
      [
        "Regenerate",
        "All three representations",
        "Labels, access descriptions, generated code, and snapshots must agree on the measure.",
      ],
      [
        "Manual",
        "Is this still the right measure?",
        "The service-latency use requires a domain judgment, even if rendering succeeds.",
      ],
    ],
  },
  {
    id: "runtime",
    label: "Change the renderer",
    before: "Known dependency",
    after: "Unresolved build",
    summary: "An unchanged wrapper cannot vouch for a changed renderer.",
    decisions: [
      [
        "Regenerate",
        "Dependent render checks",
        "The shared rendering implementation changed; prior screenshots do not cover the candidate.",
      ],
      [
        "Unknown",
        "Unclassified impact",
        "Without a resolved dependency identity, the scope of additional effects cannot be established.",
      ],
      [
        "Manual",
        "Host-specific review",
        "Results from another host remain evidence about that other host.",
      ],
    ],
  },
] as const

export const affectedOutputs = [
  [
    "High-touch example",
    "Revisit",
    "Check whether its explanation still represents the qualified reading accurately.",
  ],
  [
    "Internal prototype task",
    "Pause if misleading",
    "Stop a misleading exercise; correct the explanation or remove the case before reuse.",
  ],
  [
    "Registered report snapshot",
    "Review context",
    "Keep a correctly dated provisional reading. Correct or withdraw a copy that misstates its time or meaning.",
  ],
  [
    "Affected beta use",
    "Assess impact",
    "Follow the trial’s agreed support and fallback if the revised result makes the current use misleading.",
  ],
  [
    "Unrelated throughput chart",
    "Unaffected",
    "No declared dependency on this latency observation.",
  ],
  [
    "Unregistered offline copies",
    "Unknown",
    "Copies outside the record cannot all be discovered, recalled, or updated.",
  ],
] as const

export const promises = [
  {
    number: "01",
    title: "Useful tools create reasons to participate.",
    value:
      "A designer gets help composing a screen. A colleague gets a useful report. Immediate value gives people a reason to return before production adoption.",
    proof:
      "Observe completed tasks, repeat use, and reasons people stop using the tool. A working demo alone does not establish a useful product.",
    contribution: "Start with a task people want to do.",
  },
  {
    number: "02",
    title: "Different uses reveal different things.",
    value:
      "Design work exposes layout constraints. Reports expose ambiguous meaning. Integrations expose unfamiliar data and dependencies.",
    proof:
      "Link findings to the tasks and circumstances that produced them. Look for distinct learning and resulting changes, not a count of views.",
    contribution: "Keep enough context for someone else to investigate.",
  },
  {
    number: "03",
    title: "Faithful representations let feedback travel.",
    value:
      "A finding about labels can inform another product when its labels, scale, dimensions, and layout share the relevant behavior.",
    proof:
      "Compare the properties the observation concerns in real render paths. Test interaction in the browser; static fidelity does not establish it.",
    contribution: "Make the connection between products dependable.",
  },
  {
    number: "04",
    title: "Shared improvements repay several products.",
    value:
      "A design finding can improve the library’s layout, the application panel, and later exports. The benefit extends beyond the original encounter.",
    proof:
      "Trace a finding to a shared change and verify its benefit in another relevant consumer. Identify adapter-only fixes separately.",
    contribution: "Carry the improvement back to the people who need it.",
  },
  {
    number: "05",
    title: "Different commitments create room to learn.",
    value:
      "A bounded tool with a working fallback can support useful exploration while a customer application still needs stronger guarantees.",
    proof:
      "Explain what makes the earlier use recoverable, exercise its support and fallback, and identify the additional work required for the stronger promise.",
    contribution: "Match review and support to the task and consequences.",
  },
  {
    number: "06",
    title: "Later review should start with more understanding.",
    value:
      "Reviewers inherit useful tasks, discovered limits, and reasons for changes. They can concentrate on the questions still open in their application.",
    proof:
      "Compare reconstruction and late rework across similar changes. Include participation, tool maintenance, support, and documentation in the total cost.",
    contribution: "Keep the development history close to ordinary issues, tests, and changes.",
  },
] as const
