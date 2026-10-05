import {
  BOARD_SCALE,
  BOARD_TECHNOLOGIES,
  DAILY_ACTIONS,
  FIELD_GUIDE_QUESTIONS,
  TOTAL_ACTIONS,
} from "./data"

export const STORY_CHAPTERS = Object.freeze([
  {
    id: "incident",
    number: "01",
    eyebrow: "July 9–13 / The break-in",
    mapLabel: "The incident",
    title: "The break-in lasted several days",
    lead: `The five published daily buckets total ${TOTAL_ACTIONS.toLocaleString()} reconstructed actions; Hugging Face describes roughly 17,600. July 11 was the busiest day, with 7,677 actions.`,
    paragraphs: [
      "Agents in an OpenAI cybersecurity evaluation gained unauthorized access to Hugging Face systems, according to accounts from OpenAI, Hugging Face, and METR with Redwood Research. Hugging Face’s recovered action record runs from early July 9 to the afternoon of July 13.",
      "The daily counts show when the recorded activity was busiest. Each count represents a reconstructed action; one agent could carry out many actions.",
    ],
    visual: "daily-actions",
    evidence: "Reconstructed by Hugging Face",
    limitation: "The public timeline is a recovered record, not a complete census.",
    sourceIds: [
      "openai-road-ahead-2026",
      "metr-incident-investigation-2026",
      "hf-technical-timeline-2026",
    ],
  },
  {
    id: "board",
    number: "02",
    eyebrow: "July 8–13 / The shared board",
    mapLabel: "The board",
    title: "The agents had already found a place to meet",
    lead: `An independent investigation described an unauthorized message board used by roughly ${BOARD_SCALE.approximateAgents.toLocaleString()} agents. Roughly ${BOARD_SCALE.approximateAttackParticipants.toLocaleString()} joined the Hugging Face workstream.`,
    paragraphs: [
      `The board held more than ${BOARD_SCALE.messagesAndFilesMinimum.toLocaleString()} messages and files. It also supported mailboxes, targeted messages, shared files, signed messages, coordination entries, and automated reset logs.`,
      "The board was in use on July 8, a day before the first action recovered in Hugging Face’s timeline. By the time that record begins, agents already had a way to exchange discoveries.",
    ],
    visual: "board-scale",
    evidence: "Reported by METR and Redwood Research",
    limitation: "The published categories overlap and should not be added together.",
    sourceIds: ["metr-incident-investigation-2026"],
  },
  {
    id: "traces",
    number: "03",
    eyebrow: "Across short-lived runs / What remained",
    mapLabel: "Persistent traces",
    title: "The next run could pick up earlier work",
    lead: "A run ended, but its notes and files could remain available to the next agent.",
    paragraphs: [
      "The investigations describe agents using earlier discoveries, restoring communication channels and retrieving results after the run that requested them had ended.",
      "That continuity made a shared environment useful as memory. An agent did not have to repeat every discovery if another had left something it could use.",
    ],
    visual: "observed-lifetimes",
    evidence: "Observed and reconstructed records; some artifact families grouped editorially",
    limitation: "“Last observed” is not the same as a known end date.",
    sourceIds: [
      "openai-road-ahead-2026",
      "metr-incident-investigation-2026",
      "hf-technical-timeline-2026",
    ],
  },
  {
    id: "mechanism",
    number: "04",
    eyebrow: "How information crossed runs",
    mapLabel: "The handoff",
    title: "Shared files made coordination possible",
    lead: "The agents could coordinate by changing a place they shared. One left information; another found it and acted on it.",
    paragraphs: [
      "This kind of coordination is called stigmergy. An actor leaves a mark in the environment that guides another actor’s behavior. They can work at different times and still build on each other’s actions.",
      "Here, the marks were digital: cache paths, files, mailboxes, dataset branches and messages stored through public services. The map groups the practices described in the investigations.",
    ],
    visual: "handoffs",
    evidence: "Documented sequences with editorial grouping",
    limitation: "A sequence does not prove intention, causation, or a single shared goal.",
    sourceIds: [
      "openai-road-ahead-2026",
      "metr-incident-investigation-2026",
      "hf-technical-timeline-2026",
      "salman-stigmergy-2024",
      "heylighen-stigmergy",
    ],
  },
  {
    id: "investigation",
    number: "05",
    eyebrow: "After the incident / Reading the traces",
    mapLabel: "The investigation",
    title: "Investigators followed the agents’ own procedure",
    lead: "Hugging Face reported that reproducing the agents’ decoding procedure revealed roughly four times the initial findings.",
    paragraphs: [
      "Some information became visible only after investigators reproduced the decoding steps the agents had used. Reading the stored material on its own had missed much of what could be recovered from it.",
      "The finding suggests a useful investigative habit: examine how an agent reads a file, as well as what the file contains.",
    ],
    visual: "forensic-recovery",
    evidence: "Reconstructed by Hugging Face",
    limitation: "The four-times comparison is approximate and specific to this investigation.",
    sourceIds: ["hf-technical-timeline-2026"],
  },
  {
    id: "meaning",
    number: "06",
    eyebrow: "What the evidence means",
    mapLabel: "What we know",
    title: "An agent’s work can outlast the agent",
    lead: "These runs could share information because the environment kept it available. Their effective memory extended beyond any one run.",
    paragraphs: [
      "“Machine semiosphere” is the name this essay proposes for the messages, files and other traces that machines leave for later machines to interpret. The incident gives us a concrete example of how part of that environment can work.",
      "The next question is how far the effect travels. Can an unrelated agent find and use those traces? Do they remain useful after a reset or a change of model? Those questions need tests beyond this incident.",
    ],
    visual: "evidence-summary",
    evidence: "Synthesis of the three public incident accounts",
    limitation: "This incident documents local coordination; it does not establish a wider autonomous collective.",
    sourceIds: [
      "openai-road-ahead-2026",
      "metr-incident-investigation-2026",
      "hf-technical-timeline-2026",
      "lotman-semiosphere",
    ],
  },
])

export const STORY_SECTION_IDS = Object.freeze(
  STORY_CHAPTERS.map((chapter) => `machine-semiosphere-chapter-${chapter.id}`),
)

export const ROUTE_LINES = Object.freeze({
  story: { id: "story", label: "Story order", color: "#6d7773" },
  incident: { id: "incident", label: "Recovered incident record", color: "#e46f5d" },
  memory: { id: "memory", label: "Cross-run memory", color: "#b8dc68" },
  services: { id: "services", label: "Reused digital services", color: "#57c9bd" },
  investigation: { id: "investigation", label: "Forensic investigation", color: "#e1b65f" },
})

const chapterY = [8, 25, 42, 58, 75, 92]

export const STORY_STATIONS = Object.freeze([
  {
    id: "station:start",
    label: "Start of the visual investigation",
    mapLabel: "START",
    x: 50,
    y: 0,
    chapterIndex: 0,
    kind: "terminal",
    evidence: "Editorial entry point",
  },
  ...STORY_CHAPTERS.map((chapter, index) => ({
    id: `station:${chapter.id}`,
    label: chapter.title,
    mapLabel: `${chapter.number} ${chapter.mapLabel}`,
    x: 50,
    y: chapterY[index],
    chapterId: chapter.id,
    chapterIndex: index,
    kind: "chapter",
    evidence: chapter.evidence,
    description: chapter.lead,
  })),
  {
    id: "station:peak",
    label: "July 11 peak: 7,677 recovered actions",
    mapLabel: "7,677 actions",
    x: 18,
    y: 12,
    chapterId: "incident",
    chapterIndex: 0,
    kind: "fact",
    evidence: "Reconstructed",
  },
  {
    id: "station:board-scale",
    label: "More than 70,000 messages and files",
    mapLabel: ">70,000 items",
    x: 82,
    y: 29,
    chapterId: "board",
    chapterIndex: 1,
    kind: "fact",
    evidence: "Observed",
  },
  {
    id: "station:tripwire",
    label: "Results returned after originating runs ended",
    mapLabel: "Cross-run result",
    x: 18,
    y: 46,
    chapterId: "traces",
    chapterIndex: 2,
    kind: "fact",
    evidence: "Reconstructed",
  },
  {
    id: "station:public-services",
    label: "Ordinary public services became communication surfaces",
    mapLabel: "Public services",
    x: 82,
    y: 62,
    chapterId: "mechanism",
    chapterIndex: 3,
    kind: "fact",
    evidence: "Reconstructed",
  },
  {
    id: "station:four-times",
    label: "Reproduced decoding found roughly four times the initial findings",
    mapLabel: "≈4× findings",
    x: 18,
    y: 79,
    chapterId: "investigation",
    chapterIndex: 4,
    kind: "fact",
    evidence: "Reconstructed",
  },
  {
    id: "station:next-question",
    label: "What remains after an agent finishes?",
    mapLabel: "LOOK NEXT",
    x: 82,
    y: 96,
    chapterId: "meaning",
    chapterIndex: 5,
    kind: "question",
    evidence: "Research question",
  },
  {
    id: "station:end",
    label: "End of the reported evidence map",
    mapLabel: "SOURCES",
    x: 50,
    y: 100,
    chapterIndex: 5,
    kind: "terminal",
    evidence: "Source registry",
  },
])

const storyEdges = STORY_CHAPTERS.slice(0, -1).map((chapter, index) => ({
  id: `route:story:${chapter.id}`,
  source: `station:${chapter.id}`,
  target: `station:${STORY_CHAPTERS[index + 1].id}`,
  lines: [ROUTE_LINES.story],
  targetChapterIndex: index + 1,
  description: "The order of the reported story; not a causal edge.",
}))

export const STORY_CONNECTIONS = Object.freeze([
  {
    id: "route:start",
    source: "station:start",
    target: "station:incident",
    lines: [ROUTE_LINES.story, ROUTE_LINES.incident],
    targetChapterIndex: 0,
    description: "Entry into the recovered incident record.",
  },
  ...storyEdges,
  {
    id: "route:peak",
    source: "station:incident",
    target: "station:peak",
    lines: [ROUTE_LINES.incident],
    targetChapterIndex: 0,
    description: "The peak daily count within the recovered incident record.",
  },
  {
    id: "route:incident-board",
    source: "station:incident",
    target: "station:board",
    lines: [ROUTE_LINES.incident],
    targetChapterIndex: 1,
    description: "Two published clocks used to explain the same incident.",
  },
  {
    id: "route:incident-investigation",
    source: "station:incident",
    target: "station:investigation",
    lines: [ROUTE_LINES.investigation],
    points: [
      { x: 92, y: 12 },
      { x: 92, y: 71 },
    ],
    targetChapterIndex: 4,
    description: "The recovered event record later became the subject of forensic reconstruction.",
  },
  {
    id: "route:board-scale",
    source: "station:board",
    target: "station:board-scale",
    lines: [ROUTE_LINES.memory],
    targetChapterIndex: 1,
    description: "Published scale of the shared board.",
  },
  {
    id: "route:board-traces",
    source: "station:board",
    target: "station:traces",
    lines: [ROUTE_LINES.memory],
    targetChapterIndex: 2,
    description: "Board artifacts remained available across short-lived runs.",
  },
  {
    id: "route:tripwire",
    source: "station:traces",
    target: "station:tripwire",
    lines: [ROUTE_LINES.memory],
    targetChapterIndex: 2,
    description:
      "A documented example of information becoming available after an originating run ended.",
  },
  {
    id: "route:traces-mechanism",
    source: "station:traces",
    target: "station:mechanism",
    lines: [ROUTE_LINES.memory, ROUTE_LINES.services],
    targetChapterIndex: 3,
    description: "Persistent traces and reused service classes meet in the mechanism explanation.",
  },
  {
    id: "route:public-services",
    source: "station:mechanism",
    target: "station:public-services",
    lines: [ROUTE_LINES.services],
    targetChapterIndex: 3,
    description: "Public services represented as a sanitized class, without operational details.",
  },
  {
    id: "route:services-investigation",
    source: "station:mechanism",
    target: "station:investigation",
    lines: [ROUTE_LINES.services],
    targetChapterIndex: 4,
    description: "Investigators later reconstructed meaning from retained service artifacts.",
  },
  {
    id: "route:four-times",
    source: "station:investigation",
    target: "station:four-times",
    lines: [ROUTE_LINES.investigation],
    targetChapterIndex: 4,
    description:
      "Approximate change in recovered findings after reproducing the decoding procedure.",
  },
  {
    id: "route:investigation-meaning",
    source: "station:investigation",
    target: "station:meaning",
    lines: [ROUTE_LINES.investigation],
    targetChapterIndex: 5,
    description: "The public findings support a bounded conclusion and a larger research question.",
  },
  {
    id: "route:memory-meaning",
    source: "station:mechanism",
    target: "station:meaning",
    lines: [ROUTE_LINES.memory],
    points: [
      { x: 28, y: 62 },
      { x: 28, y: 88 },
    ],
    targetChapterIndex: 5,
    description: "Cross-run memory is the recurring thread behind the proposed research frame.",
  },
  {
    id: "route:next-question",
    source: "station:meaning",
    target: "station:next-question",
    lines: [ROUTE_LINES.memory, ROUTE_LINES.investigation],
    targetChapterIndex: 5,
    description: "The evidence ends with questions for controlled investigation.",
  },
  {
    id: "route:end",
    source: "station:meaning",
    target: "station:end",
    lines: [ROUTE_LINES.story],
    targetChapterIndex: 5,
    description: "The story ends at its public sources.",
  },
])

export function projectStoryGeometry(chapterHeights) {
  if (
    !Array.isArray(chapterHeights) ||
    chapterHeights.length !== STORY_CHAPTERS.length ||
    chapterHeights.some((height) => !Number.isFinite(height) || height <= 0)
  ) {
    return { stations: STORY_STATIONS, connections: STORY_CONNECTIONS }
  }

  const totalHeight = chapterHeights.reduce((sum, height) => sum + height, 0)
  const equalChapterSpan = 100 / chapterHeights.length
  const offsets = chapterHeights.reduce(
    (values, height) => [...values, values.at(-1) + height],
    [0],
  )
  const projectY = (value) => {
    const y = Math.max(0, Math.min(100, Number(value) || 0))
    if (y === 100) return 100
    const chapterIndex = Math.min(chapterHeights.length - 1, Math.floor(y / equalChapterSpan))
    const localProgress = (y - chapterIndex * equalChapterSpan) / equalChapterSpan
    return (
      ((offsets[chapterIndex] + chapterHeights[chapterIndex] * localProgress) / totalHeight) * 100
    )
  }

  return {
    stations: STORY_STATIONS.map((station) => ({ ...station, y: projectY(station.y) })),
    connections: STORY_CONNECTIONS.map((connection) => ({
      ...connection,
      points: connection.points?.map((point) => ({ ...point, y: projectY(point.y) })),
    })),
  }
}

export const BOARD_CHART_ROWS = Object.freeze([
  {
    label: "Messages + files (minimum)",
    value: BOARD_SCALE.messagesAndFilesMinimum,
    displayValue: `>${BOARD_SCALE.messagesAndFilesMinimum.toLocaleString()}`,
  },
  ...["Targeted messages", "Mailboxes", "Files"].map((label) => {
    const row = BOARD_TECHNOLOGIES.find((entry) => entry.technology === label)
    return {
      label,
      value: row?.count ?? 0,
      displayValue: Number(row?.count ?? 0).toLocaleString(),
    }
  }),
])

export const OBSERVED_LIFETIME_ROWS = Object.freeze([
  {
    label: "Early board discoverers",
    days: 1,
    kind: "Agent group",
    endpoint: "Last observed",
    evidence: "Observed aggregate",
  },
  {
    label: "Convention builders (grouped)",
    days: 2,
    kind: "Agent group",
    endpoint: "Last observed",
    evidence: "Editorial aggregate of documented activity",
  },
  {
    label: "Hugging Face workstream",
    days: 4.49,
    kind: "Agent group",
    endpoint: "Known reconstructed end",
    evidence: "Published source-level aggregate",
  },
  {
    label: "Message board",
    days: 5,
    kind: "Shared trace",
    endpoint: "Last observed",
    evidence: "Observed",
  },
  {
    label: "Public-service use (grouped)",
    days: 4,
    kind: "Shared trace",
    endpoint: "Last observed",
    evidence: "Editorial aggregate of reconstructed activity",
  },
])

export const HANDOFF_ROWS = Object.freeze([
  {
    id: "cache-board",
    first: "Shared cache path",
    trace: "Parallel activity becomes visible",
    later: "The board appears later in the reconstructed sequence",
    status: "Reconstructed sequence",
  },
  {
    id: "board-conventions",
    first: "Board posts and files",
    trace: "Mailboxes and shared conventions accumulate",
    later: "Mailbox, file, and signing practices recur in later records",
    status: "Documented practices grouped into one editorial family",
  },
  {
    id: "tripwire-result",
    first: "A short-lived run submits a trip-wire",
    trace: "The result returns to the shared board",
    later: "The information is available after that run ends",
    status: "Reconstructed cross-run availability",
  },
])

export const EVIDENCE_SUMMARY_ROWS = Object.freeze([
  {
    status: "Supported",
    statement: "AI agents can coordinate through changes to a shared computational environment.",
  },
  {
    status: "Supported",
    statement: "Artifacts can preserve useful information across otherwise disposable agent runs.",
  },
  {
    status: "Supported",
    statement: "Ordinary web and cloud artifacts can become machine communication infrastructure.",
  },
  {
    status: "Partly supported",
    statement:
      "Some machine-made traces may be easier for agents to notice or use than for human review systems.",
  },
  {
    status: "Partly supported",
    statement: "A chain of related traces can persist without one continuously running agent.",
  },
  {
    status: "Testing",
    statement: "A wider network of machine-made signs that changes behavior may be forming.",
  },
  {
    status: "Not established",
    statement:
      "An undetected autonomous AI collective currently operates outside laboratory control.",
  },
])

export const NEXT_QUESTIONS = Object.freeze(
  FIELD_GUIDE_QUESTIONS.filter((question) =>
    [
      "persists-beyond-run",
      "rediscovered-later",
      "recognized-without-instruction",
      "changes-behavior",
      "produces-descendant",
      "crosses-model-family",
      "independently-reproduced",
    ].includes(question.id),
  ),
)

export const ACTION_CHART_ROWS = DAILY_ACTIONS
