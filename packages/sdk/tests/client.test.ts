import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDocument } from "@brief/core";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { Brief } from "../src";
import { writeStoredCredentials } from "../src/credentials";

const originalConfigHome = process.env.XDG_CONFIG_HOME;
const originalApiToken = process.env.BRIEF_API_TOKEN;
const originalApiUrl = process.env.BRIEF_API_URL;

afterEach(() => {
  if (originalConfigHome === undefined) delete process.env.XDG_CONFIG_HOME;
  else process.env.XDG_CONFIG_HOME = originalConfigHome;
  if (originalApiToken === undefined) delete process.env.BRIEF_API_TOKEN;
  else process.env.BRIEF_API_TOKEN = originalApiToken;
  if (originalApiUrl === undefined) delete process.env.BRIEF_API_URL;
  else process.env.BRIEF_API_URL = originalApiUrl;
});

describe("Brief SDK", () => {
  test("builds an ergonomic structured document", async () => {
    const brief = await Brief.create({ title: "Deployment Report", visibility: "public" });
    brief.hero("Production is healthy", "Completed in 4m 12s", "Deployment");
    brief.summary("Deployment completed successfully.");
    brief.todo(["Warm cache", "Verify production"]).check("Warm cache");
    brief.logs("ready\n").append("healthy\n");

    expect(brief.state.pages[0]?.sections[0]?.blocks).toHaveLength(4);
    const todo = brief.state.pages[0]?.sections[0]?.blocks[2];
    expect(todo).toMatchObject({ type: "checklist" });
    expect(todo?.type === "checklist" ? todo.items[0]?.checked : undefined).toBe(true);
  });

  test("keeps a page active when no builder callback is supplied", async () => {
    const brief = await Brief.create({ title: "Migration plan" });

    brief.page("Decisions");
    brief.markdown("## Runtime\n\nUse Node.js.");

    const overview = brief.state.pages[0];
    const decisions = brief.state.pages[1];
    expect(overview?.sections[0]?.blocks).toHaveLength(0);
    expect(decisions?.sections[0]?.blocks).toHaveLength(1);
  });

  test("stores a serializable Markdown AST and reparses streaming updates from source", async () => {
    const brief = await Brief.create({ title: "AI response" });

    brief.markdown("## Result\n\n```ts\nconst answer =", { profile: "streaming" });

    const block = brief.state.pages[0]?.sections[0]?.blocks[0];
    expect(block).toMatchObject({ type: "markdown", profile: "streaming" });
    expect(
      block?.type === "markdown" && "document" in block ? block.document.type : undefined,
    ).toBe("root");
    expect(() => JSON.stringify(brief.state)).not.toThrow();
  });

  test("uses credentials saved by brief login", async () => {
    const directory = await mkdtemp(join(tmpdir(), "brief-sdk-login-"));
    process.env.XDG_CONFIG_HOME = directory;
    delete process.env.BRIEF_API_TOKEN;
    delete process.env.BRIEF_API_URL;
    const document = createDocument({ id: "12345678", title: "Authenticated Brief" });
    await writeStoredCredentials({
      version: 1,
      apiUrl: "https://brief.example",
      email: "agent@example.com",
      token: "brief_live_saved",
    });

    try {
      const brief = await Brief.open(document.id, {
        fetch: (input, init) => {
          const requestUrl =
            typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
          expect(requestUrl).toBe(`https://brief.example/v1/briefs/${document.id}`);
          expect(new Headers(init?.headers).get("authorization")).toBe("Bearer brief_live_saved");
          return Promise.resolve(Response.json({ data: document }));
        },
      });
      expect(brief.state.title).toBe("Authenticated Brief");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
