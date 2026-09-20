export interface SummaryQuestion {
  questionIndex: number;
  score: number;
  category: string;
  levelUpTips: { title: string; detail: string }[];
}

interface SessionSummaryProps {
  totalScore: number;
  overallCategory: string;
  conclusion: string;
  strengths: string[];
  growthAreas: string[];
  questions: SummaryQuestion[];
  retryTargetIndex: number;
  certificateUnlocked: boolean;
  retryUsed: boolean;
  onRetry: () => void;
}

export function SessionSummary({ totalScore, overallCategory, conclusion, strengths, growthAreas, questions, retryTargetIndex, certificateUnlocked, retryUsed, onRetry }: SessionSummaryProps) {
  return <section>
    <h2>Session summary</h2>
    <p style={{ fontSize: 32, fontWeight: 800 }}>{totalScore.toFixed(1)} <span style={{ fontSize: 18 }}>{overallCategory}</span></p>
    {certificateUnlocked && <p style={{ display: "inline-block", padding: "8px 12px", background: "#d8f3dc", borderRadius: 999, fontWeight: 800 }}>Certificate unlocked</p>}
    <p>{conclusion}</p>
    <h3>Strengths</h3><ul>{strengths.map((item) => <li key={item}>{item}</li>)}</ul>
    <h3>Growth areas</h3><ul>{growthAreas.map((item) => <li key={item}>{item}</li>)}</ul>
    <h3>Question scores</h3>
    {questions.map((question) => <p key={question.questionIndex} style={{ padding: 10, background: question.questionIndex === retryTargetIndex ? "#fff0d6" : "#eef4f5" }}><strong>Question {question.questionIndex + 1}:</strong> {question.score} · {question.category}{question.questionIndex === retryTargetIndex ? " · retry target" : ""}</p>)}
    <button type="button" onClick={onRetry} disabled={retryUsed} style={{ padding: "12px 18px", background: retryUsed ? "#aab4bb" : "#d94a4a", color: "white", border: 0, borderRadius: 8, fontWeight: 800, cursor: retryUsed ? "not-allowed" : "pointer" }}>{retryUsed ? "Retry used" : "Retry weakest answer"}</button>
  </section>;
}
