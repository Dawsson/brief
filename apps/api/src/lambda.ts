import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import {
  handle,
  type APIGatewayProxyResult,
  type LambdaContext,
  type LambdaEvent,
} from "hono/aws-lambda";
import { createApp } from "./app";

const api = handle(createApp());

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

interface StaticTarget {
  file: string;
  site: "admin" | "docs" | "web";
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

function notFound(): APIGatewayProxyResult {
  return {
    statusCode: 404,
    isBase64Encoded: false,
    body: "Not found",
    headers: { "content-type": "text/plain; charset=utf-8" },
  };
}

async function serveStatic(rawPath: string): Promise<APIGatewayProxyResult | undefined> {
  const target = staticTarget(rawPath);
  if (!target) return undefined;

  const root = resolve(process.env.LAMBDA_TASK_ROOT ?? process.cwd(), "static", target.site);
  const file = resolve(root, target.file);
  if (file !== root && !file.startsWith(`${root}${sep}`)) return notFound();

  try {
    const body = await readFile(file);
    const extension = extname(file).toLowerCase();
    return {
      statusCode: 200,
      isBase64Encoded: true,
      body: body.toString("base64"),
      headers: {
        "cache-control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
        "content-type": contentTypes[extension] ?? "application/octet-stream",
        "x-content-type-options": "nosniff",
      },
    };
  } catch (cause) {
    const code = cause instanceof Error && "code" in cause ? cause.code : undefined;
    if (code === "ENOENT") return notFound();
    throw cause;
  }
}

export async function handler(
  event: LambdaEvent,
  context?: LambdaContext,
): Promise<APIGatewayProxyResult> {
  const staticResponse = "rawPath" in event ? await serveStatic(event.rawPath) : undefined;
  return staticResponse ?? api(event, context);
}
