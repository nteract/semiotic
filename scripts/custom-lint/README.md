# Semiotic custom lint lifecycle

Custom lints are blocking CI contracts, including unstable candidates. A
failure is a review prompt for both the code and the rule; do not assume either
is correct merely because CI emitted the finding.

## Required disposition

Every new finding must produce one or more of these outcomes:

1. **Fix bug.** Correct the code or test. For an unstable rule, add a
   `confirmed_bug` evidence event to `registry.json` with a reviewable issue,
   PR, or commit reference.
2. **Change rule.** Adjust its scope, demote it, or retire it. Record
   `false_positive`, `unsafe_remediation`, `excessive_noise`, `redundant`, or
   `rule_revision` evidence before accepting changed baseline findings.
3. **Promote rule.** Promotion never resolves the finding by itself. It
   requires `10/10`, at least five positive events with distinct references,
   focused rule tests, and zero grandfathered findings.

Combinations are expected. A real bug may expose an imprecise message; fix the
bug and revise the rule, recording both observations.

## Evidence score

Rules begin at `5/10`. Scores are derived from the append-only evidence ledger
and bounded from zero to ten.

| Evidence | Weight |
| --- | ---: |
| Confirmed bug | +1 |
| Prevented regression | +1 |
| False positive | -2 |
| Unsafe or behavior-changing remediation | -3 |
| Excessive noise | -1 |
| Redundant with a stronger contract | -2 |
| Rule revision | 0 |

At zero a rule must be retained as a `retired` registry tombstone so its history
is not silently erased. An official rule that falls below ten is demoted to
`unstable`. A candidate can remain unstable at ten while grandfathered findings
are being eliminated.

The heavier negative weights encode asymmetric risk: one plausible match is
weak evidence for a general rule, while a false positive or unsafe suggested
fix directly challenges whether the rule belongs in a blocking gate.

## Baseline ratchet

The baseline is an adoption mechanism, not a general suppression file. New
findings fail. Removed findings also fail until their cleanup is acknowledged,
similar to Rust's fulfilled lint expectations.

```sh
npm run check:custom-lints
npm run lint:custom:sync-fixes
npm run lint:custom:sync-rule-change
```

`sync-fixes` can only remove findings. `sync-rule-change` requires new negative
or revision evidence for every affected rule. Do not edit `baseline.json` by
hand.

## Prior art

- Rust lint levels separate allowed, warning, denied, and forbidden policy and
  support reasons plus fulfilled expectations:
  https://doc.rust-lang.org/stable/rustc/lints/levels.html
- ESLint custom rules carry machine-readable type, documentation, fix, and
  deprecation/replacement metadata:
  https://eslint.org/docs/latest/extend/custom-rules
  https://eslint.org/docs/latest/extend/rule-deprecation
- Clippy requires focused lint documentation and supports scoped lint levels:
  https://doc.rust-lang.org/clippy/development/adding_lints.html
