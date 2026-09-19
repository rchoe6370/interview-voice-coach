# 00 — Overview

> Plan of record: Interview Voice Coach (SteelHacks 24h). This doc is the concept, tracks, credits, and scope. Build docs: `01-architecture.md` → `06-cuts.md`.

## Concept

A spoken mock-interview coach. A candidate answers five behavioral questions out loud through the browser microphone. After each spoken turn, a Gemini-backed decision engine decides whether the answer is thin enough to probe further (up to two follow-ups: a generic nudge first, then a targeted nudge naming what's missing) or whether it has enough to finalize. On finalize, it scores the whole per-question exchange 0–100, maps to a category (Excellent/Good/Satisfactory/Needs Work), and returns a three-part feedback bundle — explanation, "what was great," and 2–3 labeled "level up" tips — every score and tip grounded in a quoted transcript span. After all five questions: session synthesis (total score, overall category, conclusion, aggregate strengths/growth areas), a certificate gated on a score threshold, then a retry of the single weakest question with a before/after score comparison.

Primary users: students and early-career candidates. Buyer: university career-services offices and bootcamps.

## Target tracks

| Track | Stacking |
|---|---|
| ElevenLabs Track | Voice (STT+TTS) is in the critical path of every turn |
| Best Use of Gemini API (MLH) | Feedback engine: routing + scoring as structured JSON via responseSchema, never chat — free-tier AI Studio |
| Best .Tech Domain Name (MLH) | Claimed .tech domain serves the static showcase build; domain on the Devpost submission |
| Seed Round | Named buyer, working retry loop as evidence, explicit next validation step |

## Assumptions (locked)

- **Solo builder.** Hour plan (§`06-cuts.md`) is sequential — no parallel roles, only self-checkpoints. Eval harness is smaller, retry loop simplified, UI stretch goals cut.
- **Gemini = `gemini-2.5-flash`** via Google AI Studio REST (`generativelanguage.googleapis.com`), structured output via `responseMimeType: "application/json"` + `responseSchema`. Swap via `GEMINI_MODEL` env var (verify the current Flash model name in AI Studio at build time); integration code doesn't change. Stay on Flash for all live turns — free-tier rate limits are the constraint.
- **Hardware: considered, not included.** A push-to-talk Arduino button was cut — it's I/O sugar and a demo-day failure point for a solo build. Software-only.

## Tooling & credits (confirmed)

| Resource | Decision |
|---|---|
| Claude API credit ($25) | AI coding help via Cline/Continue (VS Code, bring-your-own-key) — Cursor-like without a subscription |
| GitHub Student Pack | Free Copilot Pro with Pitt .edu email — activate before the event regardless |
| Google AI Studio (free tier) | **Use this** for Gemini — key from aistudio.google.com, $0 model spend for the whole build |
| NVIDIA Brev GPU credit ($60) | **Not used.** Self-hosting a NIM container is 2–4h of setup risk with no upside for the tracks. Expires 9/22 — spend on a personal experiment after, not the hackathon |
| ElevenLabs Creator (1 month free) | Use as-is — covers build, rehearsal, demo quota |
| Vercel credit ($30) | **Used for the .tech showcase**: static build of the client in showcase mode (replays `cachedFallback.json`, zero backend calls) deployed to the claimed .tech domain at hour 21–22. Live judged demo stays local. |

## Minimum Viable Demo vs. stretch

| MVD (must exist by hour 14) | Stretch (only if ahead) |
|---|---|
| 1 role, 5 fixed questions, up to 2 follow-ups per question | Follow-up selection tuned across many phrasings |
| Live STT + TTS round-trip, real Gemini probe/finalize, guardrail validation | Transcript timestamp-level audio scrubbing |
| Session summary screen + certificate gate | Session synthesis via real model call (§6.7) vs code fallback |
| 1 retry loop with before/after diff | Multiple retries per session |
| Raw JSON panel visible in UI | Cross-session history / dashboard |
| Solo-scoped eval table + 1 failure writeup | Full-scope dataset, automated generic-prompt scoring |
| Cached fallback for network failure | Auto-detection of network failure |
