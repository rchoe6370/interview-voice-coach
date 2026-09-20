const recorderState = new WeakMap<MediaRecorder, { chunks: Blob[]; startedAt: number; timeout: number }>();

export class AudioError extends Error {
  constructor(public readonly code: "MIC_DENIED" | "MIC_UNAVAILABLE" | "RECORD_FAILED", message: string) {
    super(message);
    this.name = "AudioError";
  }
}

export async function startRecording(): Promise<MediaRecorder> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    const mimeType = "audio/webm;codecs=opus";
    const recorder = MediaRecorder.isTypeSupported(mimeType)
      ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
      : new MediaRecorder(stream, { audioBitsPerSecond: 128000 });
    const chunks: Blob[] = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    const timeout = window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 90000);
    recorderState.set(recorder, { chunks, startedAt: Date.now(), timeout });
    recorder.start();
    return recorder;
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError") throw new AudioError("MIC_DENIED", "Microphone permission was denied.");
    if (name === "NotFoundError") throw new AudioError("MIC_UNAVAILABLE", "No microphone was found.");
    throw new AudioError("RECORD_FAILED", "Recording could not be started.");
  }
}

export function stopRecording(recorder: MediaRecorder): Promise<Blob> {
  const state = recorderState.get(recorder);
  if (!state) return Promise.reject(new AudioError("RECORD_FAILED", "Recording state was lost."));
  const wait = Math.max(0, 500 - (Date.now() - state.startedAt));
  return new Promise((resolve, reject) => {
    const finish = () => {
      window.clearTimeout(state.timeout);
      recorder.stream.getTracks().forEach((track) => track.stop());
      recorderState.delete(recorder);
      const type = recorder.mimeType || "audio/webm";
      resolve(new Blob(state.chunks, { type }));
    };
    recorder.addEventListener("stop", finish, { once: true });
    window.setTimeout(() => {
      try {
        if (recorder.state === "recording") recorder.stop();
        else finish();
      } catch {
        reject(new AudioError("RECORD_FAILED", "Recording could not be stopped."));
      }
    }, wait);
  });
}

export async function playAudio(url: string): Promise<void> {
  const audio = new Audio(url);
  await audio.play();
}

export function speak(text: string): void {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}
