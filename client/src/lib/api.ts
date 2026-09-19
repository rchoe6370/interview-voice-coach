// TODO: null tts_audio_url must trigger SpeechSynthesis fallback and the "backup voice" badge.
export async function startSession(_role: string): Promise<unknown> {
  throw new Error("TODO: POST /session/start");
}

export async function submitAnswer(_sessionId: string, _audio: Blob, _questionIndex: number, _turnNumber: number): Promise<unknown> {
  throw new Error("TODO: POST /session/:id/answer");
}

export async function confirmTranscript(_sessionId: string, _questionIndex: number, _turnNumber: number, _transcript: string): Promise<unknown> {
  throw new Error("TODO: POST /session/:id/confirm-transcript");
}
