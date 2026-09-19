# 04 — Eval

> Must run in under 3 hours total. Full-scope targets below; solo plan (`06-cuts.md`) shrinks item counts — protocol, metrics, and success criteria are unchanged.

## Synthetic data generation

- **Demo data:** none needed — the candidate speaks live. Only pre-generated artifact is `cachedFallback.json`: one full 5-question session (with follow-ups + 1 retry) recorded via `scripts/seed-cached-fallback.ts`, used only if live APIs fail mid-demo.
- **Eval dataset (`eval/dataset.json`):** hand-written, never model-generated ("label before running any model"). Each entry is a full per-question dialogue — `{id, question, dialogue_turns: [{speaker, text}], expected_score, expected_category}` — because scoring happens over the whole exchange. Tiers per question: non-answer ("I don't know" → ~0), vague/short (10–40), relevant-but-generic (50–69), detailed-and-owned (70–89), hand-crafted excellent exemplar (90–100).
- **Routing edge cases (`eval/edge_cases.json`):** hand-written scenarios — turn at cap (must finalize regardless of quality), strong first answer (finalize at turn 0, no follow-up), weak first answer (probe `elaborate_generic`), weak second answer after generic nudge (targeted type, not another generic), answer with zero first-person language. Each: `{id, question, dialogue_turns, turn_number, expected_next_action, expected_follow_up_type_or_null}`.
- **Solo-scoped counts:** 12 scoring dialogues (2 questions × 3 tiers × 2 variants), 8 routing cases. Full-scope target: 24 dialogues, 16 routing cases.

## Protocol

| Test | Dataset | Metric | Method |
|---|---|---|---|
| Score agreement | `eval/dataset.json` | % within ±10 of `expected_score` | Run all 3 evaluators, diff vs expected |
| Category agreement | same | % exact `category` match | Stricter secondary check (a ±10 score can still cross a boundary) |
| Follow-up routing | `eval/edge_cases.json` | % matching `expected_next_action` (+ type) | Nemotron pipeline + rules baseline only (generic-prompt has no route field → N/A) |
| Evidence grounding | all finalized dialogues | % of `evidence` spans that are exact transcript substrings | Reuse live guardrail code (`evidenceCheck.ts`) — also validates the guardrail itself |
| Latency | 10 live turns in rehearsal | Median mic-stop → audio-playback-start, probe vs finalize separately | `console.time` around orchestration in `answer.ts` |

## Baselines

1. **Rules baseline** (`03-prompts.md`) — pure heuristics, zero model call.
2. **Generic prompt** — same Nemotron model, unstructured ask. Returns free text; assign closest score/category manually during eval (documented as a human-rater step in the results footnote).
3. **Nemotron pipeline** — the actual product (prompt + guardrails).

## Success criteria (set BEFORE running — never adjust after)

- Score agreement (±10): **≥ 75%**
- Category agreement (exact): **≥ 70%**
- Routing valid-route rate: **≥ 85%**
- Evidence grounding: **100%** of presented spans (by construction — ungrounded output is rejected); the reported number is **fallback rate < 20%**
- Latency: median **< 3.5s** probe turns, **< 5s** finalize turns (team-set bar: "does not break conversational flow")

Report actual observed values in `eval/results.json`. A miss becomes the documented failure case below — never a discarded run.

## Judge-facing presentation

- **5-row table** (subset incl. at least one win and one miss): `question | dialogue (truncated) | expected score/category | rules baseline | nemotron decision | quoted evidence`.
- **One miss**, written up in `docs/failure-story.md`, e.g.: "the evaluator scored a polished-but-content-free answer too high → tightened score-band language in the system prompt ('non-answer scores near 0') + added score/category consistency guardrail → re-ran → showed corrected output side by side."
