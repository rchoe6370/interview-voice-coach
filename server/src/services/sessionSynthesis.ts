import type { Category, LevelUpTip } from "../contracts.js";
import { synthesizeSessionRaw } from "./gemini.js";

export interface FinalizedTurn {
  questionIndex: number;
  score: number;
  category: Category;
  explanation: string;
  whatWasGreat: string;
  levelUpTips: LevelUpTip[];
}

export interface SessionSynthesisResult {
  totalScore: number;
  overallCategory: Category;
  conclusion: string;
  strengths: string[];
  growthAreas: string[];
  certificateUnlocked: boolean;
  degraded: boolean;
  degradedComponents: string[];
}

function categoryFor(score: number): Category {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Satisfactory";
  return "Needs Work";
}

function fallbackSummary(totalScore: number, turns: FinalizedTurn[]): Omit<SessionSynthesisResult, "degraded" | "degradedComponents"> {
  const overallCategory = categoryFor(totalScore);
  const strengths = turns.map((turn) => turn.whatWasGreat).filter(Boolean).slice(0, 3);
  const growthAreas = turns.flatMap((turn) => turn.levelUpTips.map((tip) => tip.title)).slice(0, 4);
  return {
    totalScore,
    overallCategory,
    conclusion: overallCategory === "Excellent"
      ? "You gave consistently specific, well-owned answers across the session. Keep practicing concise storytelling so those strengths stay easy to follow."
      : overallCategory === "Good"
        ? "You showed a solid foundation across the session. Add sharper outcomes and concrete details to make your answers more memorable."
        : "You made a clear start across the session. Practice expanding your answers with personal actions, outcomes, and concrete examples.",
    strengths,
    growthAreas,
    certificateUnlocked: totalScore >= 50
  };
}

export async function synthesizeSession(finalizedTurns: FinalizedTurn[]): Promise<SessionSynthesisResult> {
  const totalScore = Math.round(finalizedTurns.reduce((sum, turn) => sum + turn.score, 0) / finalizedTurns.length * 10) / 10;
  const base = fallbackSummary(totalScore, finalizedTurns);
  const summary = finalizedTurns.map((turn) => ({
    questionIndex: turn.questionIndex,
    score: turn.score,
    category: turn.category,
    explanation: turn.explanation,
    levelUpTips: turn.levelUpTips,
  }));
  try {
    const raw = await synthesizeSessionRaw(JSON.stringify(summary)) as { conclusion?: unknown; strengths?: unknown; growth_areas?: unknown };
    if (typeof raw.conclusion !== "string" || !Array.isArray(raw.strengths) || !Array.isArray(raw.growth_areas)
      || !raw.strengths.every((item) => typeof item === "string")
      || !raw.growth_areas.every((item) => typeof item === "string")) {
      throw new Error("invalid synthesis response");
    }
    return {
      ...base,
      conclusion: raw.conclusion,
      strengths: raw.strengths as string[],
      growthAreas: raw.growth_areas as string[],
      degraded: false,
      degradedComponents: []
    };
  } catch {
    return { ...base, degraded: true, degradedComponents: ["gemini"] };
  }
}
