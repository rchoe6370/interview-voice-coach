import type { Category, LevelUpTip } from "../contracts.js";

export interface FinalizedTurn {
  questionIndex: number;
  score: number;
  category: Category;
  explanation: string;
  levelUpTips: LevelUpTip[];
}

export async function synthesizeSession(_finalizedTurns: FinalizedTurn[]) {
  throw new Error("TODO: synthesize completed session");
}
