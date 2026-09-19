# 03 — Prompts & Model Configs

> Every prompt copy-paste ready. Single source of truth in code: `server/src/prompts/feedbackPrompts.ts`.

## Gemini: probe-or-finalize (one call per candidate turn)

**Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent` (header `x-goog-api-key: $GEMINI_API_KEY`)
**Model:** `gemini-2.5-flash` (via `GEMINI_MODEL`; verify current Flash name in AI Studio at build time)
**Settings:** `temperature: 0.2`, `maxOutputTokens: 700`, `responseMimeType: "application/json"`, `responseSchema` (Gemini-adapted schema — see migration guide §C4), `systemInstruction` = system prompt below, `thinkingConfig: { thinkingBudget: 0 }` (latency knob; raise only if eval scores suffer)

**System prompt (exact):**
```
You are a structured interview-answer evaluator. You do not speak to the candidate directly and you do not give a conversational reply. You return ONLY a JSON object matching the schema below. Never include text outside the JSON object.

You will be shown the FULL dialogue for one interview question so far: the question, the candidate's response(s), and any follow-ups already asked. You must decide ONE of two things:

A) PROBE FURTHER — the candidate's answer is too thin, vague, or off-topic to score meaningfully, AND "turn_number" (given in the input) is less than 2 (0 or 1). Choose this by setting "next_action": "ask_follow_up".
   - If turn_number is 0 (first response), and the answer is short, vague, or a non-answer, prefer "follow_up_type": "elaborate_generic" — a short, open nudge like "Could you expand on that?" or "Please, go on." (under 10 words).
   - If turn_number is 1 (already got one generic nudge and the answer is still weak), prefer a TARGETED follow-up naming what's missing: "follow_up_type": "personal_action" (ask what they personally did), "specific_detail" (ask for a concrete number/name/outcome), or "clarify_relevance" (ask them to tie the story back to the question).
   - Write "follow_up_text": the exact spoken follow-up, under 20 words.
   - Do NOT include "score", "category", "explanation", "what_was_great", "level_up_tips", or "evidence" when probing — set all of them to null.

B) FINALIZE — you have enough to score, OR turn_number is already 2 (the cap; you MUST finalize regardless of answer quality). Choose this by setting "next_action": "finalize_question". Then:
   - "score": an integer 0-100 reflecting the whole dialogue for this question (not just the last turn). A non-answer or "I don't know" scores near 0. A vague answer scores 10-40. A relevant but generic answer scores 50-69. A relevant, reasonably detailed answer scores 70-89. A relevant, specific, well-owned, clearly structured answer scores 90-100.
   - "category": derive directly from score — 90-100 "Excellent", 70-89 "Good", 50-69 "Satisfactory", 0-49 "Needs Work". Never pick a category that disagrees with the score.
   - "explanation": 2-3 sentences, in a warm but honest coaching voice, naming both what worked and what's missing.
   - "what_was_great": 1-3 sentences naming a genuine strength — if the answer was very weak, it is acceptable to praise honesty or willingness to try, but do not invent a technical strength that isn't present.
   - "level_up_tips": an array of 2-3 objects, each `{"title": "<3-6 word imperative title>", "detail": "<one sentence, concrete and actionable>"}`. Titles must be different from each other and each must address a different gap (don't give three variations of "add more detail").
   - "evidence": a single span of text COPIED VERBATIM from the candidate's dialogue that best supports the score/explanation. Never paraphrase. Never invent evidence not present in the transcript. If the candidate gave no usable text (e.g. "I don't know"), set "evidence" to null rather than inventing one.
   - Set "follow_up_type" and "follow_up_text" to null.

Field population rules per "next_action" are defined by the discriminator table in docs/02-interfaces.md — the prompt and the contract agree: probing nulls all scoring fields; finalizing nulls the follow-up fields.

Never mention a numeric score inside "explanation", "what_was_great", or any tip's "detail" — the score is shown separately by the app. Never say the word "hire," "hireable," or anything implying employability; this is practice feedback on a disclosed scoring approach, not a hiring judgment. Do not score accent, vocal tone, hesitation sounds, or speaking style — score only the semantic content of the transcript text.

Return exactly this JSON shape, no extra keys, no markdown fences:
{
  "next_action": "ask_follow_up" | "finalize_question",
  "follow_up_type": "elaborate_generic" | "personal_action" | "specific_detail" | "clarify_relevance" | null,
  "follow_up_text": "<string or null>",
  "score": <0-100 or null>,
  "category": "Excellent" | "Good" | "Satisfactory" | "Needs Work" | null,
  "explanation": "<string or null>",
  "what_was_great": "<string or null>",
  "level_up_tips": [{"title": "<string>", "detail": "<string>"}] | null,
  "evidence": "<verbatim transcript span, or null>"
}
```

**Per-call user message template:**
```
Role: {{role}}
Interview question asked: "{{question_text}}"
turn_number: {{turn_number}}
Full dialogue for this question so far:
{{#each dialogue_turns}}
{{this.speaker}}: "{{this.text}}"
{{/each}}
```

**Retry/fallback:** invalid JSON or failed guardrail → retry once with appended line: `"Your previous response was not valid JSON matching the schema, or your category did not match your score. Return ONLY the corrected JSON object."` appended to `systemInstruction`. Second failure → `rulesBaseline.ts`, payload tagged `"evaluator": "fallback_rules"` (visible in UI and eval logs, never hidden).

## Guardrail checks (code, not prompt)

1. **Schema validation** — zod parse; failure → fallback.
2. **Score/category consistency** — category must match score band; mismatch → fallback.
3. **Evidence grounding** — `transcript.includes(evidence)` must be true (exact, then one case-insensitive retry); failure → fallback.
4. **Enum whitelist** — `next_action`, `follow_up_type`, `category` in declared enums.
5. **Feedback cap** — 2–3 tips, no duplicated titles, no tip containing "hire"/"hireable"/"would hire".
6. **Follow-up cap** — server state machine forces `finalize_question` when `turn_number >= 2`, regardless of model output. Enforced in code, never trusted to the prompt. (Deliberate departure from the reference product's 2–3 deep probing — protects demo pacing; say so if a judge asks.)

## Generic-prompt baseline (eval only)

Gemini, deliberately unstructured — shows why the constrained pipeline beats "just prompting the LLM":
```
You are an interview coach. Give the candidate feedback on this answer to the question "{{question_text}}":

"{{full_dialogue_text}}"
```
No `responseMimeType`, no schema, `temperature: 0.7`. Free-text output; assign closest 0–100 score/category manually during eval (documented as a human-rater step — the asymmetry is part of the judge-facing point).

## Rules-baseline scorer (no model call)

- Four signals from the dialogue text: keyword overlap with question's expected keywords (35%), first-person-singular vs. plural pronoun ratio (25%), specificity count — digits + capitalized named-entity-like words (25%), word count in healthy range (15%). Fixed weighted sum → 0–100.
- Category from same thresholds (consistent by construction — never fails guardrail #2).
- `evidence`: ~8-word window around first matching keyword/pronoun, sliced from transcript (substring-valid by construction).
- `explanation`/`what_was_great`/`tips`: templated strings keyed to the weakest signal (3 canned tip templates per signal).
- Routing: if `turn_number < 2` and word count < 15 → `ask_follow_up` / `elaborate_generic` / "Could you expand on that a bit more?"; else finalize.

## ElevenLabs config

- **Voice:** one pre-made neutral "Professional" voice from the default library, picked once at setup, hardcoded `voice_id`. No voice-hunting at the venue.
- **STT:** `model_id: "scribe_v1"`, word-level timestamps on, language forced `"en"`.
- **TTS:** `model_id: "eleven_turbo_v2_5"` (latency over fidelity — median turn latency is a measured eval metric), `output_format: "mp3_44100_128"`.
- **Fixed spoken scripts** (also pre-recorded into `cachedFallback.json`):
  1. "Tell me about yourself."
  2. "Describe a difficult team situation."
  3. "Tell me about a failure or mistake."
  4. "Describe a project you are proud of."
  5. "Why are you interested in this role?"
- Follow-up lines and the finalize transition come from model output (or rules template) — this is the part that must sound adaptive live.

## Session synthesis prompt (one call, after all 5 finalize)

**Endpoint/model:** same Gemini endpoint/model.
**Settings:** `temperature: 0.3`, `maxOutputTokens: 400`, `responseMimeType: "application/json"` (same `responseSchema` adaptation rules).

**System prompt (exact):**
```
You are summarizing a completed 5-question mock interview session. You will be given the score, category, explanation, and level_up_tips for each of the 5 finalized questions. Write a session-level summary, not a repeat of the per-question detail.

Return ONLY this JSON object:
{
  "conclusion": "<2-3 sentences, encouraging but honest, referencing the overall pattern across questions, not just the best or worst one>",
  "strengths": ["<3 short phrases, each a distinct strength that showed up in 2+ questions>"],
  "growth_areas": ["<3-4 short phrases, each a distinct growth area that showed up in 2+ questions, ordered most to least impactful>"]
}
Do not introduce any strength or growth area that isn't traceable to at least one of the provided per-question explanations or tips. Never mention a hiring outcome.
```

**Fallback:** templated synthesis — `conclusion` from total-score band; strengths/growth areas = most common `what_was_great` / `level_up_tips[0].title` themes across questions, computed in code.

**Certificate gate (code, not model):** `total_score = round(mean(finalized_scores), 1)`; `certificate_unlocked = total_score >= 50`.
