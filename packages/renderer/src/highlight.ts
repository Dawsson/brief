import { createHighlighter } from "@tanstack/highlight/core";
import { js } from "@tanstack/highlight/languages/js";
import { json } from "@tanstack/highlight/languages/json";
import { markdown } from "@tanstack/highlight/languages/markdown";
import { plaintext } from "@tanstack/highlight/languages/plaintext";
import { shell } from "@tanstack/highlight/languages/shell";
import { sql } from "@tanstack/highlight/languages/sql";
import { ts } from "@tanstack/highlight/languages/ts";
import { tsx } from "@tanstack/highlight/languages/tsx";
import { yaml } from "@tanstack/highlight/languages/yaml";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";

export const highlighter = createHighlighter({
  languages: [plaintext, shell, js, json, markdown, sql, ts, tsx, yaml],
});

export const highlightMarkdownCode = createTanStackMarkdownHighlighter(highlighter);
