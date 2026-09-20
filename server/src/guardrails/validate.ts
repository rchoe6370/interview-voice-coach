import { decisionSchema } from "./schema.js";
import { evidenceIsGrounded } from "./evidenceCheck.js";
import type { DecisionObject } from "../contracts.js";
import { scoreWithRules } from "../services/rulesBaseline.js";

export function validateDecision(
  raw: unknown,
  transcript: string,
  turnNumber: number
): { decision: DecisionObject; evaluator: "gemini" | "fallback_rules" } {
  const parsed = decisionSchema.omit({ evaluator: true }).safeParse(raw);
  if (!parsed.success) {
    return { decision: scoreWithRules(transcript, turnNumber), evaluator: "fallback_rules" };
  }

  const decision = { ...parsed.data, evaluator: "gemini" } as DecisionObject;
  const categoryFor = (score: number): DecisionObject["category"] => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Satisfactory";
    return "Needs Work";
  };
  const categoryValid = decision.score === null || decision.category === categoryFor(decision.score);
  const probeFieldsValid = decision.next_action !== "ask_follow_up"
    || (decision.follow_up_type !== null && decision.follow_up_text !== null
      && decision.score === null && decision.category === null
      && decision.explanation === null && decision.what_was_great === null
      && decision.level_up_tips === null && decision.evidence === null);
  const finalizeFieldsValid = decision.next_action !== "finalize_question"
    || (decision.follow_up_type === null && decision.follow_up_text === null);
  const evidenceValid = decision.evidence === null || evidenceIsGrounded(decision.evidence, transcript);
  const titles = decision.level_up_tips?.map((tip) => tip.title) ?? [];
  const titlesUnique = new Set(titles).size === titles.length;
  if (!categoryValid || !probeFieldsValid || !finalizeFieldsValid || !evidenceValid || !titlesUnique) {
    return { decision: scoreWithRules(transcript, turnNumber), evaluator: "fallback_rules" };
  }
  // TODO(slice 4): force-finalize when turnNumber >= 2.
  return { decision, evaluator: "gemini" };
}
