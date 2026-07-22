import { buildCrucibleProductEvents } from "semiotic/physics"
import { DEBATE_WORD_TRAILS, SEGMENTS } from "../../../examples/recipes/data/debateWordTrails.js"

export const DEBATE_PHASES = [
  {
    id: "opening",
    label: "Opening",
    start: 0,
    end: 3,
    duration: 1.4,
    motion: "charge",
    intensity: 0.4,
  },
  {
    id: "early",
    label: "Early exchange",
    start: 4,
    end: 7,
    duration: 1.6,
    motion: "mix",
    intensity: 0.75,
  },
  {
    id: "middle",
    label: "Middle exchange",
    start: 8,
    end: 11,
    duration: 1.8,
    motion: "mix",
    intensity: 1,
  },
  {
    id: "late",
    label: "Late exchange",
    start: 12,
    end: 15,
    duration: 1.6,
    motion: "press",
    intensity: 0.78,
  },
  {
    id: "closing",
    label: "Closing",
    start: 16,
    end: 19,
    duration: 2.4,
    motion: "pour",
    intensity: 0.55,
  },
].map((phase) => ({
  ...phase,
  range: [phase.start, phase.end],
  percentRange: [
    Math.round((phase.start / SEGMENTS) * 100),
    Math.round(((phase.end + 1) / SEGMENTS) * 100),
  ],
}))

export const DEBATE_ROLE_META = {
  dem: {
    id: "dem",
    label: "Democratic candidate",
    color: "#2166d6",
    hatch: "forward-diagonal",
  },
  rep: {
    id: "rep",
    label: "Republican candidate",
    color: "#d62839",
    hatch: "back-diagonal",
  },
  host: { id: "host", label: "Moderator", color: "#e6b818" },
}

export const DEFAULT_FOLLOW_WORD = {
  2012: "tax",
  2016: "jobs",
  2020: "people",
}

export const DEBATE_CRUCIBLE_THRESHOLDS = {
  openingPair: 0.65,
  alloyAddition: 0.55,
  admittedPerCandidate: 12,
  maxProductsPerCandidate: 3,
  maxAdditionsPerProduct: 2,
}

export const TRANSCRIPT_ARTIFACTS = new Set(["crosstalk", "nbsp"])

export const DEBATE_CRUCIBLE_REASONS = {
  artifact: "Transcript artifact removed before charge admission.",
  belowAdmission: "Outside the top 12 non-artifact profiles by full-debate total.",
  noOpeningPair: "No unassigned partner met the 0.65 opening-pair threshold.",
  productLimit:
    "The three-product limit closed before another qualifying opening pair could be formed.",
}

const slug = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const sum = (values) => values.reduce((total, value) => total + value, 0)

const lexical = (a, b) => a.localeCompare(b)

function phaseForSegment(segment) {
  return DEBATE_PHASES.find((phase) => segment >= phase.start && segment <= phase.end)
}

export function phaseTotals(bins) {
  return DEBATE_PHASES.map((phase) => ({
    ...phase,
    total: sum(bins.slice(phase.start, phase.end + 1)),
  }))
}

function peakForBins(bins) {
  let segment = 0
  for (let index = 1; index < bins.length; index += 1) {
    if (bins[index] > bins[segment]) segment = index
  }
  const phase = phaseForSegment(segment)
  return { segment, count: bins[segment], phaseId: phase.id, phaseLabel: phase.label }
}

function normalizeProfile(debate, profile, sourceIndex) {
  if (!Array.isArray(profile.bins) || profile.bins.length !== SEGMENTS) {
    throw new Error(
      `${debate.id} ${profile.speaker}/${profile.word} must have exactly ${SEGMENTS} bins`,
    )
  }
  if (sum(profile.bins) !== profile.total) {
    throw new Error(`${debate.id} ${profile.speaker}/${profile.word} bins must sum to total`)
  }

  const id = `${debate.id}-${slug(profile.speaker)}-${slug(profile.word)}`
  return {
    id,
    word: profile.word,
    speaker: profile.speaker,
    role: debate.parties[profile.speaker],
    total: profile.total,
    bins: [...profile.bins],
    phaseTotals: phaseTotals(profile.bins),
    peak: peakForBins(profile.bins),
    sourceIndex,
  }
}

export function cosineSimilarity(leftBins, rightBins) {
  let dot = 0
  let leftMagnitude = 0
  let rightMagnitude = 0

  for (let index = 0; index < SEGMENTS; index += 1) {
    const left = leftBins[index] ?? 0
    const right = rightBins[index] ?? 0
    dot += left * right
    leftMagnitude += left * left
    rightMagnitude += right * right
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0
  return dot / Math.sqrt(leftMagnitude * rightMagnitude)
}

function relationComparator(a, b) {
  return b.score - a.score || b.total - a.total || lexical(a.id, b.id)
}

function extensionComparator(a, b) {
  return (
    b.score - a.score || b.profile.total - a.profile.total || lexical(a.profile.id, b.profile.id)
  )
}

function makeRelations(profiles, candidateId) {
  const relations = []
  for (let leftIndex = 0; leftIndex < profiles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < profiles.length; rightIndex += 1) {
      const endpoints = [profiles[leftIndex], profiles[rightIndex]].sort((a, b) =>
        lexical(a.id, b.id),
      )
      const [source, target] = endpoints
      relations.push({
        id: `${source.id}--${target.id}`,
        candidateId,
        sourceId: source.id,
        targetId: target.id,
        sourceWord: source.word,
        targetWord: target.word,
        score: cosineSimilarity(source.bins, target.bins),
        total: source.total + target.total,
      })
    }
  }
  return relations.sort(relationComparator)
}

function relationScore(relationsByPair, leftId, rightId) {
  const pairId = [leftId, rightId].sort(lexical).join("--")
  return relationsByPair.get(pairId)?.score ?? 0
}

function alloyLabel(members) {
  const labelMembers = [...members]
    .sort((a, b) => b.total - a.total || lexical(a.id, b.id))
    .slice(0, members.length === 2 ? 2 : 3)
  return labelMembers.map((member) => member.word.toUpperCase()).join(" + ")
}

function compileCandidate(debate, speaker, candidateProfiles, excludedArtifacts) {
  const role = debate.parties[speaker]
  const roleMeta = DEBATE_ROLE_META[role]
  const candidateId = `${debate.id}-${slug(speaker)}`
  const eligible = candidateProfiles
    .filter((profile) => !TRANSCRIPT_ARTIFACTS.has(profile.word))
    .sort((a, b) => b.total - a.total || a.sourceIndex - b.sourceIndex)
  const admitted = eligible.slice(0, DEBATE_CRUCIBLE_THRESHOLDS.admittedPerCandidate)
  const notAdmitted = eligible
    .slice(DEBATE_CRUCIBLE_THRESHOLDS.admittedPerCandidate)
    .map((profile) => ({
      ...profile,
      disposition: "not-admitted",
      reason: DEBATE_CRUCIBLE_REASONS.belowAdmission,
    }))
  const relations = makeRelations(admitted, candidateId)
  const relationsByPair = new Map(relations.map((relation) => [relation.id, relation]))
  const profileById = new Map(admitted.map((profile) => [profile.id, profile]))
  const unassigned = new Set(admitted.map((profile) => profile.id))
  const products = []

  while (products.length < DEBATE_CRUCIBLE_THRESHOLDS.maxProductsPerCandidate) {
    const openingRelation = relations.find(
      (relation) =>
        relation.score >= DEBATE_CRUCIBLE_THRESHOLDS.openingPair &&
        unassigned.has(relation.sourceId) &&
        unassigned.has(relation.targetId),
    )
    if (!openingRelation) break

    const members = [
      profileById.get(openingRelation.sourceId),
      profileById.get(openingRelation.targetId),
    ]
    const routes = new Map([
      [openingRelation.sourceId, { kind: "opening-pair", score: openingRelation.score }],
      [openingRelation.targetId, { kind: "opening-pair", score: openingRelation.score }],
    ])
    unassigned.delete(openingRelation.sourceId)
    unassigned.delete(openingRelation.targetId)

    for (
      let additionIndex = 0;
      additionIndex < DEBATE_CRUCIBLE_THRESHOLDS.maxAdditionsPerProduct;
      additionIndex += 1
    ) {
      const extension = [...unassigned]
        .map((profileId) => {
          const profile = profileById.get(profileId)
          const score =
            sum(members.map((member) => relationScore(relationsByPair, profile.id, member.id))) /
            members.length
          return { profile, score }
        })
        .filter((candidate) => candidate.score >= DEBATE_CRUCIBLE_THRESHOLDS.alloyAddition)
        .sort(extensionComparator)[0]

      if (!extension) break
      members.push(extension.profile)
      routes.set(extension.profile.id, { kind: "mean-affinity", score: extension.score })
      unassigned.delete(extension.profile.id)
    }

    const productNumber = products.length + 1
    const productId = `${candidateId}-alloy-${productNumber}`
    const bins = Array.from({ length: SEGMENTS }, (_, segment) =>
      sum(members.map((member) => member.bins[segment])),
    )
    const pairScores = []
    for (let left = 0; left < members.length; left += 1) {
      for (let right = left + 1; right < members.length; right += 1) {
        pairScores.push(relationScore(relationsByPair, members[left].id, members[right].id))
      }
    }

    products.push({
      id: productId,
      candidateId,
      speaker,
      label: alloyLabel(members),
      memberIds: members.map((member) => member.id),
      members: members.map((member) => ({ ...member, route: routes.get(member.id) })),
      total: sum(members.map((member) => member.total)),
      bins,
      phaseTotals: phaseTotals(bins),
      peak: peakForBins(bins),
      openingScore: openingRelation.score,
      meanCohesion: sum(pairScores) / pairScores.length,
      summary: `${members.length} words with similar timing, opened at cosine ${openingRelation.score.toFixed(2)}.`,
    })
  }

  const productLimitReached = products.length === DEBATE_CRUCIBLE_THRESHOLDS.maxProductsPerCandidate
  const hasRemainingOpeningPair = relations.some(
    (relation) =>
      relation.score >= DEBATE_CRUCIBLE_THRESHOLDS.openingPair &&
      unassigned.has(relation.sourceId) &&
      unassigned.has(relation.targetId),
  )
  const residueReason =
    productLimitReached && hasRemainingOpeningPair
      ? DEBATE_CRUCIBLE_REASONS.productLimit
      : DEBATE_CRUCIBLE_REASONS.noOpeningPair
  const unalloyed = admitted
    .filter((profile) => unassigned.has(profile.id))
    .map((profile) => ({
      ...profile,
      disposition: "unalloyed",
      reason: residueReason,
    }))
  const productByMemberId = new Map()
  for (const product of products) {
    for (const member of product.members) productByMemberId.set(member.id, { product, member })
  }
  const ledger = admitted.map((profile, admissionIndex) => {
    const assignment = productByMemberId.get(profile.id)
    if (assignment) {
      return {
        id: `${profile.id}-ledger`,
        admissionRank: admissionIndex + 1,
        wordId: profile.id,
        word: profile.word,
        speaker,
        total: profile.total,
        disposition: "alloyed",
        destinationId: assignment.product.id,
        destinationLabel: assignment.product.label,
        route: assignment.member.route,
        reason:
          assignment.member.route.kind === "opening-pair"
            ? `Opened ${assignment.product.label} at cosine ${assignment.member.route.score.toFixed(2)}.`
            : `Joined ${assignment.product.label} at mean cosine ${assignment.member.route.score.toFixed(2)}.`,
      }
    }
    return {
      id: `${profile.id}-ledger`,
      admissionRank: admissionIndex + 1,
      wordId: profile.id,
      word: profile.word,
      speaker,
      total: profile.total,
      disposition: "unalloyed",
      destinationId: `${candidateId}-unalloyed`,
      destinationLabel: "UNALLOYED",
      route: null,
      reason: residueReason,
    }
  })

  return {
    id: candidateId,
    debateId: debate.id,
    speaker,
    role,
    roleLabel: roleMeta.label,
    color: roleMeta.color,
    charge: {
      id: `${candidateId}-charge`,
      label: `${speaker} charge`,
      admitted,
      wordCount: admitted.length,
      tokenCount: sum(admitted.map((profile) => profile.total)),
    },
    products,
    unalloyed,
    residue: unalloyed,
    relations,
    eligibleRelations: relations.filter(
      (relation) => relation.score >= DEBATE_CRUCIBLE_THRESHOLDS.openingPair,
    ),
    ledger,
    notAdmitted,
    excluded: excludedArtifacts.filter((record) => record.speaker === speaker),
    summary: `${speaker}: ${products.length} temporal alloys close ${
      admitted.length - unalloyed.length
    } of ${admitted.length} admitted words; ${unalloyed.length} remain unalloyed.`,
  }
}

function makeTrailRows(compilation, selectedWord) {
  const admittedIds = new Set(
    compilation.candidates.flatMap((candidate) =>
      candidate.charge.admitted
        .filter((profile) => profile.word === selectedWord)
        .map((profile) => profile.id),
    ),
  )
  if (admittedIds.size === 0) return []

  return compilation.profiles
    .filter(
      (profile) =>
        profile.word === selectedWord &&
        !TRANSCRIPT_ARTIFACTS.has(profile.word) &&
        (admittedIds.has(profile.id) || profile.role === "host"),
    )
    .flatMap((profile) =>
      profile.bins.flatMap((weight, segment) =>
        weight > 0
          ? [
              {
                id: `${profile.id}-trail-${segment}`,
                word: selectedWord,
                speaker: profile.speaker,
                role: profile.role,
                roleLabel: DEBATE_ROLE_META[profile.role].label,
                color: DEBATE_ROLE_META[profile.role].color,
                context: profile.role === "host" ? "moderator" : "candidate",
                segment,
                weight,
                total: profile.total,
                phaseId: phaseForSegment(segment).id,
              },
            ]
          : [],
      ),
    )
}

function makeModeratorContextRows(compilation) {
  return (compilation.moderator?.profiles ?? []).flatMap((profile) =>
    profile.bins.flatMap((weight, segment) =>
      weight > 0
        ? [
            {
              id: `${profile.id}-moderator-trail-${segment}`,
              word: profile.word,
              speaker: profile.speaker,
              role: "host",
              roleLabel: DEBATE_ROLE_META.host.label,
              color: DEBATE_ROLE_META.host.color,
              context: "moderator",
              segment,
              weight,
              total: profile.total,
              phaseId: phaseForSegment(segment).id,
            },
          ]
        : [],
    ),
  )
}

export function compileDebateConceptCrucible(debate) {
  if (!debate?.id || !Array.isArray(debate.profiles)) {
    throw new Error("A debate with full word profiles is required")
  }

  const profiles = debate.profiles.map((profile, index) => normalizeProfile(debate, profile, index))
  const excluded = profiles
    .filter((profile) => TRANSCRIPT_ARTIFACTS.has(profile.word))
    .map((profile) => ({
      ...profile,
      disposition: "excluded",
      reason: DEBATE_CRUCIBLE_REASONS.artifact,
    }))
  const candidateSpeakers = debate.columnOrder.filter(
    (speaker) => debate.parties[speaker] !== "host",
  )
  const candidates = candidateSpeakers.map((speaker) =>
    compileCandidate(
      debate,
      speaker,
      profiles.filter((profile) => profile.speaker === speaker),
      excluded,
    ),
  )
  const moderatorSpeaker = debate.columnOrder.find((speaker) => debate.parties[speaker] === "host")
  const moderator = moderatorSpeaker
    ? {
        speaker: moderatorSpeaker,
        role: "host",
        ...DEBATE_ROLE_META.host,
        profiles: profiles.filter(
          (profile) =>
            profile.speaker === moderatorSpeaker && !TRANSCRIPT_ARTIFACTS.has(profile.word),
        ),
      }
    : null
  const admittedWordsByCandidate = candidates.map(
    (candidate) => new Set(candidate.charge.admitted.map((profile) => profile.word)),
  )
  const sharedWords = [...(admittedWordsByCandidate[0] ?? [])]
    .filter((word) => admittedWordsByCandidate.slice(1).every((words) => words.has(word)))
    .map((word) => {
      const candidateProfiles = candidates.map((candidate) =>
        candidate.charge.admitted.find((profile) => profile.word === word),
      )
      return {
        id: word,
        word,
        label: word,
        total: sum(candidateProfiles.map((profile) => profile.total)),
        speakers: candidateProfiles.map((profile) => profile.speaker),
      }
    })
    .sort((a, b) => b.total - a.total || lexical(a.id, b.id))
  const defaultFollowWord = DEFAULT_FOLLOW_WORD[debate.id]
  if (!sharedWords.some((option) => option.word === defaultFollowWord)) {
    throw new Error(
      `${debate.id} default follow word “${defaultFollowWord}” is not admitted by both candidates`,
    )
  }

  const compilation = {
    id: debate.id,
    label: debate.label,
    phases: DEBATE_PHASES,
    profiles,
    candidates,
    moderator,
    excluded,
    defaultFollowWord,
    sharedWordOptions: sharedWords,
    summaries: {
      debate: `${debate.label}: ${candidates.length} candidate charges, compiled independently by temporal similarity.`,
      candidates: candidates.map((candidate) => candidate.summary),
      method:
        "Cosine similarity compares the complete 20-bin timing profiles; it does not infer topic, intent, agreement, or debate performance.",
    },
  }
  compilation.trailRowsByWord = Object.fromEntries(
    sharedWords.map((option) => [option.word, makeTrailRows(compilation, option.word)]),
  )
  compilation.moderatorContextRows = makeModeratorContextRows(compilation)
  return compilation
}

export function trailRowsForWord(compilation, selectedWord = compilation.defaultFollowWord) {
  return compilation.trailRowsByWord[selectedWord] ?? makeTrailRows(compilation, selectedWord)
}

export function candidateLedger(compilation, candidateIdOrSpeaker) {
  const candidate = compilation.candidates.find(
    (item) => item.id === candidateIdOrSpeaker || item.speaker === candidateIdOrSpeaker,
  )
  return candidate ? candidate.ledger : []
}

export function ledgerEntryForWord(compilation, speaker, word) {
  return candidateLedger(compilation, speaker).find((entry) => entry.word === word) ?? null
}

export function ledgerSummary(candidate) {
  return candidate.ledger.reduce(
    (summary, entry) => ({
      ...summary,
      [entry.disposition]: (summary[entry.disposition] ?? 0) + 1,
    }),
    { admitted: candidate.charge.admitted.length, alloyed: 0, unalloyed: 0 },
  )
}

const SEGMENTS_PER_PHASE = SEGMENTS / DEBATE_PHASES.length
const LAST_TRANSFORM_COORDINATE = DEBATE_PHASES.length - 0.58
const LAST_PRODUCT_COORDINATE = DEBATE_PHASES.length - 0.65

function eventPositionAtCoordinate(coordinate) {
  const bounded = Math.max(0.06, Math.min(LAST_TRANSFORM_COORDINATE, coordinate))
  const phaseIndex = Math.min(DEBATE_PHASES.length - 1, Math.floor(bounded))
  return {
    phaseId: DEBATE_PHASES[phaseIndex].id,
    progress: bounded - phaseIndex,
  }
}

function peakCoordinate(profile) {
  return (profile.peak.segment + 0.5) / SEGMENTS_PER_PHASE
}

function routeEventPosition(profile) {
  return eventPositionAtCoordinate(peakCoordinate(profile))
}

function productEventPositions(product, additionCount) {
  const contributionOffsets = Array.from(
    { length: additionCount },
    (_, index) => 0.48 + index * 0.2,
  )
  const completeOffset = 0.7 + additionCount * 0.16
  const start = Math.max(
    0.06,
    Math.min(LAST_PRODUCT_COORDINATE - completeOffset, peakCoordinate(product) - 0.42),
  )
  return {
    relation: eventPositionAtCoordinate(start),
    open: eventPositionAtCoordinate(start + 0.24),
    contributions: contributionOffsets.map((offset) => eventPositionAtCoordinate(start + offset)),
    complete: eventPositionAtCoordinate(start + completeOffset),
  }
}

function eventComparator(a, b) {
  const leftPhase = DEBATE_PHASES.findIndex((phase) => phase.id === a.at.phaseId)
  const rightPhase = DEBATE_PHASES.findIndex((phase) => phase.id === b.at.phaseId)
  const effectOrder = {
    "set-relation": 0,
    combine: 1,
    contribute: 2,
    "complete-product": 3,
    eject: 4,
    "set-outcome": 5,
  }
  return (
    leftPhase - rightPhase ||
    a.at.progress - b.at.progress ||
    effectOrder[a.effects[0].type] - effectOrder[b.effects[0].type] ||
    lexical(a.id, b.id)
  )
}

function adaptCandidateForChart(candidate) {
  const productOutletId = `${candidate.id}-alloys`
  const unalloyedOutletId = `${candidate.id}-unalloyed`
  const products = candidate.products.map((product, order) => ({
    id: product.id,
    label: product.label,
    category: `${candidate.speaker} temporal alloy`,
    amount: product.total,
    outletId: productOutletId,
    color: candidate.color,
    order,
  }))
  const productByMemberId = new Map(
    candidate.products.flatMap((product, productIndex) =>
      product.memberIds.map((sourceId) => [sourceId, products[productIndex]]),
    ),
  )
  const ledgerByWordId = new Map(candidate.ledger.map((entry) => [entry.wordId, entry]))
  const data = candidate.charge.admitted.map((profile) => {
    const product = productByMemberId.get(profile.id)
    const ledgerEntry = ledgerByWordId.get(profile.id)
    return {
      id: profile.id,
      word: profile.word,
      label: profile.word.toUpperCase(),
      speaker: candidate.speaker,
      role: candidate.role,
      color: candidate.color,
      count: profile.total,
      amount: profile.total,
      bins: [...profile.bins],
      peakSegment: profile.peak.segment,
      peakPhaseId: profile.peak.phaseId,
      productId: product?.id ?? null,
      disposition: ledgerEntry.disposition,
      outletId: product ? productOutletId : unalloyedOutletId,
      reason: ledgerEntry.reason,
    }
  })
  const relationByPair = new Map(candidate.relations.map((relation) => [relation.id, relation]))
  const events = []

  for (const product of candidate.products) {
    const [first, second, ...additions] = product.members
    const openingRelationId = [first.id, second.id].sort(lexical).join("--")
    const openingRelation = relationByPair.get(openingRelationId)
    const supportRelations = new Map([[openingRelation.id, openingRelation]])
    additions.forEach((member, additionIndex) => {
      product.members.slice(0, additionIndex + 2).forEach((existingMember) => {
        const relation = relationByPair.get([member.id, existingMember.id].sort(lexical).join("--"))
        if (relation) supportRelations.set(relation.id, relation)
      })
    })
    const positions = productEventPositions(product, additions.length)
    events.push({
      id: `${product.id}-relation`,
      label: `Assay the members of ${product.label}`,
      description: `Full 20-bin cosine ${openingRelation.score.toFixed(2)} meets the 0.65 opening threshold.`,
      at: positions.relation,
      effects: [...supportRelations.values()].map((relation) => ({
        type: "set-relation",
        relation: {
          id: relation.id,
          sourceIds: [relation.sourceId, relation.targetId],
          label: `${relation.sourceWord} / ${relation.targetWord}`,
          category: "temporal-affinity",
          strength: relation.score,
          metrics: { cosine: relation.score },
        },
      })),
    })
    events.push(
      ...buildCrucibleProductEvents({
        productId: product.id,
        form: {
          id: `${product.id}-open`,
          label: `Open ${product.label}`,
          at: positions.open,
          sourceIds: [first.id, second.id],
          basisRelationIds: [openingRelation.id],
        },
        contributions: additions.map((member, additionIndex) => {
          const basisRelationIds = product.members
            .slice(0, additionIndex + 2)
            .map((existingMember) =>
              relationByPair.get([member.id, existingMember.id].sort(lexical).join("--")),
            )
            .filter(Boolean)
            .map((relation) => relation.id)
          return {
            id: `${product.id}-contribute-${additionIndex + 1}`,
            label: `Contribute ${member.word}`,
            description: `Mean cosine ${member.route.score.toFixed(2)} meets the 0.55 contribution threshold.`,
            at: positions.contributions[additionIndex],
            sourceIds: [member.id],
            basisRelationIds,
          }
        }),
        complete: {
          id: `${product.id}-complete`,
          label: `Complete ${product.label}`,
          at: positions.complete,
          outletId: productOutletId,
        },
      }),
    )
  }

  for (const profile of candidate.unalloyed) {
    events.push({
      id: `${profile.id}-eject`,
      label: `Route ${profile.word} to Unalloyed`,
      at: routeEventPosition(profile),
      effects: [
        {
          type: "eject",
          select: { ids: [profile.id] },
          outletId: unalloyedOutletId,
          reason: profile.reason,
        },
      ],
    })
  }

  const finalPhase = DEBATE_PHASES[DEBATE_PHASES.length - 1]
  events.push({
    id: `${candidate.id}-complete`,
    label: `Record ${candidate.speaker} assay outcome`,
    at: { phaseId: finalPhase.id, progress: 0.62 },
    effects: [
      {
        type: "set-outcome",
        outcome: "assay-complete",
        summary: candidate.summary,
      },
    ],
  })

  return {
    id: candidate.id,
    speaker: candidate.speaker,
    role: candidate.role,
    roleLabel: candidate.roleLabel,
    color: candidate.color,
    hatch: DEBATE_ROLE_META[candidate.role].hatch,
    data,
    products,
    outlets: [
      {
        id: productOutletId,
        label: "Temporal alloys",
        side: "bottom",
        color: candidate.color,
        order: 0,
      },
      {
        id: unalloyedOutletId,
        label: "Unalloyed",
        side: "right",
        color: "#77706a",
        order: 1,
      },
    ],
    phases: DEBATE_PHASES,
    events: events.sort(eventComparator),
    relations: candidate.relations,
    ledger: candidate.ledger,
    summary: candidate.summary,
  }
}

/**
 * Integration-facing, serializable chart assay. The compiler remains an
 * authored analysis: physics presents these decisions but never discovers the
 * products or destinations.
 */
export function compileDebateConceptAssay(debate) {
  const compilation = compileDebateConceptCrucible(debate)
  return {
    debate: {
      id: compilation.id,
      label: compilation.label,
      speakers: debate.columnOrder.map((speaker) => ({
        speaker,
        role: debate.parties[speaker],
        ...DEBATE_ROLE_META[debate.parties[speaker]],
      })),
    },
    candidates: compilation.candidates.map(adaptCandidateForChart),
    phases: compilation.phases,
    defaultFollowWord: compilation.defaultFollowWord,
    sharedWords: compilation.sharedWordOptions,
    excludedArtifacts: compilation.excluded,
    trailRows: trailRowsForWord(compilation),
    trailRowsByWord: compilation.trailRowsByWord,
    moderatorContextRows: compilation.moderatorContextRows,
    summary: compilation.summaries,
  }
}

export const DEBATE_CONCEPT_CRUCIBLES = DEBATE_WORD_TRAILS.map(compileDebateConceptCrucible)

export const DEBATE_CONCEPT_CRUCIBLE_BY_ID = Object.fromEntries(
  DEBATE_CONCEPT_CRUCIBLES.map((debate) => [debate.id, debate]),
)

export function getDebateConceptCrucible(debateId) {
  return DEBATE_CONCEPT_CRUCIBLE_BY_ID[debateId] ?? DEBATE_CONCEPT_CRUCIBLES[0]
}

export const DEBATE_CONCEPT_ASSAYS = DEBATE_WORD_TRAILS.map(compileDebateConceptAssay)

export const DEBATE_CONCEPT_ASSAY_BY_ID = Object.fromEntries(
  DEBATE_CONCEPT_ASSAYS.map((assay) => [assay.debate.id, assay]),
)

export function getDebateConceptAssay(debateId) {
  return DEBATE_CONCEPT_ASSAY_BY_ID[debateId] ?? DEBATE_CONCEPT_ASSAYS[0]
}
