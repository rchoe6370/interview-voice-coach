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
  if (!parsed.success || (parsed.data.evidence !== null && !evidenceIsGrounded(parsed.data.evidence, transcript))) {
    return { decision: scoreWithRules(transcript, turnNumber), evaluator: "fallback_rules" };
  }

  const decision = { ...parsed.data, evaluator: "gemini" } as DecisionObject;
  if (decision.next_action === "ask_follow_up" && turnNumber >= 2) {
    return { decision: scoreWithRules(transcript, turnNumber), evaluator: "fallback_rules" };
  }
  return { decision, evaluator: "gemini" };
}
