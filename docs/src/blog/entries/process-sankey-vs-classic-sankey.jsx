/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"
import WaterCycleFlow from "../../examples/recipes/WaterCycleFlow.jsx"
import PatientJourneys from "../../examples/recipes/PatientJourneys.jsx"
import AnscombesSankey from "../../examples/recipes/AnscombesSankey.jsx"

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
        <Link to="/charts/process-sankey">ProcessSankey</Link> both display flow. They both use very
        similar methods to do so. But where they differ is in how we understand time as part of a
        system. Systems and flows are usually represented outside of time, only showing the
        topology, or they show elements of the system over time without encoding the topology of the
        system. But now there's a diagram that can do that: The Process Sankey.
      </p>

      <h2 id="why-two-flow-layouts">Why two flow layouts?</h2>
      <p>
        The classic Sankey layout, born in the 19th century to visualize steam-engine energy
        budgets, treats flows between nodes as instantaneous and the layout as a sequence of
        vertical columns. That's why it is a surprisingly popular and familiar chart for both{" "}
        <strong>flows</strong> but also for
        <strong>part-to-whole questions</strong> where it is used almost like a hierarchical
        diagram.
      </p>
      <p>
        In contrast, the new Process Sankey uses the same ribbon geometry but pins the x-axis to
        actual time. When you do this, four problems disappear at once:
      </p>
      <ul>
        <li>
          <strong>Cycles work.</strong> Fresno to Los Angeles in January and Los Angeles to Fresno
          in March are two forward-moving flows on the timeline, not a DAG-breaking loop. Circular
          sankeys are common since Tom Shanley built d3-sankey-circular in 2017 but most people
          still use the classic d3-sankey approach that errors out when it detects cycles.
        </li>
        <li>
          <strong>Edges carry duration.</strong> A snowpack melt that flows over several months, the
          shipment that takes three weeks to cross the pacific or any other flow from one part of
          the system to another is not instantaneous. That's not always important. But until now, it
          didn't matter if it was.
        </li>
        <li>
          <strong>Parallel discrete events.</strong> The same source-target pair can fire ten times
          across a year; the classic Sankey aggregates them into one ribbon, the Process Sankey
          shows ten distinct ribbons at their actual moments.
        </li>
        <li>
          <strong>Nodes have lifetimes.</strong> Even if the flows are simultaneous (or practically
          so, in the case of a transfer from the ER to the ICU), the nodes themselves encode time
          spent in the stores and sinks that make up a flow diagram. Lakes dry up, patients get
          discharged, and even if a node is always there, it is not always the same magnitude.
          Process Sankey encodes the presence or absence of a node as a function of time but also
          its changing size and shape.
        </li>
      </ul>

      <h2 id="aggregated-water-cycle">Where classic sankeys work</h2>
      <p>
        Ten water reservoirs (Ocean, Atmosphere, Clouds, Land Rain, Snowpack, Glaciers, Soil
        Moisture, Vegetation, Surface Water, Groundwater) and 16 flows. Volumes are in thousand
        km³/yr and it's a complex system but it is clear and legible and, like any sankey:
        compelling to the reader.
      </p>
      <div style={chartFrame}>
        <WaterCycleFlow />
      </div>
      <p>
        You can see in the diagram that the Ocean to Atmosphere ribbon dominates because it{" "}
        <em>is</em> the dominant flux. The eye walks from left to right and gets the system's
        mass-balance at a glance: ~85% of all evaporation comes from the ocean; clouds split their
        precipitation roughly 80/20 between ocean and land; only a fraction of land precipitation
        makes it back to the ocean as river flow. Volume and dependency get encoded in a legible
        manner.
      </p>
      <p>
        Timing, though, is invisible. The Surface Water to Ocean and Groundwater to Ocean return
        edges show up as curved back links rather than as a closed loop. Whether the snowmelt pulse
        happens in spring or in October is information the chart literally cannot carry. That's not
        important for understanding the system's mass balance, but it is a real loss of information
        about the system's behavior over time.
      </p>
      <h2 id="discrete-patient-journeys">Patient journeys</h2>
      <p>
        We can contrast that to a different dataset: twelve patients move through five wards (ER,
        Surgery, ICU, General, Discharge) over seven days. Each row in the dataset encodes time into
        the transition between wards.
      </p>
      <div style={chartFrame}>
        <PatientJourneys />
      </div>
      <h3 id="patient-classic-readout">What the classic Sankey shows here</h3>
      <p>
        The diagram aggregates all patient-transition events into ribbons keyed by source-target
        pair. You get a clean utilization readout: most patients hit ICU before General, the General
        ward is the most common discharge launchpad. It's useful for monthly utilization review to
        allocate resources and answer operational concerns from that perspective.
      </p>
      <p>
        But the surge is invisible. Every operationally meaningful question about that is hidden in
        this aggregation:
      </p>
      <ul>
        <li>Was there a mass-casualty event?</li>
        <li>When did the ICU run hot?</li>
        <li>How saturated were the operating rooms, and for how long?</li>
        <li>How many surge-cohort patients are still admitted on Monday morning?</li>
      </ul>
      <p>
        That's all gone. The Sankey answers "where does the mass go." For this dataset, the mass is
        identical-patients. We won't be able to ask any questions that require us to know{" "}
        <em>when</em> they showed up, which the aggregation throws away.
      </p>

      <h3 id="patient-process-readout">What the Process Sankey shows here</h3>
      <p>
        The temporal layout makes the surge unmissable: a vertical wall of ER to Surgery and ER to
        ICU ribbons around a couple hours on Day 2, with the cascade visible as Surgery to ICU edges
        trailing Day 2 and ICU to General edges trailing into Day 3. Pre-surge and post-surge admits
        are visibly sparser on the timeline. An operations dashboard reader sees the wave shape
        immediately and without having to compute anything.
      </p>
      <p>
        Independent of the surge, the cycles stand out in time too: One patient ICU readmission at
        Day 2.2 (caught mid-surge, which would have been a real-world bed crisis), Another patient's
        post-op re-op at Day 2.4, and a third patient's cardiac re-event in the General ward at Day
        5.0 are all cycles back into earlier parts of the system but discrete events in time.
      </p>
      <p>
        Capacity-planning context that only the temporal view surfaces: three patients from the
        surge cohort never reach the Discharge node by the week's end. Their flow stops at whichever
        ward they were last transferred to (two still in General, one still in ICU). Anyone making
        Monday admit decisions needs to know which beds are carrying held-over patients.
      </p>

      <h2 id="anscombes-sankey">Anscombe's Sankey</h2>
      <p>
        That's <em>one</em> temporal pattern (the mass-casualty surge) that the aggregate Sankey
        couldn't surface. But the failure mode is worse than that: the aggregate can't distinguish
        between any number of completely different temporal realities, because timestamps aren't in
        the summary at all.
      </p>
      <p>
        Below are four scenarios. Each one runs the <em>same twelve patients</em> through the{" "}
        <em>same five wards</em> via the <em>same ward sequences</em> (same cycles, same routes).
        But they have different times they were admitted and stayed at each step.
      </p>
      <p>
        This is the flow analogue of{" "}
        <a
          href="https://en.wikipedia.org/wiki/Anscombe%27s_quartet"
          target="_blank"
          rel="noreferrer"
        >
          Anscombe's quartet
        </a>
        . Anscombe used four datasets with the same summary statistics and visibly different
        underlying shapes to argue you always look at your data; this says the same thing but for
        flows.
      </p>
      <p>
        Notice the <strong>Emergency Room (ER) node</strong> in each of the four ProcessSankeys
        which, instead of simply being a single flat "always there" band is an outline showing the
        time when actions affect the node with gradient stubs indicating when people enter the
        system. The cumulative effect is a staircase whose riser shape is the admit schedule. The
        pattern is diagnostic on its own showing a vertical wall in the surge week, even risers
        under normal ops, or a flat start with a Wednesday cliff in the outbreak. In this example
        each patient's first edge carries a <code>systemInDay</code> field equal to admit time (the
        column name is consumer-chosen); the chart wires it in via{" "}
        <code>systemInTimeAccessor=&quot;systemInDay&quot;</code>. The underlying layout / mass
        balance is unchanged because the gradients are pure rendering to indicate how we encode
        flows that come in and out of a system.
      </p>
      <div style={chartFrame}>
        <AnscombesSankey />
      </div>
      <p>
        Each of these days tells a different story but the traditional Sankey cannot tell them
        apart. A dashboard built only on the summary statistic would treat them as identical
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
            <td>Where does the bulk go? What fraction stays vs. leaks?</td>
            <td>
              Already aggregated totals (km³/yr, $/quarter, users/month). No time dimension or one
              you're happy to flatten.
            </td>
          </tr>
          <tr>
            <td>
              <Link to="/charts/process-sankey">ProcessSankey</Link>
            </td>
            <td>
              When did each transition happen? How long did each step take? Does this loop back? Are
              there parallel events?
            </td>
            <td>
              Discrete event-stamped rows (one patient × one move, one PR × one merge, one shipment
              × one leg). Or a graph with cycles you want to read as forward-moving time.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="other-good-domains">Other domains where this contrast pays off</h2>
      <p>
        Anywhere a system has both <em>mass-balance</em> and <em>time-of-flight</em> meaning. A few
        that translate cleanly:
      </p>
      <ul>
        <li>
          <strong>Pull-request lifecycle</strong> from opened → in review → revisions → merged →
          released, with cycle edges when a PR returns from review with comments. Edges carry "sat
          in queue for X days." Classic Sankey shows the merge funnel; ProcessSankey shows where the
          bottlenecks sit.
        </li>
        <li>
          <strong>Supply-chain logistics</strong> from supplier → warehouse → in-transit → store →
          returns. Returns cycle back to warehouse. Edges carry shipping duration. Classic shows
          leakage; ProcessSankey shows the slow legs.
        </li>
        <li>
          <strong>Financial settlement</strong> from payment → clearing → settlement, with reversal
          cycles. Classic shows volume by route; ProcessSankey shows where days-to-settle
          accumulate.
        </li>
        <li>
          <strong>Manufacturing rework</strong> from raw → assembly → QA → ship, with the rework
          loop from QA back to assembly. Classic shows yield; ProcessSankey shows how long the
          rework legs take in calendar time.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/sankey-diagram">SankeyDiagram</Link> for classic part-to-whole flow
          layout
        </li>
        <li>
          <Link to="/charts/process-sankey">ProcessSankey</Link> for cycles + durations
        </li>
        <li>
          <Link to="/charts/chord-diagram">ChordDiagram</Link> shows bidirectional flows where
          structure matters more than direction
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
