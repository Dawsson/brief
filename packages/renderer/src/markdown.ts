function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inline(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>');
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const output: string[] = [];
  let list: "ol" | "ul" | undefined;
  let paragraph: string[] = [];

  const closeList = () => {
    if (list) output.push(`</${list}>`);
    list = undefined;
  };
  const closeParagraph = () => {
    if (paragraph.length > 0) output.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    const quote = /^>\s?(.+)$/.exec(line);
    if (heading) {
      closeParagraph();
      closeList();
      output.push(`<h${heading[1]?.length}>${inline(heading[2] ?? "")}</h${heading[1]?.length}>`);
    } else if (unordered || ordered) {
      closeParagraph();
      const nextList = unordered ? "ul" : "ol";
      if (list !== nextList) {
        closeList();
        list = nextList;
        output.push(`<${list}>`);
      }
      output.push(`<li>${inline((unordered?.[1] ?? ordered?.[1]) || "")}</li>`);
    } else if (quote) {
      closeParagraph();
      closeList();
      output.push(`<blockquote>${inline(quote[1] ?? "")}</blockquote>`);
    } else if (line.trim() === "") {
      closeParagraph();
      closeList();
    } else {
      paragraph.push(line.trim());
    }
  }
  closeParagraph();
  closeList();
  return output.join("\n");
}

export function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/^```[^\n]*\n?|```$/g, ""))
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/^>\s?/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

export { escapeHtml };
