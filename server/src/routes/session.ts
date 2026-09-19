import { Router } from "express";
import crypto from "node:crypto";
import { openDatabase } from "../db.js";
import { questions } from "../data/questions.js";
import { synthesize } from "../services/elevenlabs.js";

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

router.get("/:id/summary", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "TODO: fetch summary", retryable: false } });
});

export default router;
