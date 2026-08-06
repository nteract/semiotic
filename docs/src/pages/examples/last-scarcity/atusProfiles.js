/**
 * Checked-in derivation of four ATUS comparison compositions.
 *
 * Values are transcribed from the mutually exclusive parent rows in the BLS
 * 2025 release tables. Published values can total 23.99 or 24.01 because each
 * category is rounded to hundredths of an hour. For geometry only, that
 * residual is applied to "Other activities, not elsewhere classified"; both
 * the published value and adjustment remain exposed here and in the UI.
 *
 * These are duration compositions, not chronological diary sequences. Their
 * radial position must never be described as time of day.
 */

export const ATUS_PROFILE_CATEGORIES = Object.freeze([
  { id: "personal-care", label: "Personal care (including sleep)", color: "#b7c0b6" },
  { id: "eating-drinking", label: "Eating & drinking", color: "#d5bd8d" },
  { id: "household-activities", label: "Household activities", color: "#9fb091" },
  { id: "purchasing-goods-services", label: "Purchasing goods & services", color: "#c9b99c" },
  { id: "care-household-members", label: "Care for household members", color: "#c36d5a" },
  { id: "care-nonhousehold-members", label: "Care for nonhousehold members", color: "#d58d70" },
  {
    id: "work-work-related",
    label: "Work & work-related activities",
    color: "var(--ls-wheel-work, #213e34)",
  },
  { id: "education", label: "Educational activities", color: "#66856d" },
  { id: "organizational-civic-religious", label: "Organizational, civic & religious", color: "#496b8a" },
  { id: "leisure-sports", label: "Leisure & sports", color: "#d7b64e" },
  { id: "telephone-mail-email", label: "Telephone, mail & email", color: "#d59e5c" },
  { id: "other-nec", label: "Other, not elsewhere classified", color: "#b6aea4" },
])

const RAW_PROFILES = [
  {
    id: "weekday",
    label: "weekday · age 15+",
    population: "Civilian population age 15 and older, weekdays",
    sourceLabel: "ATUS 2025 Table 2",
    sourceHref: "https://www.bls.gov/news.release/atus.t02.htm",
    publishedValues: [9.53, 1.16, 1.88, 0.67, 0.53, 0.15, 4.26, 0.55, 0.21, 4.60, 0.20, 0.27],
  },
  {
    id: "weekend-holiday",
    label: "weekend / holiday · age 15+",
    population: "Civilian population age 15 and older, weekends and holidays",
    sourceLabel: "ATUS 2025 Table 2",
    sourceHref: "https://www.bls.gov/news.release/atus.t02.htm",
    publishedValues: [10.44, 1.33, 2.26, 0.74, 0.41, 0.16, 1.11, 0.18, 0.45, 6.48, 0.18, 0.27],
  },
  {
    id: "employed-household-child",
    label: "employed adult with child",
    population: "Employed adults age 18 and older with a household child under 18, all days",
    sourceLabel: "ATUS 2025 Table 8B",
    sourceHref: "https://www.bls.gov/news.release/atus.t08B.htm",
    publishedValues: [9.35, 1.19, 1.71, 0.58, 1.22, 0.06, 5.55, 0.21, 0.22, 3.53, 0.07, 0.31],
  },
  {
    id: "not-employed-household-child",
    label: "not-employed adult with child",
    population: "Not-employed adults age 18 and older with a household child under 18, all days",
    sourceLabel: "ATUS 2025 Table 8C",
    sourceHref: "https://www.bls.gov/news.release/atus.t08C.htm",
    publishedValues: [9.99, 1.27, 3.09, 0.93, 2.15, 0.09, 0.13, 0.51, 0.35, 4.97, 0.19, 0.32],
  },
]

export const ATUS_COMPARISON_PROFILES = Object.freeze(
  RAW_PROFILES.map((profile) => {
    const publishedSum = roundHundredth(profile.publishedValues.reduce((sum, value) => sum + value, 0))
    const closureAdjustment = roundHundredth(24 - publishedSum)
    const geometryValues = profile.publishedValues.map((value, index) => (
      index === profile.publishedValues.length - 1
        ? roundHundredth(value + closureAdjustment)
        : value
    ))
    return Object.freeze({
      ...profile,
      publishedSum,
      closureAdjustment,
      geometryValues: Object.freeze(geometryValues),
      segments: Object.freeze(ATUS_PROFILE_CATEGORIES.map((category, index) => Object.freeze({
        ...category,
        publishedHours: profile.publishedValues[index],
        hours: geometryValues[index],
      }))),
    })
  }),
)

function roundHundredth(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
