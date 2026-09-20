import { Router } from "express";
import crypto from "node:crypto";
import { openDatabase } from "../db.js";
import { questions } from "../data/questions.js";
import { synthesize } from "../services/elevenlabs.js";
import { synthesizeSession } from "../services/sessionSynthesis.js";

const router = Router();
const db = openDatabase(process.env.DB_PATH ?? "./data/session.db");

router.post("/start", async (req, res) => {
  const role = typeof req.body?.role === "string" && req.body.role.trim() ? req.body.role.trim() : "general";
  const sessionId = crypto.randomUUID();
  const question = questions[0];
  let ttsAudioUrl: string | null = null;
  let degraded = false;
  let degradedComponents: string[] = [];

  try {
    ttsAudioUrl = (await synthesize(question.text)).audioUrl;
  } catch {
    degraded = true;
    degradedComponents = ["tts"];
  }

  db.prepare(`
    INSERT INTO sessions (id, role, question_set_version, created_at)
    VALUES (?, ?, 'v1', ?)
  `).run(sessionId, role, new Date().toISOString());

  res.status(201).json({
    session_id: sessionId,
    role,
    question_set_version: "v1",
    question_index: question.index,
    question_text: question.text,
    tts_audio_url: ttsAudioUrl,
    degraded,
    degraded_components: degradedComponents
  });
});

router.get("/:id", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "TODO: fetch session", retryable: false } });
});

router.get("/:id/summary", async (_req, res) => {
  const session = db.prepare("SELECT id, status, retry_target_index, total_score, overall_category, conclusion, strengths_json, growth_areas_json, certificate_unlocked FROM sessions WHERE id = ?").get(_req.params.id) as { id: string; status: string; retry_target_index: number | null; total_score: number | null; overall_category: string | null; conclusion: string | null; strengths_json: string | null; growth_areas_json: string | null; certificate_unlocked: number } | undefined;
  if (!session) return res.status(404).json({ error: { code: "INVALID_SESSION", message: "Unknown session id", retryable: false } });
  if ((session.status === "completed" || session.status === "retried") && session.total_score !== null) {
    return res.status(200).json({
      session_id: _req.params.id,
      total_score: session.total_score,
      overall_category: session.overall_category,
      conclusion: session.conclusion,
      strengths: JSON.parse(session.strengths_json ?? "[]"),
      growth_areas: JSON.parse(session.growth_areas_json ?? "[]"),
      certificate_unlocked: session.certificate_unlocked === 1,
      retry_target_index: session.retry_target_index,
      degraded: false,
      degraded_components: []
    });
  }
  const rows = db.prepare("SELECT question_index, decision_json FROM turns WHERE session_id = ? AND is_final = 1 AND is_retry = 0 ORDER BY question_index").all(_req.params.id) as { question_index: number; decision_json: string }[];
  if (new Set(rows.map((row) => row.question_index)).size !== 5) {
    return res.status(409).json({ error: { code: "BAD_STATE", message: "All five questions must be finalized first", retryable: false } });
  }
  const finalizedTurns = rows.map((row) => {
    const decision = JSON.parse(row.decision_json);
    return {
      questionIndex: row.question_index,
      score: decision.score as number,
      category: decision.category,
      explanation: decision.explanation ?? "",
      whatWasGreat: decision.what_was_great ?? "",
      levelUpTips: decision.level_up_tips ?? []
    };
  });
  const weakest = finalizedTurns.reduce((lowest, turn) => turn.score < lowest.score ? turn : lowest, finalizedTurns[0]);
  const summary = await synthesizeSession(finalizedTurns);
  db.prepare(`
    UPDATE sessions SET status = 'completed', total_score = ?, overall_category = ?, conclusion = ?, strengths_json = ?, growth_areas_json = ?, retry_target_index = ?, certificate_unlocked = ?
    WHERE id = ?
  `).run(summary.totalScore, summary.overallCategory, summary.conclusion, JSON.stringify(summary.strengths), JSON.stringify(summary.growthAreas), weakest.questionIndex, summary.certificateUnlocked ? 1 : 0, _req.params.id);
  return res.status(200).json({
    session_id: _req.params.id,
    total_score: summary.totalScore,
    overall_category: summary.overallCategory,
    conclusion: summary.conclusion,
    strengths: summary.strengths,
    growth_areas: summary.growthAreas,
    certificate_unlocked: summary.certificateUnlocked,
    retry_target_index: weakest.questionIndex,
    degraded: summary.degraded,
    degraded_components: summary.degradedComponents
  });
});

export default router;
