import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        Semiotic 3.12.0 adds network perspectives and accessible controls inside charts, reduces the
        code shipped by named imports, and brings more of the live chart's appearance into server
        exports. Read the{" "}
        <a href="https://github.com/nteract/semiotic/blob/v3.12.0/CHANGELOG.md#3120---2026-09-30">
          full changelog
        </a>{" "}
        for the individual changes.
      </p>

      <h2 id="why-care">A chart can be a place to work</h2>
      <p>
        A network diagram can explain where systems sit and how they connect. A histogram can let a
        reader move a threshold and see the consequences. Those interactions need to remain readable
        with a keyboard, and the exported chart needs to preserve the same visual claim. This
        release extends those possibilities while reducing the cost of importing the charts that
        implement them.
      </p>

      <h2 id="network-perspective">Network perspective</h2>
      <p>
        Every network chart accepts <code>perspective</code>: isometric, pixel, dimetric, military,
        or cabinet projection. The layout retains its coordinates while the finished scene gains
        depth. Hover, tooltips, keyboard focus, annotations, zoom, component SSR, and static SVG
        follow the projected marks.
      </p>
      <p>
        The object form adds elevation, extruded leaf rectangles, ground grids, plates, labelled
        regions, routing, glyphs, and animated transitions.
        <code> semiotic/network/perspective</code> exports glyph builders and
        <code> PerspectiveToggle</code>. Custom layouts can place decorations on the projected
        ground or keep them upright at a node's anchor. The{" "}
        <Link to="/features/perspective">perspective guide</Link> explains the prop shapes and
        fitting behavior.
      </p>
      <p>
        Reach for perspective when depth or a spatial metaphor helps explain a system. Keep a flat
        view for precise comparison of areas and lengths; ProcessSankey's elapsed-time axis is
        especially sensitive to projection. Configuration diagnostics warn about that combination.
      </p>

      <h2 id="direct-manipulation">Direct manipulation controls</h2>
      <p>
        XY and ordinal frames accept <code>interactiveGraphics</code> through
        <code> frameProps</code>. The callback receives scales and
        <code> pointerToPlot</code>, so controls can use the chart's own coordinate system. Their
        focusable SVG layer sits in a labelled group outside the chart's image role, keeping sliders
        exposed to assistive technology.
      </p>
      <p>
        <code>DirectManipulationMarkers</code> supplies ordered handles bounded by their neighbors.
        Coincident handles separate according to drag direction.{" "}
        <code>DirectManipulationControl</code> adds
        <code> pointToValue</code>, <code>stepOrigin</code>, PageUp/PageDown, and keyboard start/end
        callbacks. Use these for thresholds and ranges that readers should adjust in context; use an
        ordinary form control when the setting has no useful relationship to chart geometry. See{" "}
        <Link to="/features/controls">visualization controls</Link>.
      </p>

      <h2 id="smaller-imports">Smaller named imports</h2>
      <p>
        Named imports now discard unrelated charts from shared published chunks. Components retain
        their DevTools names, and plugin registration happens when charts render. XY animation
        interpolation also loads on demand. The README's cold-consumer table separates initial-load
        gzip from code fetched later, so it better reflects a code-splitting application.
      </p>
      <p>
        Continue using family imports such as <code>semiotic/xy</code> and
        <code> semiotic/network</code>. No import migration is required to benefit from the improved
        tree-shaking.
      </p>

      <h2 id="rendering">Rendering, annotations, and tooltips</h2>
      <ul>
        <li>
          Component SSR paints final data geometry even when intro animation is enabled. Static
          backgrounds, force-graph category colors, and curved edge opacity more closely match the
          live chart.
        </li>
        <li>
          Canvas and SVG hatches share angle, spacing, and opacity behavior. AreaChart semantic
          gradients follow the y-domain; custom area gradients can opt in with{" "}
          <code>extent: "domain"</code>.
        </li>
        <li>
          Threshold and band annotations accept <code>labelColor</code>. RealtimeHistogram and
          TemporalHistogram accept <code>valueBands</code>
          for unstacked bars, preserving one bin datum per mark.
        </li>
        <li>
          Tooltip placement transitions ease same-side movement and skip the first placement and
          flips. Compact legends preserve room for the plot, and keyboard-focused data-table links
          remain visible.
        </li>
        <li>
          Validation and CLI doctor diagnostics suggest corrections for unknown axis keys and likely
          annotation field typos.
        </li>
      </ul>

      <h2 id="upgrade-notes">Upgrade notes</h2>
      <p>
        Install with <code>npm install semiotic@3.12.0</code>. The new APIs are additive; review
        these corrected behaviors when updating visual snapshots or handling control events:
      </p>
      <ul>
        <li>
          <strong>Hatches:</strong> positive angles turn clockwise from horizontal on both backends.
          SVG's previous direction was mirrored. Canvas hatches at ±45° are about 1.4 times sparser;
          divide spacing by 1.41 to preserve the old density. The recipe kit's SVG{" "}
          <code>hatchFill</code> helper retains its separate angle convention measured from
          vertical.
        </li>
        <li>
          <strong>Controls:</strong> keyboard changes now fire
          <code> onChangeStart</code> and <code>onChangeEnd</code>. Consumers that commit on release
          should handle those events for keyboard input too. The default slider announcement uses
          its standard role; supply
          <code> ariaRoleDescription</code> only when you need a custom one.
        </li>
        <li>
          <strong>Server output:</strong> animated charts now export their final state. Check
          snapshots affected by hatch direction, semantic gradient stops, backgrounds, category
          colors, or compact legend reservations.
        </li>
        <li>
          <strong>Low-level network frames:</strong> a bare force frame restores its built-in layout
          on demand in the browser. Server rendering still needs explicit{" "}
          <code>registerBuiltInNetworkLayouts()</code>.
        </li>
      </ul>
      <p>
        The <Link to="/migration">migration guide</Link> covers the broader version-3 API. The
        tagged changelog above records this minor release's behavior changes.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/features/perspective">Network perspective reference</Link>
        </li>
        <li>
          <Link to="/features/controls">Visualization controls</Link>
        </li>
        <li>
          <Link to="/accessibility">Accessibility guidance</Link>
        </li>
        <li>
          <Link to="/features/tooltips">Tooltip configuration</Link>
        </li>
        <li>
          <Link to="/blog/release-3-11-0">Semiotic 3.11.0</Link>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "release-3-12-0",
  title: "Semiotic 3.12.0",
  subtitle: "Network perspectives, accessible direct manipulation, and smaller chart imports.",
  author: "Semiotic Team",
  date: "2026-09-30",
  tags: ["release"],
  excerpt:
    "3.12.0 adds projected network scenes and in-chart controls that work with pointer and keyboard input. Named imports ship less code, and rendering fixes keep hatches, gradients, annotations, and server exports consistent with the live chart.",
  component: Body,
}
