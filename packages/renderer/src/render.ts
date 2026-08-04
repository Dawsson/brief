import type { BriefBlock, BriefDocument, Primitive } from "@brief/core";
import { renderHtml } from "./html";
import { markdownSource, markdownToText } from "./markdown";
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
      return markdownSource(block);
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
  if (block.type === "markdown") return markdownToText(block);
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
