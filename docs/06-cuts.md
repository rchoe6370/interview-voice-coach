# 06 — Build Sequence, Risks & Cut List

> Solo plan. Every block ends with a manual smoke test — never trust "it's done" without running it. Do not build frontend and backend in isolation for 12 hours and integrate at the end; that's the #1 solo-hackathon failure mode.

## Hour 0–2 — Freeze the contract + scaffold

- Write `docs/decision-schema.json`, `server/src/data/questions.ts` (5 fixed questions + keyword hints), and the Nemotron system prompt into `prompts/nemotronPrompts.ts` verbatim from `03-prompts.md`. **This shape must not change later** — everything downstream depends on it.
- Scaffold: `create-vite client -- --template react-ts`, minimal Express + TypeScript `server/`. Get `/health` 200 through the Vite proxy. `npm run dev` (via `concurrently`) starts both with one command.
- **Smoke test:** `curl localhost:5173/api/health` → 200.

## Hour 2–6 — Voice end to end via curl (no UI logic yet)

- Implement `services/elevenlabs.ts`: `transcribe()` + `synthesize()`, real API calls. Test with a hardcoded phone-recorded audio file via a throwaway script — confirm real text back AND real playable MP3 back before touching the browser.
- Minimal client: `RecordButton` with real `MediaRecorder` POSTing the blob; server transcribes and returns text; TTS response through `<audio>`.
- **Smoke test (two, not one):** (1) record → correct transcript appears; (2) hardcoded string → audible TTS playback. Both must pass independently before moving on.

## Hour 6–10 — Add judgment

- Implement `services/nemotron.ts` (`response_format: json_object`), `guardrails/` (zod + evidence substring + enum whitelist), `rulesBaseline.ts` fallback.
- Wire `POST /session/:id/answer`: STT → Nemotron → guardrail (fallback to rules) → TTS → full payload.
- **Smoke test:** `curl -F audio=@test.webm localhost:8080/session/test/answer` returns a valid decision object 3 times in a row. If schema failures exceed ~1 in 3, spend ≤30 min tightening the prompt (add a one-shot example) — do not let this slide uncapped past hour 10.

## Hour 10–14 — Close the loop

- `stateMachine/interview.ts`: 5 fixed questions, 2-follow-up cap enforced via `turn_number` **in code**, retry target = lowest finalized score, `retry.ts` route.
- `sessionSynthesis.ts` + `certificate_unlocked` threshold check.
- Full UI flow on the hour 2–6 recorder: SetupScreen → live loop → TranscriptView + FollowUpBanner (probe turns) → ScoreCard + FeedbackBundle (finalize) → SessionSummary → RetryCompare.
- Add `DecisionJsonPanel` now (`<pre>{JSON.stringify(...)}</pre>`) — cheap, and it's one of the two never-cut demo moments.
- **Smoke test:** one full session through the actual UI — 5 questions, ≥1 question using both follow-ups, summary screen, 1 retry. **This is the Minimum Viable Demo. Nothing in hour 14–18 starts until this run succeeds cleanly.**

## Hour 14–18 — Build evidence (solo-scoped)

- Hand-write **12** eval dialogues (2 questions × 3 tiers × 2 variants) in `eval/dataset.json`; **8** routing edge cases in `eval/edge_cases.json`.
- `run_eval.ts`: rules-baseline + real Nemotron pipeline over the dataset (generic-prompt baseline run manually on 3–4 samples, eyeball-compared — documented as scoped-down, not hidden). Save `eval/results.json`.
- Find one clear miss → write `docs/failure-story.md`.
- **Smoke test:** `eval/results.json` has real numbers, and you can name the documented failure out loud without looking it up.

## Hour 18–21 — Fallback path + polish

- Record a real session into `cachedFallback.json` via `scripts/seed-cached-fallback.ts`; wire upstream-timeout → cached turn + `degraded: true`.
- Polish only demo-visible surfaces: recording indicator, evidence highlighting, loading spinner during the STT→Nemotron→TTS round-trip. Nothing else.
- **Smoke test:** unplug Wi-Fi mid-session → degrades to cached mode, reconnects cleanly.

## Hour 21–24 — Rehearse and buffer

- Run the exact 3-minute script (`05-demo.md`) out loud, timed, ≥5 times. Cut narration first if over — never cut the retry loop or JSON-reveal beats.
- Confirm `.env` on both laptops; backup device has repo + working `.env`.
- Record the 90-second backup video NOW, while the app is in its best-known state.
- Last 15 minutes: contingency checks only. Nothing new.

## Top risks

| # | Risk | Mitigation | Trigger |
|---|---|---|---|
| 1 | Nemotron JSON inconsistent under load | 1 retry + rules fallback already in the critical path | Fallback rate >40% in eval run → 30 min prompt hardening, then move on |
| 2 | Venue Wi-Fi can't sustain live API calls at judging | Phone hotspot + cached fallback session | Hotspot fails in hour-22 test → switch to backup-video demo, no live APIs at judging |
| 3 | Mic/codec issues on unfamiliar hardware | Demo only on your pre-tested laptop, never a judge's device | `MediaRecorder` fails in rehearsal → switch to AudioContext/WAV path immediately |
| 4 | Hour 6–10 judgment smoke test slips | Rules fallback built in the same block, app always demoable | Not passing by hour 11 → 30 more min prompt tuning, then lean on fallback |
| 5 | Eval numbers miss criteria | A miss becomes the documented failure story — itself a deliverable | Never re-run with adjusted criteria; write up the miss |
| 6 | Model conflates probe vs. finalize logic | Cap enforced in code, worst case = finalizing one turn early, never infinite loop | Wrong route >1 in 4 in smoke test → add one worked example of each case to the system prompt |

## Cut order (drop in this order if behind)

1. **First:** collapse two-tier follow-ups to a single targeted "what did you personally do?" question — keeps the adaptive feature, drops the hardest prompt-tuning.
2. **Second:** session synthesis model call → code-only fallback (most common themes). Certificate gate still works (threshold math).
3. **Third:** low-confidence STT confirm/edit step — accept STT as-is. Document the guardrail as "designed but not wired."
4. **Fourth:** shrink eval further — smallest set that keeps one item per tier per question and both test types.
5. **NEVER cut:** the retry loop and the raw-JSON reveal — these two moments make all three tracks' pitches land. Everything else is negotiable first.
