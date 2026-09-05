// Domain adapter: local clocks are resolved before any flight sorting occurs.
// The builder records process.versions.tz and emits instants; readers do not
// recompute an edition with a different browser timezone database.
const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(zone: string) {
  if (!formatters.has(zone))
    formatters.set(
      zone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
    )
  return formatters.get(zone)!
}

function wallTime(instant: number, zone: string): number {
  const parts = Object.fromEntries(
    formatter(zone)
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  )
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute)
}

export function clockMinutes(value: string): number {
  if (!/^\d{1,4}$/.test(value)) throw new Error("Missing or invalid local clock")
  const number = Number(value)
  if (number === 2400) return 1440
  const hours = Math.floor(number / 100)
  const minutes = number % 100
  if (hours > 23 || minutes > 59) throw new Error("Invalid local clock")
  return hours * 60 + minutes
}

export function localInstant(date: string, clock: string, zone: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid flight date")
  const midnight = Date.parse(`${date}T00:00:00Z`)
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== date)
    throw new Error("Invalid flight date")
  const target = midnight + clockMinutes(clock) * 60_000
  const offsets = new Set(
    [-36, -12, 0, 12, 36].map((hours) => {
      const probe = target + hours * 3_600_000
      return wallTime(probe, zone) - probe
    }),
  )
  const candidates = [...offsets]
    .map((offset) => target - offset)
    .filter((instant) => wallTime(instant, zone) === target)
  if (candidates.length !== 1)
    throw new Error(
      candidates.length ? "Ambiguous local time (DST overlap)" : "Nonexistent local time (DST gap)",
    )
  return candidates[0]
}

export function matchesClock(instant: number, clock: string, zone: string): boolean {
  const wall = new Date(wallTime(instant, zone))
  return wall.getUTCHours() * 60 + wall.getUTCMinutes() === clockMinutes(clock) % 1440
}

export function numeric(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
