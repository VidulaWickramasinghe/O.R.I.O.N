"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { AuroraAssistant } from "./aurora-assistant";
import { AuroraContextPanel } from "./aurora-context-panel";
import { AuroraDashboard } from "./aurora-dashboard";
import { AuroraSidebar } from "./aurora-sidebar";
import { AuroraTopbar } from "./aurora-topbar";
import { AuroraCommandPalette } from "./command/aurora-command-palette";
import { AuroraView, DashboardWidgetConfig } from "./aurora-types";
import { SimpleModule } from "./modules/simple-module";

import { BrowserModule } from "./modules/browser-module";
import { ConsoleModule } from "./modules/console-module";
import { DemoModule } from "./modules/demo-module";
import { MemoryModule } from "./modules/memory-module";
import { MissionsModule } from "./modules/missions-module";
import { ProjectsModule } from "./modules/projects-module";
import { SystemModule } from "./modules/system-module";
import { ToolsModule } from "./modules/tools-module";
import { VoiceModule } from "./modules/voice-module";
import { WorkspacesModule } from "./modules/workspaces-module";

import {
  useAuroraActivity,
  useAuroraProjects,
  useAuroraStatus,
  useAuroraWorkspaces,
} from "./lib/aurora-queries";
import { api } from "./lib/api-client";

type Message = {
  role: "user" | "orion";
  content: string;
};

export function AuroraWorkspace() {
  const queryClient = useQueryClient();

  const statusQuery = useAuroraStatus();
  const activityQuery = useAuroraActivity();
  const projectsQuery = useAuroraProjects();
  const workspacesQuery = useAuroraWorkspaces();

  const status = statusQuery.data || null;
  const activity = activityQuery.data?.events || [];
  const projects = projectsQuery.data?.projects || [];
  const workspaces = workspacesQuery.data?.workspaces || [];

  const [activeView, setActiveView] = useState<AuroraView>("dashboard");
  const [search, setSearch] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidgetConfig[]>([
    { id: "hero", label: "Hero Overview", enabled: true },
    { id: "metrics", label: "Metric Cards", enabled: true },
    { id: "quickActions", label: "Quick Actions", enabled: true },
    { id: "models", label: "Models", enabled: true },
    { id: "recentActivity", label: "Recent Activity", enabled: true },
  ]);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "orion",
      content:
        "O.R.I.O.N. Aurora OS UX Rebuild online. The new workspace shell is ready.",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [contextPreviewLoading, setContextPreviewLoading] = useState(false);

  // Persistence Effects
  useEffect(() => {
    const saved = localStorage.getItem("aurora-dashboard-widgets");

    if (saved) {
      try {
        setDashboardWidgets(JSON.parse(saved));
      } catch {
        localStorage.removeItem("aurora-dashboard-widgets");
      }
    }

    const savedLeft = localStorage.getItem("aurora-left-collapsed");
    const savedRight = localStorage.getItem("aurora-right-collapsed");

    setLeftPanelCollapsed(savedLeft === "true");
    setRightPanelCollapsed(savedRight === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "aurora-dashboard-widgets",
      JSON.stringify(dashboardWidgets)
    );
  }, [dashboardWidgets]);

  useEffect(() => {
    localStorage.setItem("aurora-left-collapsed", String(leftPanelCollapsed));
  }, [leftPanelCollapsed]);

  useEffect(() => {
    localStorage.setItem("aurora-right-collapsed", String(rightPanelCollapsed));
  }, [rightPanelCollapsed]);

  const apiOnline = status?.status === "online";

  async function sendMessage(customMessage?: string) {
    const cleanMessage = (customMessage || message).trim();

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
    setActiveView("assistant");

    try {
      const data = await api.post<{ response: string }>("/api/chat", {
        message: cleanMessage,
      });

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: data.response || "No response returned from backend.",
        },
      ]);

      await refreshCoreData();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content:
            "Connection error. Confirm the FastAPI backend is running on port 8000.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function previewContext() {
    const cleanMessage = message.trim();

    if (!cleanMessage || contextPreviewLoading) return;

    setContextPreviewLoading(true);

    try {
      const data = await api.post<{ message: string; context: string }>(
        "/api/context/preview",
        {
          message: cleanMessage,
        }
      );

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Context preview for: ${data.message}\n\n${data.context}`,
        },
      ]);

      setActiveView("assistant");
      await queryClient.invalidateQueries({ queryKey: ["aurora-activity"] });
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: "Context preview failed. Confirm backend is running.",
        },
      ]);
    } finally {
      setContextPreviewLoading(false);
    }
  }

  async function refreshCoreData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["aurora-status"] }),
      queryClient.invalidateQueries({ queryKey: ["aurora-activity"] }),
      queryClient.invalidateQueries({ queryKey: ["aurora-projects"] }),
      queryClient.invalidateQueries({ queryKey: ["aurora-workspaces"] }),
    ]);
  }

  function addAssistantMessage(content: string) {
    setMessages((current) => [
      ...current,
      {
        role: "orion",
        content,
      },
    ]);

    setActiveView("assistant");
  }

  async function runSystemDoctorFromPalette() {
    setActiveView("system");

    try {
      const data = await api.get<{
        status: string;
        passed: number;
        failed: number;
      }>("/api/system/doctor");

      addAssistantMessage(
        `System Doctor complete.

Status: ${data.status}
Passed: ${data.passed}
Failed: ${data.failed}`
      );

      await queryClient.invalidateQueries({ queryKey: ["aurora-activity"] });
    } catch {
      addAssistantMessage("System Doctor failed. Confirm backend is running.");
    }
  }

  async function generateDemoPackFromPalette() {
    setActiveView("demo");

    try {
      const data = await api.post<{
        generated_at: string;
        files: string[];
      }>("/api/demo/release-pack");

      addAssistantMessage(
        `Portfolio release pack generated.

Generated at:
${data.generated_at}

Files:
${(data.files || []).join("\n")}`
      );

      await queryClient.invalidateQueries({ queryKey: ["aurora-activity"] });
    } catch {
      addAssistantMessage("Portfolio release pack generation failed.");
    }
  }

  function renderMainView() {
    if (activeView === "dashboard") {
      return (
        <AuroraDashboard
          status={status}
          projects={projects}
          workspaces={workspaces}
          activity={activity}
          dashboardWidgets={dashboardWidgets}
          setDashboardWidgets={setDashboardWidgets}
          onQuickAction={sendMessage}
        />
      );
    }

    if (activeView === "assistant") {
      return (
        <AuroraAssistant
          messages={messages}
          message={message}
          setMessage={setMessage}
          loading={loading}
          sendMessage={() => sendMessage()}
          previewContext={previewContext}
          contextPreviewLoading={contextPreviewLoading}
        />
      );
    }

    if (activeView === "memory") {
      return <MemoryModule onAsk={sendMessage} />;
    }

    if (activeView === "projects") {
      return <ProjectsModule projects={projects} onAsk={sendMessage} />;
    }

    if (activeView === "missions") {
      return <MissionsModule onAssistantMessage={addAssistantMessage} />;
    }

    if (activeView === "workspaces") {
      return (
        <WorkspacesModule
          workspaces={workspaces}
          onAssistantMessage={addAssistantMessage}
          refresh={refreshCoreData}
        />
      );
    }

    if (activeView === "tools") {
      return <ToolsModule onAssistantMessage={addAssistantMessage} />;
    }

    if (activeView === "security") {
      return (
        <ToolsModule
          title="Security"
          description="Command approval system, desktop action gates, safe execution, and audit protection."
          onAssistantMessage={addAssistantMessage}
        />
      );
    }

    if (activeView === "browser") {
      return <BrowserModule onAssistantMessage={addAssistantMessage} />;
    }

    if (activeView === "voice") {
      return <VoiceModule />;
    }

    if (activeView === "system") {
      return <SystemModule />;
    }

    if (activeView === "demo") {
      return <DemoModule />;
    }

    if (activeView === "console") {
      return <ConsoleModule activity={activity} />;
    }

    return (
      <SimpleModule title="Module" description="Module not found.">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <p className="text-sm text-slate-400">Unknown module.</p>
        </div>
      </SimpleModule>
    );
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.18),_transparent_35%)]" />

      <AuroraSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        apiOnline={apiOnline}
        collapsed={leftPanelCollapsed}
        setCollapsed={setLeftPanelCollapsed}
      />

      <section className="relative flex min-w-0 flex-1 flex-col">
        <AuroraTopbar
          status={status}
          search={search}
          setSearch={setSearch}
          openCommandPalette={() => setCommandPaletteOpen(true)}
          toggleLeftPanel={() => setLeftPanelCollapsed((current) => !current)}
          toggleRightPanel={() => setRightPanelCollapsed((current) => !current)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {renderMainView()}
        </div>
      </section>

      <AuroraContextPanel
        projects={projects}
        workspaces={workspaces}
        activity={activity}
        collapsed={rightPanelCollapsed}
        setCollapsed={setRightPanelCollapsed}
      />

      <AuroraCommandPalette
        open={commandPaletteOpen}
        setOpen={setCommandPaletteOpen}
        setActiveView={setActiveView}
        runAssistantCommand={sendMessage}
        runSystemDoctor={runSystemDoctorFromPalette}
        generateDemoPack={generateDemoPackFromPalette}
      />
    </main>
  );
}
