export type NextAction = "ask_follow_up" | "finalize_question";
export type FollowUpType = "elaborate_generic" | "personal_action" | "specific_detail" | "clarify_relevance" | null;
export type Category = "Excellent" | "Good" | "Satisfactory" | "Needs Work";
export type Evaluator = "nemotron" | "fallback_rules";
export type TranscriptSource = "stt" | "browser_stt" | "human_confirmed";

export interface LevelUpTip { title: string; detail: string; }
export interface DecisionObject {
  next_action: NextAction;
  follow_up_type: FollowUpType;
  follow_up_text: string | null;
  score: number | null;
  category: Category | null;
  explanation: string | null;
  what_was_great: string | null;
  level_up_tips: LevelUpTip[] | null;
  evidence: string | null;
  evaluator: Evaluator;
}

export interface TurnResponse {
  session_id: string;
  question_index: number;
  turn_number: number;
  next_turn_number: number | null;
  next_question_index: number;
  transcript: string;
  transcript_source: TranscriptSource;
  stt_confidence: number | null;
  decision: DecisionObject;
  tts_audio_url: string;
  degraded: boolean;
  degraded_components: string[];
}

export interface SessionSummary {
  session_id: string;
  total_score: number;
  overall_category: Category;
  conclusion: string;
  strengths: string[];
  growth_areas: string[];
  certificate_unlocked: boolean;
  retry_target_index: number;
  degraded: boolean;
  degraded_components: string[];
}

export interface ProbeInput {
  role: string;
  questionText: string;
  dialogueTurns: { speaker: "interviewer" | "candidate"; text: string }[];
  turnNumber: number;
}
