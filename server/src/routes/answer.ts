import { Router } from "express";
import multer from "multer";
import { openDatabase } from "../db.js";
import { synthesize } from "../services/elevenlabs.js";
import { probeOrFinalize } from "../services/gemini.js";
import { scoreWithRules } from "../services/rulesBaseline.js";
import { validateDecision } from "../guardrails/validate.js";
import { nextQuestionIndex } from "../stateMachine/interview.js";
import { questions } from "../data/questions.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const db = openDatabase(process.env.DB_PATH ?? "./data/session.db");

async function transcribeAudio(audio: Buffer, contentType: string): Promise<{ transcript: string; confidence: number | null; source: "stt" }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  const form = new FormData();
  form.append("file", new Blob([audio as unknown as BlobPart], { type: contentType }), "answer.webm");
  form.append("model_id", "scribe_v1");
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`ElevenLabs STT failed with ${response.status}`);
  const result = await response.json() as { text?: string; confidence?: number };
  return { transcript: result.text?.trim() ?? "", confidence: result.confidence ?? null, source: "stt" };
}

router.post("/:id/answer", upload.single("audio"), async (req, res) => {
  const session = db.prepare("SELECT id, role, current_question_index, status FROM sessions WHERE id = ?").get(req.params.id) as { id: string; role: string; current_question_index: number; status: string } | undefined;
  if (!session) return res.status(404).json({ error: { code: "INVALID_SESSION", message: "Unknown session id", retryable: false } });

  const questionIndex = Number(req.body.question_index);
  const turnNumber = Number(req.body.turn_number);
  const latestTurn = db.prepare("SELECT MAX(turn_number) AS turn_number FROM turns WHERE session_id = ? AND question_index = ? AND is_retry = 0").get(req.params.id, session.current_question_index) as { turn_number: number | null };
  const expectedTurn = latestTurn.turn_number === null ? 0 : latestTurn.turn_number + 1;
  if (questionIndex !== session.current_question_index || turnNumber !== expectedTurn) {
    return res.status(409).json({
      error: {
        code: "STALE_TURN",
        message: `Expected turn_number ${expectedTurn} for question ${session.current_question_index}.`,
        retryable: false,
        expected: { question_index: session.current_question_index, turn_number: expectedTurn }
      }
    });
  }
  if (!req.file) return res.status(400).json({ error: { code: "MALFORMED_AUDIO", message: "Audio file is required", retryable: false } });

  let transcription: { transcript: string; confidence: number | null; source: "stt" };
  try {
    transcription = await transcribeAudio(req.file.buffer, req.file.mimetype || "audio/webm");
  } catch {
    return res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Speech transcription unavailable", retryable: true } });
  }
  const transcript = transcription.transcript;
  if (transcription.confidence !== null && transcription.confidence < 0.6) {
    return res.status(422).json({
      error: { code: "LOW_CONFIDENCE_UNCONFIRMED", message: "Transcript confidence is too low to score", retryable: false },
      transcript,
      stt_confidence: transcription.confidence
    });
  }
  const input = {
    role: session.role,
    questionText: questions[session.current_question_index].text,
    dialogueTurns: [] as { speaker: "interviewer" | "candidate"; text: string }[],
    turnNumber
  };
  const priorTurns = db.prepare(`
    SELECT transcript, decision_json
    FROM turns
    WHERE session_id = ? AND question_index = ? AND is_retry = 0
    ORDER BY turn_number ASC
  `).all(req.params.id, session.current_question_index) as { transcript: string; decision_json: string }[];
  for (const priorTurn of priorTurns) {
    input.dialogueTurns.push({ speaker: "candidate", text: priorTurn.transcript });
    const priorDecision = JSON.parse(priorTurn.decision_json) as { next_action?: string; follow_up_text?: string | null };
    if (priorDecision.next_action === "ask_follow_up" && priorDecision.follow_up_text) {
      input.dialogueTurns.push({ speaker: "interviewer", text: priorDecision.follow_up_text });
    }
  }
  input.dialogueTurns.push({ speaker: "candidate", text: transcript });

  let raw: unknown;
  try {
    raw = await probeOrFinalize(input);
  } catch {
    raw = scoreWithRules(transcript, input.turnNumber);
  }
  const { decision, evaluator } = validateDecision(raw, transcript, input.turnNumber);
  let ttsAudioUrl: string | null = null;
  const degradedComponents: string[] = evaluator === "fallback_rules" ? ["gemini"] : [];
  let nextQuestion: { question_index: number; question_text: string; tts_audio_url: string | null } | null = null;
  if (decision.next_action === "ask_follow_up" && decision.follow_up_text) {
    try {
      ttsAudioUrl = (await synthesize(decision.follow_up_text)).audioUrl;
    } catch {
      degradedComponents.push("tts");
    }
  }
  const nextQuestionIndexValue = nextQuestionIndex(questionIndex);
  if (decision.next_action === "finalize_question" && nextQuestionIndexValue !== null) {
    const question = questions[nextQuestionIndexValue];
    let nextQuestionAudioUrl: string | null = null;
    try {
      nextQuestionAudioUrl = (await synthesize(question.text)).audioUrl;
    } catch {
      degradedComponents.push("tts");
    }
    nextQuestion = {
      question_index: question.index,
      question_text: question.text,
      tts_audio_url: nextQuestionAudioUrl
    };
  }
  db.prepare(`
    INSERT INTO turns (session_id, question_index, turn_number, is_final, transcript, transcript_source, stt_confidence, decision_json, evaluator, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, questionIndex, turnNumber, decision.next_action === "finalize_question" ? 1 : 0, transcript, transcription.source, transcription.confidence, JSON.stringify(decision), evaluator, new Date().toISOString());
  if (decision.next_action === "finalize_question") {
    db.prepare("UPDATE sessions SET current_question_index = ? WHERE id = ?")
      .run(nextQuestionIndex(questionIndex) ?? questionIndex, req.params.id);
  }

  return res.status(200).json({
    session_id: req.params.id,
    question_index: questionIndex,
    turn_number: input.turnNumber,
    next_turn_number: decision.next_action === "ask_follow_up" ? input.turnNumber + 1 : null,
    next_question_index: decision.next_action === "finalize_question" ? nextQuestionIndexValue ?? questionIndex : questionIndex,
    next_question: nextQuestion,
    model_raw: JSON.stringify(raw),
    transcript,
    transcript_source: transcription.source,
    stt_confidence: transcription.confidence,
    decision: { ...decision, evaluator },
    tts_audio_url: ttsAudioUrl,
    degraded: degradedComponents.length > 0,
    degraded_components: degradedComponents
  });
});

router.post("/:id/confirm-transcript", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "TODO: confirm transcript", retryable: false } });
});

export default router;
