"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Send, Square, Trash2 } from "lucide-react";

import { RecoveryState } from "@/components/aurora/feedback/RecoveryState";
import { transcribeVoiceCapture } from "@/lib/api/voice";
import { recoveryFromError, type RecoveryCode } from "@/lib/recovery";
import { storeReviewedVoiceDraft } from "@/lib/voice-handoff";

type CapturePhase =
  | "permission_required"
  | "ready"
  | "recording"
  | "transcribing"
  | "review"
  | "error";

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function microphoneError(error: unknown): RecoveryCode {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "permission_denied";
  return recoveryFromError(error, "tool_failed");
}

export function VoiceCapture() {
  const router = useRouter();
  const [phase, setPhase] = useState<CapturePhase>("permission_required");
  const [permission, setPermission] = useState<"not requested" | "granted" | "denied" | "unavailable">("not requested");
  const [transcript, setTranscript] = useState("");
  const [recovery, setRecovery] = useState<RecoveryCode | null>(null);
  const [announcement, setAnnouncement] = useState("Microphone is off. Voice capture starts only after you choose Enable microphone.");
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCaptureTimer() {
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    captureTimerRef.current = null;
  }

  function releaseMicrophone() {
    clearCaptureTimer();
    stopTracks(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;
  }

  useEffect(() => () => {
    cancelledRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    stopTracks(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  async function requestMicrophonePermission() {
    setRecovery(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setPermission("unavailable");
      setPhase("error");
      setRecovery("tool_failed");
      setAnnouncement("Microphone capture is unavailable in this desktop webview.");
      return;
    }
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stopTracks(permissionStream);
      setPermission("granted");
      setPhase("ready");
      setAnnouncement("Microphone permission granted. Capture remains off until Start push-to-talk is selected.");
    } catch (error) {
      setPermission("denied");
      setPhase("error");
      setRecovery(microphoneError(error));
      setAnnouncement("Microphone permission was denied. No audio was captured.");
    }
  }

  async function startCapture() {
    if (permission !== "granted" || phase === "recording") return;
    setRecovery(null);
    setTranscript("");
    cancelledRef.current = false;
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        releaseMicrophone();
        setPhase("error");
        setRecovery("tool_failed");
        setAnnouncement("Voice capture failed. No transcript was submitted.");
      };
      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current;
        const chunks = [...chunksRef.current];
        const mimeType = recorder.mimeType || chunks[0]?.type || "audio/webm";
        releaseMicrophone();
        if (wasCancelled) {
          setPhase("ready");
          setAnnouncement("Voice capture cancelled and discarded.");
          return;
        }
        void transcribe(new Blob(chunks, { type: mimeType }));
      };
      recorder.start();
      setPhase("recording");
      setAnnouncement("Microphone is on. Select Stop and transcribe when finished.");
      captureTimerRef.current = setTimeout(() => stopCapture(), 30_000);
    } catch (error) {
      releaseMicrophone();
      setPermission(microphoneError(error) === "permission_denied" ? "denied" : permission);
      setPhase("error");
      setRecovery(microphoneError(error));
      setAnnouncement("Microphone capture could not start. No audio was retained.");
    }
  }

  function stopCapture() {
    clearCaptureTimer();
    if (recorderRef.current?.state === "recording") {
      setPhase("transcribing");
      setAnnouncement("Microphone is off. Transcribing the bounded capture for review.");
      recorderRef.current.stop();
    }
  }

  function cancelCapture() {
    cancelledRef.current = true;
    clearCaptureTimer();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else {
      releaseMicrophone();
      setPhase("ready");
    }
  }

  async function transcribe(audio: Blob) {
    if (!audio.size) {
      setPhase("error");
      setRecovery("tool_failed");
      setAnnouncement("The voice capture was empty. Nothing was submitted.");
      return;
    }
    try {
      const result = await transcribeVoiceCapture(audio);
      setTranscript(result.transcript);
      setPhase("review");
      setAnnouncement("Transcription complete. Review and edit it before sending it to the Assistant.");
    } catch (error) {
      setPhase("error");
      setRecovery(recoveryFromError(error, "provider_unavailable"));
      setAnnouncement("Transcription failed. Audio was discarded and no assistant request was created.");
    }
  }

  function confirmTranscript() {
    const reviewed = transcript.trim();
    if (!reviewed) return;
    storeReviewedVoiceDraft(reviewed);
    setAnnouncement("Reviewed transcript moved to the Assistant as an unsent draft.");
    router.push("/assistant");
  }

  function discardTranscript() {
    setTranscript("");
    setRecovery(null);
    setPhase("ready");
    setAnnouncement("Transcript discarded. No assistant request was created.");
  }

  const microphoneOn = phase === "recording";

  return (
    <section aria-labelledby="push-to-talk-title" className="rounded-3xl border border-cyan-300/15 bg-black/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Explicit capture</p>
          <h2 id="push-to-talk-title" className="mt-2 text-xl font-bold text-white">Push-to-talk review</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Microphone access begins only after your action. Captures stop after 30 seconds, audio is not retained, and transcripts never execute automatically.
          </p>
        </div>
        <div className={`rounded-full border px-3 py-2 text-xs font-bold ${microphoneOn ? "border-red-300/40 bg-red-300/10 text-red-100" : "border-white/10 text-slate-300"}`}>
          {microphoneOn ? <Mic aria-hidden="true" className="mr-1 inline" size={14} /> : <MicOff aria-hidden="true" className="mr-1 inline" size={14} />}
          Microphone {microphoneOn ? "ON" : "OFF"} · permission {permission}
        </div>
      </div>

      <p role="status" aria-live="polite" aria-atomic="true" className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200">
        {announcement}
      </p>

      {recovery && (
        <div className="mt-4">
          <RecoveryState
            code={recovery}
            actionLabel={permission === "denied" ? "Request permission again" : "Retry voice setup"}
            onAction={() => void requestMicrophonePermission()}
            compact
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {permission !== "granted" && (
          <button type="button" onClick={() => void requestMicrophonePermission()} className="aurora-button aurora-button-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
            <Mic aria-hidden="true" size={16} /> Enable microphone
          </button>
        )}
        {permission === "granted" && phase !== "recording" && phase !== "transcribing" && phase !== "review" && (
          <button type="button" onClick={() => void startCapture()} className="aurora-button aurora-button-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
            <Mic aria-hidden="true" size={16} /> Start push-to-talk
          </button>
        )}
        {phase === "recording" && (
          <>
            <button type="button" onClick={stopCapture} className="aurora-button aurora-button-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
              <Square aria-hidden="true" size={15} /> Stop and transcribe
            </button>
            <button type="button" onClick={cancelCapture} className="aurora-button focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
              <Trash2 aria-hidden="true" size={15} /> Cancel capture
            </button>
          </>
        )}
      </div>

      {phase === "transcribing" && (
        <div className="mt-4">
          <RecoveryState code="loading" title="Transcribing voice capture" description="The microphone is off. The bounded capture is being transcribed for your review." focusOnChange={false} compact />
        </div>
      )}

      {phase === "review" && (
        <div className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/[0.05] p-4">
          <label htmlFor="voice-transcript" className="text-sm font-bold text-white">Review transcript before handoff</label>
          <textarea
            id="voice-transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            className="mt-3 min-h-32 w-full rounded-2xl border border-white/15 bg-black/35 p-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          />
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Confirming opens this text as an unsent Assistant draft. Normal context, mission, capability, and approval controls still apply after you press Send there.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={confirmTranscript} disabled={!transcript.trim()} className="aurora-button aurora-button-primary disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
              <Send aria-hidden="true" size={15} /> Confirm and review in Assistant
            </button>
            <button type="button" onClick={discardTranscript} className="aurora-button focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
              <Trash2 aria-hidden="true" size={15} /> Discard transcript
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
