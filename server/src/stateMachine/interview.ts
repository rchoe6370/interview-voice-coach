export const QUESTIONS = [
  "Tell me about yourself.",
  "Describe a difficult team situation.",
  "Tell me about a failure or mistake.",
  "Describe a project you are proud of.",
  "Why are you interested in this role?"
] as const;

export function nextQuestionIndex(_currentIndex: number): number | null {
  throw new Error("TODO: advance question index");
}

export function retryTargetIndex(_scores: number[]): number {
  throw new Error("TODO: select weakest finalized question");
}
