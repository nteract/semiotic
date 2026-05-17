import React from "react"
import { Link } from "react-router-dom"
import WaterCycleFlow from "../../examples/recipes/WaterCycleFlow.js"
import PatientJourneys from "../../examples/recipes/PatientJourneys.js"
import AnscombesSankey from "../../examples/recipes/AnscombesSankey.js"

// Embedded charts go in opaque framing divs so they don't fight the
// blog's reading-width container. The 16-px padding + surface-1
// background matches the rest of the blog's chart-callout convention.
const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  overflow: "hidden",
  margin: "20px 0",
}

function Body() {
  return (
    <>
      <p>
        <Link to="/charts/sankey-diagram">SankeyDiagram</Link> and{" "}
        <Link to="/charts/process-sankey">ProcessSankey</Link> answer
        different questions about the same flow data. Two datasets
        below, each tuned to flatter the diagram it suits best, so
        the contrast becomes obvious in both directions:
      </p>
      <ul>
        <li>
          <strong>Water cycle</strong> — aggregated continuous flows
          (km³/yr) with a seasonal extent. The classic Sankey reads it
          beautifully (mass balance jumps out); the Process Sankey
          adds the seasonal phase as a bonus.
        </li>
        <li>
          <strong>Patient journeys</strong> — discrete events (one
          patient × one ward transition) with real timestamps. The
          classic Sankey collapses every transition into source→target
          aggregate ribbons and loses the story; the Process Sankey
          paints every event at its actual time and the readmission
          cycles become visible.
        </li>
      </ul>
      <p>
        Both datasets carry <code>startTime</code> /{" "}
        <code>endTime</code> fields per edge. The classic Sankey
        ignores them. The Process Sankey reads them as its x-axis.
      </p>

      <h2 id="why-two-flow-layouts">Why two flow layouts?</h2>
      <p>
        The classic Sankey layout, born in the 19th century to
        visualize steam-engine energy budgets, treats flows between
        nodes as instantaneous and the layout as a sequence of
        vertical columns. That makes it brilliantly clear for{" "}
        <strong>part-to-whole questions</strong> — what fraction of
        total flow moves between these states? — and brittle for
        anything that cycles or carries duration.
      </p>
      <p>
        ProcessSankey reuses the ribbon geometry but pins the x-axis
        to actual time. Four problems disappear at once:
      </p>
      <ul>
        <li>
          <strong>Cycles work.</strong> A → B in January and B → A in
          March are two forward-moving flows on the timeline, not a
          DAG-breaking loop. Sankey-plus draws cycle edges as curved
          return arrows; ProcessSankey unrolls them naturally.
        </li>
        <li>
          <strong>Edges carry duration.</strong> A snowpack edge
          spanning November–March, an ICU stay spanning two days, a
          shipping leg spanning three weeks — each plots at its
          actual width on the time axis.
        </li>
        <li>
          <strong>Parallel discrete events.</strong> The same
          source-target pair can fire ten times across a year; the
          classic Sankey aggregates them into one ribbon, the Process
          Sankey shows ten distinct ribbons at their actual moments.
        </li>
        <li>
          <strong>Nodes have lifetimes, not ranks.</strong> If a node
          ends before another begins, ProcessSankey packs them into
          the same vertical lane — the layout reads timing directly
          from the data instead of forcing nodes into arbitrary
          columns.
        </li>
      </ul>

      <h2 id="aggregated-water-cycle">
        Dataset 1: Water cycle (aggregated flows)
      </h2>
      <p>
        Ten water reservoirs (Ocean, Atmosphere, Clouds, Land Rain,
        Snowpack, Glaciers, Soil Moisture, Vegetation, Surface Water,
        Groundwater) and 16 flows. Volumes are in thousand km³/yr;
        each flow has a seasonal extent. <strong>This is the
        classic Sankey's home turf</strong> — the data is already
        aggregated across the year, and the mass-balance story
        dominates.
      </p>
      <div style={chartFrame}>
        <WaterCycleFlow />
      </div>

      <h3 id="what-classic-shows">What the classic Sankey shows</h3>
      <p>
        The Ocean → Atmosphere ribbon dominates the diagram because
        it <em>is</em> the dominant annual flux. The eye walks from
        left to right and gets the system's mass-balance at a glance:
        ~85% of all evaporation comes from the ocean; clouds split
        their precipitation roughly 80/20 between ocean and land;
        only a fraction of land precipitation makes it back to the
        ocean as river flow. That's the Sankey's superpower — the
        structural readout of where mass goes.
      </p>
      <p>
        The cycle itself, though, is invisible. The Surface Water →
        Ocean and Groundwater → Ocean return edges show up as curved
        back-arrows rather than as a closed loop. Whether the
        snowmelt pulse happens in spring or in October is information
        the chart literally cannot carry.
      </p>

      <h3 id="what-process-shows">What the Process Sankey shows</h3>
      <p>
        Now look at the same data on a calendar axis. The seasonal
        phase structure jumps out: precipitation lights up the
        Snowpack lane in Nov–Mar, then the Surface Water lane swells
        dramatically in Mar–Jun as the snowpack melts, and
        transpiration takes over the Vegetation lane through the
        growing season. The Ocean appears once on the left and once
        on the right — same reservoir, two ends of a year-long
        journey — instead of as a column flanked by return curves.
      </p>
      <p>
        What you trade away: absolute magnitudes are harder to
        compare. The ocean → atmosphere ribbon is still
        proportionally the thickest, but the eye is pulled to
        temporal layout first and thickness second.
      </p>

      <h2 id="discrete-patient-journeys">
        Dataset 2: Patient journeys (a mass-casualty surge)
      </h2>
      <p>
        Twelve patients move through five wards (ER, Surgery, ICU,
        General, Discharge) over seven days. Each row in the dataset
        is ONE patient making ONE transition between wards, with a
        real start and end timestamp. The week has a STORY baked in:
      </p>
      <ul>
        <li>
          <strong>Pre-surge (Days 0–1.7):</strong> three normal
          admits drift through at the routine Friday-into-Saturday-
          morning rate.
        </li>
        <li>
          <strong>The surge (Day 1.85–2.1):</strong> a mass-casualty
          event drops six trauma patients into the ER inside a 4-hour
          window. Operating rooms saturate by Day 2.0; ICU runs near
          capacity Day 2.2–3.0.
        </li>
        <li>
          <strong>Post-surge (Days 3.5+):</strong> normal admit rate
          resumes, but three patients from the surge cohort are
          still inpatient at week's end.
        </li>
      </ul>
      <p>
        Same twelve patients, same five wards, same set of routes —
        rearranging their arrival times into a uniform week-long
        trickle produces an aggregated Sankey identical to this one.
        The temporal cluster is the story; the aggregation erases
        it.
      </p>
      <div style={chartFrame}>
        <PatientJourneys />
      </div>

      <h3 id="patient-classic-readout">
        What the classic Sankey shows here
      </h3>
      <p>
        The diagram aggregates all patient-transition events into
        ribbons keyed by source-target pair. You get a clean
        utilization readout — most patients hit ICU before General,
        the General ward is the most common discharge launchpad —
        useful for the monthly review.
      </p>
      <p>
        The surge is invisible. Every operationally meaningful
        question about this specific week dies in the aggregation:
      </p>
      <ul>
        <li>Was there a mass-casualty event?</li>
        <li>When did the ICU run hot?</li>
        <li>How saturated were the operating rooms, and for how long?</li>
        <li>How many surge-cohort patients are still admitted on Monday morning?</li>
      </ul>
      <p>
        All gone. The Sankey answers "where does the mass go." For
        this dataset, the mass is identical-patients — what matters
        is <em>when</em> they showed up, which the aggregation
        throws away.
      </p>

      <h3 id="patient-process-readout">
        What the Process Sankey shows here
      </h3>
      <p>
        The temporal layout makes the surge unmissable: a vertical
        wall of ER → Surgery and ER → ICU ribbons around Day
        1.9–2.1, with the cascade visible as Surgery → ICU edges
        trailing Day 2.0–2.5 and ICU → General edges trailing Day
        2.2–3.0. Pre-surge and post-surge admits are visibly sparser
        on the timeline. An operations dashboard reader sees the
        wave shape immediately and without having to compute
        anything.
      </p>
      <p>
        Independent of the surge, the cycles stand out in time too:
        Patient P2's ICU readmission on Day 2.2 (caught mid-surge,
        which would have been a real-world bed crisis), Patient
        P8's post-op re-op on Day 2.4, and Patient P11's cardiac
        re-event in the General ward on Day 5.0 — each is a
        forward-moving event on the timeline, not a back-arrow.
      </p>
      <p>
        Capacity-planning context that only the temporal view
        surfaces: three patients from the surge cohort never reach
        the Discharge node by the week's end — their flow stops at
        whichever ward they were last transferred to (P5 and P8
        still in General, P9 still in ICU). Anyone making Monday
        admit decisions needs to know which beds are carrying
        held-over patients.
      </p>

      <h2 id="anscombes-sankey">Anscombe's Sankey</h2>
      <p>
        The patient-journeys section above demonstrated <em>one</em>{" "}
        temporal pattern (the mass-casualty surge) that the
        aggregate Sankey couldn't surface. But the failure mode is
        worse than that: the aggregate can't distinguish between
        any number of completely different temporal realities,
        because timestamps aren't in the summary at all.
      </p>
      <p>
        Below are four scenarios. Each one runs the <em>same twelve
        patients</em> through the <em>same five wards</em> via the{" "}
        <em>same ward sequences</em> (same cycles, same routes,
        same stay durations). The only thing that changes between
        scenarios is each patient's admit time. That means all four
        scenarios produce a{" "}
        <strong>byte-identical aggregate Sankey</strong> — same
        source-target counts, same ribbon thicknesses, same layout.
        The aggregate Sankey at the top is true for all four. The
        four ProcessSankeys below it tell four operationally
        distinct stories the summary statistic cannot.
      </p>
      <p>
        This is the patient-flow analogue of{" "}
        <a
          href="https://en.wikipedia.org/wiki/Anscombe%27s_quartet"
          target="_blank"
          rel="noreferrer"
        >
          Anscombe's quartet
        </a>{" "}
        — four datasets with the same summary statistics and visibly
        different underlying shapes. Anscombe used it to argue you
        always look at your data; this section is the same argument
        applied to flow visualizations.
      </p>
      <p>
        Notice the <strong>ER node</strong> in each of the four
        ProcessSankeys — instead of a single flat "always there"
        band, the ER lane is outline-only, and each patient appears
        as a 20-px gradient stub fading in at their admit time. The
        cumulative effect is a staircase whose riser shape{" "}
        <em>is</em> the admit schedule. The pattern is diagnostic
        on its own — a vertical wall in the surge week, even risers
        under normal ops, a flat start with a Wednesday cliff in
        the outbreak, regular twin steps per day in the
        shift-change week. In this example each patient's first
        edge carries a <code>systemInDay</code> field equal to admit
        time (the column name is consumer-chosen); the chart wires
        it in via{" "}
        <code>systemInTimeAccessor=&quot;systemInDay&quot;</code>.
        The underlying layout / mass balance is unchanged — the
        stubs are pure rendering. The aggregate Sankey can't draw
        any of this, because it has no x-axis.
      </p>
      <div style={chartFrame}>
        <AnscombesSankey />
      </div>

      <h3 id="anscombe-summary">The four weeks at a glance</h3>
      <table className="recipe-customization-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>What it tells you</th>
            <th>What aggregate Sankey says</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Mass-casualty surge</td>
            <td>
              A bus accident or analogous event saturated the ER and
              operating rooms inside a 4-hour window. ICU
              concurrent census peaked Day 2.2–3.0. Three patients
              still admitted at week's end.
            </td>
            <td
              rowSpan={4}
              style={{
                verticalAlign: "middle",
                textAlign: "center",
                color: "var(--semiotic-text-secondary, #525252)",
                fontStyle: "italic",
              }}
            >
              "12 patients, mostly via ICU, mostly discharging from
              General. Nothing to see here."
            </td>
          </tr>
          <tr>
            <td>Normal operations</td>
            <td>
              An admit every ~14 hours. Low concurrent census.
              Nothing's wrong; nothing's interesting either. The
              benchmark week.
            </td>
          </tr>
          <tr>
            <td>Delayed outbreak</td>
            <td>
              Quiet through Wednesday, then a respiratory or
              foodborne bug ramps and ten patients pile in Days
              3.7–5. End-of-week census stays elevated; the cohort
              hasn't fully discharged.
            </td>
          </tr>
          <tr>
            <td>Shift-change rhythm</td>
            <td>
              Admits cluster at predictable times every day — the
              morning and evening shift changes. Periodic system,
              low variability. The kind of pattern an
              emergency-department scheduler aims for.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Three of these four weeks would be quiet board meetings.
        One is a clinical incident worth investigating. One is an
        outbreak worth alerting public health about. The aggregate
        Sankey cannot tell them apart — and a dashboard built only
        on the summary statistic would treat them as identical
        situations.
      </p>

      <h2 id="when-to-use-which">When to use which</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr>
            <th>Reach for</th>
            <th>When the question is</th>
            <th>When the data is</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Link to="/charts/sankey-diagram">SankeyDiagram</Link>
            </td>
            <td>
              Where does the bulk go? What fraction stays vs.
              leaks?
            </td>
            <td>
              Already aggregated totals (km³/yr, $/quarter,
              users/month). No time dimension or one you're happy
              to flatten.
            </td>
          </tr>
          <tr>
            <td>
              <Link to="/charts/process-sankey">ProcessSankey</Link>
            </td>
            <td>
              When did each transition happen? How long did each
              step take? Does this loop back? Are there parallel
              events?
            </td>
            <td>
              Discrete event-stamped rows (one patient × one move,
              one PR × one merge, one shipment × one leg). Or a
              graph with cycles you want to read as forward-moving
              time.
            </td>
          </tr>
          <tr>
            <td>Both, stacked</td>
            <td>
              Briefing audiences who need both the structural read
              AND the temporal pulse
            </td>
            <td>
              The patient-journeys dataset shows this well — the
              aggregated Sankey gives you a one-glance utilization
              stat, the ProcessSankey gives you the timeline; both
              stay on screen.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="other-good-domains">
        Other domains where this contrast pays off
      </h2>
      <p>
        Anywhere a system has both <em>mass-balance</em> and{" "}
        <em>time-of-flight</em> meaning. A few that translate
        cleanly:
      </p>
      <ul>
        <li>
          <strong>Pull-request lifecycle</strong> — PRs flow opened
          → in review → revisions → merged → released, with cycle
          edges when a PR returns from review with comments. Edges
          carry "sat in queue for X days." Classic Sankey shows the
          merge funnel; ProcessSankey shows where the bottlenecks
          sit.
        </li>
        <li>
          <strong>Supply-chain logistics</strong> — orders flow
          supplier → warehouse → in-transit → store → returns.
          Returns cycle back to warehouse. Edges carry shipping
          duration. Classic shows leakage; ProcessSankey shows the
          slow legs.
        </li>
        <li>
          <strong>Financial settlement</strong> — payment →
          clearing → settlement, with reversal cycles. Classic
          shows volume by route; ProcessSankey shows where
          days-to-settle accumulate.
        </li>
        <li>
          <strong>Manufacturing rework</strong> — raw → assembly →
          QA → ship, with the rework loop from QA back to assembly.
          Classic shows yield; ProcessSankey shows how long the
          rework legs take in calendar time.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/sankey-diagram">SankeyDiagram</Link> —
          the classic part-to-whole flow layout
        </li>
        <li>
          <Link to="/charts/process-sankey">ProcessSankey</Link> —
          the temporal extension; cycles + durations
        </li>
        <li>
          <Link to="/charts/chord-diagram">ChordDiagram</Link> —
          for bidirectional flows where structure matters more
          than direction
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "process-sankey-vs-classic-sankey",
  title: "Process Sankey vs Classic Sankey",
  subtitle:
    "Two flow datasets — one already aggregated, one event-stamped — and the diagram that fits each. With four-panel Anscombe's-quartet demo.",
  author: "Elijah Meeks",
  date: "2026-05-16",
  tags: ["case-study", "chart-explainer", "network"],
  excerpt:
    "Same flow data, two layouts, two stories. The classic Sankey is unbeatable for part-to-whole at aggregate scale; the Process Sankey paints discrete events at their actual times and makes surges, cycles, and lingering patients visible. With an Anscombe's-quartet section: four scenarios that produce a byte-identical aggregate Sankey and four operationally distinct ProcessSankey timelines.",
  component: Body,
  ogChart: {
    component: "AnscombesSankey",
  },
}
