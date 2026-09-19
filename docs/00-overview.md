# 00 — Overview

> Plan of record: Interview Voice Coach (SteelHacks 24h). This doc is the concept, tracks, credits, and scope. Build docs: `01-architecture.md` → `06-cuts.md`.

## Concept

A spoken mock-interview coach. A candidate answers five behavioral questions out loud through the browser microphone. After each spoken turn, a Nemotron-backed decision engine decides whether the answer is thin enough to probe further (up to two follow-ups: a generic nudge first, then a targeted nudge naming what's missing) or whether it has enough to finalize. On finalize, it scores the whole per-question exchange 0–100, maps to a category (Excellent/Good/Satisfactory/Needs Work), and returns a three-part feedback bundle — explanation, "what was great," and 2–3 labeled "level up" tips — every score and tip grounded in a quoted transcript span. After all five questions: session synthesis (total score, overall category, conclusion, aggregate strengths/growth areas), a certificate gated on a score threshold, then a retry of the single weakest question with a before/after score comparison.

Primary users: students and early-career candidates. Buyer: university career-services offices and bootcamps.

## Target tracks

| Track | Stacking |
|---|---|
| ElevenLabs Track | Voice (STT+TTS) is in the critical path of every turn |
| Nemotron Track | Decision engine: routing + scoring as structured JSON, never chat |
| Seed Round | Named buyer, working retry loop as evidence, explicit next validation step |

## Assumptions (locked)

- **Solo builder.** Hour plan (§`06-cuts.md`) is sequential — no parallel roles, only self-checkpoints. Eval harness is smaller, retry loop simplified, UI stretch goals cut.
- **Nemotron = `nvidia/llama-3.1-nemotron-70b-instruct`** via `build.nvidia.com` NIM API (OpenAI-compatible). Swap via `NEMOTRON_MODEL` env var if the venue issues a different endpoint; integration code doesn't change.
- **Hardware: considered, not included.** A push-to-talk Arduino button was cut — it's I/O sugar and a demo-day failure point for a solo build. Software-only.

## Tooling & credits (confirmed)

| Resource | Decision |
|---|---|
| Claude API credit ($25) | AI coding help via Cline/Continue (VS Code, bring-your-own-key) — Cursor-like without a subscription |
| GitHub Student Pack | Free Copilot Pro with Pitt .edu email — activate before the event regardless |
| NVIDIA NIM API (free tier) | **Use this** for Nemotron — hosted `build.nvidia.com`, zero setup |
| NVIDIA Brev GPU credit ($60) | **Not used.** Self-hosting a NIM container is 2–4h of setup risk with no upside for the tracks. Expires 9/22 — spend on a personal experiment after, not the hackathon |
| ElevenLabs Creator (1 month free) | Use as-is — covers build, rehearsal, demo quota |
| Vercel credit ($30) | **Not used for the live demo** — architecture is local-only (SQLite + audio uploads don't fit serverless). Optional post-hackathon: static frontend on cached data as a shareable link |

## Minimum Viable Demo vs. stretch

| MVD (must exist by hour 14) | Stretch (only if ahead) |
|---|---|
| 1 role, 5 fixed questions, up to 2 follow-ups per question | Follow-up selection tuned across many phrasings |
| Live STT + TTS round-trip, real Nemotron probe/finalize, guardrail validation | Transcript timestamp-level audio scrubbing |
| Session summary screen + certificate gate | Session synthesis via real model call (§6.7) vs code fallback |
| 1 retry loop with before/after diff | Multiple retries per session |
| Raw JSON panel visible in UI | Cross-session history / dashboard |
| Solo-scoped eval table + 1 failure writeup | Full-scope dataset, automated generic-prompt scoring |
| Cached fallback for network failure | Auto-detection of network failure |
