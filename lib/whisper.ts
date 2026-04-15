import { WHISPER_API_URL, WHISPER_API_KEY } from "./config";

export interface WhisperResponse {
  transcript: string;
  language: string;
  duration: number;
  request_id: string;
}

export async function transcribeAudio(
  audioBlob: Blob
): Promise<WhisperResponse> {
  const formData = new FormData();
  const file = new File([audioBlob], "recording.webm", {
    type: audioBlob.type || "audio/webm",
  });
  formData.append("file", file);

  const response = await fetch(`${WHISPER_API_URL}/transcribe`, {
    method: "POST",
    headers: { "X-API-Key": WHISPER_API_KEY },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Whisper API error (${response.status}): ${text}`);
  }

  return response.json();
}
