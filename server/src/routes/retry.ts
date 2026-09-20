import { Router } from "express";
import multer from "multer";
import { openDatabase } from "../db.js";
import { questions } from "../data/questions.js";
import { synthesize } from "../services/elevenlabs.js";
import { probeOrFinalize } from "../services/gemini.js";
import { scoreWithRules } from "../services/rulesBaseline.js";
import { validateDecision } from "../guardrails/validate.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const db = openDatabase(process.env.DB_PATH ?? "./data/session.db");

async function transcribeAudio(audio: Buffer, contentType: string): Promise<{ transcript: string; confidence: number | null; source: "stt" }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  const form = new FormData();
  form.append("file", new Blob([audio as unknown as BlobPart], { type: contentType }), "retry.webm");
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

router.post("/:id/retry", upload.single("audio"), async (req, res) => {
  const session = db.prepare("SELECT id, role, status, retry_target_index FROM sessions WHERE id = ?").get(req.params.id) as { id: string; role: string; status: string; retry_target_index: number | null } | undefined;
  const questionIndex = Number(req.body.question_index);
  if (!session) return res.status(404).json({ error: { code: "INVALID_SESSION", message: "Unknown session id", retryable: false } });
  if (session.status !== "completed" || !Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= questions.length || session.retry_target_index !== questionIndex || !req.file) {
    return res.status(409).json({ error: { code: "BAD_STATE", message: "Retry is not available for this session and question", retryable: false } });
  }
  const originalRow = db.prepare("SELECT decision_json FROM turns WHERE session_id = ? AND question_index = ? AND is_final = 1 AND is_retry = 0 ORDER BY turn_number DESC LIMIT 1").get(req.params.id, questionIndex) as { decision_json: string } | undefined;
  if (!originalRow) return res.status(409).json({ error: { code: "BAD_STATE", message: "Original finalized turn not found", retryable: false } });
  const original = JSON.parse(originalRow.decision_json) as { score: number; category: string; level_up_tips?: { title: string; detail: string }[] };
  const tipApplied = original.level_up_tips?.[0]?.title ?? "Add more concrete detail";
  let transcription: { transcript: string; confidence: number | null; source: "stt" };
  try {
    transcription = await transcribeAudio(req.file.buffer, req.file.mimetype || "audio/webm");
  } catch {
    return res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Speech transcription unavailable", retryable: true } });
  }
  let raw: unknown;
  try {
    raw = await probeOrFinalize({
      role: session.role,
      questionText: questions[questionIndex].text,
      dialogueTurns: [{ speaker: "candidate", text: transcription.transcript }],
      turnNumber: 2
    });
  } catch {
    raw = scoreWithRules(transcription.transcript, 2);
  }
  const { decision, evaluator } = validateDecision(raw, transcription.transcript, 2);
  let ttsAudioUrl: string | null = null;
  const degradedComponents: string[] = evaluator === "fallback_rules" ? ["gemini"] : [];
  try {
    ttsAudioUrl = (await synthesize(tipApplied)).audioUrl;
  } catch {
    degradedComponents.push("tts");
  }
  db.prepare(`
    INSERT INTO turns (session_id, question_index, turn_number, is_final, is_retry, transcript, transcript_source, stt_confidence, decision_json, evaluator, created_at)
    VALUES (?, ?, 2, 1, 1, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, questionIndex, transcription.transcript, transcription.source, transcription.confidence, JSON.stringify(decision), evaluator, new Date().toISOString());
  db.prepare("UPDATE sessions SET status = 'retried' WHERE id = ?").run(req.params.id);
  return res.status(200).json({
    session_id: req.params.id,
    question_index: questionIndex,
    original: { score: original.score, category: original.category },
    retry: { score: decision.score, category: decision.category },
    tip_applied: tipApplied,
    tts_audio_url: ttsAudioUrl,
    degraded: degradedComponents.length > 0,
    degraded_components: degradedComponents
  });
});

export default router;
