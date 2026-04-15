import { useRef, useState, useCallback } from "react";

interface UseVoiceRecorderResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  error: string | null;
}

export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const resolveStop = useRef<((blob: Blob) => void) | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer webm, fall back to whatever is available
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, {
          type: recorder.mimeType || "audio/webm",
        });
        resolveStop.current?.(blob);
        resolveStop.current = null;
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setError(err.message || "Microphone access denied");
      throw err;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder.current || mediaRecorder.current.state !== "recording") {
        reject(new Error("Not recording"));
        return;
      }
      resolveStop.current = resolve;
      mediaRecorder.current.stop();
      setIsRecording(false);
    });
  }, []);

  return { isRecording, startRecording, stopRecording, error };
}
