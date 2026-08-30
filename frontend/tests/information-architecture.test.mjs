import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";


const dataSource = readFileSync(
  new URL("../src/lib/aurora-data.ts", import.meta.url),
  "utf8",
);
const sidebarSource = readFileSync(
  new URL("../src/components/aurora/sidebar.tsx", import.meta.url),
  "utf8",
);
const appShellSource = readFileSync(
  new URL("../src/components/aurora/app-shell.tsx", import.meta.url),
  "utf8",
);
const governanceSource = readFileSync(
  new URL("../src/components/aurora/dashboard-workspace.tsx", import.meta.url),
  "utf8",
);


test("primary navigation contains exactly seven product destinations", () => {
  const block = dataSource.match(/export const navItems[\s\S]*?= \[([\s\S]*?)\n\];/)?.[1] ?? "";
  const labels = [...block.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, [
    "Dashboard",
    "Assistant",
    "Missions",
    "Context",
    "Workspaces",
    "Governance",
    "System",
  ]);
  for (const historical of ["Demo", "Portfolio", "Release Candidate", "Patch Release"]) {
    assert.doesNotMatch(block, new RegExp(`label: "${historical}"`));
    assert.doesNotMatch(sidebarSource, new RegExp(`items: \\[[^\\]]*"${historical}"`));
  }
});

test("core tasks are exposed as contextual second-level links", () => {
  for (const route of [
    "/assistant",
    "/voice",
    "/browser",
    "/missions",
    "/workflows",
    "/agents",
    "/context",
    "/projects",
    "/workspaces",
    "/governance",
    "/security",
    "/tools",
    "/plugins",
    "/system",
    "/analytics",
    "/settings",
    "/console",
  ]) {
    assert.match(dataSource, new RegExp(`href: "${route}"`));
  }
  assert.match(appShellSource, /<DestinationNavigation \/>/);
});

test("historical release panels are not forced into the governance workspace", () => {
  const widgets = governanceSource.match(/const GOVERNANCE_WIDGETS = \[([\s\S]*?)\n\];/)?.[1] ?? "";
  for (const historical of [
    "Changelog Intelligence",
    "Stable Public Release",
    "Post-Release Maintenance",
    "Patch Release",
    "Roadmap Planner",
    "Final Launch",
    "GitHub Launch",
    "Public Landing Page",
    "UI Polish",
  ]) {
    assert.doesNotMatch(widgets, new RegExp(`"${historical}"`));
  }
  assert.match(widgets, /"Release Candidate"/);
  assert.match(widgets, /"Tool Audit Center"/);
});
