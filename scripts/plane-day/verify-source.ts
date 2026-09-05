import { execFileSync } from "node:child_process"
import { resolve } from "node:path"

// A second implementation, using Python zoneinfo rather than JS Intl and none
// of the flight adapter's calculations. Prints each featured raw row for review.
const source = process.argv[2]
if (!source)
  throw new Error(
    "Usage: node --import tsx scripts/plane-day/verify-source.ts <edition directory>"
  )
console.log(
  execFileSync(
    "python3",
    [
      "-c",
      `
import csv,json,sys,datetime,pathlib,zoneinfo,hashlib
p=pathlib.Path(sys.argv[1]); snapshot=json.loads((p/'snapshot.json').read_text())
retrieval=json.loads((p/'raw/retrieval.json').read_text())
raw=list(csv.DictReader((p/'raw/ha-july-2025.csv').open()))
records=dict(zip(retrieval['sourceRecordLines'],raw))
zones={a['id']:a['zone'] for a in snapshot['airports']}
def local(date,clock,zone):
 n=int(clock); delta=datetime.timedelta(days=1) if n==2400 else datetime.timedelta()
 hour=0 if n==2400 else n//100; minute=0 if n==2400 else n%100
 return (datetime.datetime.fromisoformat(date).replace(hour=hour,minute=minute)+delta).replace(tzinfo=zoneinfo.ZoneInfo(zone))
def stamp(value): return int(value.timestamp()*1000)
reviews=[]
for day in snapshot['cases']:
 for f in day['flights']:
  r=records[int(f['raw']['sourceRecordLine'])]
  assert all(r[k]==v for k,v in f['raw'].items() if k!='sourceRecordLine')
  scheduled=local(r['FlightDate'],r['CRSDepTime'],zones[r['OriginAirportID']]).astimezone(datetime.timezone.utc)
  actual=scheduled+datetime.timedelta(minutes=float(r['DepDelay']))
  scheduled_arrival=scheduled+datetime.timedelta(minutes=float(r['CRSElapsedTime']))
  actual_arrival=actual+datetime.timedelta(minutes=float(r['ActualElapsedTime']))
  assert [stamp(scheduled),stamp(actual),stamp(scheduled_arrival),stamp(actual_arrival)]==[f['scheduledDeparture'],f['actualDeparture'],f['scheduledArrival'],f['actualArrival']]
  assert (actual_arrival-scheduled_arrival).total_seconds()/60==float(r['ArrDelay'])
  for instant,clock,airport in [(actual,r['DepTime'],r['OriginAirportID']),(scheduled_arrival,r['CRSArrTime'],r['DestAirportID']),(actual_arrival,r['ArrTime'],r['DestAirportID'])]:
   assert instant.astimezone(zoneinfo.ZoneInfo(zones[airport])).strftime('%H%M')==('0000' if clock=='2400' else clock)
  reviews.append({'eventId':f['id'],'sourceRecordLine':int(f['raw']['sourceRecordLine']),'tail':r['Tail_Number'],'route':r['Origin']+'-'+r['Dest'],'date':r['FlightDate'],'scheduledDepartureLocal':r['CRSDepTime'],'actualDepartureLocal':r['DepTime'],'departureDeviationMinutes':float(r['DepDelay']),'arrivalDeviationMinutes':float(r['ArrDelay']),'actualArrivalUTC':actual_arrival.isoformat(),'result':'matched'})
print(json.dumps({'editionId':snapshot['editionId'],'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Independent Python datetime/zoneinfo recalculation against exact raw CSV records; all four instants, signed arrival delay and local clocks checked','sourceSHA256':hashlib.sha256((p/'raw/ha-july-2025.csv').read_bytes()).hexdigest(),'featuredRowsChecked':len(reviews),'rows':reviews,'limitation':'An automated independent arithmetic audit, not an external human editorial review.'},indent=2))
`,
      resolve(source)
    ],
    { encoding: "utf8" }
  )
)
