import React, { useState } from "react"
import { niches } from "./niches"
import "./niches.css"

export function UnderstandingProblem() {
  return (
    <section className="edd-understanding" aria-labelledby="edd-understanding-title">
      <div>
        <p className="edd-kicker">The queue after the prototype</p>
        <h2 id="edd-understanding-title">
          We can generate features faster than we can review them.
        </h2>
      </div>
      <div>
        <p>
          A designer builds a convincing prototype. A PM adds another. Engineers generate several
          more. Each arrives with code to understand, but also questions a code review cannot settle
          alone: does it help anyone, which assumptions hold, and what happens outside the demo?
        </p>
        <p>
          Engineering teams inherit those questions together. Asking the creator is no shortcut when
          they have not read much of the code AI wrote. Some of the missing understanding needs to
          be developed for the first time.
        </p>
        <p>
          <strong>The same cheap implementation can create places to learn earlier.</strong> A
          useful design tool or internal application gives people a reason to exercise the feature
          while there is still room to change it.
        </p>
      </div>
    </section>
  )
}

export function LibraryInEcology() {
  return (
    <section className="edd-library" id="edd-rendering-story" aria-labelledby="edd-library-title">
      <div className="edd-section-heading">
        <div>
          <p className="edd-kicker">A requirement that came from surrounding products</p>
          <h2 id="edd-library-title">Why Semiotic needed faithful static charts.</h2>
        </div>
        <p>Development history, as described by Semiotic’s maintainer.</p>
      </div>
      <p className="edd-niche-intro">
        Designers and colleagues needed Semiotic charts in Figma, Slack, and email reports. They
        needed useful charts in the tools where they already worked, without running an interactive
        React application there.
      </p>
      <div className="edd-rendering-definitions">
        <div>
          <p className="edd-kicker">SSR · server-side rendering</p>
          <h3>A chart to place or share.</h3>
          <p>
            The server produces an image or other static representation for a design, message, or
            report.
          </p>
        </div>
        <div>
          <p className="edd-kicker">CSR · client-side rendering</p>
          <h3>A chart to interact with.</h3>
          <p>
            The browser draws the chart inside an application, where it can support interaction and
            live updates.
          </p>
        </div>
      </div>
      <div className="edd-learning-loops">
        <div>
          <p className="edd-kicker">First loop / products shape the library</p>
          <h3>Feedback was getting stuck at the rendering boundary.</h3>
          <p>
            When static output differed from the browser chart, a designer could be reacting to a
            problem unique to the export. Fixing that output mattered, but the finding said less
            about the interactive product. In the maintainer’s account, this need drove work on
            high-fidelity SSR/CSR rendering.
          </p>
        </div>
        <div>
          <p className="edd-kicker">Second loop / the library connects the learning</p>
          <h3>Faithful charts let a finding help more than one product.</h3>
          <p>
            Comparable labels, scales, and layout let people discuss the same visual problem in
            different tools. A design task can expose a shared layout issue; a shared improvement
            can then benefit both the export and the browser panel. The walkthrough below makes this
            second loop concrete with an illustrative label problem.
          </p>
        </div>
      </div>
      <p className="edd-library-thesis">
        Semiotic supplies chart behavior and faithful representations. Surrounding products supply
        tasks, audiences, and support. Their connection brings design, interpretation, and
        engineering questions into the same development process.
      </p>
    </section>
  )
}

export default function NicheExplorer() {
  const [nicheId, setNicheId] = useState("plugins")
  const niche = niches.find((item) => item.id === nicheId) ?? niches[0]
  return (
    <section className="edd-niches" id="edd-niches" aria-labelledby="edd-niches-title">
      <div className="edd-section-heading">
        <div>
          <p className="edd-kicker">Useful products and their commitments</p>
          <h2 id="edd-niches-title">Useful before production.</h2>
        </div>
        <p>People participate because the tool helps them now.</p>
      </div>
      <p className="edd-niche-intro">
        Each product occupies a niche: an audience doing a job under a particular commitment. An
        SLA, or service-level agreement, says what people can rely on and what happens when it
        fails. For a small experimental tool, a few clear sentences can be enough.
      </p>
      <div className="edd-value-band">
        <p>
          <span>Reliability</span>
          <strong>Does it hold up?</strong>
        </p>
        <p>
          <span>Usefulness</span>
          <strong>Does it help?</strong>
        </p>
        <p>
          <span>Support</span>
          <strong>What happens when it fails?</strong>
        </p>
      </div>
      <p className="edd-scene-footnote">
        These reference commitments illustrate the offer each product makes. Actual owners agree on
        scope and support before inviting participants.
      </p>
      <div className="edd-niche-layout">
        <div className="edd-niche-picker" role="group" aria-label="Choose a product use">
          {niches.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={nicheId === item.id}
              aria-controls="edd-niche-detail"
              className={item.id === "production" ? "edd-production-choice" : undefined}
              onClick={() => setNicheId(item.id)}
            >
              <strong>{item.label}</strong>
              <span aria-hidden="true">↗</span>
            </button>
          ))}
          <p>These products can coexist. Each can remain useful on its own.</p>
        </div>
        <div
          className="edd-niche-detail"
          id="edd-niche-detail"
          role="region"
          aria-labelledby="edd-product-title"
        >
          <header>
            <p className="edd-kicker">{niche.label}</p>
            <h3 id="edd-product-title">{niche.task}</h3>
          </header>
          <div className="edd-product-value">
            <h4>What you can do here</h4>
            <p>{niche.valueNow}</p>
          </div>
          <div className="edd-product-learning">
            <h4>What we learn from it</h4>
            <p>{niche.learning}</p>
            <p className="edd-small">Findings help: {niche.benefits.join(" · ")}</p>
          </div>
          <div className="edd-niche-sla">
            <p className="edd-kicker">The service commitment</p>
            <h4>What you can rely on</h4>
            <p>{niche.commitment.mustWork}</p>
            <p className="edd-rough-edges">
              <strong>Room to experiment:</strong> {niche.commitment.tolerableRoughEdges}
            </p>
            <h4>If it fails</h4>
            <p>{niche.commitment.response}</p>
            <p className="edd-niche-response">{niche.commitment.stopOrFallback}</p>
          </div>
          <details className="edd-disclosure" key={niche.id}>
            <summary>Audience, context, and stronger uses</summary>
            <dl className="edd-niche-facts">
              <div>
                <dt>Audience</dt>
                <dd>{niche.audience}</dd>
              </div>
              <div>
                <dt>Context</dt>
                <dd>{niche.details.context}</dd>
              </div>
              <div>
                <dt>Access & limits</dt>
                <dd>{niche.details.limitations}</dd>
              </div>
              <div>
                <dt>Who responds</dt>
                <dd>{niche.details.ownerRole}</dd>
              </div>
              <div>
                <dt>Before wider use</dt>
                <dd>{niche.details.reviewBeforeStrongerUse}</dd>
              </div>
            </dl>
          </details>
        </div>
      </div>
      <p className="edd-sr-only" role="status">
        Showing {niche.label} and its service commitment.
      </p>
      <p className="edd-niche-transfer">
        Narrower tasks and recoverable failures create room for lighter formal review. Meaning and
        promised support still need to hold. Stronger expectations call for more informed review;
        “internal,” “open source,” and “beta” are not automatic exemptions.
      </p>
    </section>
  )
}
