import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve, join } from "node:path"

const [archive, retrievedAt, destination] = process.argv.slice(2)
if (!archive || !destination || !Number.isFinite(Date.parse(retrievedAt)))
  throw new Error(
    "Usage: npx tsx scripts/plane-day/extract-source.ts <2025-07.zip> <actual-retrieval-ISO-time> <output-directory>"
  )
const output = resolve(destination)
mkdirSync(output, { recursive: true })
// Preserve the archive's literal CSV records; do not serialize numeric cells.
const metadata = JSON.parse(
  execFileSync(
    "python3",
    [
      "-c",
      `
import csv,io,json,sys,zipfile,pathlib
z=zipfile.ZipFile(sys.argv[1]); out=pathlib.Path(sys.argv[2])
name='On_Time_Reporting_Carrier_On_Time_Performance_(1987_present)_2025_7.csv'
lines=z.read(name).splitlines(keepends=True)
header=next(csv.reader([lines[0].decode('utf-8-sig')]))
carrier=header.index('Reporting_Airline')
kept=[]; row_numbers=[]
for number,line in enumerate(lines[1:],start=2):
 row=next(csv.reader([line.decode('utf-8')]))
 if len(row)!=len(header): raise ValueError('Unexpected multiline or malformed CSV record')
 if row[carrier]=='HA': kept.append(line); row_numbers.append(number)
(out/'ha-july-2025.csv').write_bytes(lines[0]+b''.join(kept))
(out/'bts-readme.html').write_bytes(z.read('readme.html'))
print(json.dumps({'archiveMember':name,'archiveRows':len(lines)-1,'carrierRows':len(kept),'sourceRecordLines':row_numbers}))
`,
      resolve(archive),
      output
    ],
    { encoding: "utf8", maxBuffer: 2_000_000 }
  )
)
const hash = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex")
writeFileSync(
  join(output, "retrieval.json"),
  JSON.stringify(
    {
      ...metadata,
      retrievedAt,
      uri: "https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2025_7.zip",
      archiveSHA256: hash(archive),
      files: ["ha-july-2025.csv", "bts-readme.html"].map((file) => ({
        file,
        sha256: hash(join(output, file))
      })),
      selection:
        "Reporting_Airline exactly HA; all July dates and all original fields retained, in original order"
    },
    null,
    2
  ) + "\n"
)
console.log(
  `${metadata.carrierRows} HA records extracted from ${metadata.archiveRows} BTS records`
)
