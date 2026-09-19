# 05 — Demo

## 3-minute script

| Time | Say | Do | Judges hear/see |
|---|---|---|---|
| 0:00–0:15 | "Text practice can't reproduce a live spoken interview. So we built a coach that's spoken end to end, not a chatbot with a microphone bolted on." | Click **Start Interview** | ElevenLabs TTS asks question 1 |
| 0:15–1:00 | (let it play out) | Answer thin on purpose ("Um, I'd test it a bit I guess"); on the generic "Could you expand on that?", answer again without naming a personal action ("We'd run some tests"); on the targeted follow-up, answer for real ("I personally wrote unit tests covering the empty-list and negative-number cases") | Live transcript each turn; generic nudge first, then a *targeted* ownership follow-up on turn 2 |
| 1:00–1:20 | "Here's what just happened under the hood." | Open `DecisionJsonPanel` | Raw Gemini JSON: score, category, tips, evidence span highlighted against the transcript |
| 1:20–1:45 | "Now we apply one of those tips." | Click **Retry**, re-answer applying the "state the outcome" tip | `RetryCompare`: old score/category → new, tip applied named on screen |
| 1:45–2:10 | "We didn't invent a headline accuracy number — we labeled dialogues by hand and tested three approaches." | Show 5-row eval table, then the one documented miss | Table on screen; one sentence on the fix |
| 2:10–2:30 | "After all five questions, the candidate gets what the reference product gives — overall score, conclusion, certificate." | Jump-cut to pre-recorded `SessionSummary` (don't live-replay all 5) | Total score, category, conclusion, strengths/growth areas, certificate badge |
| 2:30–3:00 | "The wedge is behavioral-interview practice for students; the buyer is university career centers who can't schedule enough human mock interviews. Next step is a one-session pilot with a career center, not a bigger model." | Close on tagline | "You didn't just receive feedback. You practiced applying it." |

## One-sentence justifications (have verbatim)

- **Why speech, not a text box?** "A text box removes exactly the constraints real interviews test — thinking aloud, staying concise under time pressure, recovering from an unscripted follow-up."
- **Why Gemini with a strict schema, not just a bigger prompt?** "Gemini returns a strict schema our state machine executes directly — routing, scoring, and follow-up choice are code decisions grounded in model output, not the model freelancing a conversation. And it runs on the free tier, so the entire build's model spend is zero dollars."
- **Why cap follow-ups at 2?** "It can genuinely take 3+ nudges, but a demo must be predictable — we capped it in code, not the prompt, so it always resolves in bounded time, and we say so."
- **Why does the second follow-up get targeted?** "A repeated generic nudge doesn't tell the candidate what's missing — ours names the specific gap, which the reference product doesn't do."
- **Why no hiring score?** "The score measures alignment to a disclosed practice approach in this session only — we guardrail against hire/no-hire framing because that's not a claim this score can support."

## Backup plan

1. **Automatic:** `degraded: true` cached-response path — keep talking, point at the badge: "this is the fallback we built because venue APIs are unreliable."
2. **Video:** pre-recorded 90-second full-session capture (recorded in rehearsal) — narrate live over it with the same beats.
3. **Stills:** static screenshots per demo beat in `docs/`, walked through verbally if video fails too.

## Judging-room checklist

- [ ] Two laptops charged, one already running `npm run dev` before reaching the table
- [ ] Wired headphones (no Bluetooth pairing risk)
- [ ] Phone hotspot as backup network
- [ ] `.env` correct on **both** laptops (stale key on backup = classic failure)
- [ ] `.tech` domain claimed with the MLH code (do at hour 0 — provisioning can lag)
- [ ] `.tech` domain resolves and serves the showcase page (verify before judging)
- [ ] Backup video stored locally on both laptops (not cloud-linked)
- [ ] Printed/on-phone copy of the eval table + one-liners, in case a screen dies

## Track submission checklist

**ElevenLabs** — STT+TTS in the critical path of every turn (§`01`); turbo model + measured latency (§`04`); why-voice-matters one-liner delivered live at 0:00–0:20.

**Best Use of Gemini API (MLH)** — schema-enforced decision object via `responseSchema`, never free chat (§`02`/`03`); state machine executes `next_action`/`follow_up_type` verbatim, shown live via `DecisionJsonPanel`; full eval plan + documented miss (§`04`); measured probe/finalize latency on Flash; $0 model spend on the AI Studio free tier.

**Best .Tech Domain Name (MLH)** — claimed .tech domain serves the static showcase build; domain named in the Devpost submission.

**Seed Round** — named user (students) + recurring problem; buyer hypothesis (career centers/bootcamps) stated in the close; working retry loop + summary screen live, not mocked; next step named ("one-session pilot with a career center").
