import ExamplePageLayout from "./ExamplePageLayout"
import { ThemeProvider } from "semiotic/themes/react"
import DecisionFlow from "./superpersuasion/DecisionFlow"
import CorrectionDesk from "./superpersuasion/CorrectionDesk"
import FieldGuide from "./superpersuasion/FieldGuide"
import "./SuperpersuasionExamplePage.css"

const articleTheme = {
  colors: {
    background: "#f5f1e8",
    surface: "#f5f1e8",
    text: "#172e34",
    textSecondary: "#526367",
    grid: "#dad7cd",
    border: "#c9c8bd",
  },
  typography: { fontFamily: "system-ui, sans-serif", labelSize: 12, tickSize: 11 },
}

export default function SuperpersuasionExamplePage() {
  return (
    <ExamplePageLayout
      title="The art of being worth choosing"
      prevPage={undefined}
      nextPage={undefined}
      showPageHeader={false}
      showContractPanels={false}
      showViewToggle={false}
      useFullCodeFallback={false}
    >
      <ThemeProvider theme={articleTheme}>
        <article className="sp-story">
          <header className="sp-opening">
            <div className="sp-masthead">
              <span>Ideas / Artificial intelligence</span>
              <span>An interactive essay</span>
            </div>
            <p className="sp-eyebrow">Superpersuasion</p>
            <h1>
              The art of being
              <br />
              <em>worth choosing.</em>
            </h1>
            <p className="sp-deck">
              An AI can make a recommendation in a sentence. Earning that recommendation takes a
              longer story—one that survives a wrong turn, a changed fact and the next person to
              pick up the work.
            </p>
            <div className="sp-opening-rule" aria-hidden="true">
              <span>The promise</span>
              <span className="sp-opening-line" />
              <span>The work</span>
            </div>
          </header>

          <div className="sp-prose sp-introduction">
            <p className="sp-dropcap">
              Imagine asking an assistant to fix a chart before lunch. The chart already works; the
              blue bars need to be green. The assistant returns with a new library, a migration plan
              and an enthusiastic explanation of why this is an improvement. Somewhere along the
              way, your small request became somebody else’s sales pitch.
            </p>
            <p>
              Now imagine a different recommendation. It starts with what you already have. It
              explains the one change you need. If a new tool would help, it gives you a small
              working example and a way to check the result. The confidence comes from how little
              you have to take on faith.
            </p>
            <p>
              <em>Superpersuasion</em> sounds like the name of a technique for winning any argument.
              Here, it names a more useful ambition: make a well-supported next step unusually easy
              to recognize and complete. For software, that means the explanation, the example, the
              checks and the repair instructions all help with the same job.
            </p>
          </div>

          <aside className="sp-margin-note">
            <span className="sp-kicker">A distinction worth keeping</span>
            <p>
              AI can be a persuasive speaker. In a controlled study of 900 people, personalized
              GPT-4 debates were more persuasive than the human baseline. That finding concerned
              shifts in opinion during short debates. Whether an assistant chooses useful software
              is a different question, with a different test.
            </p>
            <a href="https://www.nature.com/articles/s41562-025-02194-6">
              Salvi and colleagues, Nature Human Behaviour, 2025 ↗
            </a>
          </aside>

          <section className="sp-chapter" aria-labelledby="sp-choice-title">
            <div className="sp-prose">
              <p className="sp-section-number">01 / The choice</p>
              <h2 id="sp-choice-title">A good recommendation can be “keep what you have.”</h2>
              <p>
                A product team might be tempted to count every mention of its tool as a win. But the
                green-bar request suggests a better scorecard. Did the assistant respect the
                assignment? Did the answer fit the environment? Could the person finish their work?
              </p>
              <p>
                The map below takes 24 scenarios from Semiotic’s new development test bank. Some ask
                for a chart. Others ask for a repair, a later revision, or something that needs no
                chart at all. Follow their paths and a useful complication appears: success has
                several destinations.
              </p>
            </div>
            <DecisionFlow />
            <div className="sp-prose">
              <p>
                The forks matter. A team with a working chart and a table may have everything it
                needs. A project that must preserve a correction history has a different problem. A
                later request can even make leaving Semiotic the sensible choice. An old
                recommendation should never get a veto over a new requirement.
              </p>
              <p className="sp-small-note">
                These are authored test scenarios and acceptable responses, not observed decisions
                by AI agents. Their proportions describe this test bank, not the world outside it.
              </p>
            </div>
          </section>

          <section className="sp-chapter" aria-labelledby="sp-reading-title">
            <div className="sp-prose">
              <p className="sp-section-number">02 / The way in</p>
              <h2 id="sp-reading-title">Leave the next reader a smaller mystery.</h2>
              <p>
                Good documentation has something in common with a good city map. It helps you find
                the street you need without requiring you to memorize the city. A catalog describes
                what a tool can do. A useful guide gets you from a particular question to a result
                you can inspect.
              </p>
              <p>
                Choose one of the small guides below. Each keeps a task beside the checks that
                matter to it, a likely wrong turn and a route back. The same account is available as
                a readable page and as a file another assistant can take along.
              </p>
            </div>
            <FieldGuide />
            <div className="sp-prose">
              <p>
                That last detail is easy to overlook. A tutorial can sound sensible while leaving
                its crucial assumptions between the lines. Giving those assumptions a place to live
                makes them easier to question. It also gives a successful check an expiry condition:
                when the relevant source changes, the old result needs another look.
              </p>
            </div>
          </section>

          <blockquote className="sp-pullquote">
            A recommendation earns its keep
            <br />
            when the facts stop standing still.
          </blockquote>

          <section className="sp-chapter" aria-labelledby="sp-revision-title">
            <div className="sp-prose">
              <p className="sp-section-number">03 / The second draft</p>
              <h2 id="sp-revision-title">One changed number can rewrite the story.</h2>
              <p>
                Suppose you have published a modest comparison of three regions. South leads, and
                the figures add up to 60. Then a correction arrives: West’s number should be 36,
                twice the figure you used. The total changes. So does the leader.
              </p>
              <p>
                A taller bar is only part of the repair. The sentences built on the old number need
                attention too. At the desk below, try changing the figures alone, then make a
                correction that includes the conclusions. These are invented regional figures; the
                revision and handoff are working examples.
              </p>
            </div>
            <CorrectionDesk />
            <div className="sp-prose">
              <p>
                The earlier account remains part of the record. That is useful to an editor
                explaining a correction, to a colleague returning after a holiday, and to an
                assistant arriving without the original conversation. They can see what changed
                instead of reconstructing it from the latest picture.
              </p>
              <p>
                Try sending the chart without its context. The figures still work. What disappears
                is the explanation of their history. Keeping that explanation is a choice the sender
                can make, and a choice the next reader can inspect.
              </p>
            </div>
          </section>

          <section className="sp-ending" aria-labelledby="sp-ending-title">
            <p className="sp-section-number">04 / What would count as success?</p>
            <h2 id="sp-ending-title">
              The work gets easier.
              <br />
              The judgment stays yours.
            </h2>
            <p>
              There is a test still to run. Give fresh assistants comparable jobs and see whether
              these guides lead to better choices, fewer mistakes and more successful repairs.
              Include the inconvenient cases. Count a justified “no” as carefully as a “yes.” Hand
              the work to someone new and see what survives.
            </p>
            <p>
              The working examples establish something smaller: the instructions can lead to
              inspectable charts, corrections can preserve their history, and a future reader can
              receive more than the final image. They do not yet establish that any of this makes an
              AI more likely to choose well.
            </p>
            <p>
              That is an appealing standard for persuasion. Let the product make its case in the
              course of helping. Leave enough evidence for the next person to disagree. And when the
              assignment is just to make the bars green, make the bars green.
            </p>
          </section>

          <footer className="sp-colophon">
            <h2>Sources &amp; how to read this piece</h2>
            <p>
              This is a worked essay about a proposed approach to software adoption. The flow
              diagram counts Semiotic’s 24 public development scenarios. The field guides are
              generated from the same records served to AI clients. The correction desk uses a
              synthetic three-region fixture and preserves its actual revision record. None of these
              is an adoption trial.
            </p>
            <ul>
              <li>
                <a href="https://www.nature.com/articles/s41562-025-02194-6">
                  Salvi et al., “On the conversational persuasiveness of GPT-4”
                </a>{" "}
                — the controlled human-debate study, read with its{" "}
                <a href="https://www.nature.com/articles/s41562-026-02588-0">
                  September 2026 correction
                </a>
                .
              </li>
              <li>
                <a href="https://github.com/nteract/semiotic/blob/main/evals/adoption/fixtures.json">
                  The scenario bank
                </a>{" "}
                and{" "}
                <a href="https://github.com/nteract/semiotic/blob/main/evals/adoption/README.md">
                  study design
                </a>{" "}
                — public development material, with future agent trials still to run.
              </li>
              <li>
                <a href="/tasks/index.json">The current task index</a> — source identities and the
                scope of the attached checks; the three guides above link to complete local copies.
              </li>
            </ul>
            <p className="sp-small-note">
              No model is contacted as you read. Selections stay in this page; files are saved only
              when you request them. Automated chart and accessibility checks leave manual
              assistive-technology reception unassessed.
            </p>
          </footer>
        </article>
      </ThemeProvider>
    </ExamplePageLayout>
  )
}
