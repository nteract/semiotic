import riverDataset from "./unitedStatesHistoryRiver.source.generated"

const DOMAIN_START = 1763
const DOMAIN_END = 2025
// Transactions are dated at arrival. A short authored travel window keeps an
// otherwise near-instant legal change visible on a 262-year vertical axis.
const TRANSIT = 0.65
const SOURCE_LEAD = 5
const DIRECT_SOURCE_LEAD = 4
const COLONIAL_SOURCE_LEAD = 4
const PRE_DOMAIN_SYSTEM_IN = DOMAIN_START - 1

function decimalYear(value) {
  if (typeof value === "number") return value
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(value)
  if (!match) return Number(value)
  const year = Number(match[1])
  const month = Number(match[2] ?? 1)
  const day = Number(match[3] ?? 1)
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  return year + (Date.UTC(year, month - 1, day) - start) / (end - start)
}

function list(values) {
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`
}

const admissionByCode = new Map(
  riverDataset.admissions_status.map((row) => [row.jurisdiction_code, row]),
)
function namesFor(codes) {
  return codes.map((code) => admissionByCode.get(code)?.jurisdiction ?? code)
}

export const US_RIVER_METADATA = Object.freeze({
  ...riverDataset.metadata,
  process_model:
    "Persistent institutional inventories compiled from acquisition, admission, secession, restoration, occupation, and decolonization records.",
  width_definition:
    "One unit is one jurisdiction route. A route follows a named polity or a modern jurisdiction precursor through a legal-status change; it does not measure land, people, wealth, or legitimacy.",
})

export const US_CORE_NODE_IDS = Object.freeze({
  states: "US_STATES",
  territories: "US_TERRITORIES",
  colonies: "US_COLONIES",
})

export const US_WIDTH_UNIT = Object.freeze({
  id: "jurisdiction_routes",
  label: "Routes",
  singular: "jurisdiction route",
  plural: "jurisdiction routes",
  description:
    "one status-bearing jurisdiction or polity thread, regardless of land area or population",
})

export const US_DOMAIN = Object.freeze([DOMAIN_START, DOMAIN_END])

export const US_COLORS = Object.freeze({
  states: "#173f6b",
  territories: "#4f82b5",
  colonies: "#9bc9e2",
  foundingRed: "#9a443f",
  foundingWhite: "#d2d0c8",
  foundingBlue: "#315c94",
  confederacy: "#8a4f4f",
  district: "#6b6b6b",
  british: "#8c6d31",
  revolutionary: "#a94b4b",
  french: "#8663a5",
  spanish: "#d88743",
  mexican: "#bd5c55",
  texas: "#9e3f3d",
  oregon: "#4c8d68",
  alaska: "#647f99",
  hawaiian: "#c89c2f",
  samoan: "#328f82",
  danish: "#bd607b",
  trust: "#746b96",
  panama: "#937d63",
})

export const US_FLOW_TYPES = Object.freeze([
  {
    id: "founding",
    label: "Founding",
    description: "A regional colony bundle enters the revolutionary United States.",
  },
  {
    id: "acquisition",
    label: "Acquisition",
    description: "A route enters a U.S. territorial inventory.",
  },
  {
    id: "statehood",
    label: "Statehood",
    description: "A route leaves territorial inventory and joins the United States.",
  },
  {
    id: "direct-admission",
    label: "Direct admission",
    description:
      "A republic or state-derived jurisdiction joins without an ordinary territorial passage.",
  },
  {
    id: "secession",
    label: "Secession",
    description:
      "De facto Confederate government and lost ordinary federal representation pull state routes from the Union band.",
  },
  {
    id: "restoration",
    label: "Restoration",
    description: "Congressional representation returns after war and Reconstruction.",
  },
  {
    id: "colonial-administration",
    label: "Colonial administration",
    description:
      "A possession, occupation, special control zone, or administered trust enters the analytical colonies band.",
  },
])

const MILESTONE_DEFINITIONS = [
  {
    id: "FOUNDING",
    year: 1776,
    benchmark: "1776",
    label: "Three colonial regions become one United States",
    description:
      "New England, Middle, and Southern colony bundles enter one persistent national band. The chart begins with thirteen routes—not with fifty endpoint fragments.",
    eventIds: ["E01"],
  },
  {
    id: "TERRITORIAL_SYSTEM",
    year: 1783,
    benchmark: "1783–1787",
    label: "A second institution opens",
    description:
      "Western claims and cessions begin accumulating in United States Territories. Statehood will move routes out of this band rather than create disconnected snapshots.",
    eventIds: ["E02", "E03"],
  },
  {
    id: "LOUISIANA",
    year: 1803,
    benchmark: "1803",
    label: "The territorial reservoir swells",
    description:
      "The Louisiana Purchase adds thirteen future jurisdiction routes at once. They leave for statehood over more than a century.",
    eventIds: ["E06"],
  },
  {
    id: "CONTINENTAL_EXPANSION",
    year: 1848,
    benchmark: "1845–1848",
    label: "Three routes, three legal paths",
    description:
      "Texas enters the United States directly; Oregon and the Mexican Cession enter Territories; California then moves rapidly from cession to statehood.",
    eventIds: ["E09", "E10", "E11"],
  },
  {
    id: "CIVIL_WAR",
    year: 1861,
    benchmark: "1860–1861",
    label: "The state band tears from within",
    description:
      "Eleven state routes leave in two waves for a de facto Confederate government. The break represents control and federal representation, not recognition of lawful secession.",
    eventIds: ["E13", "E14", "E15"],
  },
  {
    id: "RECONSTRUCTION",
    year: 1868,
    benchmark: "1866–1870",
    label: "Return is staggered",
    description:
      "Tennessee returns first, six states regain representation in 1868, and the last four return in 1870. Military defeat and political restoration are not one event.",
    eventIds: ["E16", "E17", "E18", "E20"],
  },
  {
    id: "OVERSEAS_EMPIRE",
    year: 1898,
    benchmark: "1898–1900",
    label: "An overseas branch opens—and does not lead only to statehood",
    description:
      "Puerto Rico, Guam, Hawaii, and Samoa enter territorial routes. Cuba and the Philippines enter a separate analytical colonies band whose exits follow different futures.",
    eventIds: ["E21", "E22"],
  },
  {
    id: "PHILIPPINE_INDEPENDENCE",
    year: 1946,
    benchmark: "1946",
    label: "The Philippines leaves the system",
    description:
      "The colonial thread fades at independence instead of being forced into an endpoint or statehood sink.",
    eventIds: ["E26", "E28"],
  },
  {
    id: "FIFTY_STATES",
    year: 1959,
    benchmark: "1959",
    label: "Two territorial routes complete the fifty-state band",
    description:
      "Alaska and Hawaii transfer from Territories to the United States. Five inhabited territorial routes remain outside statehood.",
    eventIds: ["E31"],
  },
  {
    id: "PACIFIC_DIVERGENCE",
    year: 1986,
    benchmark: "1986–1994",
    label: "One trust produces four different futures",
    description:
      "Northern Mariana Islands enters Territories; Micronesia, the Marshall Islands, and Palau leave U.S. trusteeship as sovereign states in free association.",
    eventIds: ["E32", "E34", "E35"],
  },
  {
    id: "PRESENT",
    year: 2025,
    benchmark: "present",
    label: "Fifty states and five inhabited territories",
    description:
      "The two continuing blue bands remain constitutionally different. The federal district sits outside this three-institution comparison, and former colonial administrations have faded away.",
    eventIds: ["E36"],
  },
]

export const US_MILESTONES = Object.freeze(
  MILESTONE_DEFINITIONS.map((milestone) => Object.freeze(milestone)),
)
export const US_STAGES = US_MILESTONES
export const US_AXIS_TICKS = Object.freeze([
  { date: 1763, label: "1763" },
  { date: 1776, label: "1776" },
  { date: 1783, label: "1783" },
  { date: 1803, label: "1803" },
  { date: 1821, label: "1821" },
  { date: 1848, label: "1848" },
  { date: 1861, label: "1861" },
  { date: 1870, label: "1870" },
  { date: 1898, label: "1898" },
  { date: 1912, label: "1912" },
  { date: 1946, label: "1946" },
  { date: 1959, label: "1959" },
  { date: 1986, label: "1986" },
  { date: 2000, label: "2000" },
  { date: 2025, label: "present" },
])

const FOUNDING_BUNDLES = [
  {
    id: "NEW_ENGLAND_COLONIES",
    label: "New England Colonies",
    shortLabel: "New England",
    codes: ["NH", "MA", "RI", "CT"],
    category: "foundingWhite",
    group: "founding-regions",
    description:
      "New Hampshire, Massachusetts, Rhode Island, and Connecticut form the northern founding bundle.",
  },
  {
    id: "MIDDLE_COLONIES",
    label: "Middle Colonies",
    shortLabel: "Middle Colonies",
    codes: ["NY", "NJ", "PA", "DE"],
    category: "foundingRed",
    group: "founding-regions",
    description:
      "New York, New Jersey, Pennsylvania, and Delaware form the middle founding bundle.",
  },
  {
    id: "SOUTHERN_COLONIES",
    label: "Southern Colonies",
    shortLabel: "Southern Colonies",
    codes: ["MD", "VA", "NC", "SC", "GA"],
    category: "foundingBlue",
    group: "founding-regions",
    description:
      "Maryland, Virginia, North Carolina, South Carolina, and Georgia form the southern founding bundle.",
  },
]

const TERRITORIAL_ACQUISITIONS = [
  {
    id: "TREATY_1783_INTERIOR",
    label: "1783 interior cessions",
    shortLabel: "1783 interior",
    date: "1783-09-03",
    dateLabel: "3 Sep 1783",
    codes: ["AL", "IL", "IN", "MI", "MS", "OH", "WI"],
    category: "british",
    milestoneId: "TERRITORIAL_SYSTEM",
    description:
      "Seven future state routes enter federal territorial administration after the peace boundary and later state cessions. Indigenous sovereignty and control did not vanish at the treaty line.",
  },
  {
    id: "NORTH_CAROLINA_WESTERN_CESSION",
    label: "North Carolina western cession",
    shortLabel: "Southwest Territory",
    date: "1790-04-02",
    dateLabel: "1790",
    codes: ["TN"],
    category: "revolutionary",
    milestoneId: "TERRITORIAL_SYSTEM",
    description:
      "The future Tennessee route passes through the federal Territory South of the River Ohio before statehood.",
  },
  {
    id: "LOUISIANA_PURCHASE_SOURCE",
    label: "Louisiana Purchase",
    shortLabel: "Louisiana Purchase",
    date: "1803-12-20",
    dateLabel: "20 Dec 1803",
    codes: ["AR", "CO", "IA", "KS", "LA", "MN", "MO", "MT", "NE", "ND", "OK", "SD", "WY"],
    category: "french",
    predatesDomain: false,
    milestoneId: "LOUISIANA",
    description:
      "Thirteen primary future-jurisdiction routes enter the territorial reservoir together; mixed present-state provenance is documented but not fractionally invented.",
  },
  {
    id: "FLORIDA_CESSION_SOURCE",
    label: "Spanish Florida",
    shortLabel: "Florida cession",
    date: "1821-02-22",
    dateLabel: "22 Feb 1821",
    codes: ["FL"],
    category: "spanish",
    predatesDomain: false,
    milestoneId: "LOUISIANA",
    description: "Florida transfers from Spain into U.S. territorial administration.",
  },
  {
    id: "OREGON_COUNTRY_SOURCE",
    label: "Oregon Country",
    shortLabel: "Oregon Country",
    date: "1846-06-15",
    dateLabel: "15 Jun 1846",
    codes: ["ID", "OR", "WA"],
    category: "oregon",
    predatesDomain: false,
    milestoneId: "CONTINENTAL_EXPANSION",
    description:
      "A boundary settlement with Britain routes three primary future jurisdictions into U.S. territorial government.",
  },
  {
    id: "MEXICAN_CESSION_SOURCE",
    label: "Mexican Cession",
    shortLabel: "Mexican Cession",
    date: "1848-02-02",
    dateLabel: "2 Feb 1848",
    codes: ["AZ", "CA", "NV", "NM", "UT"],
    category: "mexican",
    predatesDomain: false,
    milestoneId: "CONTINENTAL_EXPANSION",
    description:
      "Five primary future-jurisdiction routes enter after the Mexican–American War; the treaty record does not erase prior inhabitants or mixed boundaries.",
  },
  {
    id: "ALASKA_PURCHASE_SOURCE",
    label: "Russian Alaska",
    shortLabel: "Alaska Purchase",
    date: "1867-10-18",
    dateLabel: "18 Oct 1867",
    codes: ["AK"],
    category: "alaska",
    predatesDomain: false,
    milestoneId: "RECONSTRUCTION",
    description:
      "Alaska enters U.S. administration long before organized territorial government or statehood.",
  },
  {
    id: "HAWAII_ANNEXATION_SOURCE",
    label: "Republic of Hawai‘i",
    shortLabel: "Hawai‘i annexation",
    date: "1898-08-12",
    dateLabel: "12 Aug 1898",
    codes: ["HI"],
    category: "hawaiian",
    predatesDomain: false,
    milestoneId: "OVERSEAS_EMPIRE",
    description:
      "The Hawaiian route enters territorial administration after the overthrow of the Hawaiian Kingdom and U.S. annexation.",
  },
  {
    id: "SPANISH_CESSION_TERRITORIES",
    label: "Spanish cession territories",
    shortLabel: "Puerto Rico + Guam",
    date: "1899-04-11",
    dateLabel: "11 Apr 1899",
    codes: ["PR", "GU"],
    category: "spanish",
    predatesDomain: false,
    milestoneId: "OVERSEAS_EMPIRE",
    description:
      "Puerto Rico and Guam enter enduring but unequal unincorporated territorial relationships after the Treaty of Paris takes effect.",
  },
  {
    id: "SAMOAN_CESSIONS_SOURCE",
    label: "Samoan polities",
    shortLabel: "Samoan cessions",
    date: "1900-04-17",
    dateLabel: "17 Apr 1900",
    codes: ["AS"],
    category: "samoan",
    predatesDomain: false,
    sourceLead: 1.25,
    milestoneId: "OVERSEAS_EMPIRE",
    description:
      "The American Samoa route begins with the Deeds of Cession; it remains an unincorporated, unorganized territory.",
  },
  {
    id: "DANISH_WEST_INDIES_SOURCE",
    label: "Danish West Indies",
    shortLabel: "Danish West Indies",
    date: "1917-03-31",
    dateLabel: "31 Mar 1917",
    codes: ["VI"],
    category: "danish",
    predatesDomain: false,
    milestoneId: "OVERSEAS_EMPIRE",
    description: "The purchased islands enter the U.S. territorial stream as the Virgin Islands.",
  },
  {
    id: "CNMI_COVENANT_SOURCE",
    label: "Northern Marianas covenant",
    shortLabel: "Northern Marianas",
    date: "1986-11-03",
    dateLabel: "3 Nov 1986",
    codes: ["MP"],
    category: "trust",
    milestoneId: "PACIFIC_DIVERGENCE",
    description:
      "The Northern Mariana Islands route leaves trusteeship for a U.S. commonwealth territorial relationship.",
  },
]

const DIRECT_ADMISSIONS = [
  {
    id: "VERMONT_REPUBLIC",
    label: "Vermont Republic",
    shortLabel: "Vermont Republic",
    code: "VT",
    category: "revolutionary",
    description:
      "An independent republic amid disputed New York and New Hampshire claims enters directly as a state.",
  },
  {
    id: "KENTUCKY_DISTRICT",
    label: "Virginia's Kentucky District",
    shortLabel: "Kentucky District",
    code: "KY",
    category: "revolutionary",
    description: "Kentucky separates from Virginia and enters directly as a state.",
  },
  {
    id: "DISTRICT_OF_MAINE",
    label: "District of Maine",
    shortLabel: "District of Maine",
    code: "ME",
    category: "revolutionary",
    description:
      "Maine separates from Massachusetts and enters as a state in the Missouri Compromise pairing.",
  },
  {
    id: "REPUBLIC_OF_TEXAS",
    label: "Republic of Texas",
    shortLabel: "Republic of Texas",
    code: "TX",
    category: "texas",
    description:
      "Texas enters the United States directly as a state rather than waiting in the territorial institution.",
  },
  {
    id: "WEST_VIRGINIA_PROCESS",
    label: "Restored Virginia government",
    shortLabel: "West Virginia process",
    code: "WV",
    category: "revolutionary",
    description:
      "A loyal wartime government and partition of Virginia produce West Virginia statehood during the Civil War.",
  },
]

const COLONIAL_HOLDINGS = [
  {
    id: "PHILIPPINES",
    source: "SPANISH_OVERSEAS_EMPIRE",
    sourceLabel: "Spain's overseas empire",
    sourceCategory: "spanish",
    sourcePredatesDomain: false,
    arrival: "1898-08-14",
    arrivalLabel: "14 Aug 1898",
    exit: "1946-07-04",
    exitLabel: "4 Jul 1946",
    systemOutLabel: "Philippine independence",
    members: ["Philippines"],
    milestoneId: "OVERSEAS_EMPIRE",
    legalStatus: "military government, colonial possession, then Philippine Commonwealth",
    notes:
      "U.S. rule was contested by the Philippine Republic and the Philippine–American War. The later Commonwealth carried a statutory independence timetable and was not equivalent to Puerto Rico's status.",
  },
  {
    id: "CUBA_OCCUPATION_1898",
    source: "SPANISH_OVERSEAS_EMPIRE",
    sourceLabel: "Spain's overseas empire",
    sourceCategory: "spanish",
    sourcePredatesDomain: false,
    arrival: "1898-07-01",
    arrivalLabel: "Jul 1898",
    exit: "1902-05-20",
    exitLabel: "20 May 1902",
    systemOutLabel: "Cuban republican government",
    members: ["Cuba — first U.S. occupation"],
    milestoneId: "OVERSEAS_EMPIRE",
    legalStatus: "military occupation, never annexed as a U.S. territory",
    notes:
      "Spanish rule ended and Cuban sovereignty emerged under U.S. military occupation. The light-blue band is an analytical administration bucket, not a claim that Cuba became a U.S. colony in law.",
  },
  {
    id: "CUBA_OCCUPATION_1906",
    source: "CUBA_REPUBLIC_1906",
    sourceLabel: "Republic of Cuba",
    sourceCategory: "spanish",
    arrival: "1906-09-29",
    arrivalLabel: "29 Sep 1906",
    exit: "1909-01-28",
    exitLabel: "28 Jan 1909",
    systemOutLabel: "Cuban government restored",
    members: ["Cuba — second U.S. occupation"],
    milestoneId: "OVERSEAS_EMPIRE",
    legalStatus: "temporary military occupation under the Platt Amendment framework",
    notes:
      "Cuba re-enters the administration band temporarily; sovereignty does not transfer to the United States.",
  },
  {
    id: "PANAMA_CANAL_CONTROL",
    source: "PANAMA_CANAL_TREATIES",
    sourceLabel: "Panama Canal treaties",
    sourceCategory: "panama",
    arrival: "1903-11-18",
    arrivalLabel: "18 Nov 1903",
    exit: "1999-12-31",
    exitLabel: "31 Dec 1999",
    systemOutLabel: "Canal transfer completed",
    members: ["Panama Canal control"],
    milestoneId: "OVERSEAS_EMPIRE",
    legalStatus: "special control and jurisdiction, not an ordinary U.S. territory",
    notes:
      "Panama resumed territorial jurisdiction in 1979; canal operation transferred completely in 1999. One fading route compresses those two treaty steps without treating the zone as sovereign U.S. land.",
  },
  {
    id: "TTPI_FSM",
    source: "PACIFIC_TRUST_SOURCE",
    sourceLabel: "Trust Territory of the Pacific Islands",
    sourceCategory: "trust",
    arrival: "1947-07-18",
    arrivalLabel: "18 Jul 1947",
    exit: "1986-11-03",
    exitLabel: "3 Nov 1986",
    systemOutLabel: "Micronesian free association",
    members: ["Federated States of Micronesia"],
    milestoneId: "PHILIPPINE_INDEPENDENCE",
    legalStatus: "U.N. strategic trust under U.S. administration, not U.S. territorial sovereignty",
    notes:
      "The Federated States of Micronesia becomes a sovereign state in free association, not a U.S. territory.",
  },
  {
    id: "TTPI_RMI",
    source: "PACIFIC_TRUST_SOURCE",
    sourceLabel: "Trust Territory of the Pacific Islands",
    sourceCategory: "trust",
    arrival: "1947-07-18",
    arrivalLabel: "18 Jul 1947",
    exit: "1986-10-21",
    exitLabel: "21 Oct 1986",
    systemOutLabel: "Marshallese free association",
    members: ["Republic of the Marshall Islands"],
    milestoneId: "PHILIPPINE_INDEPENDENCE",
    legalStatus: "U.N. strategic trust under U.S. administration, not U.S. territorial sovereignty",
    notes:
      "The Republic of the Marshall Islands becomes a sovereign state in free association, not a U.S. territory.",
  },
  {
    id: "TTPI_PALAU",
    source: "PACIFIC_TRUST_SOURCE",
    sourceLabel: "Trust Territory of the Pacific Islands",
    sourceCategory: "trust",
    arrival: "1947-07-18",
    arrivalLabel: "18 Jul 1947",
    exit: "1994-10-01",
    exitLabel: "1 Oct 1994",
    systemOutLabel: "Palauan independence",
    members: ["Republic of Palau"],
    milestoneId: "PHILIPPINE_INDEPENDENCE",
    legalStatus: "U.N. strategic trust under U.S. administration, not U.S. territorial sovereignty",
    notes:
      "Palau becomes a sovereign state in free association when the final trusteeship agreement ends.",
  },
]

const nodes = [
  {
    id: US_CORE_NODE_IDS.states,
    label: "United States",
    shortLabel: "United States",
    category: "states",
    nodeType: "institution",
    status: "states in the federal union",
    xExtent: [1776, DOMAIN_END],
    milestoneId: "FOUNDING",
    description:
      "One persistent state institution: thirteen founding routes enter in 1776, admissions accumulate, eleven routes leave during secession, and Reconstruction returns them.",
  },
  {
    id: US_CORE_NODE_IDS.territories,
    label: "United States Territories",
    shortLabel: "U.S. Territories",
    category: "territories",
    nodeType: "institution",
    status: "federal territorial relationships",
    xExtent: [1783, DOMAIN_END],
    milestoneId: "TERRITORIAL_SYSTEM",
    description:
      "A persistent reservoir of jurisdiction routes under federal territorial administration. Most continental routes leave through statehood; five inhabited territorial routes remain.",
  },
  {
    id: US_CORE_NODE_IDS.colonies,
    label: "United States Colonies",
    shortLabel: "U.S. Colonies",
    category: "colonies",
    nodeType: "institution",
    status: "analytical colonial and external-administration inventory",
    xExtent: [1898, decimalYear("1999-12-31")],
    milestoneId: "OVERSEAS_EMPIRE",
    description:
      "A deliberately broad analytical band for overseas possession, occupation, special control, and administered trust. Every route keeps its legal distinction and fades when U.S. administration ends.",
  },
  {
    id: "CONFEDERATE_STATES",
    label: "Confederate States (de facto)",
    shortLabel: "Confederate States",
    category: "confederacy",
    nodeType: "rupture",
    status: "de facto rebel government; no U.S. recognition of lawful secession",
    xExtent: [decimalYear("1860-12-20"), decimalYear("1870-07-15")],
    milestoneId: "CIVIL_WAR",
    description:
      "Eleven state routes enter in two secession waves and return as congressional representation is restored between 1866 and 1870.",
  },
  ...FOUNDING_BUNDLES.map((bundle) => ({
    ...bundle,
    nodeType: "source",
    status: "regional bundle of the thirteen British colonies",
    xExtent: [1763, 1776.3],
    milestoneId: "FOUNDING",
  })),
  ...TERRITORIAL_ACQUISITIONS.map((cohort) => {
    const year = decimalYear(cohort.date)
    return {
      id: cohort.id,
      label: cohort.label,
      shortLabel: cohort.shortLabel,
      category: cohort.category,
      nodeType: "source",
      status: "acquisition or status-change source",
      xExtent: [
        cohort.predatesDomain
          ? DOMAIN_START
          : Math.max(DOMAIN_START, year - (cohort.sourceLead ?? SOURCE_LEAD)),
        year - TRANSIT,
      ],
      milestoneId: cohort.milestoneId,
      description: cohort.description,
    }
  }),
  ...DIRECT_ADMISSIONS.map((admission) => {
    const row = admissionByCode.get(admission.code)
    const year = decimalYear(row.statehood_or_current_status_date)
    return {
      id: admission.id,
      label: admission.label,
      shortLabel: admission.shortLabel,
      category: admission.category,
      nodeType: "source",
      status: row.immediate_prior_status,
      xExtent: [Math.max(DOMAIN_START, year - DIRECT_SOURCE_LEAD), year - TRANSIT],
      milestoneId:
        year < 1800
          ? "TERRITORIAL_SYSTEM"
          : year < 1840
            ? "LOUISIANA"
            : year < 1860
              ? "CONTINENTAL_EXPANSION"
              : "CIVIL_WAR",
      description: admission.description,
    }
  }),
  ...[...new Map(COLONIAL_HOLDINGS.map((holding) => [holding.source, holding])).values()].map(
    (holding) => {
      const year = decimalYear(holding.arrival)
      return {
        id: holding.source,
        label: holding.sourceLabel,
        shortLabel: holding.sourceLabel,
        category: holding.sourceCategory,
        nodeType: "source",
        status: "external source of U.S. administration",
        xExtent: [
          holding.sourcePredatesDomain
            ? DOMAIN_START
            : Math.max(DOMAIN_START, year - COLONIAL_SOURCE_LEAD),
          year - TRANSIT,
        ],
        milestoneId: holding.milestoneId,
        description: `Source for ${COLONIAL_HOLDINGS.filter(
          (candidate) => candidate.source === holding.source,
        )
          .flatMap((candidate) => candidate.members)
          .join(", ")}.`,
      }
    },
  ),
]

const rawEdges = []

for (const bundle of FOUNDING_BUNDLES) {
  const members = namesFor(bundle.codes)
  rawEdges.push({
    id: `FOUNDING_${bundle.id}`,
    source: bundle.id,
    target: US_CORE_NODE_IDS.states,
    value: bundle.codes.length,
    startTime: decimalYear("1776-01-01"),
    endTime: decimalYear("1776-07-04"),
    dateLabel: "4 Jul 1776",
    eventType: "founding",
    milestoneId: "FOUNDING",
    memberCodes: bundle.codes,
    members,
    notes: `${list(members)} enter the revolutionary United States as the ${bundle.label.toLowerCase()} bundle. Recognition and constitutional ratification follow later.`,
  })
}

for (const cohort of TERRITORIAL_ACQUISITIONS) {
  const endTime = decimalYear(cohort.date)
  const members = namesFor(cohort.codes)
  rawEdges.push({
    id: `ACQUIRE_${cohort.id}`,
    source: cohort.id,
    target: US_CORE_NODE_IDS.territories,
    value: cohort.codes.length,
    startTime: endTime - TRANSIT,
    endTime,
    ...(cohort.predatesDomain && { systemInTime: PRE_DOMAIN_SYSTEM_IN }),
    dateLabel: cohort.dateLabel,
    eventType: "acquisition",
    milestoneId: cohort.milestoneId,
    memberCodes: cohort.codes,
    members,
    notes: cohort.description,
  })
}

for (const admission of DIRECT_ADMISSIONS) {
  const row = admissionByCode.get(admission.code)
  const endTime = decimalYear(row.statehood_or_current_status_date)
  rawEdges.push({
    id: `ADMIT_DIRECT_${admission.code}`,
    source: admission.id,
    target: US_CORE_NODE_IDS.states,
    value: 1,
    startTime: endTime - TRANSIT,
    endTime,
    dateLabel: row.statehood_or_current_status_date,
    eventType: "direct-admission",
    milestoneId:
      endTime < 1800
        ? "TERRITORIAL_SYSTEM"
        : endTime < 1840
          ? "LOUISIANA"
          : endTime < 1860
            ? "CONTINENTAL_EXPANSION"
            : "CIVIL_WAR",
    memberCodes: [admission.code],
    members: [row.jurisdiction],
    notes: `${row.jurisdiction} enters directly from ${row.immediate_prior_status}; it does not traverse the ordinary territorial inventory in this model.`,
  })
}

const DIRECT_CODES = new Set(["VT", "KY", "ME", "TX", "WV"])
const territoryStateAdmissions = riverDataset.admissions_status
  .filter((row) => row.current_status_key === "STATE")
  .filter((row) => row.primary_acquisition_stream !== "ORIGINAL_THIRTEEN")
  .filter((row) => !DIRECT_CODES.has(row.jurisdiction_code))
  .sort(
    (a, b) =>
      decimalYear(a.statehood_or_current_status_date) -
        decimalYear(b.statehood_or_current_status_date) || a.statehood_order - b.statehood_order,
  )

for (const row of territoryStateAdmissions) {
  const endTime = decimalYear(row.statehood_or_current_status_date)
  rawEdges.push({
    id: `STATEHOOD_${row.jurisdiction_code}`,
    source: US_CORE_NODE_IDS.territories,
    target: US_CORE_NODE_IDS.states,
    value: 1,
    startTime: endTime - TRANSIT,
    endTime,
    dateLabel: row.statehood_or_current_status_date,
    eventType: "statehood",
    milestoneId:
      endTime < 1840
        ? "LOUISIANA"
        : endTime < 1860
          ? "CONTINENTAL_EXPANSION"
          : endTime < 1871
            ? "RECONSTRUCTION"
            : endTime < 1900
              ? "OVERSEAS_EMPIRE"
              : endTime < 1940
                ? "OVERSEAS_EMPIRE"
                : "FIFTY_STATES",
    memberCodes: [row.jurisdiction_code],
    members: [row.jurisdiction],
    notes: `${row.jurisdiction} moves from ${row.immediate_prior_status} into the United States as the ${row.statehood_order}${row.statehood_order % 10 === 1 && row.statehood_order !== 11 ? "st" : row.statehood_order % 10 === 2 && row.statehood_order !== 12 ? "nd" : row.statehood_order % 10 === 3 && row.statehood_order !== 13 ? "rd" : "th"} state.`,
  })
}

const firstWaveCodes = ["SC", "MS", "FL", "AL", "GA", "LA", "TX"]
const upperSouthCodes = ["VA", "AR", "NC", "TN"]

rawEdges.push(
  {
    id: "SECESSION_FIRST_WAVE",
    source: US_CORE_NODE_IDS.states,
    target: "CONFEDERATE_STATES",
    value: firstWaveCodes.length,
    startTime: decimalYear("1860-12-20"),
    endTime: decimalYear("1861-02-15"),
    dateLabel: "20 Dec 1860–1 Feb 1861",
    eventType: "secession",
    milestoneId: "CIVIL_WAR",
    memberCodes: firstWaveCodes,
    members: namesFor(firstWaveCodes),
    notes:
      "Seven first-wave states adopt secession ordinances. The ribbon depicts de facto government and loss of ordinary representation, not U.S. recognition that lawful statehood ended.",
  },
  {
    id: "SECESSION_UPPER_SOUTH",
    source: US_CORE_NODE_IDS.states,
    target: "CONFEDERATE_STATES",
    value: upperSouthCodes.length,
    startTime: decimalYear("1861-04-17"),
    endTime: decimalYear("1861-06-08"),
    dateLabel: "17 Apr–8 Jun 1861",
    eventType: "secession",
    milestoneId: "CIVIL_WAR",
    memberCodes: upperSouthCodes,
    members: namesFor(upperSouthCodes),
    notes:
      "Virginia, Arkansas, North Carolina, and Tennessee follow after Fort Sumter and Lincoln's call for troops; Unionist governments and military control remain contested.",
  },
)

const restorationGroups = [
  {
    id: "TENNESSEE",
    codes: ["TN"],
    start: "1866-07-01",
    end: "1866-07-24",
    dateLabel: "24 Jul 1866",
  },
  {
    id: "SIX_STATES_1868",
    codes: ["AR", "FL", "NC", "LA", "SC", "AL"],
    start: "1868-06-01",
    end: "1868-07-13",
    dateLabel: "22 Jun–13 Jul 1868",
  },
  {
    id: "FOUR_STATES_1870",
    codes: ["VA", "MS", "TX", "GA"],
    start: "1870-01-01",
    end: "1870-07-15",
    dateLabel: "26 Jan–15 Jul 1870",
  },
]

for (const group of restorationGroups) {
  const rows = group.codes.map((code) => admissionByCode.get(code))
  rawEdges.push({
    id: `RESTORATION_${group.id}`,
    source: "CONFEDERATE_STATES",
    target: US_CORE_NODE_IDS.states,
    value: group.codes.length,
    startTime: decimalYear(group.start),
    endTime: decimalYear(group.end),
    dateLabel: group.dateLabel,
    eventType: "restoration",
    milestoneId: "RECONSTRUCTION",
    memberCodes: group.codes,
    members: rows.map((row) => row.jurisdiction),
    notes: `${list(rows.map((row) => row.jurisdiction))} regain congressional representation. Restoration is shown as a political return, not readmission of legally extinguished states.`,
  })
}

for (const holding of COLONIAL_HOLDINGS) {
  const endTime = decimalYear(holding.arrival)
  rawEdges.push({
    id: `COLONIAL_${holding.id}`,
    source: holding.source,
    target: US_CORE_NODE_IDS.colonies,
    value: holding.members.length,
    startTime: endTime - TRANSIT,
    endTime,
    ...(holding.sourcePredatesDomain && { systemInTime: PRE_DOMAIN_SYSTEM_IN }),
    systemOutTime: decimalYear(holding.exit),
    dateLabel: holding.arrivalLabel,
    systemOutLabel: holding.systemOutLabel,
    systemOutDateLabel: holding.exitLabel,
    eventType: "colonial-administration",
    milestoneId: holding.milestoneId,
    holdingId: holding.id,
    memberCodes: [],
    members: holding.members,
    legalStatus: holding.legalStatus,
    notes: holding.notes,
  })
}

const nodeById = new Map(nodes.map((node) => [node.id, node]))

export const US_PROCESS_NODES = Object.freeze(nodes.map((node) => Object.freeze(node)))
export const US_PROCESS_EDGES = Object.freeze(
  rawEdges.map((edge) =>
    Object.freeze({
      ...edge,
      sourceLabel: nodeById.get(edge.source)?.label ?? edge.source,
      targetLabel: nodeById.get(edge.target)?.label ?? edge.target,
    }),
  ),
)

export const US_EVENTS = Object.freeze(
  riverDataset.events.map((event) =>
    Object.freeze({
      ...event,
      id: event.event_id,
    }),
  ),
)

const CURATED_SOURCE_IDS = new Set([
  "CENSUS_STATEHOOD",
  "CENSUS_ACQUISITIONS",
  "NARA_FOUNDING",
  "SENATE_CIVIL_WAR",
  "SENATE_RECONSTRUCTION",
  "PHILIPPINES_HISTORY",
  "CUBA_OCCUPATIONS",
  "PANAMA_CANAL",
  "DOI_INSULAR_TYPES",
  "DOI_TTPI",
])

export const US_SOURCES = Object.freeze(
  riverDataset.sources
    .filter((source) => source.url && CURATED_SOURCE_IDS.has(source.source_key))
    .map((source) =>
      Object.freeze({
        id: source.source_key,
        label: source.publisher,
        title: source.title,
        href: source.url,
        use: source.used_for,
        quality: source.quality_note,
      }),
    ),
)

export function usMilestoneById(id) {
  return US_MILESTONES.find((milestone) => milestone.id === id) ?? US_MILESTONES[0]
}

export function usEventsForMilestone(id) {
  const milestone = usMilestoneById(id)
  return US_EVENTS.filter((event) => milestone.eventIds.includes(event.id))
}

export const usStageById = usMilestoneById
export const usEventsForStage = usEventsForMilestone

const ALWAYS_LABEL = new Set([
  ...Object.values(US_CORE_NODE_IDS),
  "CONFEDERATE_STATES",
  "NEW_ENGLAND_COLONIES",
  "MIDDLE_COLONIES",
  "SOUTHERN_COLONIES",
  "LOUISIANA_PURCHASE_SOURCE",
  "MEXICAN_CESSION_SOURCE",
  "SPANISH_OVERSEAS_EMPIRE",
  "PACIFIC_TRUST_SOURCE",
])

export function usNodeLabel(node) {
  if (!node) return ""
  return ALWAYS_LABEL.has(node.id) ? (node.shortLabel ?? node.label) : ""
}

export function formatUsYear(value) {
  const numeric = value instanceof Date ? value.getUTCFullYear() : Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  if (Math.abs(numeric - DOMAIN_END) < 0.6) return "present"
  return String(Math.round(numeric))
}

export const formatUsStage = formatUsYear
