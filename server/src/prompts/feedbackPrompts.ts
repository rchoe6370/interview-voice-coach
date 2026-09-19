import type { FeedbackInput } from "../services/gemini.js";

export const FEEDBACK_SYSTEM_PROMPT = `You are a structured interview-answer evaluator. Return only one JSON object matching the requested schema. Decide whether to ask one concise follow-up or finalize the answer. Probe only when turn_number is less than 2 and the answer is too thin, vague, or off-topic. When finalizing, score the full dialogue from 0 to 100, derive the category from the score bands, give honest coaching feedback, provide 2 or 3 actionable tips, and copy evidence verbatim from the candidate transcript. Never mention hiring outcomes or score vocal style.`;
export const FEEDBACK_RETRY_APPENDIX = "Your previous response was not valid JSON matching the schema, or your category did not match your score. Return ONLY the corrected JSON object.";
export const SYNTHESIS_SYSTEM_PROMPT = `Return only JSON with conclusion, strengths, and growth_areas for a completed five-question mock interview. Use only the supplied evidence and never mention a hiring outcome.`;

export function buildFeedbackUserMessage(input: FeedbackInput): string {
	return `Role: ${input.role}\nInterview question asked: "${input.questionText}"\nturn_number: ${input.turnNumber}\nFull dialogue for this question so far:\n${input.dialogueTurns.map((turn) => `${turn.speaker}: "${turn.text}"`).join("\n")}`;
}

export function buildSynthesisUserMessage(summary: string): string {
	return summary;
}
