import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const SESSION_REQUEST = "ORION_DEV_API_SESSION_V1\n";
const MAX_SESSION_BYTES = 4096;

export function resolveDevelopmentAuthSocket() {
  const configured = process.env.ORION_DEV_AUTH_SOCKET?.trim();
  if (configured) return path.resolve(configured);

  const repositoryRoot = realpathSync(path.resolve(process.cwd(), ".."));
  const repositoryKey = createHash("sha256")
    .update(repositoryRoot)
    .digest("hex")
    .slice(0, 16);
  const userKey = typeof process.getuid === "function" ? process.getuid() : "user";
  const socketRoot = process.platform === "win32" ? os.tmpdir() : "/tmp";
  return path.join(socketRoot, `orion-dev-${userKey}-${repositoryKey}.sock`);
}

export function readDevelopmentApiSession({ timeoutMs = 2000 } = {}) {
  const socketPath = resolveDevelopmentAuthSocket();
  return new Promise((resolve, reject) => {
    let settled = false;
    let body = Buffer.alloc(0);
    const socket = net.createConnection(socketPath);
    const finish = (error, session) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(session);
    };

    socket.setTimeout(timeoutMs);
    socket.on("connect", () => socket.write(SESSION_REQUEST));
    socket.on("data", (chunk) => {
      body = Buffer.concat([body, chunk]);
      if (body.length > MAX_SESSION_BYTES) {
        finish(new Error("Development API session response exceeded its size limit."));
      }
    });
    socket.on("end", () => {
      try {
        const value = JSON.parse(body.toString("utf8"));
        if (
          typeof value?.token !== "string" ||
          value.token.length < 32 ||
          typeof value?.baseUrl !== "string" ||
          !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(value.baseUrl)
        ) {
          throw new Error("Development API session response was invalid.");
        }
        finish(null, { token: value.token, baseUrl: value.baseUrl });
      } catch (error) {
        finish(error instanceof Error ? error : new Error("Invalid development API session."));
      }
    });
    socket.on("timeout", () => finish(new Error("Development API session broker timed out.")));
    socket.on("error", (error) => finish(error));
  });
}
