/** @jsxImportSource hono/jsx */
import type { BriefBlock, BriefDocument, BriefPage, BriefSection, Primitive } from "@brief/core";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";
import { html, raw } from "hono/html";
import { markdownToHtml } from "./markdown";
import readerStyles from "./reader.css?inline";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("yaml", yaml);

const languageAliases: Readonly<Record<string, string>> = {
  cjs: "javascript",
  js: "javascript",
  jsx: "javascript",
  md: "markdown",
  mjs: "javascript",
  sh: "bash",
  shell: "bash",
  text: "plaintext",
  ts: "typescript",
  tsx: "typescript",
  yml: "yaml",
};

const activePageScript = `
(() => {
  const links = Array.from(document.querySelectorAll('[data-page-link]'));
  const pages = Array.from(document.querySelectorAll('[data-brief-page]'));
  let frame = 0;

  const update = () => {
    frame = 0;
    const marker = window.scrollY + Math.min(window.innerHeight * 0.28, 240);
    let current = pages[0];
    for (const page of pages) {
      if (page.offsetTop <= marker) current = page;
    }
    const target = current ? '#' + current.id : '';
    for (const link of links) {
      const active = link.getAttribute('href') === target;
      link.dataset.active = String(active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  update();
})();
`;

function display(value: Primitive): string {
  if (value === null) return "—";
  return String(value);
}

function highlightCode(code: string, language?: string): string {
  const requested = language?.trim().toLowerCase() || "plaintext";
  const normalized = languageAliases[requested] ?? requested;
  if (!hljs.getLanguage(normalized)) return code;
  return hljs.highlight(code, { language: normalized, ignoreIllegals: true }).value;
}

function Block({ block }: { block: BriefBlock }) {
  switch (block.type) {
    case "hero":
      return (
        <header class="hero" id={block.id}>
          {block.eyebrow ? <p class="eyebrow">{block.eyebrow}</p> : null}
          <h1>{block.title}</h1>
          {block.subtitle ? <p class="subtitle">{block.subtitle}</p> : null}
        </header>
      );
    case "markdown":
      return (
        <div class="prose" id={block.id}>
          {raw(markdownToHtml(block.content))}
        </div>
      );
    case "checklist":
      return (
        <ul class="checklist" id={block.id}>
          {block.items.map((item) => (
            <li class={item.checked ? "checked" : undefined}>
              <span class="check" aria-hidden="true">
                {item.checked ? "✓" : null}
              </span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      );
    case "code":
    case "logs": {
      const content = block.type === "code" ? block.code : block.content;
      const label = block.type === "code" ? (block.filename ?? block.language ?? "Code") : "Logs";
      const highlighted = block.type === "code" ? highlightCode(content, block.language) : content;
      return (
        <figure class="code" id={block.id}>
          <figcaption>
            <span>{label}</span>
            <span class="code-kind">{block.type}</span>
          </figcaption>
          <pre>
            <code class="hljs">{block.type === "code" ? raw(highlighted) : highlighted}</code>
          </pre>
        </figure>
      );
    }
    case "table":
      return (
        <div class="table-wrap" id={block.id}>
          <table>
            <thead>
              <tr>
                {block.columns.map((column) => (
                  <th>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr>
                  {block.columns.map((column) => (
                    <td>{display(row[column] ?? null)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <aside class={`callout ${block.tone}`} id={block.id}>
          <span class="callout-mark" aria-hidden="true" />
          <div>
            {block.title ? <strong>{block.title}</strong> : null}
            <p>{block.content}</p>
          </div>
        </aside>
      );
    case "image":
      return (
        <figure class="image" id={block.id}>
          <img src={block.url} alt={block.alt} loading="lazy" />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    case "metric":
      return (
        <div class="metric" id={block.id}>
          <p>{block.label}</p>
          <strong>{block.value}</strong>
          {block.detail ? <span>{block.detail}</span> : null}
        </div>
      );
    case "divider":
      return <hr id={block.id} />;
    case "spacer":
      return <div class={`spacer ${block.size}`} id={block.id} aria-hidden="true" />;
  }
}

function Section({ section }: { section: BriefSection }) {
  return (
    <section class="section" id={section.id}>
      {section.title ? <h2>{section.title}</h2> : null}
      {section.blocks.map((block) => (
        <div class="block">
          <Block block={block} />
        </div>
      ))}
    </section>
  );
}

function Page({ page, index }: { page: BriefPage; index: number }) {
  return (
    <article class="brief-page" id={`page-${page.slug}`} data-brief-page>
      {index > 0 ? <p class="page-title">{page.title}</p> : null}
      {page.sections.map((section) => (
        <Section section={section} />
      ))}
    </article>
  );
}

function Sidebar({ pages }: { pages: BriefPage[] }) {
  return (
    <aside class="side">
      <nav aria-label="Brief pages">
        <p class="side-label">On This Page</p>
        <div class="page-links">
          {pages.map((page, index) => (
            <a
              class="page-link"
              href={`#page-${page.slug}`}
              data-page-link
              data-active={String(index === 0)}
              aria-current={index === 0 ? "location" : undefined}
            >
              {page.title}
            </a>
          ))}
        </div>
      </nav>
    </aside>
  );
}

function Footer({ document }: { document: BriefDocument }) {
  const updated = new Date(document.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <footer class="footer">
      <a class="footer-link" href="https://github.com/Dawsson/brief" rel="noreferrer">
        Published with Brief
      </a>
      <p class="footer-meta">
        <span>Updated {updated}</span>
        <span>Version {document.version}</span>
      </p>
    </footer>
  );
}

function Reader({ document }: { document: BriefDocument }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#f7f7f4" />
        <title>{document.title} — Brief</title>
        {document.description ? <meta name="description" content={document.description} /> : null}
        <link rel="preconnect" href="https://rsms.me" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <style>{raw(readerStyles)}</style>
      </head>
      <body>
        <div class="shell">
          <Sidebar pages={document.pages} />
          <main class="content">
            {document.pages.map((page, index) => (
              <Page page={page} index={index} />
            ))}
            <Footer document={document} />
          </main>
        </div>
        {document.pages.length > 1 ? <script>{raw(activePageScript)}</script> : null}
      </body>
    </html>
  );
}

export function renderHtml(document: BriefDocument): string {
  const rendered = html`<!doctype html>${<Reader document={document} />}`;
  if (rendered instanceof Promise) throw new Error("The Brief reader must render synchronously");
  return rendered.valueOf();
}
