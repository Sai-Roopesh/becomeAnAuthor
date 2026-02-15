# AI Eval Loop

This project now includes a repeatable eval loop for context quality regressions.

## Files

- `docs/ai-evals/context-regression-cases.json`: 60 context-focused eval prompts.
- `scripts/generate-ai-eval-cases.js`: regenerates the 60-case suite.
- `scripts/run-ai-eval-loop.js`: scores model outputs for groundedness, style match, and instruction adherence.

## Workflow

1. Regenerate cases (optional):
   - `node scripts/generate-ai-eval-cases.js`
2. Generate model outputs for each case (from app, script, or manual run) and save as JSON:
   - Object map format: `{ "ctx-001": "...response..." }`
   - Array format: `[ { "id": "ctx-001", "response": "..." } ]`
3. Run scoring:
   - `node scripts/run-ai-eval-loop.js --responses path/to/responses.json`
4. Inspect report:
   - `docs/ai-evals/last-report.json`

## Scoring

Each case is scored on:

- Groundedness (50%): required facts preserved.
- Style match (25%): style hint compliance.
- Instruction adherence (25%): length and refusal penalties.

Use this loop before changing prompt templates or context-packing logic.
