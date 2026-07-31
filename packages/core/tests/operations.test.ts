import { describe, expect, test } from "vite-plus/test";
import {
  appendBlock,
  applyOperations,
  createBriefId,
  createDocument,
  createId,
  createPageSlug,
} from "../src";

describe("operations", () => {
  test("creates opaque eight-digit page slugs", () => {
    expect(createBriefId()).toMatch(/^\d{8}$/);
    expect(createPageSlug()).toMatch(/^\d{8}$/);
    const document = createDocument({ title: "Deployment Overview" });
    expect(document.id).toMatch(/^\d{8}$/);
    expect(document.pages[0]?.slug).toMatch(/^\d{8}$/);
  });

  test("applies append and check without mutating the source", () => {
    const document = createDocument({ title: "Deploy" });
    const logsId = createId("blk");
    const todoId = createId("blk");
    appendBlock(document, { id: logsId, type: "logs", content: "one\n" });
    appendBlock(document, {
      id: todoId,
      type: "checklist",
      items: [{ id: createId("itm"), text: "Verify production", checked: false }],
    });

    const next = applyOperations(document, [
      { kind: "append", targetId: logsId, value: "two\n" },
      { kind: "check", targetId: todoId, item: "Verify production" },
    ]);

    expect(next.pages[0]?.sections[0]?.blocks[0]).toMatchObject({ content: "one\ntwo\n" });
    expect(next.pages[0]?.sections[0]?.blocks[1]).toMatchObject({
      items: [{ checked: true }],
    });
    expect(document.pages[0]?.sections[0]?.blocks[0]).toMatchObject({ content: "one\n" });
  });
});
