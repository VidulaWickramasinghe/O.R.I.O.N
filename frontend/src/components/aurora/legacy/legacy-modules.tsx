"use client";

import { BrowserModule } from "../modules/browser-module";
import { DemoModule } from "../modules/demo-module";
import { MissionsModule } from "../modules/missions-module";
import { VoiceModule } from "../modules/voice-module";
import { WorkspacesModule } from "../modules/workspaces-module";
import { useAuroraWorkspaces } from "../lib/aurora-queries";

const assistantMessage = (message: string) => {
  console.info("Aurora legacy module message:", message);
};

export function LegacyMissionsWorkspace() {
  return <MissionsModule onAssistantMessage={assistantMessage} />;
}

export function LegacyBrowserWorkspace() {
  return <BrowserModule onAssistantMessage={assistantMessage} />;
}

export function LegacyVoiceWorkspace() {
  return <VoiceModule />;
}

export function LegacyDemoWorkspace() {
  return <DemoModule />;
}

export function LegacyWorkspacesWorkspace() {
  const workspacesQuery = useAuroraWorkspaces();

  return (
    <WorkspacesModule
      workspaces={workspacesQuery.data?.workspaces || []}
      onAssistantMessage={assistantMessage}
      refresh={async () => {
        await workspacesQuery.refetch();
      }}
    />
  );
}
