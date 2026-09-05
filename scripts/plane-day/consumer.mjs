import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { importNotePacket, renderDayHTML } from "./adapter.mjs"

// Run this copied consumer outside the docs app, with Semiotic installed.
const directory = new URL("./", import.meta.url)
const snapshot = JSON.parse(await readFile(new URL("snapshot.json", directory), "utf8"))
const packetPath = process.argv[2] || fileURLToPath(new URL("default.packet.json", directory))
const result = importNotePacket(JSON.parse(await readFile(packetPath, "utf8")), snapshot)
if (result.issue || !result.day) throw new Error(result.issue || "Unresolved aircraft-day")
console.log(JSON.stringify({ selected: result.state.selected, summary: result.day.flights.map(flight => ({ id: flight.id, flight: flight.raw.Flight_Number_Reporting_Airline, departureDeviationMinutes: flight.raw.DepDelay })), notes: result.state.notes }, null, 2))
if (process.argv[3]) await writeFile(process.argv[3], renderDayHTML(snapshot, result.day, result.state))
