import { useEffect, useRef, useState } from "react";

import { appEnv } from "@/lib/env";
import { requestDeepgramAccessToken } from "@/lib/deepgram";
import { appLog } from "@/lib/logger";

interface CaptureResult {
  transcript: string;
  durationMs: number | null;
  source: "speech";
}

type CapturePhase = "idle" | "requesting_mic" | "authenticating" | "connecting" | "ready" | "finalizing";

interface UseSpeechCaptureOptions {
  keyterms?: string[];
  sessionLabel?: string;
}

interface DeepgramResultsMessage {
  type: "Results";
  is_final?: boolean;
  speech_final?: boolean;
  from_finalize?: boolean;
  channel?: {
    alternatives?: Array<{
      transcript?: string;
    }>;
  };
}

interface DeepgramControlMessage {
  type: "Metadata" | "UtteranceEnd" | "SpeechStarted" | "KeepAlive";
}

interface DeepgramErrorMessage {
  type: "Error";
  description?: string;
  code?: string;
}

interface ActiveSpeechSession {
  websocket: WebSocket;
  mediaStream: MediaStream;
  audioContext: AudioContext;
  sourceNode: MediaStreamAudioSourceNode;
  processorNode: ScriptProcessorNode;
  outputNode: GainNode;
  finalSegments: string[];
  interimTranscript: string;
  pendingAudioChunks: ArrayBuffer[];
  sentChunkCount: number;
  shouldSubmit: boolean;
  finalizing: boolean;
  finalized: boolean;
  hasOpened: boolean;
  errorMessage: string | null;
  keepAliveTimerId: number | null;
  finalizeTimerId: number | null;
  hardCloseTimerId: number | null;
}

const targetSampleRate = 16_000;
const processorBufferSize = 4096;
const maxKeyterms = 25;
const maxQueuedAudioChunks = 12;

const isLikelyMobileSafari = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/CriOS|FxiOS/.test(userAgent);
};

const getAudioContextConstructor = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;
};

const isSpeechCaptureSupported = () =>
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  Boolean(window.WebSocket) &&
  Boolean(getAudioContextConstructor()) &&
  Boolean(navigator.mediaDevices?.getUserMedia);

const normalizeSpeechError = (error: unknown) => {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Microphone access was denied. Allow microphone permission in the browser, then retry, or use the manual transcript fallback.";
    }

    if (error.name === "NotFoundError") {
      return "No working microphone was detected. Check the device mic or switch to the manual transcript fallback.";
    }

    if (error.name === "NotReadableError") {
      return "The microphone is busy or unavailable right now. Close other apps using the mic, then try again.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Speech capture failed before a usable transcript was returned.";
};

const downsampleTo16Khz = (input: Float32Array, inputSampleRate: number) => {
  if (inputSampleRate === targetSampleRate) {
    const direct = new Int16Array(input.length);

    for (let index = 0; index < input.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
      direct[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return direct;
  }

  const ratio = inputSampleRate / targetSampleRate;
  const nextLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Int16Array(nextLength);
  let inputIndex = 0;

  for (let outputIndex = 0; outputIndex < nextLength; outputIndex += 1) {
    const nextInputIndex = Math.min(input.length, Math.round((outputIndex + 1) * ratio));
    let total = 0;
    let count = 0;

    while (inputIndex < nextInputIndex) {
      total += input[inputIndex] ?? 0;
      count += 1;
      inputIndex += 1;
    }

    const average = count > 0 ? total / count : 0;
    const clamped = Math.max(-1, Math.min(1, average));
    output[outputIndex] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return output;
};

const cleanupSession = (session: ActiveSpeechSession) => {
  session.processorNode.onaudioprocess = null;
  session.processorNode.disconnect();
  session.sourceNode.disconnect();
  session.outputNode.disconnect();

  if (session.audioContext.state !== "closed") {
    void session.audioContext.close();
  }

  session.mediaStream.getTracks().forEach((track) => track.stop());

  if (session.keepAliveTimerId !== null) {
    window.clearInterval(session.keepAliveTimerId);
  }

  if (session.finalizeTimerId !== null) {
    window.clearTimeout(session.finalizeTimerId);
  }

  if (session.hardCloseTimerId !== null) {
    window.clearTimeout(session.hardCloseTimerId);
  }
};

const buildSocketUrl = (keyterms: string[]) => {
  const url = new URL("wss://api.deepgram.com/v1/listen");

  url.searchParams.set("model", "nova-3");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("encoding", "linear16");
  url.searchParams.set("sample_rate", String(targetSampleRate));
  url.searchParams.set("channels", "1");
  url.searchParams.set("interim_results", "true");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("endpointing", "300");
  url.searchParams.set("vad_events", "true");

  // `utterance_end_ms` consistently caused non-101 websocket handshakes with
  // browser-safe temporary JWT auth, so we leave it off and rely on finalize.
  keyterms.slice(0, maxKeyterms).forEach((term) => {
    url.searchParams.append("keyterm", term);
  });

  return url.toString();
};

export const useSpeechCapture = (
  onCapture: (result: CaptureResult) => void,
  options: UseSpeechCaptureOptions = {}
) => {
  const onCaptureRef = useRef(onCapture);
  const optionsRef = useRef(options);
  const sessionRef = useRef<ActiveSpeechSession | null>(null);
  const startRequestIdRef = useRef(0);
  const isStartingRef = useRef(false);
  const captureStartRef = useRef<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const finishSession = (session: ActiveSpeechSession) => {
    if (session.finalized) {
      return;
    }

    session.finalized = true;
    cleanupSession(session);

    const transcript = [...session.finalSegments, session.interimTranscript]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const durationMs =
      captureStartRef.current === null ? null : Math.round(performance.now() - captureStartRef.current);

    if (sessionRef.current === session) {
      sessionRef.current = null;
      isStartingRef.current = false;
      captureStartRef.current = null;
      setIsListening(false);
      setPhase("idle");
      setLiveTranscript("");
    }

    if (session.shouldSubmit && transcript) {
      onCaptureRef.current({
        transcript,
        durationMs,
        source: "speech"
      });
      return;
    }

    if (session.errorMessage) {
      setError(session.errorMessage);
      return;
    }

    if (session.shouldSubmit) {
      setError(
        "No speech was detected before capture stopped. Try again or use the manual transcript fallback if the gym is too noisy."
      );
    }
  };

  const finalizeOpenSession = (session: ActiveSpeechSession) => {
    if (session.finalizeTimerId !== null || session.hardCloseTimerId !== null) {
      return;
    }

    session.websocket.send(JSON.stringify({ type: "Finalize" }));

    session.finalizeTimerId = window.setTimeout(() => {
      if (session.websocket.readyState === WebSocket.OPEN) {
        session.websocket.send(JSON.stringify({ type: "CloseStream" }));
      }
    }, 700);

    session.hardCloseTimerId = window.setTimeout(() => {
      if (session.websocket.readyState === WebSocket.OPEN || session.websocket.readyState === WebSocket.CONNECTING) {
        session.websocket.close();
      }
    }, 1_500);
  };

  const stopActiveSession = (shouldSubmit: boolean) => {
    const session = sessionRef.current;

    if (!session) {
      return;
    }

    if (session.finalizing) {
      session.shouldSubmit = session.shouldSubmit || shouldSubmit;
      return;
    }

    session.shouldSubmit = shouldSubmit;
    session.finalizing = true;
    setPhase("finalizing");

    appLog("info", "capture.deepgram.stop", {
      label: optionsRef.current.sessionLabel ?? "capture",
      shouldSubmit
    });

    session.processorNode.onaudioprocess = null;
    session.mediaStream.getTracks().forEach((track) => track.stop());

    if (session.keepAliveTimerId !== null) {
      window.clearInterval(session.keepAliveTimerId);
      session.keepAliveTimerId = null;
    }

    if (session.websocket.readyState === WebSocket.OPEN) {
      finalizeOpenSession(session);
      return;
    }

    if (session.websocket.readyState === WebSocket.CONNECTING) {
      session.hardCloseTimerId = window.setTimeout(() => {
        if (session.websocket.readyState === WebSocket.CONNECTING) {
          session.websocket.close();
        }
      }, 2_500);

      return;
    }

    session.websocket.close();
  };

  useEffect(
    () => () => {
      startRequestIdRef.current += 1;
      stopActiveSession(false);
    },
    []
  );

  const startListening = () => {
    if (!isSpeechCaptureSupported()) {
      setError(
        isLikelyMobileSafari()
          ? "This browser can’t start the Deepgram mic pipeline right now. On iPhone or iPad, allow the microphone in Safari, then try again. You can still type plays in the box below."
          : "This browser doesn’t support the live dictation pipeline. Type plays in the box below instead."
      );
      return;
    }

    if (sessionRef.current || isStartingRef.current || isListening) {
      return;
    }

    const requestId = startRequestIdRef.current + 1;
    startRequestIdRef.current = requestId;
    isStartingRef.current = true;
    captureStartRef.current = performance.now();
    setPhase("requesting_mic");
    setLiveTranscript("");
    setError(null);
    setIsListening(true);

    void (async () => {
      let mediaStream: MediaStream | null = null;

      try {
        const browserApiKey =
          appEnv.environment === "production" ? null : appEnv.deepgramBrowserApiKey;

        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        if (startRequestIdRef.current !== requestId) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        let accessToken: string | null = null;

        if (!browserApiKey) {
          setPhase("authenticating");
          appLog("info", "capture.deepgram.token.started", {
            label: optionsRef.current.sessionLabel ?? "capture"
          });

          const tokenResponse = await requestDeepgramAccessToken();
          accessToken = tokenResponse.accessToken;

          appLog("info", "capture.deepgram.token.succeeded", {
            label: optionsRef.current.sessionLabel ?? "capture",
            expiresIn: tokenResponse.expiresIn
          });
        }

        if (startRequestIdRef.current !== requestId) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        const AudioContextConstructor = getAudioContextConstructor();

        if (!AudioContextConstructor) {
          throw new Error("This browser cannot create an audio context for live dictation.");
        }

        const audioContext = new AudioContextConstructor();
        const sourceNode = audioContext.createMediaStreamSource(mediaStream);
        const processorNode = audioContext.createScriptProcessor(processorBufferSize, 1, 1);
        const outputNode = audioContext.createGain();
        outputNode.gain.value = 0;
        const credentialType = browserApiKey ? "token" : "bearer";
        const credentialValue = browserApiKey ?? accessToken;

        if (!credentialValue) {
          throw new Error("Deepgram authentication could not be prepared for live dictation.");
        }

        const websocket = new WebSocket(buildSocketUrl(optionsRef.current.keyterms ?? []), [
          credentialType,
          credentialValue
        ]);
        setPhase("connecting");

        websocket.binaryType = "arraybuffer";

        const session: ActiveSpeechSession = {
          websocket,
          mediaStream,
          audioContext,
          sourceNode,
          processorNode,
          outputNode,
          finalSegments: [],
          interimTranscript: "",
          pendingAudioChunks: [],
          sentChunkCount: 0,
          shouldSubmit: false,
          finalizing: false,
          finalized: false,
          hasOpened: false,
          errorMessage: null,
          keepAliveTimerId: null,
          finalizeTimerId: null,
          hardCloseTimerId: null
        };

        sessionRef.current = session;

        processorNode.onaudioprocess = (event) => {
          if (session.finalizing) {
            return;
          }

          const channelData = event.inputBuffer.getChannelData(0);
          const pcm = downsampleTo16Khz(channelData, audioContext.sampleRate);

          if (pcm.length === 0) {
            return;
          }

          const chunk = pcm.buffer.slice(0);

          if (session.websocket.readyState === WebSocket.OPEN) {
            session.websocket.send(chunk);
            session.sentChunkCount += 1;

            if (session.sentChunkCount === 1) {
              appLog("info", "capture.deepgram.audio.first_chunk_sent", {
                label: optionsRef.current.sessionLabel ?? "capture",
                byteLength: chunk.byteLength
              });
            }

            return;
          }

          if (session.pendingAudioChunks.length >= maxQueuedAudioChunks) {
            session.pendingAudioChunks.shift();
          }

          session.pendingAudioChunks.push(chunk);
        };

        sourceNode.connect(processorNode);
        processorNode.connect(outputNode);
        outputNode.connect(audioContext.destination);

        websocket.onopen = async () => {
          if (sessionRef.current !== session) {
            websocket.close();
            return;
          }

          appLog("info", "capture.deepgram.socket.open", {
            label: optionsRef.current.sessionLabel ?? "capture",
            keytermCount: (optionsRef.current.keyterms ?? []).slice(0, maxKeyterms).length,
            authMode: browserApiKey ? "browser_api_key" : "temporary_token"
          });

          session.hasOpened = true;
          isStartingRef.current = false;
          setPhase(session.finalizing ? "finalizing" : "ready");

          if (audioContext.state === "suspended") {
            await audioContext.resume();
          }

          session.pendingAudioChunks.forEach((chunk) => {
            session.websocket.send(chunk);
            session.sentChunkCount += 1;
          });
          session.pendingAudioChunks = [];

          if (session.finalizing) {
            finalizeOpenSession(session);
            return;
          }

          session.websocket.send(JSON.stringify({ type: "KeepAlive" }));

          session.keepAliveTimerId = window.setInterval(() => {
            if (session.websocket.readyState === WebSocket.OPEN && !session.finalizing) {
              session.websocket.send(JSON.stringify({ type: "KeepAlive" }));
            }
          }, 3_000);
        };

        websocket.onmessage = (event) => {
          const message = JSON.parse(String(event.data)) as
            | DeepgramResultsMessage
            | DeepgramControlMessage
            | DeepgramErrorMessage;

          if (message.type === "Error") {
            session.errorMessage = message.description
              ? message.code
                ? `${message.code}: ${message.description}`
                : message.description
              : "Deepgram closed the live transcription stream.";

            appLog("warn", "capture.deepgram.socket.message_error", {
              label: optionsRef.current.sessionLabel ?? "capture",
              code: message.code ?? null,
              description: message.description ?? null
            });

            return;
          }

          if (message.type !== "Results") {
            return;
          }

          const transcript = message.channel?.alternatives?.[0]?.transcript?.trim() ?? "";

          if (!transcript) {
            if (!message.is_final) {
              session.interimTranscript = "";
              setLiveTranscript(session.finalSegments.join(" ").trim());
            }

            return;
          }

          if (message.is_final) {
            const lastSegment = session.finalSegments[session.finalSegments.length - 1];

            if (lastSegment !== transcript) {
              session.finalSegments.push(transcript);
            }

            session.interimTranscript = "";
          } else {
            session.interimTranscript = transcript;
          }

          setLiveTranscript(
            [...session.finalSegments, session.interimTranscript]
              .join(" ")
              .replace(/\s+/g, " ")
              .trim()
          );

          if (message.from_finalize || message.speech_final) {
            appLog("info", "capture.deepgram.results.final", {
              label: optionsRef.current.sessionLabel ?? "capture",
              transcriptLength: transcript.length
            });
          }
        };

        websocket.onerror = () => {
          appLog("warn", "capture.deepgram.socket.error", {
            label: optionsRef.current.sessionLabel ?? "capture",
            authMode: browserApiKey ? "browser_api_key" : "temporary_token"
          });

          if (!session.hasOpened && !session.errorMessage) {
            session.errorMessage =
              "Live dictation could not finish connecting. Wait for the ready state before talking, or use the manual transcript fallback.";
          }
        };

        websocket.onclose = (closeEvent) => {
          if (!session.finalizing && !session.errorMessage) {
            session.errorMessage = closeEvent.reason
              ? `Live transcription closed: ${closeEvent.reason}`
              : `Live transcription closed unexpectedly (code ${closeEvent.code}).`;
          }

          appLog("info", "capture.deepgram.socket.close", {
            label: optionsRef.current.sessionLabel ?? "capture",
            code: closeEvent.code,
            reason: closeEvent.reason || null,
            wasClean: closeEvent.wasClean,
            sentChunkCount: session.sentChunkCount,
            queuedChunkCount: session.pendingAudioChunks.length
          });

          finishSession(session);
        };
      } catch (nextError) {
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }

        if (startRequestIdRef.current !== requestId) {
          return;
        }

        isStartingRef.current = false;
        captureStartRef.current = null;
        setIsListening(false);
        setPhase("idle");
        setLiveTranscript("");
        setError(normalizeSpeechError(nextError));

        appLog("warn", "capture.deepgram.start.failed", {
          label: optionsRef.current.sessionLabel ?? "capture",
          error: normalizeSpeechError(nextError)
        });
      }
    })();
  };

  const stopListening = () => {
    startRequestIdRef.current += 1;

    if (isStartingRef.current && !sessionRef.current) {
      isStartingRef.current = false;
      captureStartRef.current = null;
      setIsListening(false);
      setLiveTranscript("");
      return;
    }

    stopActiveSession(true);
  };

  return {
    isSupported: isSpeechCaptureSupported(),
    isListening,
    phase,
    isReadyToCapture: phase === "ready",
    liveTranscript,
    error,
    clearError: () => setError(null),
    startListening,
    stopListening
  };
};
