export interface TranscriptionResult {
  transcript: string;
  confidence: number | null;
  source: "stt" | "browser_stt";
}

export async function transcribe(_audio: Buffer): Promise<TranscriptionResult> {
  throw new Error("TODO: call ElevenLabs Scribe");
}

export async function synthesize(text: string): Promise<{ audioUrl: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) throw new Error("ElevenLabs credentials are not set");

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg"
    },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`ElevenLabs TTS failed with ${response.status}`);

  return { audioUrl: `data:audio/mpeg;base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}` };
}
