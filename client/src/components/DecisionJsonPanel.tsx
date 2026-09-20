interface DecisionJsonPanelProps {
  modelRaw: string;
  evaluator: "gemini" | "fallback_rules";
  nextAction: "ask_follow_up" | "finalize_question";
}

export function DecisionJsonPanel({ modelRaw, evaluator, nextAction }: DecisionJsonPanelProps) {
  return (
    <section aria-label="Gemini decision JSON">
      <details>
        <summary>Raw structured decision</summary>
        <p><strong>{evaluator}</strong> · {nextAction}</p>
        <pre style={{ overflowX: "auto", padding: 16, background: "#17212b", color: "#d8f3dc", borderRadius: 8 }}>{highlightJson(modelRaw)}</pre>
      </details>
    </section>
  );
}

function highlightJson(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}
