import type { BlockNode, InlineNode, MarkdownDocument } from "@tanstack/markdown";
import { streamingMarkdownExtension } from "@tanstack/markdown/extensions/streaming";
import { renderHtml } from "@tanstack/markdown/html";
import { parseMarkdown } from "@tanstack/markdown/parser";
import type { LegacyMarkdownBlock, MarkdownBlock } from "@brief/core";
import { highlightMarkdownCode } from "./highlight";

type AnyMarkdownBlock = MarkdownBlock | LegacyMarkdownBlock;

export function markdownSource(block: AnyMarkdownBlock): string {
  return "source" in block ? block.source : block.content;
}

export function markdownDocument(block: AnyMarkdownBlock): MarkdownDocument {
  if ("document" in block) return block.document;
  return parseMarkdown(block.content, { headingIds: true });
}

export function markdownToHtml(block: AnyMarkdownBlock): string {
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

export function markdownToText(block: AnyMarkdownBlock): string {
  return markdownDocument(block).children.map(blockText).filter(Boolean).join("\n\n").trim();
}

export function parseStreamingMarkdown(source: string): MarkdownDocument {
  return parseMarkdown(source, { extensions: [streamingMarkdownExtension()], headingIds: true });
}
