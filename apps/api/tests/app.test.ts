import { createDocument } from "@brief/core";
import { describe, expect, test } from "vite-plus/test";
import { createApp } from "../src/app";
import { hashToken } from "../src/crypto";
import { MemoryRepository } from "../src/repository";

describe("public Brief route", () => {
  test("negotiates Markdown and rejects unsupported types", async () => {
    const repository = new MemoryRepository();
    const document = createDocument({ title: "Deploy", visibility: "public" });
    document.version = 1;
    await repository.putBrief(document);
    const app = createApp({ repository });

    const markdown = await app.request(`/b/${document.id}`, {
      headers: { accept: "text/markdown" },
    });
    expect(markdown.status).toBe(200);
    expect(markdown.headers.get("vary")).toContain("Accept");
    expect(await markdown.text()).toContain("# Overview");

    const image = await app.request(`/b/${document.id}`, { headers: { accept: "image/png" } });
    expect(image.status).toBe(406);
  });
});

describe("browser API access", () => {
  test("allows credentialed local app origins", async () => {
    const app = createApp({ repository: new MemoryRepository() });
    const origin = "http://127.0.0.1:5174";
    const response = await app.request("/v1/auth/authenticate/options", {
      method: "OPTIONS",
      headers: {
        origin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    expect(response.headers.get("vary")).toContain("Origin");
  });

  test("does not grant unknown origins browser access", async () => {
    const app = createApp({ repository: new MemoryRepository() });
    const response = await app.request("/healthz", {
      headers: { origin: "https://not-brief.example" },
    });

    expect(response.status).toBe(403);
  });
});

describe("CLI device authorization", () => {
  test("delivers an agent token only after signed-in approval", async () => {
    const repository = new MemoryRepository();
    const legacyToken = "brief_live_existing";
    const user = {
      id: "usr_admin",
      email: "hello@dawson.gg",
      role: "admin" as const,
      createdAt: new Date().toISOString(),
      apiTokenHash: await hashToken(legacyToken),
    };
    await repository.putUser(user);
    const app = createApp({ repository });

    const started = await app.request("/v1/auth/device/code", { method: "POST" });
    expect(started.status).toBe(201);
    const authorization = (await started.json()) as {
      data: { deviceCode: string; userCode: string; verificationUri: string };
    };
    expect(authorization.data.verificationUri).toContain(
      `/admin/?device=${authorization.data.userCode}`,
    );
    expect(JSON.stringify(authorization)).not.toContain("brief_live_");

    const pending = await app.request("/v1/auth/device/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceCode: authorization.data.deviceCode }),
    });
    expect(pending.status).toBe(202);

    const approved = await app.request(
      `/v1/auth/device/${encodeURIComponent(authorization.data.userCode)}/approve`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${legacyToken}` },
      },
    );
    expect(approved.status).toBe(200);
    expect(await approved.text()).not.toContain("brief_live_");

    const exchanged = await app.request("/v1/auth/device/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceCode: authorization.data.deviceCode }),
    });
    expect(exchanged.status).toBe(200);
    const credentials = (await exchanged.json()) as { data: { token: string } };
    expect(credentials.data.token).toMatch(/^brief_live_/);

    const authorized = await app.request("/v1/briefs", {
      headers: { authorization: `Bearer ${credentials.data.token}` },
    });
    expect(authorized.status).toBe(200);

    const replay = await app.request("/v1/auth/device/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceCode: authorization.data.deviceCode }),
    });
    expect(replay.status).toBe(409);
  });
});
