import React, { useCallback, useMemo, useState } from "react"
import { GeoCustomChart } from "semiotic/geo"
import { NetworkCustomChart } from "semiotic/network"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { XYCustomChart } from "semiotic/xy"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  ISOTYPE,
  IsotypeGlyph,
  IsotypeUnitRow,
  unwrapIsotypeDatum,
} from "./isotypeCharts.jsx"
import {
  DATA_CENTER_AS_OF,
  DATA_CENTER_SITES,
  HYPERSCALE_CAPACITY,
  MODEL_COMPUTE,
  NATIONAL_RESOURCES,
  STATUS_META,
  US_OUTLINE,
  sitesByStatus,
} from "./data/dataCenterIsotypeData"
import {
  RESOURCE_EDGES,
  RESOURCE_NODES,
  dataCenterMapLayout,
  hyperscaleCapacityLayout,
  modelComputeLayout,
  resourceFlowLayout,
} from "./dataCenterIsotypeCharts.jsx"
import "./DataCentersIsotypeExamplePage.css"

const STATUS_ORDER = ["legacy", "new", "construction", "planned"]

const implementationCode = `import { GeoCustomChart } from "semiotic/geo"
import { geoHitTarget, hatchFill, tokenLayer } from "semiotic/recipes"

// Each site's capacity becomes an explicit tokenized measure, and each token
// becomes a feet-anchored glyph scene node standing on the relief — canvas-
// painted, with the partial final sign riding the node's fraction + ghostColor.
// One geoHitTarget per site keeps the stack a single keyboard/hover mark.
function dataCenterMapLayout(ctx) {
  const placed = sites.map((site) => {
    const section = sectionFor(site)                    // one of five parallels
    const [west, east] = outlineExtentAtLatitude(US_OUTLINE, section.latitude)
    const t = (site.lon - west) / (east - west)         // position along the section
    const x = interpolate(P(west, lat)[0], P(east, lat)[0], t)
    const y = baseline - profileElevationAt(section.profile, t) * 34
    return { site, x, y }
  })

  return {
    nodes: [
      ...placed.map(({ site, x, y }) => geoHitTarget({ x, y, r: 14, datum: site, id: site.id })),
      ...placed.flatMap(({ site, x, y }) =>
        tokenLayer({
          input: site.powerMW,
          encoding: {
            tokenType: "glyph",
            tokenSemantics: "unitized-measure",
            countStrategy: "unitized",
            unitValue: 100,
            unitMeaning: "one server sign = 100 MW",
          },
          options: {
            tokenSize: 11,
            glyph: SERVER_SIGN,                       // a multi-part GlyphDef
            color: STATUS_META[site.status].color,    // one cut, many inks
            ghostColor: PAPER_DEEP,
            datum: null,
            positionToken: (unit) => ({
              x: x + unit.index * 12,
              y,                                      // standing on the terrain
            }),
          },
        }).nodes,
      ),
    ],
    overlays: <ReliefSectionsAndLabels water={hatchFill({ id: "sea", angle: 90 })} />,
  }
}

<GeoCustomChart
  areas={[US_OUTLINE]}
  points={sites.filter((site) => visibleStatuses.has(site.status))}
  projection="equirectangular"
  layout={dataCenterMapLayout}
  enableHover
  accessibleTable
  onObservation={inspectSite}
/>`

export default function DataCentersIsotypeExamplePage() {
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120)
  const [visibleStatuses, setVisibleStatuses] = useState(new Set(STATUS_ORDER))
  const [activeSite, setActiveSite] = useState(
    DATA_CENTER_SITES.find((site) => site.id === "colossus"),
  )
  const compact = pageWidth < 820
  const wideChartWidth = Math.max(272, pageWidth - (compact ? 48 : 92))
  const halfChartWidth = compact
    ? Math.max(292, pageWidth - 28)
    : Math.max(360, Math.floor(pageWidth / 2 - 56))
  const visibleSites = useMemo(
    () => sitesByStatus([...visibleStatuses]),
    [visibleStatuses],
  )

  const toggleStatus = useCallback((status) => {
    setVisibleStatuses((current) => {
      const next = new Set(current)
      if (next.has(status) && next.size > 1) next.delete(status)
      else next.add(status)
      return next
    })
  }, [])

  const inspectSite = useCallback((observation) => {
    if (observation.type !== "hover" || !observation.datum) return
    const datum = unwrapIsotypeDatum(observation.datum)
    if (datum?.operator) setActiveSite(datum)
  }, [])

  const inspectResource = useCallback((observation) => {
    if (observation.type !== "hover" || !observation.datum) return
    const datum = unwrapIsotypeDatum(observation.datum)
    if (!datum?.label) return
    setActiveSite({
      label: datum.label,
      operator: "National accounting",
      status: "legacy",
      milestone: datum.note,
      powerLabel: datum.value,
      computeLabel: "Hover the map to return to a facility record",
      jobsLabel: "Not a facility-level record",
      waterLabel: datum.note,
      sourceLabel: "DOE / LBNL 2024",
      source: NATIONAL_RESOURCES.source,
    })
  }, [])

  const mapTooltip = useCallback((hover) => {
    const site = unwrapIsotypeDatum(hover)
    if (!site?.operator) return null
    return (
      <div className="dc-isotype__tooltip">
        <b style={{ color: STATUS_META[site.status].color }}>
          {STATUS_META[site.status].shortLabel}
        </b>
        <strong>{site.label}</strong>
        <span>{site.operator}</span>
        <p>{site.powerLabel}</p>
      </div>
    )
  }, [])

  return (
    <ExamplePageLayout title="The Buildings Behind AI">
      <p className="dc-isotype__lede">
        Data centers did not begin with generative AI. This explainer separates the installed cloud
        base from facilities opened after ChatGPT, active construction, and announcements—and
        refuses to turn an announced gigawatt into an operating one. Every number names its
        denominator; every missing disclosure stays missing.
      </p>

      <div className="dc-isotype" ref={pageRef}>
        <header className="dc-isotype__masthead">
          <div>
            <div className="dc-isotype__eyebrow">AN INFRASTRUCTURE ACCOUNT · AS OF JULY 3, 2026</div>
            <h2>The buildings behind the models</h2>
            <p>
              Electricity goes in. Computation happens. Nearly all of that electricity leaves as
              heat. Water use depends on cooling design and on the power plants behind the meter.
            </p>
          </div>
          <StaticGlyph kind="server" size={76} color={ISOTYPE.red} />
        </header>

        <section className="dc-isotype__premise" aria-label="U.S. data-center electricity, 2014 to 2028">
          <PremiseRow
            year="2014"
            value="58 TWh"
            note="All U.S. data centers—well before ChatGPT."
            twh={58}
            idPrefix="dc-premise-2014"
          />
          <PremiseRow
            year="2023"
            value="176 TWh"
            note="All U.S. data centers; accelerated servers used more than 40 TWh of it."
            twh={176}
            idPrefix="dc-premise-2023"
          />
          <PremiseRow
            year="2028"
            value="325–580 TWh"
            note="DOE/LBNL scenario range—hatched signs are possibilities, not promises."
            twh={325}
            rangeTwh={580}
            idPrefix="dc-premise-2028"
          />
          <p className="dc-isotype__premise-key">
            EACH BOLT SIGN = 25 TWH OF ELECTRICITY IN A YEAR · HATCHED SIGNS SPAN THE PROJECTED RANGE
          </p>
        </section>

        <section className="dc-isotype__map-section">
          <PanelHeading
            number="01"
            eyebrow="ALTITUDE AND DATA CENTERS, UNITED STATES"
            title="Operating is not the same as announced"
            note="Five west-to-east relief sections carry the sites at their longitudes, after the 1943 ISOTYPE altitude spread. This is an auditable sample, not a census: city signs mark markets that predate ChatGPT; repeated server signs appear only where an operator or government source discloses capacity."
          />

          <div className="dc-isotype__status-controls" aria-label="Filter data center status">
            {STATUS_ORDER.map((status) => {
              const active = visibleStatuses.has(status)
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleStatus(status)}
                  style={{ "--status-color": STATUS_META[status].color }}
                >
                  <i />
                  {STATUS_META[status].label}
                </button>
              )
            })}
          </div>

          <GeoCustomChart
            areas={[US_OUTLINE]}
            points={visibleSites}
            projection="equirectangular"
            layout={dataCenterMapLayout}
            width={wideChartWidth}
            height={520}
            margin={{ top: 20, right: 30, bottom: 48, left: 30 }}
            enableHover
            accessibleTable
            onObservation={inspectSite}
            tooltip={mapTooltip}
            description="A schematic map of the United States drawn as five west-to-east relief sections, with established data-center markets and selected post-ChatGPT operating, construction, and planned AI projects standing on the terrain at their longitudes."
            summary={`${visibleSites.length} selected sites or markets are visible across five relief sections. Status is current as of ${DATA_CENTER_AS_OF}.`}
            frameProps={{ background: "transparent" }}
          />

          <p className="dc-isotype__map-caption">
            Don&apos;t be deceived by this map of the United States—the five dark strips are
            schematic relief sections, drawn only to give an idea of the lie of the land and where
            the buildings stand on it. The signs mark selected, sourced sites; the terrain is
            generalized; nothing here is a navigational map. But you&apos;ve heard of the Virginia
            internet corridor and the Texas build-out. Well, here they are.
          </p>

          <SiteInspection site={activeSite} />
        </section>

        <div className="dc-isotype__split">
          <section className="dc-isotype__panel">
            <PanelHeading
              number="02"
              eyebrow="OPERATIONAL HYPERSCALE CAPACITY · END 2024"
              title="More than half is in the United States"
              note="Capacity means critical IT load in megawatts—not floor area, facility count, or electricity consumed in a year."
            />
            <OrdinalCustomChart
              data={HYPERSCALE_CAPACITY}
              layout={hyperscaleCapacityLayout}
              categoryAccessor="label"
              valueAccessor="share"
              width={halfChartWidth}
              height={330}
              margin={{ top: 8, right: 6, bottom: 8, left: 6 }}
              enableHover
              accessibleTable
              description="Regional shares of worldwide operational hyperscale data-center critical IT load at the end of 2024."
              summary="The United States held 54 percent; China and Europe each held roughly 15 percent; other regions form the rounded balance."
              frameProps={{ background: "transparent" }}
            />
            <p className="dc-isotype__method-note">
              Synergy reports the U.S. share directly and describes Europe and China as each roughly
              one-third of the remaining balance. The underlying worldwide MW denominator is
              proprietary, so this graphic does not invent it.
            </p>
          </section>

          <section className="dc-isotype__panel">
            <PanelHeading
              number="03"
              eyebrow="ENERGY, HEAT, WATER"
              title="One system, three linked concerns"
              note="Nearly all electricity leaves as low-grade heat—of which the IEA puts 70–80% within reach of heat pumps. The cooling design then decides whether that heat is shed with water or with more electricity. Every arrow is 25 TWh or 25 billion gallons; both water bundles rise from one baseline so the gap cannot hide."
            />
            <NetworkCustomChart
              nodes={RESOURCE_NODES}
              edges={RESOURCE_EDGES}
              layout={resourceFlowLayout}
              width={halfChartWidth}
              height={470}
              margin={{ top: 10, right: 8, bottom: 28, left: 8 }}
              enableHover
              accessibleTable
              onObservation={inspectResource}
              description="An arrow-unit process picture in three bands: power plants send seven electricity arrows to data centers, which reject the same energy as heat with roughly three-quarters recoverable by heat pumps; a schematic shows evaporative cooling spending water while dry cooling spends energy; and two water bundles—17 billion gallons on site and 211 billion gallons at the plants—rise from one shared baseline."
              summary="U.S. data centers used 176 TWh of electricity in 2023, nearly all of it leaving as heat with about 70–80% recoverable, and consumed about 17 billion gallons of water directly and 211 billion gallons indirectly. Cooling design trades on-site water against energy use."
              frameProps={{ background: "transparent" }}
            />
          </section>
        </div>

        <section className="dc-isotype__scale">
          <PanelHeading
            number="04"
            eyebrow="THE ON-SITE WATER, IN SCALE"
            title="A familiar amount, on a steep curve"
            note="The 17 billion gallons consumed on site in 2023 is small against how the country already moves water—and it is projected to roughly double to quadruple by the end of the decade. Each drop below is 5 billion gallons; hatched drops span the projected range."
          />
          <div className="dc-isotype__scale-body">
            <div className="dc-isotype__scale-context">
              <h4>17 BILLION GALLONS IS…</h4>

              <div className="dc-isotype__scale-item">
                <WaterHundredGrid />
                <p>
                  <strong>≈ 1%</strong> of the water Americans pour on their lawns each year—one
                  filled drop in a hundred.
                </p>
              </div>

              <div className="dc-isotype__scale-item">
                <div className="dc-isotype__scale-row">
                  <IsotypeUnitRow
                    value={155000}
                    unit={10000}
                    maxIcons={16}
                    kind="city"
                    color={ISOTYPE.blue}
                    emptyColor={ISOTYPE.paperDeep}
                    iconSize={26}
                    gap={4}
                    idPrefix="dc-scale-homes"
                    label="About 155,000 homes supplied for a year; each sign is 10,000 homes"
                  />
                </div>
                <p>
                  <strong>≈ a city of 155,000 homes</strong>, supplied for a full year at the U.S.
                  average of 300 gallons a household each day. Each sign is 10,000 homes.
                </p>
              </div>

              <p className="dc-isotype__scale-foot">
                …and about 3% of the <strong>531 billion gallons</strong> U.S. golf courses use
                annually.
              </p>
            </div>

            <div className="dc-isotype__scale-projection">
              <h4>DIRECT COOLING WATER, PER YEAR</h4>
              <div className="dc-isotype__scale-row">
                <span>2023 · 17B GALLONS</span>
                <IsotypeUnitRow
                  value={17}
                  unit={5}
                  maxIcons={15}
                  kind="water"
                  color={ISOTYPE.blue}
                  emptyColor={ISOTYPE.paperDeep}
                  iconSize={26}
                  gap={4}
                  idPrefix="dc-scale-water-2023"
                  label="2023: about 17 billion gallons of direct cooling water"
                />
              </div>
              <div className="dc-isotype__scale-row">
                <span>PROJECTED · 33–73B GALLONS</span>
                <IsotypeUnitRow
                  value={33}
                  rangeValue={73}
                  unit={5}
                  maxIcons={15}
                  kind="water"
                  color={ISOTYPE.blue}
                  rangeColor={ISOTYPE.blue}
                  emptyColor={ISOTYPE.paperDeep}
                  iconSize={26}
                  gap={4}
                  idPrefix="dc-scale-water-proj"
                  label="Projected: 33 to 73 billion gallons of direct cooling water; solid drops reach the low projection, hatched drops the high one"
                />
              </div>
              <p className="dc-isotype__scale-key">
                EACH DROP = 5 BILLION GALLONS · SOLID DROPS REACH THE LOW PROJECTION, HATCHED DROPS
                THE HIGH ONE
              </p>
            </div>
          </div>
        </section>

        <section className="dc-isotype__jobs">
          <PanelHeading
            number="05"
            eyebrow="CONSTRUCTION JOBS ARE NOT PERMANENT JOBS"
            title="A large build; a smaller operating staff"
            note="Company disclosures use different definitions and time windows. These two rows preserve those definitions instead of summing them."
          />
          <JobComparison
            name="META HYPERION"
            construction={5000}
            operations={500}
            operationsLabel="MORE THAN 500"
            note="Peak construction workforce projected for June 2026 vs. completed-site operational jobs."
          />
          <JobComparison
            name="MICROSOFT FAIRWATER"
            construction={10000}
            operations={550}
            operationsLabel="NEARLY 550"
            note="People who contributed during two years of construction vs. current full-time onsite employees—not peak concurrent construction."
          />
          <p className="dc-isotype__jobs-key">
            Each worker sign represents 500 people. Partial signs preserve the reported amount.
            Virginia’s JLARC separately found a typical 250,000-square-foot data center employs
            about 50 full-time workers, roughly half contractors.
          </p>
        </section>

        <section className="dc-isotype__compute">
          <PanelHeading
            number="06"
            eyebrow="WHY THE NEW BUILDINGS?"
            title="Training compute rose faster than benchmark scores"
            note="One chip sign equals the entire compute used to train GPT-3—count them. Yellow bolts encode five MMLU points each, with partial bolts preserving the reported score. This juxtaposes scale and one benchmark; it does not claim compute alone caused the score."
          />
          <XYCustomChart
            data={MODEL_COMPUTE}
            layout={modelComputeLayout}
            width={wideChartWidth}
            height={440}
            margin={{ top: 12, right: 10, bottom: 18, left: 10 }}
            enableHover
            accessibleTable
            description="Three language models showing training compute relative to GPT-3 and their reported MMLU benchmark scores."
            summary="PaLM used about eight GPT-3 training-compute units; Llama 3.1 405B used an estimated 121, while reported MMLU rose from 43.9 to 88.6 percent."
            frameProps={{ background: "transparent" }}
          />
          <div className="dc-isotype__compute-warning">
            <strong>Do not read this as a clean production function.</strong>
            <p>
              MMLU evaluation settings differ, the benchmark contains known errors and possible
              contamination, and training is only one demand source. Inference serves users
              continuously; research runs and failed experiments are not represented by a final
              model’s training FLOP.
            </p>
          </div>
        </section>

        <section className="dc-isotype__ledger">
          <h3>Disclosure ledger</h3>
          <p>
            “Not disclosed” is a result. It prevents planned capacity, utility service, accelerator
            count, cooling-loop volume, and permanent employment from collapsing into one
            unsupported story.
          </p>
          <div className="dc-isotype__ledger-table">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Power</th>
                  <th>Compute</th>
                  <th>Jobs</th>
                  <th>Water</th>
                </tr>
              </thead>
              <tbody>
                {DATA_CENTER_SITES.filter((site) => site.status !== "legacy").map((site) => (
                  <tr key={site.id}>
                    <th scope="row">
                      <a href={site.source} target="_blank" rel="noopener noreferrer">{site.label}</a>
                      <small>{site.operator}</small>
                    </th>
                    <td>{STATUS_META[site.status].shortLabel}</td>
                    <td>{site.powerLabel}</td>
                    <td>{site.computeLabel}</td>
                    <td>{site.jobsLabel}</td>
                    <td>{site.waterLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="dc-isotype__sources">
          <strong>DENOMINATORS AND SOURCES</strong>
          <p>
            National electricity and water:{" "}
            <a href={NATIONAL_RESOURCES.source} target="_blank" rel="noopener noreferrer">
              Lawrence Berkeley National Laboratory, 2024 U.S. Data Center Energy Usage Report
            </a>
            . Global operational hyperscale shares:{" "}
            <a
              href="https://www.srgresearch.com/articles/hyperscale-data-center-count-hits-1136-average-size-increases-us-accounts-for-54-of-total-capacity"
              target="_blank"
              rel="noopener noreferrer"
            >
              Synergy Research Group
            </a>
            . Heat recovery:{" "}
            <a
              href="https://www.iea.org/commentaries/opportunities-for-district-heating-in-the-changing-energy-landscape"
              target="_blank"
              rel="noopener noreferrer"
            >
              International Energy Agency
            </a>
            . The projected 33–73 billion gallon range and the lawn, golf, and household figures are
            order-of-magnitude national comparisons for scale (U.S. household average ≈ 300 gallons a
            day); they contextualize the sourced 2023 figure rather than extend it. Facility claims
            link directly from the disclosure ledger. Operator claims describe operator commitments;
            they are not independent audits.
          </p>
        </footer>
      </div>

      <section className="dc-isotype__editorial">
        <h2>Graphics can carry epistemic status</h2>
        <p>
          The shared ISOTYPE signs are deliberately simple; the data contract is not. Each map
          record carries status, date language, denominator, source, and caveat. Every repeated
          sign is a <code>glyph</code> scene node allocated by <code>tokenLayer</code> as a{" "}
          <code>unitized-measure</code> — canvas-painted pictograms whose partial fills preserve the reported amounts — so the
          rich poster stays observable, keyboard-navigable, and accessible without a parallel
          bookkeeping layer.
        </p>
        <CodeBlock language="jsx" showCopyButton code={implementationCode} />
      </section>
    </ExamplePageLayout>
  )
}

function StaticGlyph({ kind, size, color }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <IsotypeGlyph kind={kind} size={40} color={color} />
    </svg>
  )
}

// A 10×10 field of drops — one filled, ninety-nine ghosted — the ISOTYPE
// "one in a hundred" idiom for the lawn comparison (17B gal ≈ 1% of U.S.
// lawn watering). The single blue drop is the data-center share.
function WaterHundredGrid() {
  const cols = 10
  const size = 14
  const gap = 3
  const extent = cols * (size + gap) - gap
  return (
    <svg
      viewBox={`0 0 ${extent} ${extent}`}
      className="dc-isotype__hundred"
      role="img"
      aria-label="One hundred drops; one filled drop is data-center cooling water, the ninety-nine faint drops are lawn watering."
    >
      {Array.from({ length: 100 }, (_, index) => (
        <IsotypeGlyph
          key={index}
          kind="water"
          x={(index % cols) * (size + gap)}
          y={Math.floor(index / cols) * (size + gap)}
          size={size}
          color={index === 0 ? ISOTYPE.blue : ISOTYPE.paperDeep}
        />
      ))}
    </svg>
  )
}

function PremiseRow({ year, value, note, twh, rangeTwh, idPrefix }) {
  const label = rangeTwh
    ? `${year}: ${value} projected—solid signs reach the low scenario, hatched signs the high one. ${note}`
    : `${year}: ${value}. ${note}`
  return (
    <div className="dc-isotype__premise-row">
      <div>
        <span>{year}</span>
        <strong>{value}</strong>
      </div>
      <div>
        <IsotypeUnitRow
          value={twh}
          rangeValue={rangeTwh}
          unit={25}
          maxIcons={24}
          kind="bolt"
          color={ISOTYPE.yellow}
          emptyColor={ISOTYPE.paperDeep}
          iconSize={26}
          gap={4}
          idPrefix={idPrefix}
          label={label}
        />
        <p>{note}</p>
      </div>
    </div>
  )
}

function PanelHeading({ number, eyebrow, title, note }) {
  return (
    <header className="dc-isotype__panel-heading">
      <span>{number}</span>
      <div>
        <b>{eyebrow}</b>
        <h3>{title}</h3>
        <p>{note}</p>
      </div>
    </header>
  )
}

function SiteInspection({ site }) {
  const status = STATUS_META[site.status] || STATUS_META.legacy
  return (
    <aside className="dc-isotype__site-inspection" aria-live="polite">
      <header>
        <span style={{ background: status.color }} />
        <div>
          <b>{status.shortLabel}</b>
          <h3>{site.label}</h3>
          <p>{site.operator} · {site.milestone}</p>
        </div>
        <a href={site.source} target="_blank" rel="noopener noreferrer">SOURCE ↗</a>
      </header>
      <dl>
        <div><dt>Power</dt><dd>{site.powerLabel}</dd></div>
        <div><dt>Compute</dt><dd>{site.computeLabel}</dd></div>
        <div><dt>Jobs</dt><dd>{site.jobsLabel}</dd></div>
        <div><dt>Water</dt><dd>{site.waterLabel}</dd></div>
      </dl>
      {site.caveat && <p className="dc-isotype__site-caveat">{site.caveat}</p>}
    </aside>
  )
}

function JobComparison({ name, construction, operations, operationsLabel, note }) {
  return (
    <div className="dc-isotype__job-row">
      <div>
        <strong>{name}</strong>
        <p>{note}</p>
      </div>
      <div>
        <span>CONSTRUCTION · {construction.toLocaleString()}</span>
        <IsotypeUnitRow
          value={construction}
          unit={500}
          maxIcons={20}
          kind="worker"
          color={ISOTYPE.red}
          emptyColor={ISOTYPE.paperDeep}
          iconSize={29}
          gap={3}
          idPrefix={`${name.toLowerCase().replace(/\s+/g, "-")}-construction`}
          label={`${name}: ${construction.toLocaleString()} construction workers`}
        />
      </div>
      <div>
        <span>OPERATIONS · {operationsLabel}</span>
        <IsotypeUnitRow
          value={operations}
          unit={500}
          maxIcons={20}
          kind="worker"
          color={ISOTYPE.blue}
          emptyColor={ISOTYPE.paperDeep}
          iconSize={29}
          gap={3}
          idPrefix={`${name.toLowerCase().replace(/\s+/g, "-")}-operations`}
          label={`${name}: ${operationsLabel.toLowerCase()} operational workers`}
        />
      </div>
    </div>
  )
}
