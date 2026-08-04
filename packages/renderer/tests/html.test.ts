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
    appendBlock(document, {
      id: "blk_code",
      type: "code",
      language: "typescript",
      code: 'const status: string = "healthy";',
    });
    document.pages.push({
      id: "pag_logs",
      title: "Logs",
      slug: "93016482",
      sections: [
        {
          id: "sec_logs",
          blocks: [{ id: "blk_logs", type: "logs", content: "ready" }],
        },
      ],
    });
    document.pages.push({
      id: "pag_empty",
      title: "Empty",
      slug: "93016483",
      sections: [{ id: "sec_empty", blocks: [] }],
    });

    const rendered = renderBrief(document, "text/html");

    expect(rendered.body).toContain("https://rsms.me/inter/inter.css");
    expect(rendered.body).toContain("<title>Build &lt;Report&gt; — Brief</title>");
    expect(rendered.body).toContain("Production is healthy.");
    expect(rendered.body).toContain('<span class="th-token th-keyword">const</span>');
    expect(rendered.body).not.toContain("On This Page");
    expect(rendered.body).toContain('data-active="true"');
    expect(rendered.body).toContain("requestAnimationFrame(update)");
    expect(rendered.body).toContain("document.documentElement.scrollHeight - 2");
    expect(rendered.body).toContain("page.getBoundingClientRect().top + window.scrollY");
    expect(rendered.body).toContain("link.addEventListener('click'");
    expect(rendered.body).toContain('href="https://github.com/Dawsson/brief"');
    expect(rendered.body).toContain("Updated ");
    expect(rendered.body).toContain('class="footer-separator" aria-hidden="true">•</span>');
    expect(rendered.body).not.toContain('class="wordmark"');
    expect(rendered.body).not.toContain('class="meta"');
    expect(rendered.body).not.toContain("ui-serif");
    expect(rendered.body).toContain(">Logs</a>");
    expect(rendered.body).not.toContain(">Empty</a>");
  });

  test("renders Markdown from a durable AST with explicit external highlighting", () => {
    const document = createDocument({ id: "brf_markdown", title: "Technical report" });
    appendBlock(document, {
      id: "blk_markdown",
      type: "markdown",
      source: "## API\n\n```ts title=client.ts {1}\nconst ready = true\n```",
      document: {
        type: "root",
        children: [
          { type: "heading", depth: 2, children: [{ type: "text", value: "API" }] },
          {
            type: "code",
            lang: "ts",
            meta: "title=client.ts {1}",
            value: "const ready = true",
          },
        ],
      },
    });

    const rendered = renderBrief(document, "text/html");

    expect(rendered.body).toContain("<h2>API</h2>");
    expect(rendered.body).toContain('class="th-token th-keyword"');
    expect(rendered.body).toContain('data-lang="ts"');
  });
});
