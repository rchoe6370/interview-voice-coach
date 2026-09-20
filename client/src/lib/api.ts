const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface ApiErrorDetails {
  code: string;
  message: string;
  expected?: { question_index: number; turn_number: number };
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly details: ApiErrorDetails) {
    super(details.message);
    this.name = "ApiError";
  }
}

export interface SessionStartResponse {
  session_id: string;
  role: string;
  question_set_version: string;
  question_index: number;
  question_text: string;
  tts_audio_url: string | null;
  degraded: boolean;
  degraded_components: string[];
}

export interface AnswerResponse {
  session_id: string;
  question_index: number;
  turn_number: number;
  next_turn_number: number | null;
  next_question_index: number;
  transcript: string;
  transcript_source: "stt" | "browser_stt" | "human_confirmed";
  stt_confidence: number | null;
  decision: {
    next_action: "ask_follow_up" | "finalize_question";
    follow_up_type: string | null;
    follow_up_text: string | null;
    score: number | null;
    category: string | null;
    explanation: string | null;
    what_was_great: string | null;
    level_up_tips: { title: string; detail: string }[] | null;
    evidence: string | null;
    evaluator: "gemini" | "fallback_rules";
  };
  tts_audio_url: string | null;
  degraded: boolean;
  degraded_components: string[];
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, init);
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => ({})) as { error?: ApiErrorDetails };
  throw new ApiError(response.status, body.error ?? { code: "REQUEST_FAILED", message: `Request failed with ${response.status}.` });
}

export function startSession(role: string): Promise<SessionStartResponse> {
  return request<SessionStartResponse>("/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });
}

export function submitAnswer(sessionId: string, audio: Blob, questionIndex: number, turnNumber: number): Promise<AnswerResponse> {
  const form = new FormData();
  form.append("audio", audio, "answer.webm");
  form.append("question_index", String(questionIndex));
  form.append("turn_number", String(turnNumber));
  return request<AnswerResponse>(`/session/${sessionId}/answer`, { method: "POST", body: form });
}

export async function confirmTranscript(_sessionId: string, _questionIndex: number, _turnNumber: number, _transcript: string): Promise<unknown> {
  throw new Error("TODO: POST /session/:id/confirm-transcript");
}
