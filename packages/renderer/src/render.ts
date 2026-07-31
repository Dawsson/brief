import type { BriefBlock, BriefDocument, Primitive } from "@brief/core";
import { escapeHtml, markdownToHtml, markdownToText } from "./markdown";
import type { BriefContentType } from "./content-types";

export interface RenderedBrief {
  body: string;
  contentType: BriefContentType;
}

function display(value: Primitive): string {
  if (value === null) return "—";
  return String(value);
}

function blockToMarkdown(block: BriefBlock): string {
  switch (block.type) {
    case "hero":
      return `${block.eyebrow ? `${block.eyebrow}\n\n` : ""}# ${block.title}${block.subtitle ? `\n\n${block.subtitle}` : ""}`;
    case "markdown":
      return block.content;
    case "checklist":
      return block.items.map((item) => `- [${item.checked ? "x" : " "}] ${item.text}`).join("\n");
    case "code":
      return `\`\`\`${block.language ?? ""}\n${block.code}\n\`\`\``;
    case "logs":
      return `\`\`\`text\n${block.content}\n\`\`\``;
    case "table":
      return [
        `| ${block.columns.join(" | ")} |`,
        `| ${block.columns.map(() => "---").join(" | ")} |`,
        ...block.rows.map(
          (row) => `| ${block.columns.map((column) => display(row[column] ?? null)).join(" | ")} |`,
        ),
      ].join("\n");
    case "callout":
      return `> ${block.title ? `**${block.title}.** ` : ""}${block.content}`;
    case "image":
      return `![${block.alt}](${block.url})${block.caption ? `\n_${block.caption}_` : ""}`;
    case "metric":
      return `**${block.label}: ${block.value}**${block.detail ? ` — ${block.detail}` : ""}`;
    case "divider":
      return "---";
    case "spacer":
      return "";
  }
}

function blockToText(block: BriefBlock): string {
  if (block.type === "markdown") return markdownToText(block.content);
  if (block.type === "checklist") {
    return block.items.map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.text}`).join("\n");
  }
  if (block.type === "table") {
    return [
      block.columns.join("\t"),
      ...block.rows.map((row) =>
        block.columns.map((column) => display(row[column] ?? null)).join("\t"),
      ),
    ].join("\n");
  }
  if (block.type === "hero")
    return [block.eyebrow, block.title, block.subtitle].filter(Boolean).join("\n");
  if (block.type === "code") return [block.filename, block.code].filter(Boolean).join("\n");
  if (block.type === "logs") return block.content;
  if (block.type === "callout") return [block.title, block.content].filter(Boolean).join(": ");
  if (block.type === "image")
    return [block.alt, block.caption, block.url].filter(Boolean).join(" — ");
  if (block.type === "metric")
    return `${block.label}: ${block.value}${block.detail ? ` (${block.detail})` : ""}`;
  if (block.type === "divider") return "────────";
  return "";
}

function blockToHtml(block: BriefBlock): string {
  const id = escapeHtml(block.id);
  switch (block.type) {
    case "hero":
      return `<header class="hero" id="${id}">${block.eyebrow ? `<p class="eyebrow">${escapeHtml(block.eyebrow)}</p>` : ""}<h1>${escapeHtml(block.title)}</h1>${block.subtitle ? `<p class="subtitle">${escapeHtml(block.subtitle)}</p>` : ""}</header>`;
    case "markdown":
      return `<div class="prose" id="${id}">${markdownToHtml(block.content)}</div>`;
    case "checklist":
      return `<ul class="checklist" id="${id}">${block.items.map((item) => `<li class="${item.checked ? "checked" : ""}"><span class="check" aria-hidden="true">${item.checked ? "✓" : ""}</span><span>${escapeHtml(item.text)}</span></li>`).join("")}</ul>`;
    case "code":
    case "logs": {
      const content = block.type === "code" ? block.code : block.content;
      const label = block.type === "code" ? (block.filename ?? block.language ?? "Code") : "Logs";
      return `<figure class="code" id="${id}"><figcaption><span>${escapeHtml(label)}</span><span class="code-kind">${block.type}</span></figcaption><pre><code>${escapeHtml(content)}</code></pre></figure>`;
    }
    case "table":
      return `<div class="table-wrap" id="${id}"><table><thead><tr>${block.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${block.columns.map((column) => `<td>${escapeHtml(display(row[column] ?? null))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "callout":
      return `<aside class="callout ${block.tone}" id="${id}"><span class="callout-mark" aria-hidden="true"></span><div>${block.title ? `<strong>${escapeHtml(block.title)}</strong>` : ""}<p>${escapeHtml(block.content)}</p></div></aside>`;
    case "image":
      return `<figure class="image" id="${id}"><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" loading="lazy">${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}</figure>`;
    case "metric":
      return `<div class="metric" id="${id}"><p>${escapeHtml(block.label)}</p><strong>${escapeHtml(block.value)}</strong>${block.detail ? `<span>${escapeHtml(block.detail)}</span>` : ""}</div>`;
    case "divider":
      return `<hr id="${id}">`;
    case "spacer":
      return `<div class="spacer ${block.size}" id="${id}" aria-hidden="true"></div>`;
  }
}

const reportStyles = `
:root{color-scheme:light;--ink:#1d1d1f;--muted:#6e6e73;--faint:#86868b;--line:#e7e7e9;--surface:#f5f5f7;--blue:#0066cc;--ease:cubic-bezier(.19,1,.22,1);font-family:"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif;font-synthesis:none;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}html{background:#fff;scroll-behavior:smooth}body{margin:0;color:var(--ink);background:#fff}.shell{display:grid;grid-template-columns:224px minmax(0,760px);gap:88px;width:min(1120px,calc(100% - 48px));margin:0 auto;padding:52px 0 120px}.side{position:sticky;top:48px;align-self:start}.wordmark{display:flex;align-items:center;gap:10px;color:var(--ink);font-size:15px;font-weight:650;text-decoration:none;letter-spacing:-.01em}.mark{display:grid;width:26px;height:26px;place-items:center;border-radius:7px;background:var(--ink);color:#fff;font-family:Georgia,serif;font-size:17px}.side nav{margin-top:52px}.side-label{margin:0 0 12px;color:var(--faint);font-size:11px;font-weight:650;letter-spacing:.08em;text-transform:uppercase}.side a.page{display:block;padding:7px 0;color:var(--muted);font-size:13px;text-decoration:none;transition:color 150ms ease}.side a.page:hover{color:var(--ink)}.meta{margin-top:36px;padding-top:20px;border-top:1px solid var(--line);color:var(--faint);font-size:11px;line-height:1.6}.content{min-width:0}.page{padding-bottom:104px}.page+.page{padding-top:88px;border-top:1px solid var(--line)}.page-title{margin:0 0 48px;color:var(--faint);font-size:13px;font-weight:500}.section+.section{margin-top:72px}.section>h2{margin:0 0 26px;font-size:25px;letter-spacing:-.025em}.block+.block{margin-top:28px}.hero{padding:34px 0 60px}.eyebrow{margin:0 0 13px;color:var(--blue);font-size:14px;font-weight:650;letter-spacing:.005em}.hero h1{max-width:720px;margin:0;font-size:clamp(46px,8vw,74px);font-weight:700;letter-spacing:-.055em;line-height:.98}.subtitle{max-width:620px;margin:25px 0 0;color:var(--muted);font-size:21px;letter-spacing:-.015em;line-height:1.48}.prose{font-family:ui-serif,Georgia,Cambria,"Times New Roman",serif;font-size:18px;line-height:1.72}.prose h1,.prose h2,.prose h3,.prose h4{font-family:"SF Pro Display","Helvetica Neue",sans-serif;letter-spacing:-.025em;line-height:1.2}.prose h2{margin:48px 0 16px;font-size:28px}.prose h3{margin:38px 0 12px;font-size:21px}.prose p{margin:0 0 20px}.prose a{color:var(--blue);text-underline-offset:3px}.prose code{padding:2px 5px;border:1px solid #e4e4e7;border-radius:5px;background:#f7f7f8;font-family:"SFMono-Regular",Consolas,monospace;font-size:.82em}.prose blockquote{margin:28px 0;padding-left:20px;border-left:2px solid var(--ink);color:var(--muted)}.prose li+li{margin-top:7px}.checklist{display:grid;gap:12px;margin:0;padding:0;list-style:none}.checklist li{display:flex;align-items:flex-start;gap:12px;color:var(--ink);font-size:15px;line-height:1.5}.check{display:grid;flex:0 0 20px;width:20px;height:20px;margin-top:1px;place-items:center;border:1px solid #c7c7cc;border-radius:6px;color:#fff;font-size:12px;font-weight:700}.checklist .checked{color:var(--faint);text-decoration:line-through;text-decoration-color:#c7c7cc}.checked .check{border-color:var(--ink);background:var(--ink)}.code{overflow:hidden;margin:0;border:1px solid #2b2b2f;border-radius:13px;background:#18181b;box-shadow:0 14px 35px rgba(0,0,0,.09)}.code figcaption{display:flex;justify-content:space-between;padding:11px 15px;border-bottom:1px solid #303034;color:#c7c7cc;font-size:11px}.code-kind{color:#71717a;text-transform:uppercase;letter-spacing:.08em}.code pre{overflow:auto;margin:0;padding:20px;color:#e4e4e7;font:12px/1.7 "SFMono-Regular",Consolas,monospace}.table-wrap{overflow-x:auto;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:14px 12px;border-bottom:1px solid var(--line);font-size:13px}th{color:var(--faint);font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}tbody tr:last-child td{border-bottom:0}.callout{display:flex;gap:14px;padding:18px 20px;border-radius:12px;background:var(--surface);font-size:14px;line-height:1.5}.callout-mark{flex:0 0 3px;border-radius:3px;background:#8e8e93}.callout.success .callout-mark{background:#34c759}.callout.warning .callout-mark{background:#ff9f0a}.callout.danger .callout-mark{background:#ff3b30}.callout.info .callout-mark{background:#007aff}.callout p{margin:3px 0 0;color:var(--muted)}.image{margin:0}.image img{display:block;width:100%;border-radius:13px}.image figcaption{margin-top:10px;color:var(--faint);font-size:12px}.metric{padding:28px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.metric p{margin:0 0 10px;color:var(--faint);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}.metric strong{display:block;font-size:43px;letter-spacing:-.04em}.metric span{display:block;margin-top:8px;color:var(--muted);font-size:13px}hr{height:1px;margin:42px 0;border:0;background:var(--line)}.spacer.small{height:16px}.spacer.medium{height:40px}.spacer.large{height:76px}.footer{padding-top:36px;border-top:1px solid var(--line);color:var(--faint);font-size:11px}.block{animation:enter 650ms var(--ease) both}.block:nth-child(2){animation-delay:45ms}.block:nth-child(3){animation-delay:80ms}@keyframes enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:800px){.shell{display:block;width:min(100% - 36px,760px);padding-top:26px}.side{position:static;display:flex;align-items:center;justify-content:space-between;margin-bottom:58px}.side nav,.meta{display:none}.hero{padding-top:8px}.page{padding-bottom:78px}.hero h1{font-size:48px}.subtitle{font-size:18px}.prose{font-size:17px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.block{animation:fade 180ms ease both}@keyframes fade{from{opacity:0}to{opacity:1}}}
`;

function renderHtml(document: BriefDocument): string {
  const nav = document.pages
    .map(
      (page) =>
        `<a class="page" href="#page-${escapeHtml(page.slug)}">${escapeHtml(page.title)}</a>`,
    )
    .join("");
  const pages = document.pages
    .map(
      (page, pageIndex) =>
        `<article class="page" id="page-${escapeHtml(page.slug)}">${pageIndex > 0 ? `<p class="page-title">${escapeHtml(page.title)}</p>` : ""}${page.sections.map((section) => `<section class="section" id="${escapeHtml(section.id)}">${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}${section.blocks.map((block) => `<div class="block">${blockToHtml(block)}</div>`).join("")}</section>`).join("")}</article>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(document.title)} — Brief</title>${document.description ? `<meta name="description" content="${escapeHtml(document.description)}">` : ""}<style>${reportStyles}</style></head><body><div class="shell"><aside class="side"><a class="wordmark" href="/"><span class="mark">B</span>Brief</a><nav><p class="side-label">Pages</p>${nav}</nav><p class="meta">Updated ${escapeHtml(new Date(document.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}<br>Version ${document.version}</p></aside><main class="content">${pages}<footer class="footer">Published with Brief</footer></main></div></body></html>`;
}

function renderMarkdown(document: BriefDocument): string {
  return document.pages
    .map(
      (page) =>
        `# ${page.title}\n\n${page.sections.map((section) => `${section.title ? `## ${section.title}\n\n` : ""}${section.blocks.map(blockToMarkdown).filter(Boolean).join("\n\n")}`).join("\n\n")}`,
    )
    .join("\n\n---\n\n");
}

function renderText(document: BriefDocument): string {
  return document.pages
    .map(
      (page) =>
        `${page.title.toUpperCase()}\n\n${page.sections.map((section) => `${section.title ? `${section.title}\n\n` : ""}${section.blocks.map(blockToText).filter(Boolean).join("\n\n")}`).join("\n\n")}`,
    )
    .join("\n\n────────\n\n");
}

export function renderBrief(document: BriefDocument, contentType: BriefContentType): RenderedBrief {
  if (contentType === "text/html") return { contentType, body: renderHtml(document) };
  if (contentType === "text/markdown") return { contentType, body: renderMarkdown(document) };
  if (contentType === "text/plain") return { contentType, body: renderText(document) };
  if (contentType === "application/json") {
    return { contentType, body: JSON.stringify({ data: document }, null, 2) };
  }
  return { contentType, body: JSON.stringify(document, null, 2) };
}
