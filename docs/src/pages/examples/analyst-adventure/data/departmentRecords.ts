export interface DepartmentRecord {
  id: string
  department: string
  headcount: number
  cancellations: number
  cancellationsPerEmployee: number
  tenureBand: string
  location: string
}

export const departmentRecords: DepartmentRecord[] = [
  {
    id: "sales",
    department: "Sales",
    headcount: 80,
    cancellations: 40,
    cancellationsPerEmployee: 0.5,
    tenureBand: "0–12 years",
    location: "Sales pavilion",
  },
  {
    id: "finance",
    department: "Finance",
    headcount: 20,
    cancellations: 18,
    cancellationsPerEmployee: 0.9,
    tenureBand: "2–18 years",
    location: "Finance annex",
  },
  {
    id: "executive-rituals",
    department: "Executive Rituals",
    headcount: 5,
    cancellations: 10,
    cancellationsPerEmployee: 2,
    tenureBand: "8–30 years",
    location: "Ceremonial boardroom",
  },
  {
    id: "corporate-archaeology",
    department: "Corporate Archaeology",
    headcount: 2,
    cancellations: 6,
    cancellationsPerEmployee: 3,
    tenureBand: "20+ years",
    location: "B2 maintenance access",
  },
]

export function deriveDepartmentFacts(records: readonly DepartmentRecord[] = departmentRecords) {
  const byRawCount = [...records].sort((a, b) => b.cancellations - a.cancellations)
  const byRate = [...records].sort(
    (a, b) => b.cancellationsPerEmployee - a.cancellationsPerEmployee,
  )
  const strongestRate = byRate[0]

  if (!strongestRate) {
    throw new Error("Department records fixture must contain at least one row")
  }

  return {
    rawCountLeader: byRawCount[0],
    strongestRate,
    denominator: "department headcount",
    allStrongestRateCancellationsConcernB2:
      strongestRate.cancellations === 6 && strongestRate.location === "B2 maintenance access",
  }
}

export const departmentFacts = deriveDepartmentFacts()
