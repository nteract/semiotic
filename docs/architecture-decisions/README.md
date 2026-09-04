# Information Artifact Architecture Decisions

These records capture consequential choices in the Artifact Contract, its compatibility adapters,
and its evaluation and policy boundaries. They preserve the reason for each choice beside links to
the code and tests that implement it.

## Index

| Record                                                | Status   | Decision                                                                                                            |
| ----------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| [0001](./0001-structured-artifact-purpose.md)         | Accepted | Move analytical and communicative intent into structured artifact purpose while retaining compatibility inputs.     |
| [0002](./0002-responsible-practice-api-boundaries.md) | Accepted | Express responsible practice through descriptive APIs, explicit states, and deterministic-versus-manual boundaries. |
| [0003](./0003-artifact-revision-and-release-boundaries.md) | Accepted | Preserve prior identity and evidence during revision; keep conditional diagnostics separate from release authorization. |

## Convention

- Use a four-digit sequence followed by a short kebab-case title.
- Never reuse a number, including after a record is withdrawn.
- Use `Proposed`, `Accepted`, `Superseded`, or `Withdrawn` as the status.
- Include context, a testable decision, consequences, alternatives, and implementation evidence.
- Correct an accepted record in place only for factual errors. Record a change in direction as a new
  decision that links to the record it supersedes.
