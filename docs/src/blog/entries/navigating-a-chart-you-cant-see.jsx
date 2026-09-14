import React from "react"
import { Link } from "react-router-dom"
import { buildNavigationTree, AccessibleNavTree } from "semiotic"

const DEMO = {
  component: "LineChart",
  props: {
    data: [
      { month: "Jan", sales: 4200, region: "West" },
      { month: "Feb", sales: 5100, region: "West" },
      { month: "Mar", sales: 6800, region: "West" },
      { month: "Jan", sales: 2200, region: "East" },
      { month: "Feb", sales: 3100, region: "East" },
      { month: "Mar", sales: 2600, region: "East" },
    ],
    xAccessor: "month",
    yAccessor: "sales",
    lineBy: "region",
  },
}

function NavDemo() {
  const tree = React.useMemo(() => buildNavigationTree(DEMO.component, DEMO.props), [])
  return (
    <div
      style={{
        border: "1px solid var(--surface-3)",
        borderRadius: 8,
        padding: 10,
        margin: "20px 0",
        background: "var(--surface-1)",
      }}
    >
      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 6px 8px" }}>
        Tab into the tree. Up/Down moves, Right expands, and Left collapses or returns to a parent.
        The tree is shown visually here; it can also be presented for screen readers.
      </p>
      <AccessibleNavTree tree={tree} label="Sales by region — navigable structure" visible />
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        Suppose you want to compare two sales regions without looking at the chart. An exact-value
        table lets you retrieve a number. A navigation tree adds another route: hear an overview,
        choose a region, then inspect its months. You decide how much detail to open.
      </p>
      <h2 id="why-care">Why this matters</h2>
      <p>
        Different questions need different reading tools. A table is useful for looking up or
        comparing exact values, while a long list can make it harder to discover the structure.
        Research tools such as <a href="https://mitvis.github.io/olli/">Olli</a> and
        <a href="https://www.frank.computer/data-navigator/"> Data Navigator</a> explore ways to
        navigate a visualization through a separate, meaningful structure. Semiotic's tree applies
        that idea to the chart configuration.
      </p>
      <h2 id="the-thing">Walk from the overview to one value</h2>
      <p>
        This demo shows the navigation tree for two synthetic sales series. Press Tab to enter it.
        Use Up and Down to move between visible items, Right to expand a branch, and Left to close
        it or return to its parent. Open the West series and find March: sales are 6,800. The East
        series gives you the same months to compare.
      </p>
      <NavDemo />
      <p>
        A collapsed series carries a summary, so you can decide whether to explore it. Its points
        have labels and positions within the group. Home and End move to the first and last visible
        items. These are the standard tree controls; the instructions do not depend on seeing a
        highlight or using a pointer.
      </p>
      <h2 id="how-it-works">How it works</h2>
      <p>
        <code>buildNavigationTree</code> reads a chart configuration and returns a navigation model.{" "}
        <code>AccessibleNavTree</code> renders that model as real HTML with ARIA tree semantics. The
        structure can sit beside a canvas drawing because it describes the data, rather than asking
        assistive technology to recover meaning from pixels.
      </p>
      <h2 id="when">When to reach for it</h2>
      <p>
        Use structured navigation when groups, series, or hierarchy help a reader choose where to
        look next. Keep an exact-value table for lookup and comparison, and add an authored summary
        for the main point. For a single value, a clear label and explanation are usually enough.
        Check the component's navigation support before promising the same structure for every chart
        family.
      </p>
      <h2 id="wiring">Wiring it up</h2>
      <pre
        style={{ background: "var(--surface-1)", padding: 16, overflowX: "auto" }}
      >{`<ChartContainer
  chartConfig={{ component: "LineChart", props }}
  navigable
  describe
>
  <LineChart {...props} />
</ChartContainer>`}</pre>
      <p>
        The container adds the navigation and generated description when requested. Individual
        charts expose their own documented keyboard and table behavior; adding this richer tree is a
        separate choice. For an application-owned layout, render
        <code> AccessibleNavTree</code> yourself and use <code>onActiveChange</code> to respond when
        the reader moves.
      </p>
      <h2 id="sync">Keep readers on the same item</h2>
      <p>
        <code>useNavigationSync</code> can coordinate the active tree item with chart observation
        and selection. This lets a keyboard user and a collaborator looking at the chart discuss the
        same datum. The <Link to="/accessibility/navigation">navigation reference</Link> shows the
        extra wiring; the standalone tree above demonstrates navigation only.
      </p>
      <h2 id="other-domains">Other places this helps</h2>
      <p>
        The overview-to-detail path is useful for a dashboard's series, an organization chart's
        departments, and a map's regional groups. Choose the grouping that helps someone answer a
        question, then test it with the readers and assistive technologies you intend to support.
      </p>
      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/accessibility/navigation">Structured navigation reference</Link>
        </li>
        <li>
          <Link to="/accessibility/descriptions">Chart descriptions</Link>
        </li>
        <li>
          <a href="https://www.frank.computer/data-navigator/">Data Navigator research and demos</a>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "navigating-a-chart-you-cant-see",
  title: "Navigating a Chart You Can't See",
  subtitle:
    "Give readers a path from the whole chart to a series and an exact value, using a keyboard and a screen reader.",
  author: "Elijah Meeks",
  date: "2026-06-15",
  tags: ["case-study", "accessibility"],
  excerpt:
    "A table supports exact lookup; a navigation tree helps reveal the structure. Try a two-region sales example and learn how to offer both an overview and detail on demand.",
  component: Body,
  ogChart: { component: "LineChart" },
}
