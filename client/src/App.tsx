import { useState } from "react";
import { RecordButton } from "./components/RecordButton";
import { ApiError, AnswerResponse, SessionStartResponse, startSession, submitAnswer } from "./lib/api";
import { playAudio, speak } from "./lib/audio";

export function App() {
  const [role, setRole] = useState("swe-behavioral");
  const [session, setSession] = useState<SessionStartResponse | null>(null);
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionText, setQuestionText] = useState("");
  const [turnNumber, setTurnNumber] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [backupVoice, setBackupVoice] = useState(false);
  const [complete, setComplete] = useState(false);

  const announce = async (text: string, audioUrl: string | null) => {
    if (audioUrl) {
      setBackupVoice(false);
      try { await playAudio(audioUrl); } catch { speak(text); setBackupVoice(true); }
    } else {
      speak(text);
      setBackupVoice(true);
    }
  };

  const beginSession = async () => {
    setBusy(true); setError("");
    try {
      const next = await startSession(role);
      setSession(next); setAnswer(null); setQuestionIndex(next.question_index); setQuestionText(next.question_text); setTurnNumber(0); setComplete(false);
      await announce(next.question_text, next.tts_audio_url);
    } catch (caught) { setError(formatError(caught)); }
    finally { setBusy(false); }
  };

  const handleRecording = async (audio: Blob) => {
    if (!session) return;
    setBusy(true); setError("");
    try {
      const next = await submitAnswer(session.session_id, audio, questionIndex, turnNumber);
      setAnswer(next);
      if (next.decision.next_action === "ask_follow_up") {
        if (next.next_turn_number !== null) setTurnNumber(next.next_turn_number);
        if (next.decision.follow_up_text) await announce(next.decision.follow_up_text, next.tts_audio_url);
      } else {
        const finalized = next as AnswerResponse & { next_question: { question_index: number; question_text: string; tts_audio_url: string | null } | null };
        if (!finalized.next_question) {
          setComplete(true);
          return;
        }
        setQuestionIndex(finalized.next_question.question_index);
        setQuestionText(finalized.next_question.question_text);
        setTurnNumber(0);
        await announce(finalized.next_question.question_text, finalized.next_question.tts_audio_url);
      }
    } catch (caught) { setError(formatError(caught)); }
    finally { setBusy(false); }
  };

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", minHeight: "100vh", boxSizing: "border-box" }}>
      <p style={{ color: "#d94a4a", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Interview Voice Coach</p>
      <h1 style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 1, margin: "16px 0", color: "#173f5f" }}>Practice answers that land.</h1>
      {!session ? (
        <section>
          <p style={{ fontSize: 20, lineHeight: 1.5 }}>A focused mock interview with spoken questions and useful follow-ups.</p>
          <label style={{ display: "block", margin: "32px 0 12px", fontWeight: 700 }}>Role
            <select value={role} onChange={(event) => setRole(event.target.value)} style={{ display: "block", marginTop: 8, padding: 12, fontSize: 16, minWidth: 240 }}>
              <option value="swe-behavioral">Software engineering</option><option value="pm">Product management</option><option value="data">Data</option><option value="general">General</option>
            </select>
          </label>
          <button type="button" onClick={() => void beginSession()} disabled={busy} style={{ padding: "14px 24px", border: 0, borderRadius: 8, background: "#d94a4a", color: "white", fontWeight: 800, fontSize: 16 }}>{busy ? "Starting..." : "Start interview"}</button>
        </section>
      ) : (
        <section>
          <p style={{ color: "#68737d" }}>Question {questionIndex + 1} of 5</p>
          <h2 style={{ fontSize: 32, color: "#173f5f", lineHeight: 1.2 }}>{questionText}</h2>
          {backupVoice && <p style={{ display: "inline-block", padding: "6px 10px", background: "#fff0d6", color: "#8a5712", borderRadius: 999, fontWeight: 700 }}>Backup voice</p>}
          {answer && <div style={{ margin: "28px 0", padding: 20, background: "#eef4f5", borderLeft: "4px solid #d94a4a" }}><strong>You said</strong><p>{answer.transcript}</p>{answer.decision.follow_up_text && <><strong>Follow-up</strong><p>{answer.decision.follow_up_text}</p></>}</div>}
          {answer?.decision.next_action === "finalize_question" && <div style={{ margin: "28px 0", padding: 20, background: "#fff0d6" }}><strong>Score: {answer.decision.score ?? "-"} · {answer.decision.category ?? "Unscored"}</strong><p>{answer.decision.evidence ? `Evidence: ${answer.decision.evidence}` : "No evidence captured."}</p>{answer.decision.level_up_tips?.map((tip) => <p key={tip.title}><strong>{tip.title}:</strong> {tip.detail}</p>)}</div>}
          {complete ? <p style={{ fontSize: 20, fontWeight: 700 }}>Interview complete — summary screen lands in slice 7.</p> : <RecordButton disabled={busy} onRecordingComplete={(audio) => void handleRecording(audio)} onError={setError} />}
          {busy && <p>Processing your answer...</p>}
        </section>
      )}
      {error && <p role="alert" style={{ marginTop: 24, color: "#a12626", fontWeight: 700 }}>{error}</p>}
    </main>
  );
}

function formatError(error: unknown): string {
  if (error instanceof ApiError) {
    const expected = error.details.expected ? ` Expected question ${error.details.expected.question_index}, turn ${error.details.expected.turn_number}.` : "";
    return `${error.details.message} (${error.details.code}).${expected}`;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
