import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";


test("concurrent dashboard consumers issue one request per resource", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false } },
  });
  let requests = 0;
  const query = async () => {
    requests += 1;
    await Promise.resolve();
    return { missions: [] };
  };

  await Promise.all([
    client.fetchQuery({ queryKey: ["aurora-missions"], queryFn: query }),
    client.fetchQuery({ queryKey: ["aurora-missions"], queryFn: query }),
    client.fetchQuery({ queryKey: ["aurora-missions"], queryFn: query }),
  ]);
  await client.fetchQuery({ queryKey: ["aurora-missions"], queryFn: query });
  assert.equal(requests, 1);

  await client.invalidateQueries({ queryKey: ["aurora-missions"] });
  await client.fetchQuery({ queryKey: ["aurora-missions"], queryFn: query });
  assert.equal(requests, 2);
});

test("the application has one root provider and no dashboard polling loop", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  const dashboard = readFileSync(
    new URL("../src/components/aurora/dashboard-workspace.tsx", import.meta.url),
    "utf8",
  );
  const duplicateClient = new URL(
    "../src/components/aurora/lib/api-client.ts",
    import.meta.url,
  );

  assert.match(layout, /<AuroraQueryProvider>/);
  assert.doesNotMatch(dashboard, /setInterval\s*\(/);
  assert.doesNotMatch(dashboard, /getWorkspaces\s*\(/);
  assert.match(dashboard, /useAuroraWorkspaces\s*\(/);
  assert.match(dashboard, /invalidateQueries\s*\(/);
  assert.equal(existsSync(duplicateClient), false);
});

test("secondary live views consume the shared query cache", () => {
  const sharedViews = [
    "../src/components/aurora/context-panel.tsx",
    "../src/components/aurora/modules/agents-workspace.tsx",
    "../src/components/aurora/modules/console-workspace.tsx",
    "../src/components/aurora/modules/workspaces-workspace.tsx",
  ];

  for (const path of sharedViews) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bapiGet\b|\bgetSystemStatus\b|\bgetWorkspaces\b/);
    assert.match(source, /useAurora[A-Z][A-Za-z]+\s*\(/);
  }
});
