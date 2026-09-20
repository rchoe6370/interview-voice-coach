import { useEffect, useState } from "react";
import { RecordButton } from "./RecordButton";
import { speak } from "../lib/audio";

interface RetryCompareProps {
  sessionId: string;
  questionIndex: number;
  questionText: string;
  tipApplied: string;
  result?: RetryResult | null;
  onBack: () => void;
  onComplete: (result: RetryResult) => void;
}

export interface RetryResult { original: { score: number; category: string }; retry: { score: number | null; category: string | null }; tip_applied: string; }

export function RetryCompare({ sessionId, questionIndex, questionText, tipApplied, result = null, onBack, onComplete }: RetryCompareProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!result) speak(tipApplied);
  }, [result, tipApplied]);
  const retry = async (audio: Blob) => {
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.append("audio", audio, "retry.webm"); form.append("question_index", String(questionIndex));
      const response = await fetch(`/api/session/${sessionId}/retry`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? `Retry failed (${response.status})`);
      onComplete(body as RetryResult);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Retry failed."); }
    finally { setBusy(false); }
  };
  return <section style={{ marginTop: 24 }}>
    <h2>Retry: {questionText}</h2>
    {result ? <div>
      <p><strong>Original:</strong> {result.original.score} · {result.original.category}</p>
      <p><strong>Retry:</strong> {result.retry.score ?? "-"} · {result.retry.category ?? "-"}</p>
      <p>Tip applied: {result.tip_applied}</p>
      <p>Practice only — summary totals unchanged.</p>
    </div> : <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 28px", color: "#53616c" }}>
        <span><strong>Tip to apply:</strong> {tipApplied}</span>
        <button type="button" aria-label="Replay tip" onClick={() => speak(tipApplied)} disabled={busy} style={{ border: 0, background: "transparent", color: "#164e63", textDecoration: "underline", cursor: "pointer", padding: 4 }}>Replay</button>
      </div>
      <RecordButton disabled={busy} onRecordingComplete={(audio) => void retry(audio)} onError={setError} />
      {busy && <p>Processing retry...</p>}{error && <p role="alert">{error}</p>}
    </>}
    <button type="button" onClick={onBack} disabled={busy} style={{ display: "block", marginTop: 28, border: 0, background: "transparent", color: "#53616c", padding: 0, textDecoration: "underline", cursor: "pointer" }}>Back to summary</button>
  </section>;
}
