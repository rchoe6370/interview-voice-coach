export function evidenceIsGrounded(evidence: string | null, transcript: string): boolean {
  return evidence === null || transcript.includes(evidence) || transcript.toLowerCase().includes(evidence.toLowerCase());
}
