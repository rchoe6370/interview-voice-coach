import { useEffect, useRef, useState } from "react";
import { startRecording, stopRecording } from "../lib/audio";

interface RecordButtonProps {
  disabled?: boolean;
  onRecordingComplete: (audio: Blob) => void;
  onError: (message: string) => void;
}

export function RecordButton({ disabled = false, onRecordingComplete, onError }: RecordButtonProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed((Date.now() - (startedAtRef.current ?? Date.now())) / 1000), 100);
    return () => window.clearInterval(timer);
  }, [recording]);

  const startedAtRef = useRef<number | null>(null);
  const begin = async () => {
    if (disabled || recorderRef.current) return;
    try {
      recorderRef.current = await startRecording();
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Recording failed.");
    }
  };
  const end = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setRecording(false);
    try {
      onRecordingComplete(await stopRecording(recorder));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Recording failed.");
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); void begin(); }}
      onPointerUp={() => { void end(); }}
      onPointerCancel={() => { void end(); }}
      style={{ minWidth: 220, minHeight: 88, border: 0, borderRadius: 18, color: "white", background: recording ? "#0e7490" : "#164e63", fontSize: 18, fontWeight: 700, boxShadow: recording ? "0 0 0 10px rgba(217,74,74,.16)" : "0 8px 20px rgba(23,63,95,.2)" }}
    >
      {recording ? `Recording ${elapsed.toFixed(1)}s` : "Press and hold to answer"}
    </button>
  );
}
