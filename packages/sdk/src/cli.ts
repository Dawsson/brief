#!/usr/bin/env node

import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import packageMetadata from "../package.json";
import {
  clearStoredCredentials,
  credentialsPath,
  readStoredCredentials,
  writeStoredCredentials,
} from "./credentials";

const DEFAULT_API_URL = "https://brief.harbr.run";

interface DeviceAuthorization {
  deviceCode: string;
  expiresIn: number;
  interval: number;
  userCode: string;
  verificationUri: string;
}

interface DeviceToken {
  token: string;
  tokenType: "Bearer";
  user: { email: string; role: "admin" | "user" };
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

async function request(path: string, apiUrl: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("content-type", "application/json");
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(10_000),
  });
}

async function responseError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => undefined)) as ApiErrorBody | undefined;
  return new Error(body?.error?.message ?? `${response.status} ${response.statusText}`);
}

function normalizedUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("The API URL must use http or https");
  }
  return url.toString().replace(/\/$/, "");
}

function openBrowser(url: string): boolean {
  const command =
    process.platform === "darwin"
      ? { executable: "open", arguments: [url] }
      : process.platform === "win32"
        ? { executable: "cmd", arguments: ["/c", "start", "", url] }
        : { executable: "xdg-open", arguments: [url] };
  try {
    spawn(command.executable, command.arguments, { detached: true, stdio: "ignore" }).unref();
    return true;
  } catch {
    return false;
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function login(apiUrlInput: string | undefined, noOpen: boolean): Promise<void> {
  const stored = await readStoredCredentials();
  const apiUrl = normalizedUrl(
    apiUrlInput ?? process.env.BRIEF_API_URL ?? stored?.apiUrl ?? DEFAULT_API_URL,
  );
  console.error("Requesting device authorization…");
  const started = await request("/v1/auth/device/code", apiUrl, {
    method: "POST",
    body: "{}",
  });
  if (!started.ok) throw await responseError(started);
  const { data } = (await started.json()) as { data: DeviceAuthorization };

  console.error(`\nCode: ${data.userCode}`);
  console.error(`Open: ${data.verificationUri}\n`);
  if (!noOpen) {
    if (openBrowser(data.verificationUri))
      console.error("Opened your browser. Approve or deny the request there.");
    else console.error("Could not open a browser. Open the URL above to continue.");
  }

  const deadline = Date.now() + data.expiresIn * 1000;
  while (Date.now() < deadline) {
    await wait(Math.max(data.interval, 1) * 1000);
    let response: Response;
    try {
      response = await request("/v1/auth/device/token", apiUrl, {
        method: "POST",
        body: JSON.stringify({ deviceCode: data.deviceCode }),
      });
    } catch (cause) {
      if (Date.now() >= deadline) throw cause;
      continue;
    }
    if (response.status === 202) continue;
    if (!response.ok) throw await responseError(response);
    const tokenResponse = (await response.json()) as { data: DeviceToken };
    await writeStoredCredentials({
      version: 1,
      apiUrl,
      email: tokenResponse.data.user.email,
      token: tokenResponse.data.token,
    });
    console.log(`Connected as ${tokenResponse.data.user.email}.`);
    console.log(`Credentials saved to ${credentialsPath()}.`);
    return;
  }
  throw new Error("The device code expired. Run brief login again.");
}

async function logout(): Promise<void> {
  const removed = await clearStoredCredentials();
  console.log(removed ? "Signed out of Brief." : "Brief is already signed out.");
}

async function whoami(): Promise<void> {
  const credentials = await readStoredCredentials();
  if (!credentials) throw new Error("Not signed in. Run brief login.");
  const response = await request("/v1/auth/session", credentials.apiUrl, {
    method: "GET",
    headers: { authorization: `Bearer ${credentials.token}` },
  });
  if (!response.ok) throw await responseError(response);
  const result = (await response.json()) as {
    data: { email: string; role: "admin" | "user" };
  };
  console.log(`${result.data.email} (${result.data.role})`);
}

function help(): string {
  return `Brief CLI — connect agents to beautiful reports

Usage:
  brief login [--api-url <url>] [--no-open]
  brief whoami
  brief logout

Commands:
  login    Authorize this machine in your browser and save credentials
  whoami   Show the currently connected Brief account
  logout   Remove saved credentials from this machine

Options:
  --api-url <url>  Brief API origin (default: ${DEFAULT_API_URL})
  --no-open        Print the approval URL without opening a browser
  -h, --help       Show help
  --version        Show version
`;
}

async function main(): Promise<void> {
  const parsed = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      "api-url": { type: "string" },
      help: { type: "boolean", short: "h" },
      "no-open": { type: "boolean" },
      version: { type: "boolean" },
    },
  });
  if (parsed.values.help) {
    process.stdout.write(help());
    return;
  }
  if (parsed.values.version) {
    console.log(packageMetadata.version);
    return;
  }

  const command = parsed.positionals[0];
  if (!command) {
    process.stdout.write(help());
    return;
  }
  if (parsed.positionals.length > 1)
    throw new Error(`Unexpected argument: ${parsed.positionals[1]}`);
  if (command === "login") {
    await login(parsed.values["api-url"], parsed.values["no-open"] ?? false);
    return;
  }
  if (command === "logout") {
    await logout();
    return;
  }
  if (command === "whoami") {
    await whoami();
    return;
  }
  throw new Error(`Unknown command: ${command}. Run brief --help.`);
}

process.once("SIGINT", () => {
  console.error("\nCancelled.");
  process.exit(130);
});

main().catch((cause: unknown) => {
  console.error(`Error: ${cause instanceof Error ? cause.message : "Brief CLI failed"}`);
  process.exitCode = 1;
});
