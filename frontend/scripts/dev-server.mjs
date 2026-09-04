import http from "node:http";
import next from "next";

import { readDevelopmentApiSession } from "./dev-auth-session.mjs";

function option(name, shortName, fallback) {
  const index = process.argv.findIndex((value) => value === name || value === shortName);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function isLoopbackRequest(request) {
  const remote = request.socket.remoteAddress ?? "";
  const hostname = String(request.headers.host ?? "").split(":")[0].replace(/^\[|\]$/g, "");
  return (
    ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote) &&
    ["localhost", "127.0.0.1", "::1"].includes(hostname)
  );
}

const hostname = option("--hostname", "-H", "127.0.0.1");
const port = Number(option("--port", "-p", process.env.PORT ?? "3000"));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("The Aurora development server port must be between 1 and 65535.");
}

const application = next({
  dev: true,
  dir: process.cwd(),
  hostname,
  port,
  turbopack: process.argv.includes("--turbo"),
});
await application.prepare();
const handle = application.getRequestHandler();
const handleUpgrade = application.getUpgradeHandler();

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (requestUrl.pathname === "/__orion/api-session") {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Pragma", "no-cache");
    if (request.method !== "GET" || !isLoopbackRequest(request)) {
      response.statusCode = 403;
      response.end(JSON.stringify({ detail: "Development API session access denied." }));
      return;
    }
    try {
      const session = await readDevelopmentApiSession();
      response.statusCode = 200;
      response.end(JSON.stringify(session));
    } catch {
      response.statusCode = 503;
      response.end(JSON.stringify({
        detail: "Start the O.R.I.O.N. backend to establish a development API session.",
      }));
    }
    return;
  }
  await handle(request, response);
});

server.on("upgrade", (request, socket, head) => {
  void handleUpgrade(request, socket, head);
});

server.listen(port, hostname, () => {
  console.log(`Aurora OS: http://${hostname === "127.0.0.1" ? "localhost" : hostname}:${port}`);
  console.log("Authenticated backend sessions are negotiated in memory; no token is written to disk.");
});

async function shutdown() {
  server.close();
  await application.close();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
