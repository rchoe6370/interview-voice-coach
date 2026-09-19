import type { DecisionObject } from "../contracts.js";

export function validateDecision(
  _raw: unknown,
  _transcript: string,
  _turnNumber: number
): { decision: DecisionObject; evaluator: "nemotron" | "fallback_rules" } {
  throw new Error("TODO: validate decision and fall back when invalid");
}
