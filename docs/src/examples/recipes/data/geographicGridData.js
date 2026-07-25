// A compact, authored U.S. tile-grid table. Rows/columns preserve the broad
// west→east and north→south reading while giving every state one equal slot.
// Population is the 2020 Census resident population (fixed historical data).
// Source: https://www.census.gov/data/tables/2020/dec/2020-apportionment-data.html

const STATE_ROWS = `
AK|Alaska|0|0|West|733391
ME|Maine|0|11|Northeast|1362359
WI|Wisconsin|1|5|Midwest|5893718
VT|Vermont|1|9|Northeast|643077
NH|New Hampshire|1|10|Northeast|1377529
WA|Washington|2|0|West|7705281
ID|Idaho|2|1|West|1839106
MT|Montana|2|2|West|1084225
ND|North Dakota|2|3|Midwest|779094
MN|Minnesota|2|4|Midwest|5706494
IL|Illinois|2|5|Midwest|12812508
MI|Michigan|2|6|Midwest|10077331
NY|New York|2|8|Northeast|20201249
MA|Massachusetts|2|9|Northeast|7029917
OR|Oregon|3|0|West|4237256
NV|Nevada|3|1|West|3104614
WY|Wyoming|3|2|West|576851
SD|South Dakota|3|3|Midwest|886667
IA|Iowa|3|4|Midwest|3190369
IN|Indiana|3|5|Midwest|6785528
OH|Ohio|3|6|Midwest|11799448
PA|Pennsylvania|3|7|Northeast|13002700
NJ|New Jersey|3|8|Northeast|9288994
CT|Connecticut|3|9|Northeast|3605944
RI|Rhode Island|3|10|Northeast|1097379
CA|California|4|0|West|39538223
UT|Utah|4|1|West|3271616
CO|Colorado|4|2|West|5773714
NE|Nebraska|4|3|Midwest|1961504
MO|Missouri|4|4|Midwest|6154913
KY|Kentucky|4|5|South|4505836
WV|West Virginia|4|6|South|1793716
VA|Virginia|4|7|South|8631393
MD|Maryland|4|8|South|6177224
DE|Delaware|4|9|South|989948
AZ|Arizona|5|0|West|7151502
NM|New Mexico|5|1|West|2117522
KS|Kansas|5|2|Midwest|2937880
AR|Arkansas|5|3|South|3011524
TN|Tennessee|5|4|South|6910840
NC|North Carolina|5|7|South|10439388
SC|South Carolina|5|8|South|5118425
OK|Oklahoma|6|2|South|3959353
LA|Louisiana|6|3|South|4657757
MS|Mississippi|6|4|South|2961279
AL|Alabama|6|5|South|5024279
GA|Georgia|6|6|South|10711908
HI|Hawaii|7|0|West|1455271
TX|Texas|7|2|South|29145505
FL|Florida|7|8|South|21538187
`.trim()

export const US_STATE_GRID = STATE_ROWS.split("\n").map((row) => {
  const [abbr, name, gridRow, gridColumn, region, population] = row.split("|")
  return {
    id: abbr,
    abbr,
    name,
    gridRow: Number(gridRow),
    gridColumn: Number(gridColumn),
    region,
    population: Number(population),
  }
})

export const US_REGION_COLORS = Object.freeze({
  West: "#2f78a8",
  Midwest: "#6b9b7c",
  South: "#d36b48",
  Northeast: "#8a67a5",
})

export const WORLD_LATITUDE_COLORS = Object.freeze({
  "Far north": "#5d83a8",
  "Northern midlatitudes": "#5e9b8b",
  Tropics: "#d5a64a",
  "Southern midlatitudes": "#c66d55",
  "Far south": "#876f9c",
})

export function worldLatitudeBand(datum) {
  const latitude = Number(datum?.gridLatitude)
  if (!Number.isFinite(latitude)) return "Tropics"
  if (latitude >= 55) return "Far north"
  if (latitude >= 23.5) return "Northern midlatitudes"
  if (latitude > -23.5) return "Tropics"
  if (latitude > -55) return "Southern midlatitudes"
  return "Far south"
}

export function worldLatitudeColor(datum) {
  return WORLD_LATITUDE_COLORS[worldLatitudeBand(datum)]
}

export const CENSUS_SOURCE =
  "https://www.census.gov/data/tables/2020/dec/2020-apportionment-data.html"

export function formatPopulation(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}
