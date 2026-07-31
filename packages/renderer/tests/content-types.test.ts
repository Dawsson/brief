import { describe, expect, test } from "vite-plus/test";
import { negotiateContentType } from "../src";

describe("content negotiation", () => {
  test("defaults to HTML", () => {
    expect(negotiateContentType(null)).toBe("text/html");
  });

  test("honors quality and wildcards", () => {
    expect(negotiateContentType("text/*;q=.5, application/vnd.harbr.brief+json;q=.9")).toBe(
      "application/vnd.harbr.brief+json",
    );
    expect(negotiateContentType("text/*")).toBe("text/html");
    expect(negotiateContentType("image/png")).toBeUndefined();
  });
});
