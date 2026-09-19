export const GEMINI_DECISION_SCHEMA = {
  type: "object",
  properties: {
    next_action: { type: "string", enum: ["ask_follow_up", "finalize_question"] },
    follow_up_type: { type: "string", enum: ["elaborate_generic", "personal_action", "specific_detail", "clarify_relevance"], nullable: true },
    follow_up_text: { type: "string", maxLength: 150, nullable: true },
    score: { type: "integer", minimum: 0, maximum: 100, nullable: true },
    category: { type: "string", enum: ["Excellent", "Good", "Satisfactory", "Needs Work"], nullable: true },
    explanation: { type: "string", maxLength: 500, nullable: true },
    what_was_great: { type: "string", maxLength: 300, nullable: true },
    level_up_tips: { type: "array", minItems: 2, maxItems: 3, nullable: true, items: { type: "object", properties: { title: { type: "string", maxLength: 60 }, detail: { type: "string", maxLength: 200 } }, required: ["title", "detail"] } },
    evidence: { type: "string", nullable: true },
  },
  required: ["next_action", "follow_up_type", "follow_up_text", "score", "category", "explanation", "what_was_great", "level_up_tips", "evidence"],
} as const;

export const GEMINI_SYNTHESIS_SCHEMA = {
  type: "object",
  properties: { conclusion: { type: "string" }, strengths: { type: "array", items: { type: "string" } }, growth_areas: { type: "array", items: { type: "string" } } },
  required: ["conclusion", "strengths", "growth_areas"],
} as const;