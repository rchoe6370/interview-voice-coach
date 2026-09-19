import type { Category, LevelUpTip } from "../contracts.js";
import { synthesizeSessionRaw } from "./gemini.js";

export interface FinalizedTurn {
  questionIndex: number;
  score: number;
  category: Category;
  explanation: string;
  levelUpTips: LevelUpTip[];
}

export async function synthesizeSession(_finalizedTurns: FinalizedTurn[]) {
  const summary = _finalizedTurns.map((turn) => ({
    questionIndex: turn.questionIndex,
    score: turn.score,
    category: turn.category,
    explanation: turn.explanation,
    levelUpTips: turn.levelUpTips,
  }));
  return synthesizeSessionRaw(JSON.stringify(summary));
}
