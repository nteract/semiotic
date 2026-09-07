export const DICTIONARY = {
  stationId: "CDEC station identity; SHA, ORO, FOL, NML, DNP or CLE in the factual edition.",
  observationDate:
    "Calendar reporting day from DATE TIME, daily sensor 15, in the service's fixed Pacific Standard Time convention.",
  sourceDateTime:
    "Original DATE TIME calendar label, reformatted with a space before HHmm. It assigns the daily row; it is not a publication time.",
  sourceObservationDateTime:
    "Separate OBS DATE from CDEC. Retained as a fixed-PST wall-clock timestamp, not a retrieval, publication or revision timestamp.",
  storageAcreFeet:
    "Reported volume in acre-feet (AF). Missing --- is null, never zero. No interpolation.",
  qualityFlag:
    "Blank: reported; r: revised; e: estimated. Revised is eligible; estimated and unknown flags are retained but excluded from calculations.",
  capacityId:
    "Documented capacity whose applicability interval includes the reporting date, or null. A separately labeled July 30, 2025 reference may still be compared.",
  snapshotId:
    "Immutable edition identity. Raw source checksums and actual retrieval times are in the manifest.",
  sourceRecordLine:
    "One-based CSV record line including the header. Stable row identity is stationId:observationDate, not this line number.",
  packedSeries:
    "Each station's array covers every date from startDate through endDate. Each row is [storageAF|null, OBS DATE offset in minutes from DATE TIME|null, optional quality flag]. Null offset means the source row was absent; explicit --- rows retain their source timestamp.",
  seasonalMean:
    "Arithmetic mean of eligible same-month/day observations in water years 1991–2020 using a compatible documented measurement regime. Coverage N is always shown.",
  percentile:
    "100 × (number lower + half the ties) / N. Requires at least 20 eligible baseline years. February 29 has only eight possible baseline years.",
  collection:
    "Sum storage / sum capacity for exactly the same eligible members. Partial membership names exclusions. Not a statewide total.",
}
