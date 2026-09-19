# 02 — Interfaces (source of truth)

> Every API contract and data schema. Code must match this doc — if they disagree, fix the code, not this doc.

## Feedback decision-object schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["next_action", "follow_up_type", "follow_up_text", "score", "category", "explanation", "what_was_great", "level_up_tips", "evidence", "evaluator"],
  "properties": {
    "next_action": {"enum": ["ask_follow_up", "finalize_question"]},
    "follow_up_type": {"enum": ["elaborate_generic", "personal_action", "specific_detail", "clarify_relevance", null]},
    "follow_up_text": {"type": ["string", "null"], "maxLength": 150},
    "score": {"type": ["integer", "null"], "minimum": 0, "maximum": 100},
    "category": {"enum": ["Excellent", "Good", "Satisfactory", "Needs Work", null]},
    "explanation": {"type": ["string", "null"], "maxLength": 500},
    "what_was_great": {"type": ["string", "null"], "maxLength": 300},
    "level_up_tips": {
      "type": ["array", "null"], "minItems": 2, "maxItems": 3,
      "items": {
        "type": "object", "required": ["title", "detail"], "additionalProperties": false,
        "properties": {
          "title": {"type": "string", "maxLength": 60},
          "detail": {"type": "string", "maxLength": 200}
        }
      }
    },
    "evidence": {"type": ["string", "null"]},
    "evaluator": {"enum": ["gemini", "fallback_rules"], "description": "Stamped by the server after validation; never trusted from model output."}
  }
}
```

The `evaluator` enum values are now `"gemini" | "fallback_rules"`.

**Discriminator — `next_action` controls which fields are populated** (enforced in code by `validateDecision`; unknown properties are rejected):

| `next_action` | `follow_up_type` / `follow_up_text` | `score` / `category` / `explanation` / `what_was_great` / `level_up_tips` | `evidence` |
|---|---|---|---|
| `ask_follow_up` | populated | all `null` | `null` |
| `finalize_question` | both `null` | populated | verbatim transcript span, or `null` when the candidate gave no usable text |

Category bands (enforced in code, never trusted to the model alone): Excellent 90–100 / Good 70–89 / Satisfactory 50–69 / Needs Work 0–49. The same bands apply to `overall_category` in the session summary, applied to `total_score`.

## State machine & indexing (authoritative)

- Response indexes identify the turn/question **just processed**, never the next one.
- `turn_number` is **server-owned**. The client submits the turn it is answering (0-based) as an assertion; the server validates it against its expected counter and rejects mismatches with `409 STALE_TURN` — the `expected` object carries the correct values so the client can resync.
- Every `/answer` response includes `next_turn_number` (`null` once the question is finalized) and `next_question_index`. The client never derives state on its own.
- The follow-up cap is enforced in code: when `turn_number >= 2` the server forces `finalize_question` regardless of model output.

## Errors

One envelope for every failure:

```json
{
  "error": {
    "code": "STALE_TURN",
    "message": "Expected turn_number 2 for question 1.",
    "retryable": false,
    "expected": { "question_index": 1, "turn_number": 2 }
  },
  "request_id": "req_9f2c41"
}
```

`expected` appears only on 409s. `request_id` is server-generated per request and mirrored in server logs. Fallback activation is **not** an HTTP error — the endpoint returns 200 with `degraded: true` and `degraded_components` naming the failed stage, so the demo keeps running.

| Code | Status | When |
|---|---|---|
| `INVALID_SESSION` | 404 | Unknown or expired session id |
| `BAD_STATE` | 409 | Action invalid for current status (answering a completed session, retry before completion, re-confirming a finalized turn) |
| `STALE_TURN` | 409 | `question_index`/`turn_number` assertion mismatches server state |
| `MALFORMED_AUDIO` | 400 | Multipart body malformed or unreadable |
| `UNSUPPORTED_AUDIO` | 400 | Codec/container not supported (expect webm/opus from MediaRecorder) |
| `LOW_CONFIDENCE_UNCONFIRMED` | 422 | `stt_confidence < 0.6` and no confirmed transcript yet — body includes the raw transcript for the client to display |
| `CONFIRM_LIMIT` | 422 | More than 2 confirmations attempted on a single turn |
| `UPSTREAM_TIMEOUT` | 504 | Gemini/ElevenLabs timed out and the fallback could not serve the request (`retryable: true` — client may retry the same turn) |
| `SERVICE_UNAVAILABLE` | 503 | Fallback also failed; nothing to serve |

## Universal response fields

Every turn-processing response (`POST /session/:id/answer` and `POST /session/:id/confirm-transcript`) includes:
(`POST /session/:id/retry` carries `degraded`/`degraded_components` but not the transcript fields; `POST /session/start` has its own shape.)
- `degraded: boolean` — true if any pipeline stage fell back
- `degraded_components: ("stt" | "tts" | "gemini" | "cache")[]` — which stages degraded
- `transcript` — the **current turn's** transcript only (full dialogue via `GET /session/:id`)
- `transcript_source` — `"stt"` | `"browser_stt"` | `"human_confirmed"`; `browser_stt` means ElevenLabs STT fell back to the browser Web Speech API and `stt_confidence` is `null`
- `tts_audio_url` — `string | null`; when non-null, an `audio/mpeg` URL served locally in dev and valid for the session lifetime. When `degraded_components` includes `"tts"`, this is `null`; the client must speak the response text with browser `SpeechSynthesis` (`question_text` for start, `decision.follow_up_text` for answers) and show the "backup voice" badge.

### Success status codes

- `POST /session/start` -> `201 Created`
- `POST /session/:id/answer`, `/confirm-transcript`, `/retry` -> `200`
- All `GET` endpoints -> `200`

## SQLite schema

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  question_set_version TEXT NOT NULL DEFAULT 'v1',
  created_at TEXT NOT NULL,
  current_question_index INTEGER NOT NULL DEFAULT 0 CHECK (current_question_index BETWEEN 0 AND 4),
  retry_target_index INTEGER CHECK (retry_target_index BETWEEN 0 AND 4),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'retried')),
  total_score REAL CHECK (total_score BETWEEN 0 AND 100),
  overall_category TEXT CHECK (overall_category IN ('Excellent', 'Good', 'Satisfactory', 'Needs Work')),
  conclusion TEXT,
  strengths_json TEXT,
  growth_areas_json TEXT,
  certificate_unlocked INTEGER NOT NULL DEFAULT 0 CHECK (certificate_unlocked IN (0, 1))
);

CREATE TABLE turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL CHECK (question_index BETWEEN 0 AND 4),
  turn_number INTEGER NOT NULL DEFAULT 0 CHECK (turn_number BETWEEN 0 AND 2),
  is_final INTEGER NOT NULL DEFAULT 0 CHECK (is_final IN (0, 1)),
  is_retry INTEGER NOT NULL DEFAULT 0 CHECK (is_retry IN (0, 1)),
  transcript TEXT NOT NULL,
  transcript_source TEXT NOT NULL DEFAULT 'stt' CHECK (transcript_source IN ('stt', 'browser_stt', 'human_confirmed')),
  superseded_transcript TEXT,
  superseded_audio_url TEXT,
  stt_confidence REAL CHECK (stt_confidence IS NULL OR (stt_confidence BETWEEN 0 AND 1)),
  decision_json TEXT NOT NULL,
  evaluator TEXT NOT NULL CHECK (evaluator IN ('gemini', 'fallback_rules')),
  created_at TEXT NOT NULL,
  UNIQUE (session_id, question_index, turn_number, is_retry)
);
```

The repository layer owns transactions; the constraints above are the last line of defense, not the only one.

## `POST /session/start`

Roles: `"swe-behavioral" | "pm" | "data" | "general"`. Missing or empty role → `"general"`.

Request: `{ "role": "swe-behavioral" }`

Response:
```json
{ "session_id": "a1b2c3", "role": "swe-behavioral",
  "question_set_version": "v1", "question_index": 0,
  "question_text": "Tell me about yourself.",
  "tts_audio_url": "/audio/a1b2c3-q0.mp3" }
```

POST always creates a new session — duplicate POSTs create duplicate sessions. Resume an existing session with `GET /session/:id`.

## `POST /session/:id/answer`

Request: `multipart/form-data` — `audio` (blob, webm/opus), `question_index` (int), `turn_number` (int, 0–2).

`question_index` and `turn_number` are **assertions**: the server validates them against session state and returns `409 STALE_TURN` on mismatch. The server derives the authoritative next state itself.

Response, probing (no score yet):
```json
{
  "session_id": "a1b2c3", "question_index": 0, "turn_number": 0,
  "next_turn_number": 1, "next_question_index": 0,
  "transcript": "So my team and we ended up changing the design at the last minute.",
  "transcript_source": "stt", "stt_confidence": 0.94,
  "decision": {
    "next_action": "ask_follow_up", "follow_up_type": "elaborate_generic",
    "follow_up_text": "Could you expand on that?",
    "score": null, "category": null, "explanation": null,
    "what_was_great": null, "level_up_tips": null,
    "evidence": null, "evaluator": "gemini"
  },
  "tts_audio_url": "/audio/a1b2c3-turn1.mp3",
  "degraded": false, "degraded_components": []
}
```

Response, finalizing:
```json
{
  "session_id": "a1b2c3", "question_index": 0, "turn_number": 1,
  "next_turn_number": null, "next_question_index": 1,
  "transcript": "I personally rewrote the API contract so the two teams could agree before we shipped.",
  "transcript_source": "stt", "stt_confidence": 0.97,
  "decision": {
    "next_action": "finalize_question", "follow_up_type": null, "follow_up_text": null,
    "score": 72, "category": "Good",
    "explanation": "You clearly named a personal action and the reason for it. Adding the outcome — what happened after you rewrote the contract — would make this stronger.",
    "what_was_great": "You led with what YOU personally did, which shows ownership clearly.",
    "level_up_tips": [
      {"title": "State the outcome", "detail": "Say what happened after your action — did the disagreement resolve, did the timeline hold?"},
      {"title": "Add a number", "detail": "A rough timeframe or team size makes the story easier to picture and verify."}
    ],
    "evidence": "I personally rewrote the API contract",
    "evaluator": "gemini"
  },
  "tts_audio_url": "/audio/a1b2c3-turn2.mp3",
  "degraded": false, "degraded_components": []
}
```

## `POST /session/:id/confirm-transcript`

When `/answer` returns `422 LOW_CONFIDENCE_UNCONFIRMED`, the client shows the raw transcript and posts a correction here.

Request: `{ "question_index": 1, "turn_number": 0, "confirmed_transcript": "..." }`

Rules:
- `confirmed_transcript`: 1–2000 chars.
- Max 2 confirmations per turn → `422 CONFIRM_LIMIT`.
- Confirming an already-confirmed or finalized turn → `409 BAD_STATE`.
- The original transcript is kept in `superseded_transcript` and the original audio file is kept at `superseded_audio_url`; the confirmed text becomes the active transcript and the pipeline re-runs on it.

Response: same shape as `/answer`, with `"transcript_source": "human_confirmed"` and `"stt_confidence": null`.

## `GET /session/:id/summary`

Scoring rules:
- `total_score` = arithmetic mean of the 5 finalized question scores, rounded to 1 decimal.
- `overall_category` = the category bands applied to `total_score`.
- If synthesis fails, the templated fallback from `docs/03-prompts.md` is used and the response carries `degraded: true, degraded_components: ["gemini"]` — the total is never null.
- Retry never changes the summary: original scores are immutable.

```json
{
  "session_id": "a1b2c3", "total_score": 55.0, "overall_category": "Satisfactory",
  "conclusion": "You're off to a great start with testing fundamentals and Python conventions. With more practice explaining your thought process and expanding on your answers, you'll gain confidence articulating your skills.",
  "strengths": ["Identified a variety of concrete test cases", "Recognized the importance of naming and readability conventions", "Demonstrated awareness of debugging tools"],
  "growth_areas": ["Expand answers with more detail and examples", "Practice articulating your thought process clearly", "Get familiar with common Python libraries/tools", "Discuss specific error-handling strategies"],
  "certificate_unlocked": true, "retry_target_index": 4,
  "degraded": false, "degraded_components": []
}
```

## `POST /session/:id/retry`

Request: `{ "question_index": 4 }`

Rules:
- Allowed once per session, only when `status = 'completed'`, only for `retry_target_index` → otherwise `409 BAD_STATE`.
- Retry turns are stored with `is_retry = 1` in the same `turn_number` namespace.
- The retry never alters `total_score`, `overall_category`, or `certificate_unlocked` — it is practice, returned as a before/after comparison only.

Response:
```json
{ "session_id": "a1b2c3", "question_index": 4,
  "original": { "score": 14, "category": "Needs Work" },
  "retry": { "score": 58, "category": "Satisfactory" },
  "tip_applied": "Mention specific libraries",
  "tts_audio_url": "/audio/a1b2c3-retry1.mp3",
  "degraded": false, "degraded_components": [] }
```

## `GET /session/:id`

Full session object — all turns, all decisions, status, summary once computed. Used by the eval harness and the `DecisionJsonPanel` "show me everything" toggle.

## Internal function signatures

```ts
// guardrails/validate.ts
function validateDecision(
  raw: unknown,
  transcript: string,
  turnNumber: number
): { decision: DecisionObject; evaluator: "gemini" | "fallback_rules" }

// services/gemini.ts — returns RAW output; caller must run validateDecision
async function probeOrFinalize(input: {
  role: string;
  questionText: string;
  dialogueTurns: { speaker: "interviewer" | "candidate"; text: string }[];
  turnNumber: number;
}): Promise<unknown>

// services/sessionSynthesis.ts
type Category = "Excellent" | "Good" | "Satisfactory" | "Needs Work";
async function synthesizeSession(finalizedTurns: {
  questionIndex: number; score: number; category: Category;
  explanation: string; levelUpTips: { title: string; detail: string }[];
}[]): Promise<{
  totalScore: number; overallCategory: Category; conclusion: string;
  strengths: string[]; growthAreas: string[]; certificateUnlocked: boolean;
}>
```
