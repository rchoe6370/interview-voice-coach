# Interview Voice Coach

A voice-first AI interview coach. You speak your answers out loud; it listens, probes your weak spots, scores each answer with grounded evidence, then lets you retry your weakest answer and shows the before/after.

Built for SteelHacks: **Best Use of Gemini API** (MLH) · **Out Loud** · **Seed Round** . **Cold Start**.

## The demo (60 seconds)

1. Pick a role, start the interview. The first question plays out loud.
2. Hold the button, answer out loud. Your transcript appears.
3. Thin answer → the coach probes you ("Can you tell me a bit more?"). Strong answer → it scores you with a verbatim evidence quote and concrete tips, then moves on.
4. After 5 questions: your total score, per-question breakdown, strengths, growth areas.
5. Hit **Retry weakest answer**: hear your top tip, re-record, and see the before/after comparison. Original scores are never rewritten — retry is practice.

Every turn also shows the **raw structured JSON** the model produced — no black box.

## Setup

### Prerequisites

- Node.js 18+
- An [ElevenLabs](https://elevenlabs.io) API key (STT + TTS)
- A [Google AI Studio](https://aistudio.google.com) API key (free tier works)

### Run it

```bash
git clone <repo-url>
cd interview-voice-coach
cp .env.example .env   # then fill in your keys (see below)
npm install
npm run dev
```

Open **http://localhost:5173**. The API runs on `http://localhost:8080`.

### Environment

| Variable | What it is |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs key — speech-to-text (`scribe_v1`) and text-to-speech |
| `ELEVENLABS_VOICE_ID` | Voice used for interviewer audio |
| `GEMINI_API_KEY` | Google AI Studio key — answer routing, scoring, session synthesis |
| `GEMINI_MODEL` | Model name (e.g. `gemini-3.6-flash`) |
| `PORT` | API port (default `8080`) |
| `VITE_API_URL` | Client → API base URL (default `http://localhost:8080`) |

Never commit `.env`. `.env.example` lists the names with blank values.

## How it works

```
Browser mic → ElevenLabs STT → Gemini (probe or finalize?) → guardrails → ElevenLabs TTS
                                                        ↓ fail
                                              rules-baseline fallback (stamped, never silent)
```

- **Client** (React + Vite): push-to-talk recording, audio playback, interview state machine, summary/retry UI, raw-JSON reveal panel.
- **Server** (Node + Express + TypeScript, SQLite): session state (authoritative), the answer pipeline, guardrail validation, session synthesis, retry logic.
- **Gemini** (`gemini-3.6-flash` via AI Studio): one structured call per turn decides *probe vs. finalize*; on finalize it scores (0–100), categorizes (Excellent/Good/Satisfactory/Needs Work), cites verbatim evidence, and writes tips. A second call synthesizes the end-of-session summary.
- **ElevenLabs**: `scribe_v1` transcribes answers; TTS voices every question and follow-up.

### Engineering decisions that matter

- **Structured output is a contract, not a hope.** Every model response is validated: unknown properties rejected, score/category bands cross-checked, evidence must be a verbatim transcript substring, tips capped and de-duplicated. Anything fails → deterministic rules baseline, stamped `evaluator: "fallback_rules"` so you can always tell who scored you.
- **Degradation is in-band, not a crash.** If TTS fails, `tts_audio_url` comes back `null` and the client falls back to browser speech with a backup-voice badge. If Gemini 429s/503s, the request retries, then the baseline takes over — the interview never dies.
- **Server state is authoritative.** The client asserts question/turn numbers; mismatches get `409 STALE_TURN` with the expected values for resync. The 2-turn probe cap is enforced in code, never trusted to the prompt.
- **History is real.** The model sees the full ordered dialogue per question (transcript → follow-up asked → transcript), with an explicit no-repeat instruction — probed follow-ups reference what you actually said.
- **Retry is practice-only.** One retry per session, weakest question only; original total, category, and certificate status are immutable.

## Known limitations

- Gemini free-tier quotas can 429 under heavy use; the app degrades to the rules baseline automatically (visible via the `fallback_rules` evaluator badge).
- Very-low-confidence transcripts surface an error rather than a confirmation dialog (planned).
- Local demo; no hosted deployment. SQLite database is local and gitignored.

## Future work

Confirmation-dialog UX for low-confidence audio · more question banks (system design, behavioral deep-dives) · progress tracking across sessions · the 12-dialogue / 8-routing-case eval harness with real measurements.
