"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ORION_API_URL || "http://127.0.0.1:8000";

type SpeechRecognitionConstructor = new () => any;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type Message = {
  role: "user" | "orion";
  content: string;
};

type Status = {
  name: string;
  version: string;
  mode: string;
  status: string;
  tagline: string;
  modules: string[];
};

type ActivityEvent = {
  id: number;
  timestamp: string;
  type: string;
  source: string;
  message: string;
};

type ProjectItem = {
  key: string;
  name: string;
  type: string;
  status: string;
  description: string;
  updated_at?: string | null;
};

type MemoryItem = {
  id: number;
  category: string;
  title: string;
  content: string;
  source: string;
  importance: number;
  created_at: string;
  updated_at: string;
};

type MissionItem = {
  id: number;
  title: string;
  goal: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
};

type MissionRunItem = {
  id: number;
  mission_id: number;
  step_id?: number | null;
  mission_title: string;
  step_title: string;
  status: string;
  output: string;
  error: string;
  started_at: string;
  completed_at?: string | null;
  created_at: string;
};

type ApprovalItem = {
  id: number;
  action_type: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  risk_level: string;
  status: string;
  result: string;
  source: string;
  created_at: string;
  updated_at: string;
};

type WorkspaceItem = {
  id: number;
  name: string;
  path: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type GitHubReleaseResult = {
  workspace_id: number;
  status: string;
  content: string;
  artifact_path?: string | null;
};

type BrowserResearchResult = {
  status: string;
  status_code?: string | number | null;
  title?: string | null;
  url?: string | null;
  final_url?: string | null;
  content?: string | null;
  content_preview?: string | null;
  summary?: string | null;
  artifact_path?: string | null;
};

type VoiceStatus = {
  mode: string;
  wake_phrase: string;
  listening: boolean;
  last_transcript: string;
  last_response: string;
  last_event: string;
  updated_at: string;
};

type ContextPreview = {
  message: string;
  context: string;
};

type DesktopActionResult = {
  status: string;
  approval_id?: number | null;
  message: string;
};

type DemoStatus = {
  demo_mode: boolean;
  release_version: string;
  project_name: string;
  interface_name: string;
  tagline: string;
  last_generated_pack: string;
  updated_at: string;
  readiness_report: string;
};

type DemoReleasePack = {
  status: string;
  generated_at: string;
  files: string[];
};

type ActivityResponse = {
  events?: ActivityEvent[];
};

type ProjectsResponse = {
  projects?: ProjectItem[];
};

type MemoryResponse = {
  items?: MemoryItem[];
};

type MissionsResponse = {
  missions?: MissionItem[];
};

type MissionRunsResponse = {
  runs?: MissionRunItem[];
};

type ApprovalsResponse = {
  approvals?: ApprovalItem[];
};

type WorkspacesResponse = {
  workspaces?: WorkspaceItem[];
};

type ChatResponse = {
  response?: string;
};

type ActionResponse = {
  result?: string;
  output?: string;
};

type MissionReportResponse = {
  mission_id: number;
  report_path: string;
  status: string;
};

type MissionBatchCycle = {
  mission_id: number;
  step_id?: number | null;
  status: string;
  output: string;
};

type MissionBatchResponse = {
  mission_id: number;
  requested_steps: number;
  completed_cycles: number;
  status: string;
  stop_reason: string;
  cycles: MissionBatchCycle[];
};

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("");

  const [missionRuns, setMissionRuns] = useState<MissionRunItem[]>([]);
  const [generatingReportId, setGeneratingReportId] = useState<number | null>(
    null
  );

  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(
    null
  );
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  const [githubReleaseResult, setGithubReleaseResult] =
    useState<GitHubReleaseResult | null>(null);
  const [githubReleaseLoadingId, setGithubReleaseLoadingId] =
    useState<number | null>(null);

  const [researchUrl, setResearchUrl] = useState("");
  const [latestResearch, setLatestResearch] = useState<{
    title: string;
    summary: string;
    url: string;
    content: string;
  } | null>(null);

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);

  const [contextPreview, setContextPreview] =
    useState<ContextPreview | null>(null);
  const [contextPreviewLoading, setContextPreviewLoading] = useState(false);

  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null);
  const [demoReleasePack, setDemoReleasePack] =
    useState<DemoReleasePack | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "orion",
      content:
        "O.R.I.O.N. Aurora OS dashboard online. How can I assist your mission?",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [runningMissionId, setRunningMissionId] = useState<number | null>(null);
  const [runningBatchMissionId, setRunningBatchMissionId] = useState<
    number | null
  >(null);

  const [desktopLoadingAction, setDesktopLoadingAction] = useState<
    string | null
  >(null);
  const [desktopUrl, setDesktopUrl] = useState("http://localhost:3000");

  const [listening, setListening] = useState(false);
  const [micStatus, setMicStatus] = useState("Voice idle");

  async function loadStatus() {
    try {
      const data = await fetchJson<Status>("/api/status");
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }

  async function loadActivity() {
    try {
      const data = await fetchJson<ActivityResponse>("/api/activity");
      setActivity(data.events || []);
    } catch {
      setActivity([]);
    }
  }

  async function loadProjects() {
    try {
      const data = await fetchJson<ProjectsResponse>("/api/projects");
      setProjects(data.projects || []);
    } catch {
      setProjects([]);
    }
  }

  async function loadMemory() {
    try {
      const data = await fetchJson<MemoryResponse>("/api/memory");
      setMemoryItems(data.items || []);
    } catch {
      setMemoryItems([]);
    }
  }

  async function loadMissions() {
    try {
      const data = await fetchJson<MissionsResponse>("/api/missions");
      setMissions(data.missions || []);
    } catch {
      setMissions([]);
    }
  }

  async function loadMissionRuns() {
    try {
      const data = await fetchJson<MissionRunsResponse>("/api/mission-runs");
      setMissionRuns(data.runs || []);
    } catch {
      setMissionRuns([]);
    }
  }

  async function loadApprovals() {
    try {
      const data = await fetchJson<ApprovalsResponse>("/api/approvals");
      setApprovals(data.approvals || []);
    } catch {
      setApprovals([]);
    }
  }

  async function loadWorkspaces() {
    try {
      const data = await fetchJson<WorkspacesResponse>("/api/workspaces");
      setWorkspaces(data.workspaces || []);
    } catch {
      setWorkspaces([]);
    }
  }

  async function loadVoiceStatus() {
    try {
      const data = await fetchJson<VoiceStatus>("/api/voice/status");
      setVoiceStatus(data);
    } catch {
      setVoiceStatus(null);
    }
  }

  async function loadDemoStatus() {
    try {
      const data = await fetchJson<DemoStatus>("/api/demo/status");
      setDemoStatus(data);
    } catch {
      setDemoStatus(null);
    }
  }

  async function toggleDemoMode(enabled: boolean) {
    setDemoLoading(true);

    try {
      const data = await fetchJson<DemoStatus>("/api/demo/mode", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      });

      setDemoStatus(data);

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Demo mode is now ${
            data.demo_mode ? "enabled" : "disabled"
          }.`,
        },
      ]);

      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: "Demo mode update failed. Confirm backend is running.",
        },
      ]);
    } finally {
      setDemoLoading(false);
    }
  }

  async function generateDemoReleasePack() {
    setDemoLoading(true);

    try {
      const data = await fetchJson<DemoReleasePack>("/api/demo/release-pack", {
        method: "POST",
      });

      setDemoReleasePack(data);

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Portfolio release pack generated.

Generated at:
${data.generated_at}

Files:
${(data.files || []).join("\n")}`,
        },
      ]);

      await loadDemoStatus();
      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: "Portfolio release pack generation failed.",
        },
      ]);
    } finally {
      setDemoLoading(false);
    }
  }

  async function resetVoiceStatus() {
    try {
      await fetchJson("/api/voice/reset", {
        method: "POST",
      });

      await loadVoiceStatus();
      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: "Voice status reset failed. Confirm backend is running.",
        },
      ]);
    }
  }

  async function previewContext() {
    const cleanMessage = message.trim();

    if (!cleanMessage || contextPreviewLoading) return;

    setContextPreviewLoading(true);

    try {
      const data = await fetchJson<ContextPreview>("/api/context/preview", {
        method: "POST",
        body: JSON.stringify({
          message: cleanMessage,
        }),
      });

      setContextPreview(data);
      await loadActivity();
    } catch {
      setContextPreview({
        message: cleanMessage,
        context: "Context preview failed. Confirm backend is running.",
      });
    } finally {
      setContextPreviewLoading(false);
    }
  }

  async function requestDesktopAction(
    actionKey: string,
    url: string,
    options?: RequestInit
  ) {
    setDesktopLoadingAction(actionKey);

    try {
      const response = await fetch(url, options || { method: "POST" });

      if (!response.ok) {
        throw new Error(`Desktop request failed: ${response.status}`);
      }

      const data: DesktopActionResult = await response.json();

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Desktop Control: ${data.status}

${data.message}

${
  data.approval_id
    ? `Approval Request ID: ${data.approval_id}. Approve it in Command Approval.`
    : ""
}`,
        },
      ]);

      await loadApprovals();
      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: "Desktop Control action failed. Confirm backend is running.",
        },
      ]);
    } finally {
      setDesktopLoadingAction(null);
    }
  }

  async function runGithubReleaseAction(
    workspaceId: number,
    action: "status" | "notes" | "checklist" | "commit-message"
  ) {
    setGithubReleaseLoadingId(workspaceId);

    try {
      const path =
        action === "status"
          ? `/api/workspaces/${workspaceId}/github-release/status`
          : `/api/workspaces/${workspaceId}/github-release/${action}`;

      const data = await fetchJson<GitHubReleaseResult>(path, {
        method: action === "status" ? "GET" : "POST",
        body:
          action === "status"
            ? undefined
            : JSON.stringify({
                release_version: "v1.9",
                change_summary:
                  "prepare GitHub Release Assistant and portfolio release workflow",
              }),
      });

      setGithubReleaseResult(data);

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `GitHub Release Assistant generated: ${action}\n\n${
            data.artifact_path ? `Artifact: ${data.artifact_path}\n\n` : ""
          }${data.content}`,
        },
      ]);

      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content:
            "GitHub Release Assistant failed. Confirm backend is running on port 8000.",
        },
      ]);
    } finally {
      setGithubReleaseLoadingId(null);
    }
  }

  async function researchPage() {
    const cleanUrl = researchUrl.trim();

    if (!cleanUrl) return;

    try {
      const data = await fetchJson<BrowserResearchResult>(
        "/api/browser/research",
        {
          method: "POST",
          body: JSON.stringify({
            url: cleanUrl,
          }),
        }
      );

      const researchText =
        data.content_preview ||
        data.content ||
        data.summary ||
        "No content preview returned.";

      const researchStatus = data.status || data.status_code || "completed";
      const researchUrlValue = data.final_url || data.url || cleanUrl;

      setLatestResearch({
        title: data.title || "Untitled page",
        summary: data.summary || "No summary returned.",
        url: researchUrlValue,
        content: String(researchText).slice(0, 3000),
      });

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Browser Research Result: ${researchStatus}

Title: ${data.title || "N/A"}
URL: ${researchUrlValue}

Summary:
${data.summary || "No summary returned."}

Content Preview:
${String(researchText).slice(0, 3000)}`,
        },
      ]);

      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content:
            "Browser Research failed. Confirm the backend is running and the Browser Research API route is available.",
        },
      ]);
    }
  }

  function speakResponse(text: string) {
    if (!("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function startVoiceCommand() {
    if (listening || loading) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicStatus(
        "Speech recognition is not supported in this browser. Use Chrome or Chromium."
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus(
        "Microphone API is not available. Use Chrome/Chromium on localhost or HTTPS."
      );
      return;
    }

    try {
      setMicStatus("Requesting microphone permission...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      stream.getTracks().forEach((track) => track.stop());

      const recognition = new SpeechRecognition();

      recognition.lang = "en-AU";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setMicStatus("Listening... Speak now.");
      };

      recognition.onspeechstart = () => {
        setMicStatus("Speech detected...");
      };

      recognition.onspeechend = () => {
        setMicStatus("Speech ended. Processing...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";

        if (!transcript.trim()) {
          setMicStatus("No clear speech detected. Try again.");
          return;
        }

        setMicStatus(`Heard: ${transcript}`);
        setMessage(transcript);

        void sendMessage(transcript, true);
      };

      recognition.onerror = (event: any) => {
        const errorCode = event?.error || "unknown";

        console.warn("Speech recognition warning:", {
          error: errorCode,
          message: event?.message || "No extra browser message available.",
        });

        setListening(false);

        switch (errorCode) {
          case "not-allowed":
            setMicStatus(
              "Microphone permission blocked. Allow microphone access in browser settings."
            );
            break;

          case "audio-capture":
            setMicStatus(
              "No microphone detected. Check Ubuntu microphone input settings."
            );
            break;

          case "no-speech":
            setMicStatus("No speech detected. Press Speak and talk clearly.");
            break;

          case "network":
            setMicStatus(
              "Speech recognition network error. Chrome speech service may be unavailable."
            );
            break;

          case "service-not-allowed":
            setMicStatus(
              "Speech service blocked by browser or system settings."
            );
            break;

          case "language-not-supported":
            setMicStatus(
              "Language not supported. Try changing recognition.lang to en-US."
            );
            break;

          case "aborted":
            setMicStatus("Voice recognition stopped.");
            break;

          default:
            setMicStatus(
              `Voice recognition stopped or failed. Error: ${errorCode}`
            );
            break;
        }
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
    } catch (error) {
      console.warn("Microphone startup warning:", error);

      setListening(false);
      setMicStatus(
        "Microphone access failed. Check browser and Ubuntu microphone permission."
      );
    }
  }

  async function approveAction(approvalId: number) {
    try {
      const data = await fetchJson<ActionResponse>(
        `/api/approvals/${approvalId}/approve`,
        {
          method: "POST",
        }
      );

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Approval ${approvalId} approved.\n\n${
            data.result || "Action completed."
          }`,
        },
      ]);

      await loadApprovals();
      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Approval ${approvalId} could not be executed.`,
        },
      ]);
    }
  }

  async function rejectAction(approvalId: number) {
    try {
      const data = await fetchJson<ActionResponse>(
        `/api/approvals/${approvalId}/reject`,
        {
          method: "POST",
        }
      );

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Approval ${approvalId} rejected.\n\n${
            data.result || "Action rejected."
          }`,
        },
      ]);

      await loadApprovals();
      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Approval ${approvalId} could not be rejected.`,
        },
      ]);
    }
  }

  async function runNextMissionStep(missionId: number) {
    if (runningMissionId === missionId) return;

    setRunningMissionId(missionId);

    try {
      const data = await fetchJson<ActionResponse>(
        `/api/missions/${missionId}/run-next`,
        {
          method: "POST",
        }
      );

      const resultText =
        data.result || data.output || "Next mission step completed.";

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Mission ${missionId} executed next step.\n\n${resultText}`,
        },
      ]);

      await loadMissions();
      await loadMissionRuns();
      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Failed to run next step for mission ${missionId}.`,
        },
      ]);
    } finally {
      setRunningMissionId(null);
    }
  }

  async function runMissionBatch(missionId: number) {
    if (runningBatchMissionId === missionId) return;

    setRunningBatchMissionId(missionId);

    try {
      const data = await fetchJson<MissionBatchResponse>(
        `/api/missions/${missionId}/run-batch`,
        {
          method: "POST",
          body: JSON.stringify({
            max_steps: 3,
          }),
        }
      );

      const cycleSummary = (data.cycles || [])
        .map(
          (cycle) =>
            `Step ID: ${cycle.step_id || "N/A"} | Status: ${
              cycle.status
            }\n${cycle.output}`
        )
        .join("\n\n---\n\n");

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Controlled multi-step mission run complete.

Mission ID: ${data.mission_id}
Status: ${data.status}
Stop reason: ${data.stop_reason}
Completed cycles: ${data.completed_cycles}

${cycleSummary || "No cycles were returned."}`,
        },
      ]);

      await loadMissions();
      await loadActivity();
      await loadApprovals();
      await loadMissionRuns();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content:
            "Controlled multi-step mission run failed. Confirm backend is running.",
        },
      ]);
    } finally {
      setRunningBatchMissionId(null);
    }
  }

  async function generateMissionReport(missionId: number) {
    setGeneratingReportId(missionId);

    try {
      const data = await fetchJson<MissionReportResponse>(
        `/api/missions/${missionId}/report`,
        {
          method: "POST",
        }
      );

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Mission ${missionId} report status: ${data.status}\n\nReport path:\n${data.report_path}`,
        },
      ]);

      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Mission ${missionId} report generation failed.`,
        },
      ]);
    } finally {
      setGeneratingReportId(null);
    }
  }

  async function openProject(project: ProjectItem) {
    setSelectedProject(project);

    setMessage(
      `Read the project called ${project.name}. Then summarize its current status and next best development step.`
    );
  }

  async function sendMessage(customMessage?: string, speakBack = false) {
    const cleanMessage = (customMessage ?? message).trim();

    if (!cleanMessage || loading) return;

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: cleanMessage,
      },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const data = await fetchJson<ChatResponse>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: cleanMessage,
        }),
      });

      await loadActivity();
      await loadMemory();
      await loadMissions();
      await loadApprovals();
      await loadMissionRuns();
      await loadWorkspaces();
      await loadVoiceStatus();
      await loadDemoStatus();

      const orionResponse =
        data.response || "No response returned from backend.";

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: orionResponse,
        },
      ]);

      if (speakBack) {
        speakResponse(orionResponse);
      }
    } catch {
      const errorMessage =
        "Connection error. Confirm the FastAPI backend is running on port 8000.";

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: errorMessage,
        },
      ]);

      if (speakBack) {
        speakResponse(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    loadActivity();
    loadProjects();
    loadMemory();
    loadMissions();
    loadApprovals();
    loadMissionRuns();
    loadWorkspaces();
    loadVoiceStatus();
    loadDemoStatus();

    const timer = setInterval(() => {
      loadActivity();
      loadMemory();
      loadMissions();
      loadApprovals();
      loadMissionRuns();
      loadWorkspaces();
      loadVoiceStatus();
      loadDemoStatus();
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.18),_transparent_35%)]" />

      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-col justify-between gap-4 rounded-3xl border border-cyan-400/20 bg-white/5 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.45em] text-cyan-300">
              Aurora OS
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-6xl">
              O.R.I.O.N.
            </h1>

            <p className="mt-2 max-w-2xl text-slate-300">
              Operational Response and Intelligent Orchestration Network
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-black/30 px-5 py-4 text-sm">
            <p className="text-cyan-300">System Status</p>

            <p className="mt-1 text-2xl font-semibold">
              {status?.status === "online" ? "ONLINE" : "CHECKING"}
            </p>

            <p className="mt-1 text-slate-400">
              {status?.tagline || "Think. Plan. Act. Learn."}
            </p>

            {status?.version && (
              <p className="mt-2 text-xs text-slate-500">
                Version {status.version} · {status.mode}
              </p>
            )}
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col rounded-3xl border border-cyan-400/20 bg-white/5 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">AI Chat Console</h2>
                <p className="text-sm text-slate-400">
                  Connected to O.R.I.O.N. backend brain
                </p>
              </div>

              <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                v2.5 Voice
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
              {messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`rounded-2xl p-4 ${
                    item.role === "user"
                      ? "ml-auto max-w-[85%] border border-violet-400/20 bg-violet-500/10"
                      : "mr-auto max-w-[85%] border border-cyan-400/20 bg-cyan-500/10"
                  }`}
                >
                  <p className="mb-1 text-xs uppercase tracking-[0.25em] text-slate-400">
                    {item.role === "user" ? "You" : "O.R.I.O.N."}
                  </p>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                    {item.content}
                  </p>
                </div>
              ))}

              {loading && (
                <div className="mr-auto max-w-[85%] rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <p className="text-sm text-cyan-200">
                    O.R.I.O.N. is thinking...
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void sendMessage();
                    }
                  }}
                  placeholder="Ask O.R.I.O.N. something..."
                  className="flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
                />

                <button
                  onClick={() => void previewContext()}
                  disabled={contextPreviewLoading || loading}
                  className="rounded-2xl border border-cyan-400/30 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {contextPreviewLoading ? "Scanning..." : "Context"}
                </button>

                <button
                  onClick={() => void sendMessage()}
                  disabled={loading}
                  className="rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send"}
                </button>

                <button
                  onClick={() => void startVoiceCommand()}
                  disabled={listening || loading}
                  className="rounded-2xl border border-cyan-400/30 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {listening ? "Listening..." : "🎙️ Speak"}
                </button>
              </div>

              <p className="text-xs text-slate-500">{micStatus}</p>
            </div>
          </section>

          <aside className="grid gap-6">
            <section className="rounded-3xl border border-cyan-400/20 bg-white/5 p-5 backdrop-blur">
              <h2 className="text-xl font-semibold">Neural Core</h2>

              <div className="mx-auto my-8 h-56 w-56 rounded-full border border-cyan-300/40 bg-[radial-gradient(circle,_rgba(34,211,238,0.45),_rgba(15,23,42,0.15)_45%,_transparent_70%)] shadow-[0_0_80px_rgba(34,211,238,0.35)]" />

              <p className="text-center text-sm text-slate-400">
                Voice, tools, memory, and agentic planning modules connected.
              </p>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Portfolio Demo Mode</h2>
                  <p className="text-sm text-slate-400">
                    Release pack, demo readiness, and portfolio presentation
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  v2.5
                </span>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Demo Mode</span>

                  <span className="rounded-full border border-cyan-400/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-300">
                    {demoStatus?.demo_mode ? "enabled" : "disabled"}
                  </span>
                </div>

                {demoStatus && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                      Demo Identity
                    </p>

                    <div className="mt-3 space-y-2 text-xs text-slate-400">
                      <p>
                        <span className="text-slate-300">Project:</span>{" "}
                        {demoStatus.project_name}
                      </p>

                      <p>
                        <span className="text-slate-300">Interface:</span>{" "}
                        {demoStatus.interface_name}
                      </p>

                      <p>
                        <span className="text-slate-300">Version:</span>{" "}
                        {demoStatus.release_version}
                      </p>

                      <p>
                        <span className="text-slate-300">Tagline:</span>{" "}
                        {demoStatus.tagline}
                      </p>

                      {demoStatus.last_generated_pack && (
                        <p className="break-all">
                          <span className="text-slate-300">
                            Last Release Pack:
                          </span>{" "}
                          {demoStatus.last_generated_pack}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void toggleDemoMode(true)}
                    disabled={demoLoading}
                    className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
                  >
                    Enable Demo
                  </button>

                  <button
                    onClick={() => void toggleDemoMode(false)}
                    disabled={demoLoading}
                    className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                  >
                    Disable Demo
                  </button>
                </div>

                <button
                  onClick={() => void generateDemoReleasePack()}
                  disabled={demoLoading}
                  className="w-full rounded-2xl border border-violet-400/30 px-4 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/10 disabled:opacity-60"
                >
                  {demoLoading
                    ? "Generating..."
                    : "Generate Portfolio Release Pack"}
                </button>

                {demoStatus && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                      Demo Readiness
                    </p>

                    <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
                      {demoStatus.readiness_report}
                    </pre>
                  </div>
                )}

                {demoReleasePack && (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
                      Latest Release Pack
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      Generated: {demoReleasePack.generated_at}
                    </p>

                    <div className="mt-3 space-y-1">
                      {demoReleasePack.files.map((file) => (
                        <p key={file} className="break-all text-xs text-slate-300">
                          {file}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Voice Control</h2>
                  <p className="text-sm text-slate-400">
                    Wake phrase and voice interaction status
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  v2.5
                </span>
              </div>

              <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Wake Phrase</span>
                  <span className="text-sm font-semibold text-cyan-200">
                    {voiceStatus?.wake_phrase || "Hey Orion"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Mode</span>
                  <span className="rounded-full border border-cyan-400/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-300">
                    {voiceStatus?.mode || "idle"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Listening</span>
                  <span className="text-sm font-semibold text-slate-200">
                    {voiceStatus?.listening ? "YES" : "NO"}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Last Transcript
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {voiceStatus?.last_transcript || "No transcript yet."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Last Event
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {voiceStatus?.last_event || "No voice event yet."}
                  </p>
                </div>

                <button
                  onClick={() => void resetVoiceStatus()}
                  className="rounded-2xl border border-cyan-400/30 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10"
                >
                  Reset Voice State
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Context Retrieval</h2>
                  <p className="text-sm text-slate-400">
                    Memory, project, workspace, mission, and activity context
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  v2.5
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                {!contextPreview ? (
                  <p className="text-sm text-slate-500">
                    Type a question, then press Context to preview what
                    O.R.I.O.N. will retrieve before answering.
                  </p>
                ) : (
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                      Query
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      {contextPreview.message}
                    </p>

                    <p className="mt-4 text-xs uppercase tracking-[0.25em] text-cyan-300">
                      Retrieved Context
                    </p>

                    <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300">
                      {contextPreview.context}
                    </pre>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Workspace Manager</h2>
                  <p className="text-sm text-slate-400">
                    Registered local coding workspaces
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  {workspaces.length} workspaces
                </span>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
                {workspaces.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No workspaces registered yet. Ask O.R.I.O.N. to register a
                    local project path.
                  </p>
                ) : (
                  workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() =>
                        setMessage(
                          `Summarize workspace ${workspace.id}. Then tell me the detected tech stack and next best development step.`
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                          {workspace.status}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          ID {workspace.id}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-100">
                        {workspace.name}
                      </h3>

                      <p className="mt-1 break-all text-xs text-slate-500">
                        {workspace.path}
                      </p>

                      <p className="mt-2 text-sm leading-5 text-slate-400">
                        {workspace.description || "No description yet."}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Desktop Control</h2>
                  <p className="text-sm text-slate-400">
                    Approval-gated desktop actions for workspaces and browser
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  v2.5
                </span>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Registered Workspaces
                  </p>

                  {workspaces.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Register a workspace first.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {workspaces.map((workspace) => (
                        <div
                          key={workspace.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-slate-100">
                              {workspace.name}
                            </h3>

                            <span className="text-[10px] text-slate-500">
                              ID {workspace.id}
                            </span>
                          </div>

                          <p className="break-all text-xs text-slate-500">
                            {workspace.path}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                void requestDesktopAction(
                                  `vscode-${workspace.id}`,
                                  `${API_BASE_URL}/api/desktop/workspaces/${workspace.id}/open-vscode`
                                )
                              }
                              disabled={
                                desktopLoadingAction ===
                                `vscode-${workspace.id}`
                              }
                              className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:opacity-60"
                            >
                              {desktopLoadingAction ===
                              `vscode-${workspace.id}`
                                ? "Requesting..."
                                : "VS Code"}
                            </button>

                            <button
                              onClick={() =>
                                void requestDesktopAction(
                                  `folder-${workspace.id}`,
                                  `${API_BASE_URL}/api/desktop/workspaces/${workspace.id}/open-folder`
                                )
                              }
                              disabled={
                                desktopLoadingAction ===
                                `folder-${workspace.id}`
                              }
                              className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                            >
                              {desktopLoadingAction ===
                              `folder-${workspace.id}`
                                ? "Requesting..."
                                : "Folder"}
                            </button>

                            <button
                              onClick={() =>
                                void requestDesktopAction(
                                  `dev-${workspace.id}`,
                                  `${API_BASE_URL}/api/desktop/workspaces/${workspace.id}/start-dev`
                                )
                              }
                              disabled={
                                desktopLoadingAction === `dev-${workspace.id}`
                              }
                              className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/10 disabled:opacity-60"
                            >
                              {desktopLoadingAction === `dev-${workspace.id}`
                                ? "Requesting..."
                                : "Start Dev"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Open Browser URL
                  </p>

                  <div className="flex gap-2">
                    <input
                      value={desktopUrl}
                      onChange={(event) => setDesktopUrl(event.target.value)}
                      className="min-w-0 flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
                      placeholder="http://localhost:3000"
                    />

                    <button
                      onClick={() =>
                        void requestDesktopAction(
                          "open-url",
                          `${API_BASE_URL}/api/desktop/open-url`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              url: desktopUrl,
                            }),
                          }
                        )
                      }
                      disabled={desktopLoadingAction === "open-url"}
                      className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
                    >
                      {desktopLoadingAction === "open-url"
                        ? "Opening..."
                        : "Open"}
                    </button>
                  </div>
                </div>

                <p className="text-xs leading-5 text-slate-500">
                  Safety: all desktop actions create approval requests first. No
                  silent app launching.
                </p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    GitHub Release Assistant
                  </h2>
                  <p className="text-sm text-slate-400">
                    Prepare release notes, checklist, and commit messages
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  v2.5
                </span>
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
                {workspaces.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Register a workspace first to prepare a GitHub release.
                  </p>
                ) : (
                  workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-100">
                          {workspace.name}
                        </h3>

                        <span className="text-[10px] text-slate-500">
                          ID {workspace.id}
                        </span>
                      </div>

                      <p className="break-all text-xs text-slate-500">
                        {workspace.path}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            void runGithubReleaseAction(workspace.id, "status")
                          }
                          disabled={githubReleaseLoadingId === workspace.id}
                          className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:opacity-60"
                        >
                          Readiness
                        </button>

                        <button
                          onClick={() =>
                            void runGithubReleaseAction(workspace.id, "notes")
                          }
                          disabled={githubReleaseLoadingId === workspace.id}
                          className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/10 disabled:opacity-60"
                        >
                          Notes
                        </button>

                        <button
                          onClick={() =>
                            void runGithubReleaseAction(
                              workspace.id,
                              "checklist"
                            )
                          }
                          disabled={githubReleaseLoadingId === workspace.id}
                          className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
                        >
                          Checklist
                        </button>

                        <button
                          onClick={() =>
                            void runGithubReleaseAction(
                              workspace.id,
                              "commit-message"
                            )
                          }
                          disabled={githubReleaseLoadingId === workspace.id}
                          className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                        >
                          Commit Msg
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {githubReleaseResult && (
                <div className="mt-4 max-h-72 overflow-y-auto rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                    Latest Release Output
                  </p>

                  {githubReleaseResult.artifact_path && (
                    <p className="mt-2 break-all text-xs text-slate-400">
                      Artifact: {githubReleaseResult.artifact_path}
                    </p>
                  )}

                  <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-200">
                    {githubReleaseResult.content}
                  </pre>
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Browser Research</h2>
                  <p className="text-sm text-slate-400">
                    Safe public web page inspection and research extraction
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  v2.5
                </span>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <input
                  value={researchUrl}
                  onChange={(event) => setResearchUrl(event.target.value)}
                  placeholder="https://example.com/docs"
                  className="w-full rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
                />

                <button
                  onClick={() => void researchPage()}
                  className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed"
                >
                  Research Page
                </button>

                <p className="text-xs leading-5 text-slate-500">
                  Safety: public pages only. No login, purchases, account
                  changes, or form submissions.
                </p>
              </div>

              {latestResearch && (
                <div className="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                    Latest Research Output
                  </p>

                  <h3 className="mt-2 text-sm font-semibold text-slate-100">
                    {latestResearch.title}
                  </h3>

                  {latestResearch.url && (
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {latestResearch.url}
                    </p>
                  )}

                  <div className="mt-3 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Summary:
                    </span>{" "}
                    {latestResearch.summary}
                  </div>

                  <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-200">
                    {latestResearch.content}
                  </pre>
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Mission Run History</h2>
                  <p className="text-sm text-slate-400">
                    Controlled execution cycle records
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  {missionRuns.length} runs
                </span>
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
                {missionRuns.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No mission run history yet. Run a mission step to create
                    one.
                  </p>
                ) : (
                  missionRuns.map((run) => (
                    <div
                      key={run.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                          {run.status}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          Run #{run.id}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-100">
                        {run.mission_title}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Mission ID: {run.mission_id} | Step ID:{" "}
                        {run.step_id || "N/A"}
                      </p>

                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {run.step_title || "No step title recorded."}
                      </p>

                      {run.error && (
                        <p className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 p-2 text-xs text-red-200">
                          {run.error}
                        </p>
                      )}

                      {run.completed_at && (
                        <p className="mt-2 text-[10px] text-slate-500">
                          Completed: {run.completed_at}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Command Approval</h2>
                  <p className="text-sm text-slate-400">
                    Manual approval gate for file and command actions
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  {approvals.filter((item) => item.status === "pending").length}{" "}
                  pending
                </span>
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
                {approvals.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No approval requests yet.
                  </p>
                ) : (
                  approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                          {approval.status}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          Risk: {approval.risk_level}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-100">
                        #{approval.id} — {approval.title}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {approval.description}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Type: {approval.action_type}
                      </p>

                      {approval.result && (
                        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-2 text-xs text-slate-400">
                          {approval.result}
                        </p>
                      )}

                      {approval.status === "pending" && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => void approveAction(approval.id)}
                            className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => void rejectAction(approval.id)}
                            className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Mission Planner</h2>
                  <p className="text-sm text-slate-400">
                    Structured O.R.I.O.N. goals and action plans
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  {missions.length} missions
                </span>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
                {missions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No missions yet. Ask O.R.I.O.N. to create a mission.
                  </p>
                ) : (
                  missions.map((mission) => (
                    <div
                      key={mission.id}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                          {mission.status}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          Priority {mission.priority}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-100">
                        {mission.title}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {mission.goal}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => void runNextMissionStep(mission.id)}
                          disabled={runningMissionId === mission.id}
                          className="rounded-xl bg-cyan-300 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {runningMissionId === mission.id
                            ? "Running..."
                            : "Run Next Step"}
                        </button>

                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void runMissionBatch(mission.id);
                          }}
                          disabled={runningBatchMissionId === mission.id}
                          className="rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {runningBatchMissionId === mission.id
                            ? "Running..."
                            : "Run 3 Steps"}
                        </button>

                        <button
                          onClick={() => void generateMissionReport(mission.id)}
                          disabled={generatingReportId === mission.id}
                          className="rounded-xl border border-cyan-400/30 px-3 py-1.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {generatingReportId === mission.id
                            ? "Generating..."
                            : "Report"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}



