import { useState } from "react"
import { Link } from "react-router-dom"
import category from "../../../../public/tasks/compare-category-totals.json"
import live from "../../../../public/tasks/update-live-chart.json"
import correction from "../../../../public/tasks/correct-published-chart.json"

const guides = [
  {
    label: "Compare totals",
    packet: category,
    opening: "Three regions. Three figures. A way to check every bar.",
    question: "Do the picture and the numbers tell the same story?",
    route:
      "Inspect the values, then check the drawn proportions. A chart that appears on screen has cleared only the first hurdle.",
  },
  {
    label: "Keep a chart current",
    packet: live,
    opening: "An observation arrives. Later, someone corrects it.",
    question: "Does the correction replace the old point, or quietly add a second one?",
    route:
      "Give each observation an identity. Then check what survives a pause, a lost connection and a restart.",
  },
  {
    label: "Correct a source",
    packet: correction,
    opening: "One number changes. Two conclusions need another look.",
    question: "Which statements depended on the old figure?",
    route:
      "Revise the data and its affected claims together. Keep the old account available, and leave approval to the person responsible for it.",
  },
]

export default function FieldGuide() {
  const [selected, setSelected] = useState(0)
  const guide = guides[selected]
  const packet = guide.packet
  const current = packet.evidence.status === "supported-in-scope"
  return (
    <aside className="sp-guide" aria-labelledby="sp-guide-title">
      <div className="sp-guide-topline">
        <span className="sp-kicker">A small guide to the next step</span>
        <span>0{selected + 1} / 03</span>
      </div>
      <div className="sp-guide-choices" role="group" aria-label="Choose a field guide">
        {guides.map((item, index) => (
          <button
            type="button"
            key={item.label}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="sp-guide-body" data-testid="sp-selected-guide">
        <p className="sp-guide-opening">{guide.opening}</p>
        <h3 id="sp-guide-title">{guide.question}</h3>
        <p>{guide.route}</p>
        <div className="sp-guide-receipt">
          <span className="sp-receipt-mark" aria-hidden="true">
            ↳
          </span>
          <p>
            <strong>
              {current ? "Checks attached to this edition." : "This edition needs a fresh check."}
            </strong>{" "}
            {current
              ? "The record identifies the source and the tests that ran. It leaves human review and real-world usefulness open."
              : "A result from a different source edition does not automatically carry forward."}
          </p>
        </div>
        <div className="sp-guide-links">
          <Link to={packet.route}>
            Try the complete guide <span aria-hidden="true">↗</span>
          </Link>
          <a href={`/tasks/${packet.id}.json`} download>
            Take the same guide as a file ↓
          </a>
        </div>
        <details>
          <summary>What travels in that file?</summary>
          <p>
            The task, the source edition, complete example files, checks, repairs and limits. The
            readable page and the file come from the same record. An AI can also retrieve it through{" "}
            <code>semiotic://tasks/{packet.id}</code>.
          </p>
          <dl className="sp-guide-facts">
            <div>
              <dt>One expected result</dt>
              <dd>{packet.evidence.expected[0]}</dd>
            </div>
            <div>
              <dt>A question still open</dt>
              <dd>{packet.evidence.unassessed[0]}</dd>
            </div>
            <div>
              <dt>Source version</dt>
              <dd>Semiotic {packet.identity.packageVersion} · source checkout</dd>
            </div>
          </dl>
          <a href={`/tasks/${packet.id}.md`}>Read the plain-text edition</a>
        </details>
      </div>
    </aside>
  )
}
