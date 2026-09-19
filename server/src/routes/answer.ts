import { Router } from "express";
import multer from "multer";
import { probeOrFinalize } from "../services/gemini.js";
import { scoreWithRules } from "../services/rulesBaseline.js";
import { validateDecision } from "../guardrails/validate.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/:id/answer", upload.any(), async (req, res) => {
  const transcript = typeof req.body.transcript === "string" && req.body.transcript.trim()
    ? req.body.transcript.trim()
    : "I worked with my team to improve the project and delivered the result on time.";
  const turnNumber = Number(req.body.turn_number ?? 0);
  const input = {
    role: String(req.body.role ?? "general"),
    questionText: String(req.body.question_text ?? "Tell me about yourself."),
    dialogueTurns: [{ speaker: "candidate" as const, text: transcript }],
    turnNumber: Number.isInteger(turnNumber) ? turnNumber : 0
  };

  let raw: unknown;
  try {
    raw = await probeOrFinalize(input);
  } catch {
    raw = scoreWithRules(transcript, input.turnNumber);
  }
  const { decision, evaluator } = validateDecision(raw, transcript, input.turnNumber);
  res.status(200).json({
    session_id: req.params.id,
    question_index: Number(req.body.question_index ?? 0),
    turn_number: input.turnNumber,
    next_turn_number: decision.next_action === "ask_follow_up" ? input.turnNumber + 1 : null,
    next_question_index: Number(req.body.question_index ?? 0) + (decision.next_action === "finalize_question" ? 1 : 0),
    transcript,
    transcript_source: "stt",
    stt_confidence: null,
    decision: { ...decision, evaluator },
    tts_audio_url: "",
    degraded: evaluator === "fallback_rules",
    degraded_components: evaluator === "fallback_rules" ? ["gemini"] : []
  });
});

router.post("/:id/confirm-transcript", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "TODO: confirm transcript", retryable: false } });
});

export default router;
