export async function startRecording(): Promise<MediaRecorder> {
  throw new Error("TODO: request microphone and start MediaRecorder");
}

export function stopRecording(_recorder: MediaRecorder): Promise<Blob> {
  throw new Error("TODO: stop recorder and collect audio blob");
}
