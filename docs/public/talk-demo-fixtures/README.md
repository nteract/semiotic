# Talk demo fixtures

Deterministic, browser-local inputs for the October 2026 conference demo and its fallback; no file in this directory may require an external request or live model call.

- `trust-loop-proposals.json` drives the accept/refuse trust-loop beat.
- `bimodal-latency.json` drives the BoxPlot → RidgelinePlot model-provenance variant beat; its assessment is committed, not a live call.
- `stale-notes.json` drives the `fresh → aging → stale → expired` annotation scrubber.
- `conference-arc.json` is the typed, hand-authored Stage C recovery arc, including refusal, render evidence, scale, audience, variant, and grounding beats.
