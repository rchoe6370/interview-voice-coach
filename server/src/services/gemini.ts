import {
  FEEDBACK_SYSTEM_PROMPT,
  buildFeedbackUserMessage,
  FEEDBACK_RETRY_APPENDIX,
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserMessage,
} from "../prompts/feedbackPrompts.js";
import { GEMINI_DECISION_SCHEMA, GEMINI_SYNTHESIS_SCHEMA } from "./geminiSchema.js";

const configuredModel = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
const GEMINI_MODEL = configuredModel === "gemini-2.5-flash" ? "gemini-3.6-flash" : configuredModel;
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export interface FeedbackInput {
  role: string;
  questionText: string;
  dialogueTurns: { speaker: "interviewer" | "candidate"; text: string }[];
  turnNumber: number;
}

async function callGemini(
  systemText: string,
  userText: string,
  maxOutputTokens: number,
  temperature: number,
  responseSchema: unknown,
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(ENDPOINT(GEMINI_MODEL), {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents: [{ parts: [{ text: userText }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`gemini http ${res.status}: ${await res.text().catch(() => "")}`);
  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.length) throw new Error("gemini: empty response text");
  return JSON.parse(text);
}

export async function probeOrFinalize(input: FeedbackInput): Promise<unknown> {
  try {
    return await callGemini(FEEDBACK_SYSTEM_PROMPT, buildFeedbackUserMessage(input), 700, 0.2, GEMINI_DECISION_SCHEMA);
  } catch (error) {
    console.error("Gemini probe failed; retrying:", error);
    try {
      return await callGemini(FEEDBACK_SYSTEM_PROMPT + "\n" + FEEDBACK_RETRY_APPENDIX, buildFeedbackUserMessage(input), 700, 0.2, GEMINI_DECISION_SCHEMA);
    } catch (retryError) {
      console.error("Gemini probe retry failed; caller will use fallback:", retryError);
      throw retryError;
    }
  }
}

export async function synthesizeSessionRaw(finalizedSummary: string): Promise<unknown> {
  return callGemini(SYNTHESIS_SYSTEM_PROMPT, buildSynthesisUserMessage(finalizedSummary), 400, 0.3, GEMINI_SYNTHESIS_SCHEMA);
}
