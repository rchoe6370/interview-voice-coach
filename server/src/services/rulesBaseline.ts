import type { DecisionObject } from "../contracts.js";

export function scoreWithRules(_transcript: string, _turnNumber: number): DecisionObject {
  throw new Error("TODO: implement rules-baseline scorer");
}
