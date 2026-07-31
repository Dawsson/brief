import type { BriefBlock, BriefDocument, Primitive } from "@brief/core";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";
import { escapeHtml, markdownToHtml, markdownToText } from "./markdown";
import type { BriefContentType } from "./content-types";

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

export interface RenderedBrief {
  body: string;
  contentType: BriefContentType;
}

function display(value: Primitive): string {
  if (value === null) return "—";
  return String(value);
}

function highlightCode(code: string, language?: string): string {
  const requested = language?.trim().toLowerCase() || "plaintext";
  const normalized = languageAliases[requested] ?? requested;
  if (!hljs.getLanguage(normalized)) return escapeHtml(code);
  return hljs.highlight(code, { language: normalized, ignoreIllegals: true }).value;
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
      const highlighted =
        block.type === "code" ? highlightCode(content, block.language) : escapeHtml(content);
      return `<figure class="code" id="${id}"><figcaption><span>${escapeHtml(label)}</span><span class="code-kind">${block.type}</span></figcaption><pre><code class="hljs">${highlighted}</code></pre></figure>`;
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
:root{color-scheme:light;--canvas:#f7f7f4;--ink:#20211f;--body:#363733;--muted:#747570;--faint:#969792;--line:rgba(32,33,31,.1);--surface:#eeeeea;--accent:#5d7082;--ease:cubic-bezier(.22,1,.36,1);font-family:InterVariable,Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-synthesis:none;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}html{background:var(--canvas);scroll-behavior:smooth;scroll-padding-top:32px}body{margin:0;color:var(--ink);background:var(--canvas)}.shell{position:relative;width:min(680px,calc(100% - 40px));margin:0 auto;padding:48px 0 88px}.side{position:fixed;top:44px;left:max(24px,calc(50% - 530px));width:176px}.wordmark{color:var(--ink);font-size:12px;font-weight:650;text-decoration:none;letter-spacing:-.01em}.side nav{margin-top:48px}.side-label{margin:0 0 14px;color:var(--ink);font-size:12.5px;font-weight:550;letter-spacing:-.015em}.page-links{border-left:1px solid var(--line);padding:3px 0}.side a.page{position:relative;display:block;padding:7px 0 7px 18px;color:var(--muted);font-size:12.5px;line-height:1.4;text-decoration:none;transition:color 140ms ease}.side a.page:first-of-type{color:var(--ink);font-weight:550}.side a.page:first-of-type::before{position:absolute;top:4px;bottom:4px;left:-2px;width:3px;border-radius:3px;background:var(--ink);content:""}.side a.page:hover{color:var(--ink)}.meta{margin:26px 0 0 18px;color:var(--faint);font-size:10px;line-height:1.6}.content{min-width:0;animation:content-enter 420ms var(--ease) both}.page{padding-bottom:60px}.page+.page{padding-top:58px;border-top:1px solid var(--line)}.page-title{margin:0 0 34px;color:var(--muted);font-size:12px;font-weight:600;letter-spacing:-.01em}.section+.section{margin-top:46px}.section>h2{margin:0 0 20px;font-size:19px;font-weight:650;letter-spacing:-.025em}.block+.block{margin-top:22px}.hero{padding:24px 0 44px}.eyebrow{margin:0 0 12px;color:var(--accent);font-size:12px;font-weight:600;letter-spacing:-.005em}.hero h1{max-width:650px;margin:0;font-size:clamp(42px,5.2vw,56px);font-weight:650;letter-spacing:-.048em;line-height:1.04}.subtitle{max-width:590px;margin:18px 0 0;color:var(--muted);font-size:17px;letter-spacing:-.018em;line-height:1.55}.prose{color:var(--body);font-size:15.5px;line-height:1.7;letter-spacing:-.006em}.prose h1,.prose h2,.prose h3,.prose h4{color:var(--ink);font-family:inherit;font-weight:650;letter-spacing:-.03em;line-height:1.25}.prose h1{margin:40px 0 14px;font-size:25px}.prose h2{margin:36px 0 12px;font-size:21px}.prose h3{margin:30px 0 10px;font-size:17px}.prose p{margin:0 0 16px}.prose strong{font-weight:650}.prose ul,.prose ol{margin:16px 0;padding-left:21px}.prose li+li{margin-top:5px}.prose a{color:inherit;text-decoration-color:#a5a6a1;text-decoration-thickness:1px;text-underline-offset:3px}.prose a:hover{text-decoration-color:var(--ink)}.prose code{padding:2px 5px;border:1px solid var(--line);border-radius:4px;background:var(--surface);font-family:"SFMono-Regular",Consolas,monospace;font-size:.82em}.prose blockquote{margin:24px 0;padding:2px 0 2px 16px;border-left:2px solid #babbb6;color:var(--muted)}.checklist{display:grid;gap:9px;margin:0;padding:0;list-style:none}.checklist li{display:flex;align-items:flex-start;gap:10px;color:var(--body);font-size:14px;line-height:1.5}.check{display:grid;flex:0 0 18px;width:18px;height:18px;margin-top:1px;place-items:center;border:1px solid #b8b9b4;border-radius:5px;color:var(--canvas);font-size:10px;font-weight:700}.checklist .checked{color:var(--faint);text-decoration:line-through;text-decoration-color:#c5c6c1}.checked .check{border-color:var(--ink);background:var(--ink)}.code{overflow:hidden;margin:0;border:1px solid #292a27;border-radius:10px;background:#1c1d1b}.code figcaption{display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #30312e;color:#c4c5c0;font-size:10px}.code-kind{color:#777873;text-transform:uppercase;letter-spacing:.08em}.code pre{overflow:auto;margin:0;padding:18px;color:#e5e5e1;font:11.5px/1.7 "SFMono-Regular",Consolas,monospace}.code pre code{display:block}.hljs-comment,.hljs-quote{color:#80817c}.hljs-keyword,.hljs-selector-tag,.hljs-subst{color:#d9a0a8}.hljs-string,.hljs-doctag,.hljs-regexp{color:#aac79b}.hljs-number,.hljs-literal,.hljs-variable,.hljs-template-variable{color:#9ebad1}.hljs-title,.hljs-title.class_,.hljs-title.function_{color:#d1bd91}.hljs-built_in,.hljs-type,.hljs-attribute{color:#b7acd6}.hljs-meta,.hljs-symbol,.hljs-bullet{color:#c1a77d}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}.table-wrap{overflow-x:auto;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:12px 10px;border-bottom:1px solid var(--line);font-size:12.5px}th{color:var(--faint);font-size:9.5px;font-weight:650;letter-spacing:.08em;text-transform:uppercase}tbody tr:last-child td{border-bottom:0}.callout{display:flex;gap:12px;padding:15px 16px;border:1px solid rgba(32,33,31,.04);border-radius:9px;background:var(--surface);font-size:13.5px;line-height:1.55}.callout-mark{flex:0 0 2px;border-radius:2px;background:#90918c}.callout.success .callout-mark{background:#66806a}.callout.warning .callout-mark{background:#a67b47}.callout.danger .callout-mark{background:#a55e58}.callout.info .callout-mark{background:var(--accent)}.callout p{margin:2px 0 0;color:var(--muted)}.image{margin:0}.image img{display:block;width:100%;border:1px solid var(--line);border-radius:10px}.image figcaption{margin-top:8px;color:var(--faint);font-size:11px}.metric{display:grid;grid-template-areas:"label value" "detail value";grid-template-columns:1fr auto;align-items:end;column-gap:32px;row-gap:4px;padding:20px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.metric p{grid-area:label;margin:0;color:var(--faint);font-size:9.5px;font-weight:650;text-transform:uppercase;letter-spacing:.1em}.metric strong{grid-area:value;display:block;font-size:34px;font-weight:620;letter-spacing:-.045em;line-height:1}.metric span{grid-area:detail;display:block;color:var(--muted);font-size:11.5px}hr{height:1px;margin:34px 0;border:0;background:var(--line)}.spacer.small{height:12px}.spacer.medium{height:28px}.spacer.large{height:52px}.footer{padding-top:28px;border-top:1px solid var(--line);color:var(--faint);font-size:10px}@keyframes content-enter{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:1040px){.shell{padding-top:28px}.side{position:static;display:flex;width:auto;align-items:center;justify-content:space-between;margin-bottom:34px}.side nav{max-width:66%;margin:0}.page-links{display:flex;gap:16px;overflow-x:auto;border:0;padding:0}.side-label,.meta{display:none}.side a.page{padding:5px 0;white-space:nowrap}.side a.page:first-of-type::before{display:none}.content{animation-duration:320ms}}
@media(max-width:640px){.shell{width:calc(100% - 32px);padding:20px 0 64px}.side{margin-bottom:26px}.side nav{gap:12px}.hero{padding:16px 0 34px}.hero h1{font-size:38px;letter-spacing:-.042em}.subtitle{margin-top:15px;font-size:16px}.page{padding-bottom:48px}.page+.page{padding-top:46px}.page-title{margin-bottom:28px}.section+.section{margin-top:38px}.section>h2{font-size:18px}.prose{font-size:15px;line-height:1.68}.metric strong{font-size:29px}.spacer.large{height:40px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.content{animation:none}}
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="theme-color" content="#f7f7f4"><title>${escapeHtml(document.title)} — Brief</title>${document.description ? `<meta name="description" content="${escapeHtml(document.description)}">` : ""}<link rel="preconnect" href="https://rsms.me"><link rel="stylesheet" href="https://rsms.me/inter/inter.css"><style>${reportStyles}</style></head><body><div class="shell"><aside class="side"><a class="wordmark" href="/">Brief</a><nav><p class="side-label">On this page</p><div class="page-links">${nav}</div></nav><p class="meta">Updated ${escapeHtml(new Date(document.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}<br>Version ${document.version}</p></aside><main class="content">${pages}<footer class="footer">Published with Brief</footer></main></div></body></html>`;
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
