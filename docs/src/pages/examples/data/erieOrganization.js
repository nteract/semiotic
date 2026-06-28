export const ERIE_EMPLOYEE_CLASSES = [
  { id: "agents", label: "Station agents", color: "#9a3f2f" },
  { id: "train", label: "Train crews", color: "#304f63" },
  { id: "track", label: "Track hands", color: "#6c7442" },
  { id: "shops", label: "Shop hands", color: "#9a7138" },
]

export const ERIE_DIVISIONS = [
  {
    id: "eastern",
    label: "Eastern Division",
    short: "Eastern",
    stations: ["Piermont", "Sufferns", "Turners", "Goshen", "Middletown"],
  },
  {
    id: "delaware",
    label: "Delaware Division",
    short: "Delaware",
    stations: ["Port Jervis", "Lackawaxen", "Narrowsburgh", "Callicoon", "Deposit"],
  },
  {
    id: "susquehanna",
    label: "Susquehanna Division",
    short: "Susquehanna",
    stations: ["Susquehanna", "Great Bend", "Binghamton", "Owego", "Elmira"],
  },
  {
    id: "western",
    label: "Western Division",
    short: "Western",
    stations: ["Corning", "Addison", "Hornellsville", "Cuba", "Olean"],
  },
  {
    id: "lake",
    label: "Lake Erie Division",
    short: "Lake Erie",
    stations: ["Salamanca", "Little Valley", "Dayton", "Fredonia", "Dunkirk"],
  },
]

export const ERIE_SERVICE_OFFICES = [
  { id: "treasurer", label: "Treasurer", side: -1, order: 0 },
  { id: "secretary", label: "Secretary", side: -1, order: 1 },
  { id: "telegraph", label: "Telegraph Sup't", side: -1, order: 2 },
  { id: "master-mechanic", label: "Master Mechanic", side: 1, order: 0 },
  { id: "car-inspector", label: "Gen'l Car Inspector", side: 1, order: 1 },
  { id: "road-master", label: "Road Master", side: 1, order: 2 },
]

const crewTemplates = [
  { employeeClass: "agents", role: "Station & freight office" },
  { employeeClass: "train", role: "Conductors, engineers & trainmen" },
  { employeeClass: "track", role: "Section foremen & track hands" },
  { employeeClass: "shops", role: "Machinists, carpenters & shop hands" },
]

const nodes = [
  {
    id: "board-of-directors",
    kind: "authority",
    label: "Board of Directors",
    role: "Fountain of authority",
    level: 0,
  },
  {
    id: "president",
    kind: "authority",
    label: "President",
    role: "Executive officer",
    level: 1,
  },
  {
    id: "general-superintendent",
    kind: "authority",
    label: "General Superintendent",
    role: "Operating authority",
    level: 2,
  },
]

const edges = [
  { id: "board-president", source: "board-of-directors", target: "president" },
  { id: "president-superintendent", source: "president", target: "general-superintendent" },
]

for (const service of ERIE_SERVICE_OFFICES) {
  nodes.push({
    ...service,
    kind: "service",
    role: "General office",
    count: 1,
  })
  edges.push({
    id: `president-${service.id}`,
    source: "president",
    target: service.id,
  })
}

ERIE_DIVISIONS.forEach((division, divisionIndex) => {
  const divisionId = `${division.id}-division`
  nodes.push({
    id: divisionId,
    kind: "division",
    division: division.id,
    label: division.label,
    role: "Division superintendent",
    order: divisionIndex,
  })
  edges.push({
    id: `superintendent-${division.id}`,
    source: "general-superintendent",
    target: divisionId,
  })

  division.stations.forEach((station, stationIndex) => {
    const stationId = `${division.id}-station-${stationIndex}`
    nodes.push({
      id: stationId,
      kind: "station",
      division: division.id,
      divisionLabel: division.label,
      label: station,
      role: "Station",
      order: stationIndex,
    })
    edges.push({
      id: `${division.id}-${stationIndex === 0 ? "division" : `station-${stationIndex - 1}`}-${stationIndex}`,
      source: stationIndex === 0 ? divisionId : `${division.id}-station-${stationIndex - 1}`,
      target: stationId,
    })

    crewTemplates.forEach((crew, crewIndex) => {
      // Deterministic, representative counts. These are deliberately not
      // presented as a transcription of the plate's tiny statistical table.
      const count = 18 + ((divisionIndex * 29 + stationIndex * 17 + crewIndex * 13) % 54)
      const crewId = `${stationId}-${crew.employeeClass}`
      nodes.push({
        id: crewId,
        kind: "crew",
        division: division.id,
        divisionLabel: division.label,
        station,
        stationIndex,
        crewIndex,
        employeeClass: crew.employeeClass,
        label: crew.role,
        role: crew.role,
        count,
      })
      edges.push({
        id: `${stationId}-${crew.employeeClass}`,
        source: stationId,
        target: crewId,
      })
    })
  })
})

export const ERIE_NODES = nodes
export const ERIE_EDGES = edges

export const ERIE_REPRESENTATIVE_TOTAL = nodes
  .filter((node) => node.kind === "crew")
  .reduce((sum, node) => sum + node.count, 0)

export const ERIE_INTERACTIVE_ROLE_COUNT = nodes.filter(
  (node) => node.kind !== "authority",
).length
