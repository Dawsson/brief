import { createDocument } from "@brief/core";
import { describe, expect, test } from "vite-plus/test";
import { createApp } from "../src/app";
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

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
