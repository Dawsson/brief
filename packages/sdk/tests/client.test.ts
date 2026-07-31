import { describe, expect, test } from "vite-plus/test";
import { Brief } from "../src";

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
});
