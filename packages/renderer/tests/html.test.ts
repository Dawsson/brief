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
      sections: [{ id: "sec_logs", blocks: [] }],
    });

    const rendered = renderBrief(document, "text/html");

    expect(rendered.body).toContain("https://rsms.me/inter/inter.css");
    expect(rendered.body).toContain("<title>Build &lt;Report&gt; — Brief</title>");
    expect(rendered.body).toContain("Production is healthy.");
    expect(rendered.body).toContain('<span class="hljs-keyword">const</span>');
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
  });
});
