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
