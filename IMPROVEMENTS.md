# Semiotic: Strategic Roadmap & Areas for Improvement

## Executive Summary
Semiotic is a Tier-1 React data visualization library that has successfully carved out a unique niche: **AI-assisted development**. Its deep integration with the Model Context Protocol (MCP), robust JSON schemas, and semantic "behavior contracts" make it the best-in-class choice for the LLM-driven future of software engineering.

However, as the project matures, there are opportunities to evolve from being a **developer tool for building charts** into a **data platform for understanding visualizations**.

---

## 1. Stakeholder Analysis

### 🌍 For the Readers (Visualization Consumers)
*The people looking at the dashboards, monitoring live feeds, and trying to extract meaning from data.*

*   **Interactivity Depth**: While hover and brush are supported, there is a gap in "Exploratory Interactivity." Readers would benefit from built-in zoom/pan for XY charts, drill-down patterns, and "Filter-in-place" UI that doesn't require developer wiring.
*   **Narrative & Insights**: Charts often show *what* happened, but not *why*. Automated labeling of "Key Insights" (e.g., "All-time high," "Outlier detected") should be first-class props rather than manual annotations.
*   **Export Utility**: A standard "Export to CSV/JSON/PNG" button as a first-class feature of the HOC charts would empower non-technical readers.

### 🛠 For the Developers (Maintainers)
*The contributors keeping the engine running and the ecosystem growing.*

*   **Local Development Friction**: Currently, the documentation site imports from the built `dist/` bundle. This requires a full rebuild of the library to see source changes in the docs. Migrating to a **Monorepo / Workspace** (e.g., Turborepo) where the docs site can alias to the `src/` directory would radically improve DX.
*   **Build Complexity**: The `scripts/build.mjs` is a custom Rollup orchestration. While high-performance, it's a barrier to entry for new contributors. Modernizing this with a standard tool like **Vite** or **Rspack** for the website could simplify the setup.
*   **Technical Debt in Frames**: The `StreamXYFrame` and `PipelineStore` are massive (1.7k+ lines). Decomposing these into smaller, functional modules (e.g., a standalone `ScaleManager`, `LayoutEngine`, and `InteractionManager`) would make the core logic easier to test and extend.

### 🤝 For Integration Partners
*Companies and products embedding Semiotic or using its output.*

*   **Design System Synchronization**: Theming is currently proprietary. Supporting **W3C Design Tokens** or providing a direct **Tailwind CSS** plugin to map theme variables to utility classes would make integration into enterprise design systems seamless.
*   **Headless Layout Engine**: Integration partners often want the *math* of Semiotic (the layouts, the scales, the bins) without the *DOM*. Exposing a "Headless" version of `PipelineStore` that works in pure Node or Worker environments without JSDOM would be a game-changer for data processing pipelines.
*   **Bundle Optimization**: The bundle sizes (85KB+ for XY) are large for modern web standards. More aggressive code-splitting (e.g., lazy-loading specific chart types like Candlestick or Swarm) could reduce the initial load for simple use cases.

---

## 2. Core Technical Improvements

### 🎨 Graphical Functionality
*   **Complex Axis Types**: Better support for non-linear scales (Log, Power) and "broken" axes for handling massive outliers.
*   **Touch Optimization**: Improved gesture support for mobile readers (pinch-to-zoom, long-press for tooltips).
*   **Statistical Overlays**: First-class support for LOESS smoothing, confidence intervals, and regression lines as simple props rather than complex annotation objects.

### ⚡ Performance
*   **OffscreenCanvas**: Offloading heavy canvas rendering to Web Workers for charts with >100k data points.
*   **Virtualization**: Virtualizing the `AccessibleDataTable` to prevent DOM bloat when the reader toggle-opens the data view for huge datasets.

### 🤖 AI Integration (The "Assistant" Layer)
*   **Generative Layouts**: Allow the AI to suggest not just the *chart type*, but the *visual priority* (e.g., "Highlight the trend, de-emphasize the points").
*   **Prop Auto-Correction**: The `diagnoseConfig` tool is excellent. The next step is "Auto-Fix" — an AI tool that takes a broken config and returns a corrected one that is guaranteed to render.

---

## 3. The "Hidden" High-Impact Feature: **Conversational Chart Interrogation**

### The Concept
Today, Semiotic helps an AI **build** a chart. The high-impact move is to help an AI **explain** the chart to the reader.

We propose a new component: `<ChatWithChart chart={myChartProps} />` or a prop `interactiveExplain`.

### How it works:
1.  **Context Awareness**: Because Semiotic knows the `schema`, the `data`, and the `intent` (via behavior contracts), it can provide a "narrow" context to an LLM.
2.  **Narrative Interaction**: A reader can ask: *"What was the highest peak in March?"*
3.  **Visual Feedback**: The AI doesn't just answer with text. It returns an **Annotation Object** that Semiotic dynamically renders onto the chart. The chart literally "highlights" what the AI is talking about.
4.  **Why this is huge**: It bridges the gap between **Static Visualization** and **Data Science**. It makes every chart an interactive data analyst. It's the ultimate Accessibility feature: those who can't see the chart can *talk* to it to understand the trends.

### Implementation Path:
*   Leverage the existing `semiotic-mcp` server.
*   Create a "Small Context" generator that extracts the statistical summary of the data (min, max, mean, outliers).
*   Build a UI bridge that turns AI responses into Semiotic `annotations`.

---

*Authored by Gemini CLI for Elijah Meeks*
