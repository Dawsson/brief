import type { BlockNode, InlineNode, MarkdownDocument } from "@tanstack/markdown";
import { renderHtml } from "@tanstack/markdown/html";
import type { MarkdownBlock } from "@brief/core";
import { highlightMarkdownCode } from "./highlight";

export function markdownSource(block: MarkdownBlock): string {
  return block.source;
}

export function markdownDocument(block: MarkdownBlock): MarkdownDocument {
  return block.document;
}

export function markdownToHtml(block: MarkdownBlock): string {
  return renderHtml(markdownDocument(block), { highlighter: highlightMarkdownCode });
}

function inlineText(node: InlineNode): string {
  if ("value" in node) return node.value;
  if (node.type === "image") return node.alt;
  if (node.type === "break") return "\n";
  if ("children" in node) return node.children.map(inlineText).join("");
  return "";
}

function blockText(node: BlockNode): string {
  if (node.type === "code" || node.type === "html") return node.value;
  if (node.type === "thematicBreak") return "────────";
  if (node.type === "table") {
    return [node.header, ...node.rows]
      .map((row) => row.map((cell) => cell.children.map(inlineText).join("")).join("\t"))
      .join("\n");
  }
  if (node.type === "footnotes") {
    return node.items.flatMap((item) => item.children.map(blockText)).join("\n");
  }
  if (node.type === "list") {
    return node.items.map((item) => item.children.map(blockText).join("\n")).join("\n");
  }
  if ("children" in node) {
    return node.children
      .map((child) =>
        "type" in child && child.type === "paragraph"
          ? blockText(child)
          : "children" in child || "value" in child
            ? inlineText(child as InlineNode)
            : blockText(child as BlockNode),
      )
      .join("");
  }
  return "";
}

export function markdownToText(block: MarkdownBlock): string {
  return markdownDocument(block).children.map(blockText).filter(Boolean).join("\n\n").trim();
}
