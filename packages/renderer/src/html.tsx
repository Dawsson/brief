/** @jsxImportSource hono/jsx */
import type { BriefBlock, BriefDocument, BriefPage, BriefSection, Primitive } from "@brief/core";
import { html, raw } from "hono/html";
import { markdownToHtml } from "./markdown";
import { highlighter } from "./highlight";
import readerStyles from "./reader.css?inline";

const activePageScript = `
(() => {
  const links = Array.from(document.querySelectorAll('[data-page-link]'));
  const pages = Array.from(document.querySelectorAll('[data-brief-page]'));
  let frame = 0;

  const setActive = (target) => {
    for (const link of links) {
      const active = link.getAttribute('href') === target;
      link.dataset.active = String(active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };

  const update = () => {
    frame = 0;
    const atBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) {
      const lastPage = pages[pages.length - 1];
      setActive(lastPage ? '#' + lastPage.id : '');
      return;
    }

    const marker = window.scrollY + Math.min(window.innerHeight * 0.28, 240);
    let current = pages[0];
    for (const page of pages) {
      const pageTop = page.getBoundingClientRect().top + window.scrollY;
      if (pageTop <= marker) current = page;
    }
    setActive(current ? '#' + current.id : '');
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  for (const link of links) {
    link.addEventListener('click', () => setActive(link.getAttribute('href') || ''));
  }
  update();
})();
`;

function display(value: Primitive): string {
  if (value === null) return "—";
  return String(value);
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
          {raw(markdownToHtml(block))}
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
      const highlighted =
        block.type === "code"
          ? highlighter.renderCodeBlockData({
              code: content,
              ...(block.language ? { lang: block.language } : {}),
            }).htmlMarkup
          : undefined;
      return (
        <figure class="code" id={block.id}>
          <figcaption>
            <span>{label}</span>
            <span class="code-kind">{block.type}</span>
          </figcaption>
          {highlighted ? (
            raw(highlighted)
          ) : (
            <pre>
              <code>{content}</code>
            </pre>
          )}
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

function hasContent(page: BriefPage): boolean {
  return page.sections.some((section) => section.title || section.blocks.length > 0);
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
        <span class="footer-separator" aria-hidden="true">
          •
        </span>
        <span>Version {document.version}</span>
      </p>
    </footer>
  );
}

function Reader({ document }: { document: BriefDocument }) {
  const visiblePages = document.pages.filter(hasContent);
  const pages = visiblePages.length > 0 ? visiblePages : document.pages.slice(0, 1);
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
          <Sidebar pages={pages} />
          <main class="content">
            {pages.map((page, index) => (
              <Page page={page} index={index} />
            ))}
            <Footer document={document} />
          </main>
        </div>
        {pages.length > 1 ? <script>{raw(activePageScript)}</script> : null}
      </body>
    </html>
  );
}

export function renderHtml(document: BriefDocument): string {
  const rendered = html`<!doctype html>${<Reader document={document} />}`;
  if (rendered instanceof Promise) throw new Error("The Brief reader must render synchronously");
  return rendered.valueOf();
}
