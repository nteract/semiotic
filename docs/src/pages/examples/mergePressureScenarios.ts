export interface ReviewTrait {
  id: string
  label: string
  short: string
  color: string
  work: number
  priority: number
  load: number
}

export interface ReviewScenario {
  id: string
  short: string
  label: string
  source: string
  count: number
  arrivalGap: number
  reviewRate: number
  humanBudget: number
  aiMode: string
  seed: number
  description: string
  lesson: string
  comparison: string
}

export const TRAITS: Record<string, ReviewTrait> = {
  missing_tests: {
    id: "missing_tests",
    label: "Missing Tests",
    short: "MT",
    color: "#dc2626",
    work: 3,
    priority: 3,
    load: 1.35,
  },
  bad_tests: {
    id: "bad_tests",
    label: "Bad Tests",
    short: "BT",
    color: "#ea580c",
    work: 2,
    priority: 5,
    load: 1.15,
  },
  bugs: {
    id: "bugs",
    label: "Bugs",
    short: "BUG",
    color: "#e11d48",
    work: 2,
    priority: 1,
    load: 1.1,
  },
  docs: {
    id: "docs",
    label: "Docs Gap",
    short: "DOC",
    color: "#d97706",
    work: 1,
    priority: 0,
    load: 0.7,
  },
  scope: {
    id: "scope",
    label: "Scope Creep",
    short: "SCOPE",
    color: "#475569",
    work: 2,
    priority: 2,
    load: 0.95,
  },
  tech_debt: {
    id: "tech_debt",
    label: "Tech Debt",
    short: "DEBT",
    color: "#7c3aed",
    work: 3,
    priority: 4,
    load: 1.25,
  },
}

export const TRAIT_ORDER = ["docs", "bugs", "scope", "missing_tests", "tech_debt", "bad_tests"]

export const NEGATIVE_PROPERTIES = Object.values(TRAITS).map((trait) => ({
  ...trait,
  mass: 0.72,
  radius: 7.5,
  pull: { x: -7, y: 18 + trait.load * 5 },
}))

export const PR_TEMPLATES = [
  { points: 2, negatives: ["missing_tests", "docs"] },
  { points: 4, negatives: ["docs", "bugs", "missing_tests"] },
  { points: 3, negatives: ["scope", "docs"] },
  {
    points: 6,
    negatives: ["docs", "bugs", "scope", "missing_tests", "tech_debt"],
  },
  { points: 5, negatives: ["missing_tests", "tech_debt", "bugs"] },
  { points: 3, negatives: ["docs", "bad_tests"] },
  { points: 4, negatives: ["scope", "bugs", "missing_tests", "bugs"] },
  { points: 2, negatives: ["docs", "tech_debt"] },
]

export const SCENARIOS: Record<string, ReviewScenario> = {
  humanPace: {
    id: "humanPace",
    short: "1. Human pace",
    label: "Coding throttles the system",
    source: "Human-authored PRs",
    count: 8,
    arrivalGap: 1.45,
    reviewRate: 5,
    humanBudget: 5,
    aiMode: "observe",
    seed: 31,
    comparison: "Baseline: eight PRs arrive 1.45 model seconds apart.",
    description:
      "PR work arrives slowly enough that the shared human queue drains between arrivals.",
    lesson:
      "When coding is slower than review service, attached risk can be inspected without a persistent backlog.",
  },
  aiBurst: {
    id: "aiBurst",
    short: "2. AI burst",
    label: "The bottleneck moves to review",
    source: "AI-assisted PRs",
    count: 8,
    arrivalGap: 0.38,
    reviewRate: 5,
    humanBudget: 5,
    aiMode: "observe",
    seed: 31,
    comparison:
      "Compared with Human pace: only the arrival gap changes, from 1.45 to 0.38 model seconds.",
    description:
      "The same review service now receives code points faster than it can process them.",
    lesson:
      "More generated code is visible immediately; merged Feature points remain governed by shared review throughput.",
  },
  ciReturns: {
    id: "ciReturns",
    short: "3. CI returns",
    label: "Recirculation consumes capacity twice",
    source: "AI-agent PRs, narrow review",
    count: 8,
    arrivalGap: 0.38,
    reviewRate: 5,
    humanBudget: 3,
    aiMode: "observe",
    seed: 31,
    comparison:
      "Compared with AI burst: only the remediation budget falls, from 5 to 3 units per review.",
    description:
      "A smaller remediation budget leaves Missing Tests attached, so CI sends the same PR back through human review.",
    lesson:
      "A CI return sends the same PR through review again, adding repeat demand to a finite service.",
  },
  aiTests: {
    id: "aiTests",
    short: "4. Shallow checks",
    label: "A green check can conceal risk",
    source: "Presence-only automated checks",
    count: 8,
    arrivalGap: 0.38,
    reviewRate: 5,
    humanBudget: 3,
    aiMode: "bad_tests",
    seed: 31,
    comparison:
      "Compared with CI returns: only the automated check changes. It adds tests without establishing their quality.",
    description:
      "This deliberately shallow check replaces Missing Tests with Bad Tests. CI tests for presence, so it can pass with flawed tests still attached.",
    lesson:
      "Test presence and test quality answer different questions. This authored policy illustrates that gap; it does not estimate AI accuracy.",
  },
  scaledReview: {
    id: "scaledReview",
    short: "5. Scale review",
    label: "Give review more capacity",
    source: "AI-assisted PRs, wider review",
    count: 8,
    arrivalGap: 0.38,
    reviewRate: 15,
    humanBudget: 5,
    aiMode: "observe",
    seed: 31,
    comparison:
      "Compared with AI burst: only review service triples, from 5 to 15 work units per model second.",
    description: "The same burst and review depth now have three times the shared review service.",
    lesson:
      "Extra review capacity can drain the burst faster. The unchanged remediation policy still determines which risks remain.",
  },
}

export const SCENARIO_ORDER = ["humanPace", "aiBurst", "ciReturns", "aiTests", "scaledReview"]
