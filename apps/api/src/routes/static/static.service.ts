import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const contentTypes: Readonly<Record<string, string>> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

type StaticTarget = {
  readonly file: string;
  readonly site: "admin" | "docs" | "web";
};

export async function serveStaticPath(rawPath: string): Promise<Response | undefined> {
  const target = staticTarget(rawPath);
  const taskRoot = process.env.LAMBDA_TASK_ROOT;
  if (!target || !taskRoot) return undefined;

  const root = resolve(taskRoot, "static", target.site);
  const file = resolve(root, target.file);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const body = await readFile(file);
    const extension = extname(file).toLowerCase();
    return new Response(body, {
      headers: {
        "cache-control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
        "content-type": contentTypes[extension] ?? "application/octet-stream",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (cause) {
    const code = cause instanceof Error && "code" in cause ? cause.code : undefined;
    if (code === "ENOENT") return new Response("Not found", { status: 404 });
    throw cause;
  }
}

function staticTarget(rawPath: string): StaticTarget | undefined {
  if (rawPath === "/") return { file: "index.html", site: "web" };
  if (rawPath.startsWith("/assets/")) return { file: rawPath.slice(1), site: "web" };

  for (const site of ["admin", "docs"] as const) {
    const prefix = `/${site}`;
    if (rawPath !== prefix && !rawPath.startsWith(`${prefix}/`)) continue;
    const relativePath = rawPath.slice(prefix.length).replace(/^\//, "");
    return {
      file: relativePath && extname(relativePath) ? relativePath : "index.html",
      site,
    };
  }
  return undefined;
}
