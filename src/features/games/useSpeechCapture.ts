import { useEffect, useRef, useState } from "react";

interface CaptureResult {
  transcript: string;
  durationMs: number | null;
  source: "speech";
}

const getSpeechRecognitionConstructor = () =>
  typeof window === "undefined"
    ? null
    : window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;

export const useSpeechCapture = (onCapture: (result: CaptureResult) => void) => {
  const onCaptureRef = useRef(onCapture);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const captureStartRef = useRef<number | null>(null);
  const combinedTranscriptRef = useRef("");
  const shouldSubmitRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  const resetRecognition = () => {
    if (!recognitionRef.current) {
      return;
    }

    recognitionRef.current.onstart = null;
    recognitionRef.current.onresult = null;
    recognitionRef.current.onerror = null;
    recognitionRef.current.onend = null;
    recognitionRef.current = null;
  };

  useEffect(() => resetRecognition, []);

  const startListening = () => {
    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionConstructor) {
      setError("This browser does not expose Web Speech capture. Use the manual transcript fallback below.");
      return;
    }

    if (recognitionRef.current || isListening) {
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    combinedTranscriptRef.current = "";
    shouldSubmitRef.current = true;
    captureStartRef.current = performance.now();
    setLiveTranscript("");
    setError(null);

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let nextFinalTranscript = "";
      let nextInterimTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim() ?? "";

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          nextFinalTranscript = `${nextFinalTranscript} ${transcript}`.trim();
        } else {
          nextInterimTranscript = `${nextInterimTranscript} ${transcript}`.trim();
        }
      }

      combinedTranscriptRef.current = `${nextFinalTranscript} ${nextInterimTranscript}`.trim();
      setLiveTranscript(combinedTranscriptRef.current);
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        return;
      }

      setError(
        event.error === "not-allowed"
          ? "Microphone access was denied. Allow microphone permission or use the manual transcript fallback."
          : `Speech capture failed: ${event.error}.`
      );
    };

    recognition.onend = () => {
      const transcript = combinedTranscriptRef.current.trim();
      const durationMs =
        captureStartRef.current === null ? null : Math.round(performance.now() - captureStartRef.current);

      setIsListening(false);
      resetRecognition();

      if (shouldSubmitRef.current && transcript) {
        onCaptureRef.current({
          transcript,
          durationMs,
          source: "speech"
        });
      }

      shouldSubmitRef.current = false;
      combinedTranscriptRef.current = "";
      captureStartRef.current = null;
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (!recognitionRef.current) {
      return;
    }

    recognitionRef.current.stop();
  };

  return {
    isSupported: Boolean(getSpeechRecognitionConstructor()),
    isListening,
    liveTranscript,
    error,
    clearError: () => setError(null),
    startListening,
    stopListening
  };
};
