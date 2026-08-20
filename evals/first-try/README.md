# First-try context trial

The first-try suite has two deliberately comparable context profiles:

- `llms`: `ai/reference.md` plus the public `docs/public/llms.txt`.
- `skill`: `ai/reference.md` plus the packaged `agent-skill/semiotic-charts/SKILL.md`.

Run the same fixtures, models, and spend cap once per profile, with separate
trial IDs and output directories. The OpenAI runner requires explicit spend
confirmation; it never starts a paid run by default.

```sh
npm run eval:ai:openai -- \
  --suites first-try \
  --first-try-context llms \
  --trial-id llms \
  --output-dir evals/reports/first-try-llms \
  --max-usd 10 --confirm-spend

npm run eval:ai:openai -- \
  --suites first-try \
  --first-try-context skill \
  --trial-id skill \
  --output-dir evals/reports/first-try-skill \
  --max-usd 10 --confirm-spend
```

Compare only matching model and fixture results. The `line-push` fixture is the
true-push case: its proposal must omit `data`; the evaluator materializes the
provided pushed row only for static validation and render evidence.
