# Copilot instructions — SteelHacks 24h build

## Project
Interview Voice Coach: a spoken mock-interview coach. Concept and tracks: `docs/00-overview.md`.

## Hard rules
- 24-hour hackathon, solo builder: simple working code beats elegant code.
- Never add a dependency without asking first.
- Never hardcode secrets. All keys come from environment variables (see `.env.example`).
- All data is synthetic or public. No real PII, credentials, or account numbers.
- Keep changes scoped to the files I name. Don't refactor unrelated code.

## Stack
- Backend: TypeScript + Express (Node 20), SQLite via better-sqlite3
- Frontend: React 18 + Vite, browser MediaRecorder for audio
- STT/TTS: ElevenLabs (scribe_v1 / eleven_turbo_v2_5)
- Feedback engine: Google Gemini via AI Studio REST (plain fetch), `responseMimeType: "application/json"` + `responseSchema`; model via `GEMINI_MODEL` env (default `gemini-2.5-flash`); `thinkingConfig.thinkingBudget: 0` for latency
- Local only: server localhost:8080, client localhost:5173 (Vite proxies /api)

## Workflow
- After every code change, run the relevant test/build command and report pass/fail.
- Build end-to-end slices, not layers. Each task should leave something demoable.
- `docs/` is the plan of record. `docs/02-interfaces.md` is the source of truth for schemas and contracts — follow it; flag conflicts instead of silently deviating.
- Never trust the model alone for control flow: follow-up caps, category bands, and certificate thresholds are enforced in code.

## Docs map
- `docs/00-overview.md` — concept, target tracks, credits, MVD vs stretch
- `docs/01-architecture.md` — components, data flow, tech stack, repo structure
- `docs/02-interfaces.md` — API contracts and schemas (source of truth)
- `docs/03-prompts.md` — model prompts, copy-paste ready, guardrails, ElevenLabs config
- `docs/04-eval.md` — eval protocol and success criteria
- `docs/05-demo.md` — 3-minute script, backup plan, judging checklist, track checklist
- `docs/06-cuts.md` — hour-by-hour build sequence, risks, cut order
