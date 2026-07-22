export const SNAPSHOT = Object.freeze({
  oryxThrough: "2025-12-31",
  kielThrough: "2026-04-30",
  worldBankUpdated: "2026-07-13",
  unThrough: "2025-02-24",
})

export const AID_METRICS = Object.freeze([
  {
    id: "total",
    label: "All dated allocations",
    shortLabel: "Total",
    color: "#ffd166",
  },
  {
    id: "military",
    label: "Military allocations",
    shortLabel: "Military",
    color: "#ef8354",
  },
  {
    id: "civilian",
    label: "Civilian allocations",
    shortLabel: "Civilian",
    color: "#8ac926",
    sourceCategory: "Kiel humanitarian",
  },
  {
    id: "unspecified",
    label: "Unspecified-use allocations",
    shortLabel: "Unspecified",
    color: "#61a5c2",
    sourceCategory: "Kiel financial",
  },
])

export const AID_YEARS = Object.freeze(["all", 2022, 2023, 2024, 2025, 2026])

// Capital coordinates are presentation metadata, not part of the Kiel workbook.
export const AID_DONORS = Object.freeze([
  {
    id: "united-states",
    donor: "United States",
    capital: "Washington",
    lon: -77.0369,
    lat: 38.9072,
  },
  {
    id: "eu-institutions",
    donor: "EU institutions",
    kielDonor: "EU (Commission and Council)",
    capital: "Brussels",
    lon: 4.18,
    lat: 50.72,
  },
  {
    id: "germany",
    donor: "Germany",
    capital: "Berlin",
    lon: 13.405,
    lat: 52.52,
  },
  {
    id: "united-kingdom",
    donor: "United Kingdom",
    capital: "London",
    lon: -0.128,
    lat: 51.507,
  },
  {
    id: "canada",
    donor: "Canada",
    capital: "Ottawa",
    lon: -75.697,
    lat: 45.422,
  },
  {
    id: "japan",
    donor: "Japan",
    capital: "Tokyo",
    lon: 139.692,
    lat: 35.69,
  },
  {
    id: "denmark",
    donor: "Denmark",
    capital: "Copenhagen",
    lon: 12.568,
    lat: 55.676,
  },
  {
    id: "netherlands",
    donor: "Netherlands",
    capital: "Amsterdam",
    lon: 4.904,
    lat: 52.368,
  },
  {
    id: "norway",
    donor: "Norway",
    capital: "Oslo",
    lon: 10.752,
    lat: 59.914,
  },
  {
    id: "sweden",
    donor: "Sweden",
    capital: "Stockholm",
    lon: 18.069,
    lat: 59.329,
  },
  {
    id: "france",
    donor: "France",
    capital: "Paris",
    lon: 2.352,
    lat: 48.857,
  },
  {
    id: "poland",
    donor: "Poland",
    capital: "Warsaw",
    lon: 21.012,
    lat: 52.23,
  },
  {
    id: "finland",
    donor: "Finland",
    capital: "Helsinki",
    lon: 24.938,
    lat: 60.17,
  },
  {
    id: "belgium",
    donor: "Belgium",
    capital: "Brussels",
    lon: 4.5,
    lat: 50.92,
  },
  {
    id: "spain",
    donor: "Spain",
    capital: "Madrid",
    lon: -3.704,
    lat: 40.417,
  },
  {
    id: "italy",
    donor: "Italy",
    capital: "Rome",
    lon: 12.496,
    lat: 41.903,
  },
  {
    id: "lithuania",
    donor: "Lithuania",
    capital: "Vilnius",
    lon: 25.28,
    lat: 54.687,
  },
])

// Release 29 of the Kiel Ukraine Support Tracker. Each compact tuple is
// [year, military, humanitarian, financial] in current EUR billions. The page
// relabels humanitarian as "civilian" and financial as "unspecified use" so
// the three mutually exclusive source categories match the dashboard controls.
// Only allocations with a tracked month from January 2022 through April 2026
// are included, making the all-years view exactly additive across year buttons.
const AID_YEARLY_VALUES = Object.freeze({
  "united-states": [
    [2022, 20.882106, 1.86728, 12.689473],
    [2023, 23.110891, 0.67417, 9.233871],
    [2024, 20.140971, 0.925132, 25.373838],
    [2025, 0.482918, 0, 0],
  ],
  "eu-institutions": [
    [2022, 0, 1.6, 7.32],
    [2023, 0, 0.650412, 18],
    [2024, 0, 0.418239, 17.89425],
    [2025, 0, 0.29, 34.83172],
    [2026, 0, 0.252839, 0],
  ],
  germany: [
    [2022, 2.732843, 1.434978, 1.607],
    [2023, 4.223197, 1.411096, 0],
    [2024, 3.958558, 0.441318, 0],
    [2025, 9.013514, 0.29846, 0.0405],
    [2026, 4.2, 0.353, 0],
  ],
  "united-kingdom": [
    [2022, 3.592984, 0.268169, 2.096646],
    [2023, 2.577482, 0.286544, 0.703496],
    [2024, 2.666167, 0.389519, 0.917086],
    [2025, 5.440068, 0.313213, 0.035978],
    [2026, 1.909029, 0.101726, 0],
  ],
  canada: [
    [2022, 1.402665, 0.333685, 1.902546],
    [2023, 0.883949, 0.007588, 1.622541],
    [2024, 0.385157, 0.141653, 1.635371],
    [2025, 2.02343, 0.072959, 3.263708],
    [2026, 0.378789, 0.044635, 0],
  ],
  japan: [
    [2022, 0, 0.579371, 0.559211],
    [2023, 0.028022, 0.690792, 4.117512],
    [2024, 0.035097, 0.174309, 3.647837],
    [2025, 0, 0.228932, 0.474205],
    [2026, 0, 0.033796, 1.579044],
  ],
  denmark: [
    [2022, 0.570594, 0.123907, 0.050291],
    [2023, 3.963046, 0.090504, 0.064836],
    [2024, 2.80656, 0.161775, 0],
    [2025, 2.536866, 0.53341, 0],
    [2026, 0.072689, 0.050914, 0],
  ],
  netherlands: [
    [2022, 1.096278, 0.208429, 0.368375],
    [2023, 2.460816, 0.357875, 0.3475],
    [2024, 2.515162, 0.1945, 0],
    [2025, 2.534351, 0.303025, 0],
    [2026, 0.248, 0.061, 0],
  ],
  norway: [
    [2022, 0.456052, 0.230875, 0.32331],
    [2023, 0.311287, 0.247608, 0.475835],
    [2024, 1.220248, 0.563045, 0.410533],
    [2025, 3.628731, 0.392688, 0.6558],
    [2026, 1.18068, 0.415743, 0.177477],
  ],
  sweden: [
    [2022, 0.548316, 0.110441, 0.160469],
    [2023, 1.471083, 0.092666, 0.107116],
    [2024, 2.207847, 0.20153, 0],
    [2025, 3.711356, 0.341821, 0.029118],
    [2026, 1.210658, 0.165921, 0.236],
  ],
  france: [
    [2022, 0.966861, 0.333597, 0.6994],
    [2023, 1.795061, 0.046, 0.1],
    [2024, 0.685535, 0.2217, 0],
    [2025, 2.195, 0.2, 0],
    [2026, 0.265004, 0.074332, 0],
  ],
  poland: [
    [2022, 1.834312, 0.463075, 0.887999],
    [2023, 1.489247, 0.027481, 0.025],
    [2024, 0.526258, 0.003161, 0],
    [2025, 0.310837, 0.003878, 0],
    [2026, 0.291155, 0.001662, 0],
  ],
  finland: [
    [2022, 0.2067, 0.079244, 0.0733],
    [2023, 1.408, 0.03737, 0.0815],
    [2024, 0.7201, 0.099254, 0],
    [2025, 0.693, 0.03347, 0.0046],
    [2026, 0.141, 0.022, 0],
  ],
  belgium: [
    [2022, 0.147012, 0.00443, 0.00806],
    [2023, 0.180673, 0.04541, 0.0205],
    [2024, 1.2503, 0.08379, 0.02],
    [2025, 1.143, 0.27849, 0],
    [2026, 0.015256, 0.00008, 0],
  ],
  spain: [
    [2022, 0.522147, 0.072436, 0.2497],
    [2023, 0.192776, 0.01011, 0.17],
    [2024, 0.074799, 0.01686, 0.051],
    [2025, 0.615, 0.213745, 0],
    [2026, 0.08942, 0.001, 0],
  ],
  italy: [
    [2022, 0.32467, 0.051322, 0.31],
    [2023, 0.737787, 0.17066, 0.1],
    [2024, 0.31766, 0.2535, 0],
    [2025, 0.32319, 0.2065, 0],
    [2026, 0, 0.145, 0],
  ],
  lithuania: [
    [2022, 0.373531, 0.061, 0.02],
    [2023, 0.306852, 0.006977, 0.0215],
    [2024, 0.236564, 0.08662, 0.01],
    [2025, 0.224, 0.034, 0],
    [2026, 0.023, 0.18847, 0],
  ],
})

export const AID_DONOR_YEARLY = Object.freeze(
  Object.entries(AID_YEARLY_VALUES).flatMap(([donorId, values]) =>
    values.map(([year, military, civilian, unspecified]) =>
      Object.freeze({
        donorId,
        year,
        military,
        civilian,
        unspecified,
        total: military + civilian + unspecified,
      }),
    ),
  ),
)

export const KYIV = Object.freeze({
  id: "kyiv",
  donor: "Ukraine",
  capital: "Kyiv",
  lon: 30.524,
  lat: 50.45,
  kind: "recipient",
})

export const WAR_CHAPTERS = Object.freeze([
  {
    id: "opening",
    year: 2022,
    ordinal: "01",
    range: "24 February – April 2022",
    title: "The opening shock",
    dek: "The northern drive failed to take Kyiv; the war contracted east and south after Russia withdrew from northern Ukraine.",
  },
  {
    id: "counterstrokes",
    year: 2022,
    ordinal: "02",
    range: "May – December 2022",
    title: "Siege, then counterstrokes",
    dek: "Mariupol fell after a destructive siege. Ukrainian offensives then retook large areas around Kharkiv and the city of Kherson.",
  },
  {
    id: "attrition",
    year: 2023,
    ordinal: "03",
    range: "January – December 2023",
    title: "The attritional year",
    dek: "Bakhmut became the emblem of an artillery-heavy war. Ukraine’s summer offensive gained ground but did not produce a strategic breakthrough.",
  },
  {
    id: "industrial",
    year: 2024,
    ordinal: "04",
    range: "January – December 2024",
    title: "A war of production and adaptation",
    dek: "Russia captured Avdiivka and reopened a Kharkiv axis; Ukraine expanded deep strikes and carried the war across the border into Kursk.",
  },
  {
    id: "repricing",
    year: 2025,
    ordinal: "05",
    range: "January – December 2025",
    title: "The coalition is repriced",
    dek: "The front remained costly while the diplomatic coalition changed shape: the February UN vote exposed a sharp break in Washington’s position.",
  },
])

export const CAMPAIGN_PLACES = Object.freeze([
  {
    id: "kyiv-opening",
    chapter: "opening",
    date: "2022-02-24",
    name: "Kyiv / Hostomel",
    lon: 30.31,
    lat: 50.52,
    side: "Ukraine",
    note: "The airborne and armoured opening did not seize the capital.",
  },
  {
    id: "bucha",
    chapter: "opening",
    date: "2022-04-02",
    name: "Bucha",
    lon: 30.21,
    lat: 50.54,
    side: "Ukraine",
    note: "Russian forces withdrew from northern Ukraine; evidence of atrocities emerged after liberation.",
  },
  {
    id: "mariupol",
    chapter: "counterstrokes",
    date: "2022-05-20",
    name: "Mariupol",
    lon: 37.55,
    lat: 47.1,
    side: "Russia",
    note: "The siege ended with the surrender of the Azovstal defenders.",
  },
  {
    id: "izium",
    chapter: "counterstrokes",
    date: "2022-09-10",
    name: "Izium",
    lon: 37.25,
    lat: 49.21,
    side: "Ukraine",
    note: "Ukraine’s Kharkiv counteroffensive collapsed a large Russian salient.",
  },
  {
    id: "kherson",
    chapter: "counterstrokes",
    date: "2022-11-11",
    name: "Kherson",
    lon: 32.62,
    lat: 46.64,
    side: "Ukraine",
    note: "Ukraine retook the only regional capital Russia had captured after February 2022.",
  },
  {
    id: "bakhmut",
    chapter: "attrition",
    date: "2023-05-20",
    name: "Bakhmut",
    lon: 38.0,
    lat: 48.6,
    side: "Russia",
    note: "Russia took the ruined city after months of high-cost attrition.",
  },
  {
    id: "robotyne",
    chapter: "attrition",
    date: "2023-08-28",
    name: "Robotyne axis",
    lon: 35.84,
    lat: 47.45,
    side: "Ukraine",
    note: "The summer offensive breached forward positions but not the full defensive system.",
  },
  {
    id: "avdiivka",
    chapter: "industrial",
    date: "2024-02-17",
    name: "Avdiivka",
    lon: 37.71,
    lat: 48.14,
    side: "Russia",
    note: "Ukraine withdrew as Russia captured the fortified city.",
  },
  {
    id: "vovchansk",
    chapter: "industrial",
    date: "2024-05-10",
    name: "Vovchansk",
    lon: 36.94,
    lat: 50.29,
    side: "Russia",
    note: "Russia opened a new cross-border axis north of Kharkiv.",
  },
  {
    id: "sudzha",
    chapter: "industrial",
    date: "2024-08-06",
    name: "Kursk / Sudzha",
    lon: 35.27,
    lat: 51.19,
    side: "Ukraine",
    note: "Ukraine launched a surprise cross-border operation into Russia’s Kursk region.",
  },
  {
    id: "pokrovsk",
    chapter: "repricing",
    date: "2025-02-01",
    name: "Pokrovsk axis",
    lon: 37.18,
    lat: 48.28,
    side: "contested",
    note: "Pressure concentrated on the eastern logistics belt while negotiations and aid politics shifted.",
  },
])

const MONTHLY_LOSS_ARRAYS = Object.freeze({
  Russia: Object.freeze({
    Tanks: [
      40, 311, 249, 155, 88, 125, 82, 244, 230, 107, 90, 76, 124, 131, 39, 93, 84, 107, 89, 61, 108,
      103, 111, 90, 94, 109, 85, 141, 103, 107, 60, 79, 94, 85, 74, 54, 75, 54, 115, 85, 30, 23, 31,
      40, 59, 39, 53,
    ],
    "Infantry carriers": [
      74, 420, 355, 189, 109, 119, 103, 368, 366, 203, 114, 148, 160, 149, 75, 96, 105, 155, 135,
      119, 187, 122, 206, 151, 181, 207, 198, 212, 182, 162, 135, 185, 276, 273, 210, 202, 145, 152,
      252, 140, 56, 46, 26, 60, 129, 57, 74,
    ],
    Artillery: [
      8, 136, 76, 27, 37, 33, 22, 104, 101, 68, 30, 46, 48, 48, 32, 55, 65, 93, 67, 69, 91, 42, 54,
      44, 33, 46, 33, 41, 43, 45, 53, 33, 32, 20, 16, 41, 39, 30, 33, 37, 24, 21, 34, 32, 35, 14,
      13,
    ],
  }),
  Ukraine: Object.freeze({
    Tanks: [
      14, 72, 58, 43, 12, 33, 16, 31, 70, 40, 68, 15, 23, 22, 13, 18, 49, 38, 36, 28, 32, 16, 31,
      18, 13, 34, 23, 36, 25, 20, 30, 38, 20, 17, 35, 45, 28, 33, 41, 36, 14, 25, 24, 33, 27, 22,
      32,
    ],
    "Infantry carriers": [
      16, 121, 103, 56, 27, 52, 70, 66, 220, 63, 125, 71, 45, 54, 26, 73, 84, 117, 97, 65, 51, 33,
      52, 39, 66, 45, 52, 66, 70, 45, 99, 101, 112, 106, 138, 147, 116, 216, 183, 147, 105, 124, 62,
      110, 143, 191, 167,
    ],
    Artillery: [
      5, 47, 15, 18, 10, 17, 16, 7, 31, 29, 23, 31, 24, 31, 20, 28, 16, 34, 38, 14, 24, 19, 24, 19,
      22, 28, 26, 36, 17, 27, 19, 18, 22, 13, 10, 19, 20, 35, 34, 31, 28, 25, 15, 38, 32, 40, 43,
    ],
  }),
})

export const ORYX_CATEGORY_COLORS = Object.freeze({
  Tanks: "#ef8354",
  "Infantry carriers": "#ffd166",
  Artillery: "#61a5c2",
})

export const ORYX_HEADLINE = Object.freeze({
  Russia: Object.freeze({
    total: 23812,
    tanks: 4301,
    destroyed: 18496,
    captured: 3158,
    damaged: 935,
    abandoned: 1223,
  }),
  Ukraine: Object.freeze({
    total: 10937,
    tanks: 1370,
    destroyed: 8318,
    captured: 1394,
    damaged: 612,
    abandoned: 613,
  }),
})

function addUtcMonths(date, count) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1))
}

export const ORYX_MONTHLY = Object.freeze(
  Object.entries(MONTHLY_LOSS_ARRAYS).flatMap(([country, categories]) =>
    Object.entries(categories).flatMap(([category, values]) =>
      values.map((losses, index) => ({
        id: `${country}-${category}-${index}`,
        country,
        category,
        monthIndex: index,
        date: addUtcMonths(new Date(Date.UTC(2022, 1, 1)), index),
        losses,
      })),
    ),
  ),
)

export const GDP_GROWTH = Object.freeze([
  { year: 2021, country: "Ukraine", value: 3.44562065945944 },
  { year: 2022, country: "Ukraine", value: -28.7585842155085 },
  { year: 2023, country: "Ukraine", value: 5.53473354963334 },
  { year: 2024, country: "Ukraine", value: 3.24811808426423 },
  { year: 2025, country: "Ukraine", value: 1.82152376756284 },
  { year: 2021, country: "Russia", value: 5.866491772979 },
  { year: 2022, country: "Russia", value: -1.43537063467896 },
  { year: 2023, country: "Russia", value: 4.06661395813023 },
  { year: 2024, country: "Russia", value: 4.92167966203073 },
  { year: 2025, country: "Russia", value: 1.00117656925738 },
])

export const UKRAINE_INFLATION = Object.freeze([
  { year: 2021, value: 9.36313917695223 },
  { year: 2022, value: 20.1836366617478 },
  { year: 2023, value: 12.8490222828559 },
  { year: 2024, value: 6.50198464669254 },
  { year: 2025, value: 12.7303341026903 },
])

export const UN_VOTES = Object.freeze([
  {
    id: "ES-11/1",
    shortLabel: "Mar 2022",
    date: "2022-03-02",
    title: "Aggression against Ukraine",
    yes: 141,
    no: 5,
    abstain: 35,
    absent: 12,
    usPosition: "Yes",
  },
  {
    id: "ES-11/6",
    shortLabel: "Feb 2023",
    date: "2023-02-23",
    title: "Principles for a just and lasting peace",
    yes: 141,
    no: 7,
    abstain: 32,
    absent: 13,
    usPosition: "Yes",
  },
  {
    id: "ES-11/7",
    shortLabel: "Feb 2025",
    date: "2025-02-24",
    title: "Advancing a comprehensive, just and lasting peace",
    yes: 93,
    no: 18,
    abstain: 65,
    absent: 17,
    usPosition: "No",
  },
])

export const UN_VOTE_ROWS = Object.freeze(
  UN_VOTES.flatMap((vote) => [
    { resolution: vote.shortLabel, vote: "Yes", count: vote.yes, id: vote.id },
    { resolution: vote.shortLabel, vote: "Abstain", count: vote.abstain, id: vote.id },
    { resolution: vote.shortLabel, vote: "No", count: vote.no, id: vote.id },
    { resolution: vote.shortLabel, vote: "Not voting", count: vote.absent, id: vote.id },
  ]),
)

export function aidRowsForYear(year = "all") {
  const rows =
    year === "all" ? AID_DONOR_YEARLY : AID_DONOR_YEARLY.filter((row) => row.year === Number(year))
  const byDonor = new Map()

  for (const row of rows) {
    const aggregate = byDonor.get(row.donorId) ?? {
      donorId: row.donorId,
      year: year === "all" ? "all" : Number(year),
      military: 0,
      civilian: 0,
      unspecified: 0,
      total: 0,
    }
    aggregate.military += row.military
    aggregate.civilian += row.civilian
    aggregate.unspecified += row.unspecified
    aggregate.total += row.total
    byDonor.set(row.donorId, aggregate)
  }

  return [...byDonor.values()].map((row) => ({
    ...AID_DONORS.find((donor) => donor.id === row.donorId),
    ...row,
  }))
}

export function buildAidFlows(metric = "total", year = "all") {
  return aidRowsForYear(year)
    .filter((donor) => donor[metric] > 0)
    .map((donor) => ({
      ...donor,
      id: `${donor.id}-${year}-${metric}`,
      source: donor.id,
      target: KYIV.id,
      aidType: metric,
      value: donor[metric],
    }))
}

export function aidMetricDefinition(metric) {
  return AID_METRICS.find((entry) => entry.id === metric) ?? AID_METRICS[0]
}

export function oryxRowsForCountry(country) {
  return ORYX_MONTHLY.filter((row) => row.country === country)
}

export function oryxRowsForYear(country, year) {
  return ORYX_MONTHLY.filter((row) => row.country === country && row.date.getUTCFullYear() === year)
}

export function sumOryxRows(rows) {
  return rows.reduce((sum, row) => sum + row.losses, 0)
}

export function formatEuroBillions(value) {
  if (!Number.isFinite(value)) return "—"
  if (value < 0.1) return `€${Math.round(value * 1000)}m`
  return `€${value.toFixed(value >= 10 ? 1 : 2)}bn`
}

export function formatMonth(date) {
  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  })
}

export function oryxMonthForIndex(monthIndex) {
  return addUtcMonths(new Date(Date.UTC(2022, 1, 1)), Math.floor(Number(monthIndex) || 0))
}
