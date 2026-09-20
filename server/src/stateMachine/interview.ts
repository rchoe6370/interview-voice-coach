export const QUESTIONS = [
  "Tell me about yourself.",
  "Describe a difficult team situation.",
  "Tell me about a failure or mistake.",
  "Describe a project you are proud of.",
  "Why are you interested in this role?"
] as const;

export function nextQuestionIndex(currentIndex: number): number | null {
  return currentIndex < QUESTIONS.length - 1 ? currentIndex + 1 : null;
}

export function retryTargetIndex(_scores: number[]): number {
  throw new Error("TODO: select weakest finalized question");
}
