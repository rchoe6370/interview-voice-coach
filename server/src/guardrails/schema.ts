import { z } from "zod";

export const decisionSchema = z.object({
  next_action: z.enum(["ask_follow_up", "finalize_question"]),
  follow_up_type: z.enum(["elaborate_generic", "personal_action", "specific_detail", "clarify_relevance"]).nullable(),
  follow_up_text: z.string().max(150).nullable(),
  score: z.number().int().min(0).max(100).nullable(),
  category: z.enum(["Excellent", "Good", "Satisfactory", "Needs Work"]).nullable(),
  explanation: z.string().max(500).nullable(),
  what_was_great: z.string().max(300).nullable(),
  level_up_tips: z.array(z.object({ title: z.string().max(60), detail: z.string().max(200) })).min(2).max(3).nullable(),
  evidence: z.string().nullable(),
  evaluator: z.enum(["nemotron", "fallback_rules"])
}).strict();
