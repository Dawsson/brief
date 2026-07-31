import { appendBlock, createDocument } from "@brief/core";
import { describe, expect, test } from "vite-plus/test";
import { renderBrief } from "../src/render";

describe("HTML renderer", () => {
  test("renders the document reader with Inter and escaped content", () => {
    const document = createDocument({ id: "brf_reader", title: "Build <Report>" });
    appendBlock(document, {
      id: "blk_hero",
      type: "hero",
      title: "Production is healthy.",
      subtitle: "Every service is responding normally.",
    });

    const rendered = renderBrief(document, "text/html");

    expect(rendered.body).toContain("https://rsms.me/inter/inter.css");
    expect(rendered.body).toContain("font-family:InterVariable,Inter");
    expect(rendered.body).toContain("<title>Build &lt;Report&gt; — Brief</title>");
    expect(rendered.body).toContain("Production is healthy.");
    expect(rendered.body).not.toContain("ui-serif");
  });
});
