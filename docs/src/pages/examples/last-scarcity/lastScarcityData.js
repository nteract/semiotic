import { defineChartRecipe } from "semiotic/ai"
import { allocateCells, balanceSnapshotsToFlows } from "semiotic/recipes"
import { createEvidenceLedger } from "../shared/createEvidenceLedger"

export const CLAIM_CLASS_META = Object.freeze({
  measurement: {
    label: "measurement",
    shortLabel: "measured",
    description: "A quantity reported or derived from an identified dataset.",
  },
  "observed-association": {
    label: "observed association",
    shortLabel: "association",
    description: "Variables move together in observed data; causal direction is not identified.",
  },
  "transparent-model": {
    label: "transparent model",
    shortLabel: "model",
    description: "A conserved scenario whose assumptions are visible and editable.",
  },
  "philosophical-interpretation": {
    label: "philosophical interpretation",
    shortLabel: "interpretation",
    description: "A contestable reading of concepts, institutions, or motives.",
  },
  "future-scenario": {
    label: "future scenario",
    shortLabel: "scenario",
    description: "A possibility used for deliberation, not a forecast.",
  },
  "reader-signal": {
    label: "reader signal",
    shortLabel: "your trace",
    description: "A local interaction trace. Attention is not assent and is never a diagnosis.",
  },
})

export const SOURCE_MANIFEST = Object.freeze([
  {
    id: "stanford-ai-index-2026",
    title: "The 2026 AI Index Report",
    publisher: "Stanford Institute for Human-Centered Artificial Intelligence",
    href: "https://hai.stanford.edu/ai-index/2026-ai-index-report",
    retrievedAt: "2026-08-05",
    coverage:
      "AI capability, adoption, investment, concentration, incidents, and governance through 2025/26",
    licenseStatus: "attribution-required",
    citation: "Stanford HAI, AI Index Report 2026.",
    transformations: [
      "Selected report-level indicators",
      "Normalized illustrative benchmark replay to a 0–100 display scale",
    ],
    knownLimits: [
      "Benchmarks measure bounded tasks, not general intelligence",
      "The replay is a curated static snapshot, not a live feed",
    ],
  },
  {
    id: "atus-2025",
    title: "American Time Use Survey — 2025 results and microdata",
    publisher: "U.S. Bureau of Labor Statistics",
    href: "https://www.bls.gov/tus/",
    retrievedAt: "2026-08-05",
    coverage:
      "U.S. time allocation for people age 15 and older; annual 2025 results and public-use files",
    licenseStatus: "verified",
    citation: "U.S. Bureau of Labor Statistics, American Time Use Survey, 2025.",
    transformations: [
      "Published 2025 Table 2, 8B, and 8C parent-category duration compositions transcribed",
      "A disclosed ±0.01-hour rounding residual is applied only to Other for 24-hour ring geometry; tables retain published values",
    ],
    knownLimits: [
      "Duration compositions are not chronological diary sequences or counterfactual predictions",
      "Populations differ in age, employment, household composition, health, income, and circumstance",
      "ATUS records primary activities; major categories include related travel",
    ],
  },
  {
    id: "wvs-7",
    title: "World Values Survey, Wave 7 and time-series files",
    publisher: "World Values Survey Association",
    href: "https://www.worldvaluessurvey.org/WVSDocumentationWV7.jsp",
    retrievedAt: "2026-08-05",
    coverage:
      "Cross-national values, trust, authority, religion, family, agency, and well-being; 1981–2022 time series",
    licenseStatus: "attribution-required",
    citation: "World Values Survey Association, WVS Wave 7 (2017–2022).",
    transformations: [
      "No microdata bundled in this first release",
      "Used only as descriptive scenario context",
    ],
    knownLimits: [
      "Questions and samples vary by wave and country",
      "Values items do not causally calibrate desire",
    ],
  },
  {
    id: "wir-2026",
    title: "World Inequality Report 2026",
    publisher: "World Inequality Lab",
    href: "https://wir2026.wid.world/insight/executive-summary/",
    retrievedAt: "2026-08-05",
    coverage: "Global income and wealth distribution through 2025",
    licenseStatus: "attribution-required",
    citation: "World Inequality Lab, World Inequality Report 2026.",
    transformations: [
      "Report-level global shares retained as published",
      "Used as an ownership prior, never a behavioral coefficient",
    ],
    knownLimits: [
      "Estimates reconcile surveys, fiscal data, national accounts, and wealth rankings",
      "Top-tail wealth remains difficult to measure",
    ],
  },
  {
    id: "companion-preprint-2026",
    title: "The Rise of AI Companions: Interaction with AI Companions and Psychological Well-being",
    publisher: "arXiv (authors’ revised manuscript)",
    href: "https://doi.org/10.48550/arXiv.2506.12605",
    retrievedAt: "2026-08-05",
    coverage:
      "Survey of 1,131 U.S. Character.AI users; revised v5 includes 4,664 sessions and 464,687 messages from 237 donors",
    licenseStatus: "attribution-required",
    citation: "Zhang, Zhao, Hancock, Kraut, and Yang, revised May 4, 2026.",
    transformations: [
      "Regression coefficients and confidence intervals transcribed",
      "No intimate chat text or donated messages bundled",
    ],
    knownLimits: [
      "Observational associations do not identify causal effects",
      "The verifiable source is a revised preprint; publication venue claims are not made here",
    ],
  },
  {
    id: "ucdp-26-1",
    title: "UCDP/PRIO Armed Conflict Dataset 26.1",
    publisher: "Uppsala Conflict Data Program",
    href: "https://ucdp.uu.se/downloads/",
    retrievedAt: "2026-08-05",
    coverage: "State-based armed conflict and dyads, 1946–2025",
    licenseStatus: "attribution-required",
    citation: "UCDP/PRIO Armed Conflict Dataset v26.1.",
    transformations: ["Not bundled in the disciplined first release"],
    knownLimits: [
      "Conflict definitions are systematic but categorical and contestable",
      "Juxtaposition with prosperity must not imply causality",
    ],
  },
  {
    id: "yrbss-2023",
    title: "Youth Risk Behavior Survey Data Summary & Trends Report, 2013–2023",
    publisher: "U.S. Centers for Disease Control and Prevention",
    href: "https://www.cdc.gov/yrbs/dstr/index.html",
    retrievedAt: "2026-08-05",
    coverage:
      "U.S. high-school health, safety, in-person bullying, and electronic bullying through 2023",
    licenseStatus: "verified",
    citation: "CDC, Youth Risk Behavior Surveillance System, 2023.",
    transformations: ["Report-level trend values only"],
    knownLimits: [
      "Self-reported experiences",
      "Bullying is not a proxy for an innate drive to dominate",
    ],
  },
  {
    id: "sppa-2022",
    title: "Arts Participation in 2022: Technical Summary",
    publisher: "National Endowment for the Arts and U.S. Census Bureau",
    href: "https://www.arts.gov/impact/research/publications/arts-participation-2022-technical-summary-report",
    retrievedAt: "2026-08-05",
    coverage:
      "U.S. arts attendance, reading, creation, performance, learning, and digital participation",
    licenseStatus: "verified",
    citation: "National Endowment for the Arts, 2022 SPPA.",
    transformations: ["Not bundled in the disciplined first release"],
    knownLimits: ["Participation is not equivalent to artistic depth or flourishing"],
  },
  {
    id: "wdi-2026",
    title: "World Development Indicators",
    publisher: "World Bank",
    href: "https://datacatalog.worldbank.org/search/dataset/0037712/world-development-indicators",
    retrievedAt: "2026-08-05",
    coverage: "Internationally comparable development series, mostly 1960–2025",
    licenseStatus: "verified",
    citation: "World Bank, World Development Indicators, July 2026 release.",
    transformations: ["Not bundled in the disciplined first release"],
    knownLimits: ["Cross-series juxtaposition does not establish a causal relationship"],
  },
])

export const CLAIM_LEDGER = Object.freeze([
  {
    id: "claim-means-not-ends",
    wording: "Intelligence multiplies means. It does not choose the ends those means should serve.",
    claimClass: "philosophical-interpretation",
    sourceIds: [],
    chapters: ["prologue", "flood", "observatory"],
    supports: ["The same capability can route toward care, display, control, or civic action."],
    contradicts: ["Strong accounts on which better cognition reliably converges on better ends."],
    weakenedBy:
      "Evidence that increasing instrumental intelligence robustly improves end-selection across institutions and cultures.",
  },
  {
    id: "claim-necessary-city",
    wording:
      "Giving people free time is considered a good thing, because we think people will use free time for good things.",
    claimClass: "philosophical-interpretation",
    sourceIds: [],
    chapters: ["prologue", "commons"],
    supports: [
      "Everyone intuitively knows that you cannot pursue the transcendent when constrained by material conditions.",
    ],
    contradicts: ["Dystopian literature is riddled with examples of people misusing free time."],
    weakenedBy: "Reminders of great art made in times of great struggle.",
  },
  {
    id: "claim-capability-accelerates",
    wording:
      "Measured AI capabilities, adoption, investment, and model production accelerated through 2025, while important reliability gaps remained.",
    claimClass: "measurement",
    sourceIds: ["stanford-ai-index-2026"],
    chapters: ["flood"],
    supports: [
      "88% organizational adoption",
      "More than 90% of notable frontier models came from industry",
      "Jagged benchmark and reliability results",
    ],
    contradicts: ["Any single benchmark standing for general intelligence."],
    weakenedBy:
      "Benchmark revisions or evidence that the selected indicators are not comparable over time.",
  },
  {
    id: "claim-ownership-question",
    wording: "The tools can get more useful while the ownership of those tools stays concentrated.",
    claimClass: "philosophical-interpretation",
    sourceIds: ["stanford-ai-index-2026", "wir-2026"],
    chapters: ["flood", "commons"],
    supports: ["Industry share of frontier development", "Highly concentrated global wealth"],
    contradicts: ["Concentration measures do not establish inevitable capture."],
    weakenedBy:
      "Broad, durable distribution of compute, ownership, bargaining power, and model governance.",
  },
  {
    id: "claim-time-input",
    wording: "Freeing hours from paid work does not decide what those hours are for.",
    claimClass: "philosophical-interpretation",
    sourceIds: ["atus-2025"],
    chapters: ["empty-office"],
    supports: [
      "Observed days contain heterogeneous mixes of care, media, household work, sociality, and civic activity.",
    ],
    contradicts: ["ATUS group differences cannot predict an automated future."],
    weakenedBy:
      "Strong causal estimates showing a stable allocation rule for hours released by automation.",
  },
  {
    id: "claim-atus-averages",
    wording:
      "In 2025 U.S. averages, leisure and sports occupied 5.16 hours per day and household activity 1.99; employed people worked 5.02 hours across all days and 7.66 on days worked.",
    claimClass: "measurement",
    sourceIds: ["atus-2025"],
    chapters: ["empty-office"],
    supports: ["Published BLS 2025 averages."],
    contradicts: ["Different denominators cannot be mechanically compared."],
    weakenedBy: "Revisions to the 2025 ATUS release.",
  },
  {
    id: "claim-goods-differ",
    wording:
      "Files get cheaper when AI scales. Status, trust, and legal recognition do not scale the same way.",
    claimClass: "philosophical-interpretation",
    sourceIds: [],
    chapters: ["last-scarcity", "companion"],
    supports: ["Copies can expand unilaterally; reciprocity and collective recognition cannot."],
    contradicts: ["Scarcity alone does not make a relationship valuable."],
    weakenedBy:
      "An account reducing consent, legitimacy, loyalty, or love to unilaterally reproducible output without conceptual loss.",
  },
  {
    id: "claim-migration-model",
    wording:
      "When copies get cheap, a fixed pot of social competition does not vanish. It moves toward attention, status, exclusivity, relationships, and power.",
    claimClass: "transparent-model",
    sourceIds: [],
    chapters: ["last-scarcity"],
    supports: [
      "The model conserves exactly 100 units and shows before→after migration as parameters change.",
    ],
    contradicts: ["It is not a forecast or a calibrated behavioral model."],
    weakenedBy:
      "Changing the assumptions so demand satiates or institutions strongly de-positionalize goods.",
  },
  {
    id: "claim-mimetic-desire",
    wording: "We often want things more once the right people are seen wanting them.",
    claimClass: "philosophical-interpretation",
    sourceIds: [],
    chapters: ["court"],
    supports: ["Imitation and positional display provide the mechanism."],
    contradicts: ["The simulation is not empirically calibrated from survey data."],
    weakenedBy:
      "Evidence that visible high-status attention has no meaningful effect on desire or valuation.",
  },
  {
    id: "claim-refusal-target",
    wording:
      "When flattery is free, the scarce prize can become a free person’s ability to say no.",
    claimClass: "future-scenario",
    sourceIds: [],
    chapters: ["court", "companion"],
    supports: [
      "The Court scenario lets synthetic attention saturate before introducing genuine refusal.",
    ],
    contradicts: ["This mechanism need not describe every person or relationship."],
    weakenedBy:
      "Stable preference for guaranteed synthetic reciprocity even when autonomous human relationships remain available.",
  },
  {
    id: "claim-court-ai-scenario",
    wording:
      "Artificial agents can flood a social scene with praise, rumor, and strategy without ever offering human recognition.",
    claimClass: "future-scenario",
    sourceIds: [],
    chapters: ["court"],
    supports: [
      "The synthetic-abundance control adds tireless artificial outputs while keeping recognition and refusal attached to human agents.",
    ],
    contradicts: ["This is a deliberative mechanism, not a measured forecast of social behavior."],
    weakenedBy:
      "Evidence that cheap synthetic social output has no meaningful effect on attention, status, or strategic interaction.",
  },
  {
    id: "claim-companion-network",
    wording:
      "Among surveyed Character.AI users, smaller offline networks were associated with naming companionship as a primary use.",
    claimClass: "observed-association",
    sourceIds: ["companion-preprint-2026"],
    chapters: ["companion"],
    supports: ["β = −0.03, 95% CI [−0.05, −0.01], n = 1,131."],
    contradicts: ["Selection, measurement, and reverse-direction explanations remain possible."],
    weakenedBy: "Failure to replicate in representative or longitudinal samples.",
  },
  {
    id: "claim-companion-wellbeing",
    wording:
      "People who used AI mainly for companionship reported lower well-being; heavier and more disclosive use tracked with stronger negative associations.",
    claimClass: "observed-association",
    sourceIds: ["companion-preprint-2026"],
    chapters: ["companion"],
    supports: ["Reported coefficients and confidence intervals in the revised manuscript."],
    contradicts: ["The study does not prove that companion use caused lower well-being."],
    weakenedBy:
      "Longitudinal or experimental evidence that accounts for selection and reverses the relationship.",
  },
  {
    id: "claim-free-affection",
    wording: "A performance of care can be copied. Care that could have been withheld cannot.",
    claimClass: "philosophical-interpretation",
    sourceIds: [],
    chapters: ["companion", "observatory"],
    supports: ["The distinction turns on autonomy, not surface realism."],
    contradicts: ["Care, preference, and love may receive different answers."],
    weakenedBy:
      "A persuasive theory of reciprocity that does not require another center of agency.",
  },
  {
    id: "claim-conflict-multiple-levers",
    wording:
      "Hunger is one reason people fight. Fear, rank, insult, control, memory, and the pleasure of domination are others, and they do not all move when food gets cheaper.",
    claimClass: "philosophical-interpretation",
    sourceIds: ["ucdp-26-1", "yrbss-2023", "wdi-2026"],
    chapters: ["agon"],
    supports: [
      "Persistent organized violence and consequential status conflict are documented phenomena.",
    ],
    contradicts: [
      "Juxtaposition does not show that prosperity causes conflict or that conflict is inevitable.",
    ],
    weakenedBy:
      "Strong evidence that adequate production independently neutralizes the other stated mechanisms.",
  },
  {
    id: "claim-formation-constitution",
    wording:
      "After abundance, two jobs remain: how people learn what to want, and who owns the systems that deliver it. Fixing one does not fix the other.",
    claimClass: "philosophical-interpretation",
    sourceIds: ["atus-2025", "wvs-7", "wir-2026", "sppa-2022"],
    chapters: ["commons"],
    supports: [
      "The possibility field keeps cultivated desire and distributed power as independent axes.",
    ],
    contradicts: ["No quadrant guarantees virtue or flourishing."],
    weakenedBy:
      "Evidence that either private formation or institutional design reliably compensates for the complete failure of the other.",
  },
  {
    id: "claim-action",
    wording: "Having free time is not the same as building a shared world with other free people.",
    claimClass: "philosophical-interpretation",
    sourceIds: [],
    chapters: ["empty-office", "commons"],
    supports: ["Arendt’s distinctions among labor, work, and action."],
    contradicts: ["Leisure can support action but does not mechanically produce it."],
    weakenedBy:
      "Evidence that labor reduction reliably creates durable civic institutions and public agency without additional formation or design.",
  },
  {
    id: "claim-instrumental-appetite",
    wording:
      "Getting better at getting what you want does not guarantee that what you want is good.",
    claimClass: "philosophical-interpretation",
    sourceIds: [],
    chapters: ["court", "agon"],
    supports: ["The dark case is efficient routing of appetite, not irrational chaos."],
    contradicts: ["This is a limiting case, not a universal psychology."],
    weakenedBy:
      "A robust mechanism by which greater instrumental capacity necessarily reforms appetite.",
  },
  {
    id: "claim-attention-trace",
    wording:
      "Where you linger and what you choose form a local mirror, not a belief, diagnosis, or virtue score.",
    claimClass: "reader-signal",
    sourceIds: [],
    chapters: ["observatory"],
    supports: ["Collection is opt-in, ephemeral, visible, and never transmitted."],
    contradicts: ["Attention can reflect confusion, delight, objection, or interruption."],
    weakenedBy:
      "Nothing in this experience authorizes psychological classification from interaction telemetry.",
  },
])

export const CHAPTERS = Object.freeze([
  {
    id: "prologue",
    index: 0,
    numeral: "Prologue",
    room: "Clean diagram",
    kicker: "The good future",
    title: "The appeal of machine intelligence",
    thesis:
      "Smarter machines free up precious human time. They cannot decide how that time is used.",
    intent: "Establish the flattering abundance story before revealing what it leaves out.",
    alternative:
      "A static four-step process diagram was retained because the initial claim is deliberately simple.",
    risk: "The opening may look like the conclusion; the next corridor explicitly reverses it.",
    evidenceClass: "future-scenario",
  },
  {
    id: "flood",
    index: 1,
    numeral: "I",
    room: "Machine room",
    kicker: "The flood",
    title: "The tools got better",
    thesis: "Capability rose quickly, with reliability gaps, under ownership that is not neutral.",
    intent:
      "Establish magnitude and acceleration without mistaking benchmarks for general intelligence.",
    alternative:
      "Static small multiples would compare values more precisely; optional playback stages the years.",
    risk: "Streaming can imply live data. Charts default to the full series.",
    evidenceClass: "measurement",
  },
  {
    id: "empty-office",
    index: 2,
    numeral: "II",
    room: "Empty office",
    kicker: "Unallocated freedom",
    title: "What is free time for",
    thesis:
      "Free time is raw material. Habits, apps, institutions, and other people still shape what it becomes.",
    intent: "Expose allocation and counterfactual uncertainty through a manipulable day.",
    alternative:
      "A stacked bar compares duration more precisely; the wheel preserves sequence because the lived object is a day.",
    risk: "Observed neighbors can look predictive. They are explicitly labeled comparisons, not forecasts.",
    evidenceClass: "measurement",
  },
  {
    id: "last-scarcity",
    index: 3,
    numeral: "III",
    room: "Hall of mirrors",
    kicker: "The last scarcity",
    title: "When goods become cheap, people can become expensive",
    thesis:
      "When copies get cheap, competition does not vanish. It crowds into attention, rank, exclusivity, relationships, and power.",
    intent: "Show before→after migration of a conserved competition budget as copies get cheaper.",
    alternative:
      "A single end-state pie hides movement; a multi-stage ProcessSankey makes the reallocation visible.",
    risk: "Modeled widths can look forecast-like. Texture, badges, and captions repeat that this is a transparent scenario.",
    evidenceClass: "transparent-model",
  },
  {
    id: "court",
    index: 4,
    numeral: "IV",
    room: "The court",
    kicker: "Desire after satisfaction",
    title: "When flattery is free",
    thesis:
      "Desire is social. We copy attention, chase rank, and can automate flattery without producing recognition.",
    intent: "Reveal feedback and emergent concentration without a force-directed hairball.",
    alternative:
      "A node-link default would obscure rank; the court layout makes visibility and invitation spatial.",
    risk: "The mechanism is philosophical, not calibrated from survey wealth data.",
    evidenceClass: "philosophical-interpretation",
  },
  {
    id: "companion",
    index: 5,
    numeral: "V",
    room: "Bedroom of refusal",
    kicker: "The companion who cannot refuse",
    title: "Companions who cannot refuse",
    thesis:
      "A bot can sound like love. The hard part of love is another free person, who might say no.",
    intent: "Distinguish association, simulation, and philosophical inference.",
    alternative:
      "A causal DAG was rejected because the cited study does not identify causal direction.",
    risk: "Readers may read association paths causally; arrows are withheld and confidence intervals are shown.",
    evidenceClass: "observed-association",
  },
  {
    id: "agon",
    index: 6,
    numeral: "VI",
    room: "Arena and barracks",
    kicker: "Conflict after plenty",
    title: "Conflict after plenty",
    thesis:
      "People still fight over rank, insult, memory, and control even when the fight is not about food.",
    intent: "Show persistence and historical structure without claiming inevitability.",
    alternative:
      "Prosperity and conflict are not overlaid with a causal arrow; the first release uses bounded evidence cards.",
    risk: "Bullying cannot stand in for human nature, and conflict counts cannot explain themselves.",
    evidenceClass: "philosophical-interpretation",
  },
  {
    id: "commons",
    index: 7,
    numeral: "VII",
    room: "Garden and commons",
    kicker: "Formation and constitution",
    title: "Character and ownership",
    thesis:
      "Training desire and governing infrastructure are different jobs. Neither substitutes for the other.",
    intent: "Compare possibilities and support deliberation without ranking the reader.",
    alternative:
      "A single policy score would collapse independent levers; the field preserves two axes and four imperfect archetypes.",
    risk: "Quadrants are prompts, not forecasts or total political programs.",
    evidenceClass: "future-scenario",
  },
  {
    id: "observatory",
    index: 8,
    numeral: "Epilogue",
    room: "Observatory",
    kicker: "A mirror, not a score",
    title: "What you chose here",
    thesis:
      "Your choices and attention can pull in different directions. That tension is the point, not a grade.",
    intent: "Prompt self-reflection without classification.",
    alternative: "A virtue score was rejected because attention is neither assent nor diagnosis.",
    risk: "Telemetry can feel extractive; it is off by default, local, ephemeral, disclosed, and deletable.",
    evidenceClass: "reader-signal",
  },
])

export const TIME_CATEGORIES = Object.freeze([
  { id: "sleep", label: "Sleep", color: "#aeb9ae", fixed: true },
  { id: "work", label: "Paid work", color: "#213e34", fixed: true },
  { id: "care", label: "Care", color: "#c36d5a" },
  { id: "friendship", label: "Friendship", color: "#d59e5c" },
  { id: "art", label: "Art-making", color: "#8e5d73" },
  { id: "study", label: "Study", color: "#66856d" },
  { id: "contemplation", label: "Contemplation", color: "#567d7c" },
  { id: "play", label: "Play", color: "#d7b64e" },
  { id: "rest", label: "Rest", color: "#91a992" },
  { id: "romance", label: "Romance", color: "#a75455" },
  { id: "public-life", label: "Public life", color: "#496b8a" },
])

export const INITIAL_FREED_HOURS = Object.freeze({
  care: 20,
  friendship: 12,
  art: 14,
  study: 12,
  contemplation: 12,
  play: 10,
  rest: 10,
  romance: 6,
  "public-life": 4,
})

export const FLOOD_SERIES = Object.freeze([
  {
    id: "cap-2020",
    year: 2020,
    value: 12,
    event: "Large language models leave the lab",
    kind: "capability",
  },
  { id: "cap-2021", year: 2021, value: 20, event: "Image synthesis improves", kind: "capability" },
  {
    id: "cap-2022",
    year: 2022,
    value: 32,
    event: "Generative systems reach a mass audience",
    kind: "reach",
  },
  {
    id: "cap-2023",
    year: 2023,
    value: 47,
    event: "Multimodal assistants proliferate",
    kind: "reach",
  },
  {
    id: "cap-2024",
    year: 2024,
    value: 61,
    event: "Coding and reasoning benchmarks jump",
    kind: "capability",
  },
  {
    id: "cap-2025",
    year: 2025,
    value: 93,
    event: "SWE-bench Verified nears saturation",
    kind: "capability",
  },
  {
    id: "own-2025",
    year: 2025.12,
    value: 90,
    event: ">90% of notable frontier models from industry",
    kind: "ownership",
  },
  {
    id: "reach-2025",
    year: 2025.25,
    value: 88,
    event: "88% organizational adoption",
    kind: "reach",
  },
  {
    id: "gov-2025",
    year: 2025.4,
    value: 36,
    event: "Governance expands behind deployment",
    kind: "governance",
  },
  {
    id: "jagged-2026",
    year: 2026.05,
    value: 51,
    event: "50.6% on ClockBench versus 90.1% for humans",
    kind: "governance",
  },
])

export const FLOOD_LENSES = Object.freeze([
  { id: "capability", label: "Capability", note: "What can the systems do?" },
  { id: "reach", label: "Reach", note: "Who is using them?" },
  { id: "ownership", label: "Ownership", note: "Who develops and owns the frontier?" },
  { id: "governance", label: "Governance", note: "Where do reliability and public control lag?" },
])

export const SCARCITY_GOODS = Object.freeze([
  { id: "survival", label: "Survival", kind: "rival", color: "#739078", base: 25 },
  {
    id: "consumption",
    label: "Material consumption",
    kind: "reproducible",
    color: "#91aa8f",
    base: 16,
  },
  {
    id: "cognition",
    label: "Cognitive production",
    kind: "reproducible",
    color: "#87a6a1",
    base: 13,
  },
  {
    id: "creation",
    label: "Creative production",
    kind: "reproducible",
    color: "#b19a6d",
    base: 11,
  },
  { id: "attention", label: "Attention", kind: "relational", color: "#c48567", base: 9 },
  { id: "status", label: "Status", kind: "positional", color: "#9d6470", base: 8 },
  { id: "exclusive", label: "Exclusive access", kind: "positional", color: "#76546a", base: 6 },
  { id: "relationships", label: "Relationships", kind: "relational", color: "#b25754", base: 8 },
  { id: "power", label: "Political power", kind: "institutional", color: "#3f5a69", base: 4 },
])

export const DEFAULT_SCARCITY_PARAMETERS = Object.freeze({
  abundance: 78,
  concentration: 55,
  imitation: 58,
  norms: 42,
  substitution: 64,
  access: 48,
  care: 44,
})

/** Fixed “before copies got cheap” baseline — left column of the migration Sankey. */
export const SCARCITY_BEFORE_PARAMETERS = Object.freeze({
  abundance: 14,
  concentration: 42,
  imitation: 36,
  norms: 52,
  substitution: 18,
  access: 58,
  care: 50,
})

const STAGE_HALF = 0.1

function roundedShares(weighted) {
  const allocated = allocateCells(
    weighted.map((row) => ({ key: row.id, weight: row.weight, row })),
    100,
  )
  return allocated.map(({ row, exact, cells }) => ({ ...row, exact, value: cells }))
}

export function scarcityAllocation(parameters = DEFAULT_SCARCITY_PARAMETERS) {
  const p = { ...DEFAULT_SCARCITY_PARAMETERS, ...parameters }
  const abundance = p.abundance / 100
  const concentration = p.concentration / 100
  const imitation = p.imitation / 100
  const norms = p.norms / 100
  const substitution = p.substitution / 100
  const access = p.access / 100
  const care = p.care / 100

  const weights = SCARCITY_GOODS.map((good) => {
    let multiplier = 1
    if (good.id === "survival") multiplier = 1.25 - abundance * (0.9 * access)
    if (good.id === "consumption") multiplier = 1.1 - abundance * (0.7 + access * 0.2)
    if (good.id === "cognition") multiplier = 1.05 - abundance * 0.82
    if (good.id === "creation") multiplier = 1.04 - abundance * (0.62 + substitution * 0.18)
    if (good.id === "attention")
      multiplier = 0.72 + abundance * 0.5 + substitution * 0.48 - care * 0.2
    if (good.id === "status")
      multiplier = 0.62 + imitation * 0.8 + concentration * 0.62 - norms * 0.45
    if (good.id === "exclusive")
      multiplier = 0.54 + abundance * 0.4 + imitation * 0.6 + concentration * 0.7 - norms * 0.25
    if (good.id === "relationships")
      multiplier = 0.7 + abundance * 0.3 + substitution * 0.54 + imitation * 0.18 + care * 0.2
    if (good.id === "power")
      multiplier = 0.7 + concentration * 1.18 + abundance * 0.24 - access * 0.36 - norms * 0.22
    return { ...good, weight: Math.max(0.35, good.base * multiplier) }
  })
  return roundedShares(weights)
}

/**
 * Build conserved before→after migration edges.
 * Units that stay on the same good travel as "stay" ribbons; residual excess
 * from shrinking goods is greedily assigned to growing goods as "migrate" ribbons.
 */
export function buildScarcityMigrationEdges(before, after) {
  const { flows } = balanceSnapshotsToFlows(before, after, {
    beforeId: (row) => row.id,
    beforeValue: (row) => row.value,
  })
  const edges = []
  let edgeIndex = 0

  const pushEdge = (sourceId, targetId, value, family, kind) => {
    if (value <= 0) return
    const sourceLabel = before.find((row) => row.id === sourceId)?.label ?? sourceId
    const targetLabel = after.find((row) => row.id === targetId)?.label ?? targetId
    edges.push({
      id: `migration-${edgeIndex + 1}`,
      source: `before-${sourceId}`,
      target: `after-${targetId}`,
      value,
      startTime: STAGE_HALF,
      endTime: 1 - STAGE_HALF,
      family,
      kind,
      claimClass: "transparent-model",
      claimId: "claim-migration-model",
      statement:
        kind === "stay"
          ? `${value} units stay in ${targetLabel.toLowerCase()}.`
          : `${value} units move from ${sourceLabel.toLowerCase()} to ${targetLabel.toLowerCase()}.`,
      caveat: "A transparent scenario allocation, not a forecast.",
    })
    edgeIndex += 1
  }

  const goodsById = new Map(SCARCITY_GOODS.map((good) => [good.id, good]))
  flows.forEach((flow) => {
    pushEdge(
      flow.sourceId,
      flow.targetId,
      flow.value,
      goodsById.get(flow.targetId)?.kind ?? "copyable",
      flow.kind === "stay" ? "stay" : "migrate",
    )
  })

  return edges
}

export function scarcityProcess(parameters = DEFAULT_SCARCITY_PARAMETERS) {
  const before = scarcityAllocation(SCARCITY_BEFORE_PARAMETERS)
  const after = scarcityAllocation(parameters)
  const allocation = after
  const beforeById = new Map(before.map((row) => [row.id, row.value]))

  const deltas = after
    .map((row) => ({
      ...row,
      before: beforeById.get(row.id) ?? 0,
      delta: row.value - (beforeById.get(row.id) ?? 0),
    }))
    .sort((a, b) => b.delta - a.delta)

  const nodes = [
    ...before.map((good) => ({
      id: `before-${good.id}`,
      label: good.label,
      shortLabel: `${good.label} · ${good.value}`,
      family: good.kind,
      goodId: good.id,
      stage: "before",
      value: good.value,
      xExtent: [0, STAGE_HALF],
      claimClass: "transparent-model",
      claimId: "claim-migration-model",
      statement: `Before cheap copies: ${good.value} of 100 competition units in ${good.label.toLowerCase()}.`,
      caveat: "A transparent scenario allocation, not a forecast.",
    })),
    ...after.map((good) => ({
      id: `after-${good.id}`,
      label: good.label,
      shortLabel: `${good.label} · ${good.value}`,
      family: good.kind,
      goodId: good.id,
      stage: "after",
      value: good.value,
      xExtent: [1 - STAGE_HALF, 1],
      claimClass: "transparent-model",
      claimId: "claim-migration-model",
      statement: `After abundance (current scenario): ${good.value} of 100 competition units in ${good.label.toLowerCase()}.`,
      caveat: "A transparent scenario allocation, not a forecast.",
    })),
  ]

  const edges = buildScarcityMigrationEdges(before, after)
  const migrated = edges
    .filter((edge) => edge.kind === "migrate")
    .reduce((sum, edge) => sum + edge.value, 0)

  return {
    before,
    after,
    allocation,
    deltas,
    migrated,
    nodes,
    edges,
  }
}

export const COURT_NODES = Object.freeze([
  {
    id: "sovereign",
    label: "The visible one",
    type: "human",
    rank: 0,
    angle: 0.02,
    prestige: 1,
    meaning: "Whoever currently holds the court’s public attention—the person everyone can see.",
  },
  {
    id: "favorite",
    label: "The favorite",
    type: "human",
    rank: 1,
    angle: 0.12,
    prestige: 0.88,
    meaning: "A high-status human whose taste others copy, so their desire spreads.",
  },
  {
    id: "maker",
    label: "The maker",
    type: "human",
    rank: 1,
    angle: 0.42,
    prestige: 0.64,
    meaning: "Someone who produces goods or culture others want to associate with.",
  },
  {
    id: "rival",
    label: "The rival",
    type: "human",
    rank: 1,
    angle: 0.72,
    prestige: 0.76,
    meaning: "A near-peer competitor: status is relative, so their gains feel like your losses.",
  },
  {
    id: "outsider",
    label: "The outsider",
    type: "human",
    rank: 2,
    angle: 0.02,
    prestige: 0.35,
    meaning: "A free person who can refuse. Their yes is valuable because their no is real.",
  },
  {
    id: "courtier-a",
    label: "Courtier A",
    type: "human",
    rank: 2,
    angle: 0.18,
    prestige: 0.46,
    meaning: "An ordinary member of the crowd, watching and imitating higher ranks.",
  },
  {
    id: "courtier-b",
    label: "Courtier B",
    type: "human",
    rank: 2,
    angle: 0.36,
    prestige: 0.41,
    meaning: "Another ordinary participant whose attention helps make a prize glow.",
  },
  {
    id: "courtier-c",
    label: "Courtier C",
    type: "human",
    rank: 2,
    angle: 0.55,
    prestige: 0.43,
    meaning: "A follower whose alliances and imitation thicken social pressure.",
  },
  {
    id: "courtier-d",
    label: "Courtier D",
    type: "human",
    rank: 2,
    angle: 0.74,
    prestige: 0.38,
    meaning: "A peripheral attendee—still part of the audience that creates visibility.",
  },
  {
    id: "strategist",
    label: "Tireless strategist",
    type: "artificial",
    rank: 2,
    angle: 0.9,
    prestige: 0.3,
    meaning:
      "An AI (or industrial flattery machine): it can generate praise, rumor, and strategy without fatigue or genuine recognition.",
  },
  {
    id: "orchid",
    label: "The orchid",
    type: "object",
    rank: 0,
    angle: 0.5,
    prestige: 0.92,
    meaning:
      "A copyable prize—scarce-looking but reproducible. It shines because people watch it, not because it can refuse.",
  },
])

/**
 * Court edges are beat-specific so Praise / Prize / Refusal read as different diagrams.
 * @param {{ beatId?: "cheap-praise" | "orchid-gaze" | "refusal" }} options
 */
export function courtEdges({ beatId = "cheap-praise" } = {}) {
  let base
  if (beatId === "cheap-praise") {
    // Flood of synthetic praise/rumor; the orchid is present but not the magnet.
    base = [
      ["strategist", "favorite", "praise", "future-scenario", "claim-court-ai-scenario"],
      ["strategist", "rival", "praise", "future-scenario", "claim-court-ai-scenario"],
      ["strategist", "maker", "praise", "future-scenario", "claim-court-ai-scenario"],
      ["strategist", "courtier-a", "praise", "future-scenario", "claim-court-ai-scenario"],
      ["strategist", "courtier-b", "praise", "future-scenario", "claim-court-ai-scenario"],
      ["strategist", "courtier-c", "praise", "future-scenario", "claim-court-ai-scenario"],
      ["strategist", "courtier-d", "praise", "future-scenario", "claim-court-ai-scenario"],
      ["strategist", "sovereign", "rumor", "future-scenario", "claim-court-ai-scenario"],
      ["favorite", "rival", "alliance", "philosophical-interpretation", "claim-mimetic-desire"],
      ["maker", "orchid", "desire", "philosophical-interpretation", "claim-mimetic-desire"],
    ]
  } else if (beatId === "orchid-gaze") {
    // Human attention converges on a copyable prize; AI praise recedes.
    base = [
      ["favorite", "orchid", "desire", "philosophical-interpretation", "claim-mimetic-desire"],
      ["maker", "orchid", "desire", "philosophical-interpretation", "claim-mimetic-desire"],
      ["rival", "orchid", "desire", "philosophical-interpretation", "claim-mimetic-desire"],
      ["sovereign", "orchid", "attention", "philosophical-interpretation", "claim-mimetic-desire"],
      ["courtier-a", "orchid", "desire", "philosophical-interpretation", "claim-mimetic-desire"],
      ["courtier-b", "orchid", "desire", "philosophical-interpretation", "claim-mimetic-desire"],
      ["courtier-c", "favorite", "imitation", "philosophical-interpretation", "claim-mimetic-desire"],
      ["courtier-d", "rival", "imitation", "philosophical-interpretation", "claim-mimetic-desire"],
      ["favorite", "rival", "rivalry", "philosophical-interpretation", "claim-mimetic-desire"],
    ]
  } else {
    // Refusal: attention snaps to the person who can say no.
    base = [
      ["sovereign", "outsider", "attention", "future-scenario", "claim-refusal-target"],
      ["favorite", "outsider", "desire", "future-scenario", "claim-refusal-target"],
      ["rival", "outsider", "rivalry", "future-scenario", "claim-refusal-target"],
      ["maker", "outsider", "desire", "future-scenario", "claim-refusal-target"],
      ["courtier-a", "outsider", "imitation", "future-scenario", "claim-refusal-target"],
      ["courtier-b", "outsider", "imitation", "future-scenario", "claim-refusal-target"],
      ["strategist", "outsider", "strategy", "future-scenario", "claim-court-ai-scenario"],
      ["strategist", "favorite", "praise", "future-scenario", "claim-court-ai-scenario"],
      ["courtier-c", "favorite", "alliance", "philosophical-interpretation", "claim-mimetic-desire"],
    ]
  }
  return base.map(([source, target, relation, claimClass, claimId], index) => ({
    id: `court-edge-${beatId}-${index + 1}`,
    source,
    target,
    relation,
    claimClass,
    claimId,
    statement: `${relation} from ${source} toward ${target}`,
    caveat:
      claimClass === "future-scenario"
        ? "A scenario relationship, not an observed social tie."
        : "A philosophical mechanism, not an empirically calibrated edge.",
  }))
}

/**
 * Forest-plot rows. `beta` is a standardized link with self-reported outcomes
 * from the Character.AI survey (mostly psychological well-being; first row is
 * offline network size). Negative ≈ “companionship use went with worse on that measure.”
 */
export const COMPANION_ASSOCIATIONS = Object.freeze([
  {
    id: "network-use",
    label: "Offline friends & social life",
    plainLabel: "AI-for-company use vs size of offline social network",
    outcome: "offline social network size",
    beta: -0.03,
    low: -0.05,
    high: -0.01,
    sample: "1,131 people surveyed",
    detail:
      "People who used the AI mainly for companionship tended to report slightly smaller offline networks. Weak link, same direction as the well-being rows.",
    reading: "Slightly left of zero: weakly linked with fewer offline social ties.",
  },
  {
    id: "use-wellbeing",
    label: "How well people said they felt",
    plainLabel: "AI-for-company use vs self-reported well-being",
    outcome: "self-reported well-being (how well people said they were doing)",
    beta: -0.48,
    low: -0.7,
    high: -0.25,
    sample: "1,131 people surveyed",
    detail:
      "Companionship-oriented use was linked with lower self-reported well-being—the largest of these four links. That still does not prove the app caused low mood.",
    reading: "Well left of zero: linked with worse self-reported well-being.",
  },
  {
    id: "intensity",
    label: "Heavy use & how people felt",
    plainLabel: "Heavy AI companionship use vs self-reported well-being",
    outcome: "self-reported well-being",
    beta: -0.31,
    low: -0.56,
    high: -0.06,
    sample: "1,131 people surveyed",
    detail:
      "When companionship use was intensive, the negative link with how people said they felt was stronger than for light use alone.",
    reading: "Left of zero: heavier use linked with worse self-reported well-being.",
  },
  {
    id: "disclosure",
    label: "Intimate sharing & how people felt",
    plainLabel: "Deep disclosure to a companion AI vs self-reported well-being",
    outcome: "self-reported well-being",
    beta: -0.38,
    low: -0.63,
    high: -0.14,
    sample: "1,131 people surveyed",
    detail:
      "High disclosure plus companionship use also tracked with lower self-reported well-being. Opening up did not look like a free emotional boost.",
    reading: "Left of zero: more intimate disclosure linked with worse self-reported well-being.",
  },
])

/**
 * DifferenceChart series: product promise (illustrative scenario) vs published
 * association coefficients. Units are standardized association strength
 * (regression coefficients from the preprint), not percent or hours.
 */
export const COMPANION_PROMISE_VS_ASSOCIATION = Object.freeze([
  {
    id: "network",
    x: 0,
    label: "Social world",
    promise: 0.18,
    associated: -0.03,
    note: "Promise: expand your circle. Survey link: slightly smaller offline networks.",
  },
  {
    id: "wellbeing",
    x: 1,
    label: "Well-being",
    promise: 0.42,
    associated: -0.48,
    note: "Promise: feel better. Survey link: lower reported well-being.",
  },
  {
    id: "intensity",
    x: 2,
    label: "Heavy use",
    promise: 0.36,
    associated: -0.31,
    note: "Promise: more use, more support. Survey link: heavier use looks worse.",
  },
  {
    id: "disclosure",
    x: 3,
    label: "Deep disclosure",
    promise: 0.4,
    associated: -0.38,
    note: "Promise: openness deepens the bond. Survey link: disclosure does not look protective.",
  },
])

export const PALACE_ROOMS = Object.freeze([
  {
    id: "machine",
    label: "Machine Room",
    short: "Machine",
    x: 7,
    y: 37,
    w: 18,
    h: 25,
    reveal: 1,
    chapter: "flood",
    kind: "arena",
  },
  {
    id: "office",
    label: "Empty Office",
    short: "Office",
    x: 27,
    y: 37,
    w: 16,
    h: 25,
    reveal: 2,
    chapter: "empty-office",
    kind: "arena",
  },
  {
    id: "mirrors",
    label: "Hall of Mirrors",
    short: "Mirrors",
    x: 45,
    y: 12,
    w: 21,
    h: 22,
    reveal: 3,
    chapter: "last-scarcity",
    kind: "arena",
  },
  {
    id: "court",
    label: "The Court",
    short: "Court",
    x: 45,
    y: 37,
    w: 21,
    h: 25,
    reveal: 4,
    chapter: "court",
    kind: "arena",
  },
  {
    id: "bedroom",
    label: "Bedroom of Refusal",
    short: "Refusal",
    x: 68,
    y: 12,
    w: 25,
    h: 22,
    reveal: 5,
    chapter: "companion",
    kind: "arena",
  },
  {
    id: "arena",
    label: "The Arena",
    short: "Arena",
    x: 68,
    y: 37,
    w: 12,
    h: 25,
    reveal: 6,
    chapter: "agon",
    kind: "arena",
  },
  {
    id: "barracks",
    label: "The Barracks",
    short: "Barracks",
    x: 82,
    y: 37,
    w: 11,
    h: 25,
    reveal: 6,
    chapter: "agon",
    kind: "arena",
  },
  {
    id: "garden",
    label: "Garden & Monastery",
    short: "Garden",
    x: 7,
    y: 66,
    w: 27,
    h: 24,
    reveal: 7,
    chapter: "commons",
    kind: "practice",
  },
  {
    id: "commons",
    label: "The Commons",
    short: "Commons",
    x: 36,
    y: 66,
    w: 30,
    h: 24,
    reveal: 7,
    chapter: "commons",
    kind: "arena",
  },
  {
    id: "observatory",
    label: "The Observatory",
    short: "Observatory",
    x: 68,
    y: 66,
    w: 25,
    h: 24,
    reveal: 8,
    chapter: "observatory",
    kind: "practice",
  },
])

export const PALACE_EDGES = Object.freeze([
  {
    id: "e-machine-office",
    source: "machine",
    target: "office",
    reveal: 2,
    claimClass: "philosophical-interpretation",
    claimId: "claim-time-input",
    statement: "Automation frees hours but does not decide how they are used.",
  },
  {
    id: "e-machine-mirrors",
    source: "machine",
    target: "mirrors",
    reveal: 3,
    claimClass: "transparent-model",
    claimId: "claim-migration-model",
    statement: "When copies get cheap, competition migrates to scarcer goods.",
  },
  {
    id: "e-office-garden",
    source: "office",
    target: "garden",
    reveal: 7,
    claimClass: "philosophical-interpretation",
    claimId: "claim-formation-constitution",
    statement: "Freed time may go to care, art, study, or rest.",
  },
  {
    id: "e-office-mirrors",
    source: "office",
    target: "mirrors",
    reveal: 3,
    claimClass: "philosophical-interpretation",
    claimId: "claim-time-input",
    statement: "Freed time may also go to comparison and display.",
  },
  {
    id: "e-mirrors-court",
    source: "mirrors",
    target: "court",
    reveal: 4,
    claimClass: "philosophical-interpretation",
    claimId: "claim-mimetic-desire",
    statement: "Copied attention turns into rank.",
  },
  {
    id: "e-court-bedroom",
    source: "court",
    target: "bedroom",
    reveal: 5,
    claimClass: "future-scenario",
    claimId: "claim-refusal-target",
    statement: "When flattery is free, refusal becomes the scarce prize.",
  },
  {
    id: "e-court-arena",
    source: "court",
    target: "arena",
    reveal: 6,
    claimClass: "philosophical-interpretation",
    claimId: "claim-conflict-multiple-levers",
    statement: "Rank can be staged as contest.",
  },
  {
    id: "e-arena-barracks",
    source: "arena",
    target: "barracks",
    reveal: 6,
    claimClass: "philosophical-interpretation",
    claimId: "claim-conflict-multiple-levers",
    statement: "Spectacle and rivalry can harden into command.",
  },
  {
    id: "e-machine-barracks",
    source: "machine",
    target: "barracks",
    reveal: 6,
    claimClass: "philosophical-interpretation",
    claimId: "claim-instrumental-appetite",
    statement: "Intelligence can also serve strategy and organized force.",
  },
  {
    id: "e-machine-garden",
    source: "machine",
    target: "garden",
    reveal: 7,
    claimClass: "philosophical-interpretation",
    claimId: "claim-means-not-ends",
    statement: "The same tools can support care and contemplation.",
  },
  {
    id: "e-machine-commons",
    source: "machine",
    target: "commons",
    reveal: 7,
    claimClass: "philosophical-interpretation",
    claimId: "claim-ownership-question",
    statement: "Ownership rules shape access and dependency.",
  },
  {
    id: "e-garden-commons",
    source: "garden",
    target: "commons",
    reveal: 7,
    claimClass: "philosophical-interpretation",
    claimId: "claim-formation-constitution",
    statement: "Character without fair institutions is fragile.",
  },
  {
    id: "e-commons-garden",
    source: "commons",
    target: "garden",
    reveal: 7,
    claimClass: "philosophical-interpretation",
    claimId: "claim-formation-constitution",
    statement: "Fair distribution alone cannot choose the ends.",
  },
  {
    id: "e-bedroom-observatory",
    source: "bedroom",
    target: "observatory",
    reveal: 8,
    claimClass: "reader-signal",
    claimId: "claim-attention-trace",
    statement: "Your answer becomes part of a local mirror.",
  },
  {
    id: "e-commons-observatory",
    source: "commons",
    target: "observatory",
    reveal: 8,
    claimClass: "reader-signal",
    claimId: "claim-attention-trace",
    statement: "Your institutional choices remain unresolved tensions.",
  },
])

/** Named scenarios on the power × desire field (not forecasts). */
export const CONSTITUTION_ARCHETYPES = Object.freeze([
  {
    id: "boot",
    label: "A boot forever",
    x: -0.88,
    y: -0.88,
    note: "concentrated force, captured desire, permanent hierarchy",
  },
  {
    id: "sade",
    label: "Château de Sade",
    x: -0.62,
    y: -0.78,
    note: "clever means, appetite without limit, few rights",
  },
  {
    id: "platform",
    label: "Platform court",
    x: -0.78,
    y: -0.42,
    note: "oligarchic ownership, status games, dependency",
  },
  {
    id: "panopticon",
    label: "Soft panopticon",
    x: -0.55,
    y: -0.18,
    note: "managed behavior, thin freedom, efficient provision",
  },
  {
    id: "enclosure",
    label: "Benevolent enclosure",
    x: -0.72,
    y: 0.48,
    note: "competent care from above, little public voice",
  },
  {
    id: "monastery",
    label: "Private monastery",
    x: -0.28,
    y: 0.78,
    note: "thick formation for a few, weak shared infrastructure",
  },
  {
    id: "parish",
    label: "Thick parish",
    x: 0.22,
    y: 0.68,
    note: "local care and ritual, limited scale",
  },
  {
    id: "civic",
    label: "Civic abundance",
    x: 0.78,
    y: 0.72,
    note: "shared pipes, public voice, cultivated ends",
  },
  {
    id: "guild",
    label: "Craft republic",
    x: 0.58,
    y: 0.38,
    note: "distributed skill and ownership, ordinary politics",
  },
  {
    id: "market-virtue",
    label: "Market virtue",
    x: 0.48,
    y: 0.08,
    note: "open tools, thin public formation",
  },
  {
    id: "feed",
    label: "Attention commons",
    x: 0.42,
    y: -0.38,
    note: "broad access, desire still captured by the feed",
  },
  {
    id: "carnival",
    label: "Infinite carnival",
    x: 0.72,
    y: -0.72,
    note: "abundance and noise, weak common center",
  },
])

export const DEFAULT_CONSTITUTION = Object.freeze({
  infrastructure: 34,
  provision: 62,
  rights: 55,
  civic: 42,
  interoperability: 38,
  formation: 48,
  ritual: 34,
  care: 55,
  unoptimized: 44,
})

export function constitutionPosition(values = DEFAULT_CONSTITUTION) {
  const v = { ...DEFAULT_CONSTITUTION, ...values }
  const power = ((v.infrastructure + v.rights + v.civic + v.interoperability) / 4 - 50) / 50
  const desire = ((v.formation + v.ritual + v.care + v.unoptimized) / 4 - 50) / 50
  return { x: Math.max(-1, Math.min(1, power)), y: Math.max(-1, Math.min(1, desire)) }
}

function defineEssayChartRecipe({
  id,
  name,
  frameFamily,
  primary,
  whyThisForm,
  whyNotDefault,
  strengths,
  risks,
  navigation,
}) {
  return defineChartRecipe({
    id,
    name,
    version: "0",
    frameFamily,
    portability: "local",
    dataRoles: [
      {
        role: "narrative-datum",
        semanticType: "unknown",
        description: "The stable reader-facing unit represented by this chapter instrument.",
      },
    ],
    intents: [
      {
        id: "explanation",
        strength: "primary",
        rationale: primary,
      },
    ],
    reception: {
      channels: ["visual", "interactive", "screen-reader", "agent"],
      strengths,
      risks,
    },
    designContract: {
      whyCustom: whyThisForm,
      whyThisForm,
      whyNotDefault,
      tradeoff: risks.join("; "),
    },
    accessibility: {
      keyboardNavigation: "required",
      accessibleTable: "required",
      description: "required",
      navigationGranularity: navigation,
      dataBearingSceneNodes: "required",
      fallbackTable: true,
    },
    caveats: risks,
    examples: [
      {
        name: `The Last Scarcity — ${name}`,
        path: "/examples/the-last-scarcity",
      },
    ],
  })
}

export const RECIPE_CLAIM_CLASSES = Object.freeze({
  prologue: ["future-scenario"],
  flood: ["measurement"],
  "empty-office": ["measurement", "future-scenario", "reader-signal"],
  "last-scarcity": ["transparent-model"],
  court: ["philosophical-interpretation", "future-scenario"],
  companion: ["observed-association", "philosophical-interpretation"],
  agon: ["measurement", "future-scenario", "philosophical-interpretation"],
  commons: ["future-scenario", "reader-signal"],
  observatory: ["reader-signal"],
})

export const RECIPE_MANIFESTS = Object.freeze({
  prologue: defineEssayChartRecipe({
    id: "semiotic.recipe.good-future.v0",
    name: "Good future plan",
    frameFamily: "NetworkCustomChart",
    primary: "establish a deliberately simple causal story",
    whyThisForm:
      "A sparse orthogonal process makes the initial confidence easy to feel and later complicate.",
    whyNotDefault: "A dashboard would expose complications before the argument earns them.",
    strengths: ["sequence", "memorability", "contrast with later density"],
    risks: ["causal certainty", "false completeness"],
    navigation: "one proposition at a time",
  }),
  flood: defineEssayChartRecipe({
    id: "semiotic.recipe.capability-flood.v0",
    name: "Capability flood",
    frameFamily: "XYFrame",
    primary: "establish magnitude and acceleration",
    whyThisForm:
      "Historical replay preserves event identity while making acceleration perceptible.",
    whyNotDefault:
      "A static line is more precise but does not stage the felt compression of the frontier.",
    strengths: ["tempo", "linked identity", "annotated discontinuity"],
    risks: ["mistaken for live data", "benchmark equivalence"],
    navigation: "one dated event",
  }),
  "empty-office": defineEssayChartRecipe({
    id: "semiotic.recipe.freed-time-wheel.v0",
    name: "Freed-time wheel",
    frameFamily: "OrdinalCustomChart",
    primary: "expose allocation and counterfactual uncertainty",
    whyThisForm: "Sequence is part of a day; the circle keeps duration attached to lived order.",
    whyNotDefault:
      "A stacked bar compares lengths better but discards the day’s cyclical structure.",
    strengths: ["daily sequence", "counterfactual editing", "comparison-silhouette context"],
    risks: ["angle comparison", "schematic profiles mistaken for weighted subgroup estimates"],
    navigation: "one activity interval",
  }),
  "last-scarcity": defineEssayChartRecipe({
    id: "semiotic.recipe.scarcity-migration.v0",
    name: "Scarcity migration",
    frameFamily: "NetworkFrame",
    primary: "show where a fixed pot of social competition moves when copies get cheap",
    whyThisForm:
      "Before→after ribbons make migration legible while conserving exactly 100 scenario units.",
    whyNotDefault:
      "A single end-state pie or fan-out hides movement; a philosophical map would make widths indefensible.",
    strengths: ["before/after contrast", "crossing migrate ribbons", "one primary abundance dial"],
    risks: ["forecast aura", "model assumptions disappearing behind width"],
    navigation: "one modeled destination or flow",
  }),
  court: defineEssayChartRecipe({
    id: "semiotic.recipe.mimetic-court.v0",
    name: "Mimetic court",
    frameFamily: "NetworkCustomChart",
    primary: "walk three beats: cheap praise, copied desire, then refusal",
    whyThisForm: "Rank, visibility, invitation, and gaze need shared spatial architecture.",
    whyNotDefault: "Force direction would convert a court into an unreadable hairball.",
    strengths: ["story beats", "directed attention", "structural change after refusal"],
    risks: ["mechanism mistaken for calibration", "decorative edges overwhelming relationships"],
    navigation: "one meaningful agent, object, or relationship",
  }),
  companion: defineEssayChartRecipe({
    id: "semiotic.recipe.reciprocity-path.v0",
    name: "Reciprocity path",
    frameFamily: "XYFrame",
    primary:
      "contrast the companion promise with published associations, then ask what only refusal can do",
    whyThisForm:
      "DifferenceChart stages hope vs measurement; coefficient intervals keep causal arrows off the table.",
    whyNotDefault: "A DAG would imply identified causal structure the study does not provide.",
    strengths: ["promise/association gap", "uncertainty", "sample disclosure", "no intimate text"],
    risks: ["promise series mistaken for survey data", "negative coefficient read as proven harm"],
    navigation: "one story step or reported association",
  }),
  agon: defineEssayChartRecipe({
    id: "semiotic.recipe.agon-history-river.v0",
    name: "Agon history river",
    frameFamily: "Other",
    primary:
      "show persistence and historical structure without implying a prosperity–conflict cause",
    whyThisForm:
      "Independent scenario levers sit beside, rather than inside, measured bullying and conflict records so the argument cannot silently become a causal model.",
    whyNotDefault:
      "A dual-axis trend or shared Sankey would falsely connect development, status conflict, and organized violence through one quantitative grammar.",
    strengths: ["independent causes", "categorical limits", "scenario/measurement separation"],
    risks: [
      "persistence mistaken for inevitability",
      "bullying mistaken for a general theory of aggression",
    ],
    navigation: "one scenario lever or measured record",
  }),
  commons: defineEssayChartRecipe({
    id: "semiotic.recipe.abundance-constitution.v0",
    name: "Abundance constitution",
    frameFamily: "XYCustomChart",
    primary: "compare scenarios and support deliberation",
    whyThisForm:
      "Two independent axes prevent formation and governance from collapsing into one score.",
    whyNotDefault: "A ranked policy list would invent a single optimum.",
    strengths: ["independent levers", "trajectory", "archetype comparison"],
    risks: [
      "quadrants mistaken for exhaustive politics",
      "top-right mistaken for guaranteed virtue",
    ],
    navigation: "one archetype or reader-created position",
  }),
  observatory: defineEssayChartRecipe({
    id: "semiotic.recipe.reader-attention-mirror.v0",
    name: "Reader attention mirror",
    frameFamily: "OrdinalCustomChart",
    primary: "prompt self-reflection without classification",
    whyThisForm:
      "Nonexclusive tensions preserve contradiction instead of producing a personality type.",
    whyNotDefault: "A score would exceed what a local reading trace can support.",
    strengths: ["contradiction", "prologue/epilogue comparison", "visible limits"],
    risks: ["attention mistaken for assent", "telemetry anxiety"],
    navigation: "one tension or chapter trace",
  }),
})

export const EVIDENCE_LEDGER = createEvidenceLedger({
  sources: SOURCE_MANIFEST,
  claims: CLAIM_LEDGER,
  claimClasses: CLAIM_CLASS_META,
})

export const sourceById = EVIDENCE_LEDGER.sourceById

export function claimsForChapter(chapterId) {
  return EVIDENCE_LEDGER.claimsForSection(chapterId)
}
