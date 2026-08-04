import { streamingMarkdownExtension } from "@tanstack/markdown/extensions/streaming";
import { parseMarkdown } from "@tanstack/markdown/parser";

export function parseBriefMarkdown(source: string, profile?: "streaming") {
  return parseMarkdown(source, {
    headingIds: true,
    ...(profile === "streaming" ? { extensions: [streamingMarkdownExtension()] } : {}),
  });
}
