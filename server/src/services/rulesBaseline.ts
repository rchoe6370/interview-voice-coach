import type { DecisionObject } from "../contracts.js";
import type { Category } from "../contracts.js";

function categoryFor(score: number): Category {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Satisfactory";
  return "Needs Work";
}

export function scoreWithRules(transcript: string, turnNumber: number): DecisionObject {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (turnNumber < 2 && wordCount < 15) {
    return {
      next_action: "ask_follow_up",
      follow_up_type: "elaborate_generic",
      follow_up_text: "Could you expand on that a bit more?",
      score: null,
      category: null,
      explanation: null,
      what_was_great: null,
      level_up_tips: null,
      evidence: null,
      evaluator: "fallback_rules"
    };
  }

  const firstPerson = /\b(I|my|me|we|our)\b/gi.test(transcript) ? 25 : 0;
  const specificity = Math.min(25, (transcript.match(/\d+/g)?.length ?? 0) * 8 + (transcript.match(/\b[A-Z][a-z]+\b/g)?.length ?? 0) * 3);
  const score = Math.min(100, Math.max(0, Math.round(Math.min(35, wordCount * 1.5) + firstPerson + specificity + (wordCount >= 30 ? 15 : wordCount >= 15 ? 8 : 0))));
  return {
    next_action: "finalize_question",
    follow_up_type: null,
    follow_up_text: null,
    score,
    category: categoryFor(score),
    explanation: "Your answer gives the coach enough material to assess. Add a clearer outcome and concrete detail to make the story stronger.",
    what_was_great: firstPerson ? "You included personal ownership in the answer." : "You made a clear attempt to answer the question.",
    level_up_tips: [
      { title: "State the outcome", detail: "Explain what changed after your action and what you learned." },
      { title: "Add concrete detail", detail: "Include a number, timeframe, or named artifact to make the example easier to verify." }
    ],
    evidence: words.slice(0, Math.min(8, words.length)).join(" ") || null,
    evaluator: "fallback_rules"
  };
}
