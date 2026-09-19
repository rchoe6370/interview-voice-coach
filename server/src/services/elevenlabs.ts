export interface TranscriptionResult {
  transcript: string;
  confidence: number | null;
  source: "stt" | "browser_stt";
}

export async function transcribe(_audio: Buffer): Promise<TranscriptionResult> {
  throw new Error("TODO: call ElevenLabs Scribe");
}

export async function synthesize(_text: string): Promise<{ audioUrl: string }> {
  throw new Error("TODO: call ElevenLabs TTS");
}
