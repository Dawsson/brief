import { applyOperations, BRIEF_SCHEMA_VERSION, type BriefDocument } from "@brief/core";
import { briefContentTypes, negotiateContentType, renderBrief } from "@brief/renderer";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { AuthService } from "./auth";
import { randomToken, hashToken } from "./crypto";
import { DynamoRepository } from "./dynamo-repository";
import type { InviteRecord, UserRecord } from "./model";
import { MemoryRepository, type Repository } from "./repository";
import { LocalStorageService, S3StorageService, type StorageService } from "./storage";

interface Bindings {
  Variables: { user: UserRecord };
}

export interface CreateAppOptions {
  adminEmail?: string;
  appOrigin?: string;
  bucketName?: string;
  repository?: Repository;
  rpId?: string;
  storage?: StorageService;
  tableName?: string;
}

const registerInput = z.object({ email: z.email(), inviteToken: z.string().nullable().optional() });
const flowInput = z.object({ flowId: z.string().min(1), response: z.unknown() });
const authenticateInput = z.object({ email: z.email() });
const inviteInput = z.object({ email: z.email(), role: z.enum(["admin", "user"]).default("user") });
const uploadInput = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(120),
});
const updateInput = z.object({
  expectedVersion: z.number().int().nonnegative(),
  operations: z.array(z.unknown()).max(100),
});

function isBriefDocument(value: unknown): value is BriefDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BriefDocument>;
  return (
    candidate.schemaVersion === BRIEF_SCHEMA_VERSION &&
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.pages)
  );
}

function error(
  context: Context,
  status: 400 | 401 | 403 | 404 | 409 | 410 | 422,
  code: string,
  message: string,
) {
  return context.json({ error: { code, message } }, status);
}

function publicUrl(context: Context, key: string): string {
  return `${new URL(context.req.url).origin}/v1/storage/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function createApp(options: CreateAppOptions = {}) {
  const tableName = options.tableName ?? process.env.BRIEF_TABLE;
  const bucketName = options.bucketName ?? process.env.BRIEF_BUCKET;
  const repository =
    options.repository ?? (tableName ? new DynamoRepository(tableName) : new MemoryRepository());
  const storage: StorageService =
    options.storage ?? (bucketName ? new S3StorageService(bucketName) : new LocalStorageService());
  const appOrigin = options.appOrigin ?? process.env.BRIEF_APP_ORIGIN ?? "http://localhost:5174";
  const rpId = options.rpId ?? process.env.BRIEF_RP_ID ?? new URL(appOrigin).hostname;
  const auth = new AuthService(repository, {
    adminEmail: options.adminEmail ?? process.env.BRIEF_ADMIN_EMAIL ?? "hello@dawson.gg",
    origin: appOrigin,
    rpId,
    rpName: "Brief",
  });
  const app = new Hono<Bindings>();
  const allowedOrigins = new Set([
    appOrigin,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ]);

  app.use(
    "*",
    cors({
      origin: (origin) => (allowedOrigins.has(origin) ? origin : appOrigin),
      allowHeaders: ["authorization", "content-type", "accept"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
      credentials: true,
      exposeHeaders: ["content-type", "etag", "vary"],
    }),
  );

  const requireUser = async (context: Context<Bindings>, next: Next) => {
    const user = await auth.resolveUser(context);
    if (!user) return error(context, 401, "unauthorized", "Authentication required");
    context.set("user", user);
    await next();
  };
  const requireAdmin = async (context: Context<Bindings>, next: Next) => {
    const user = await auth.resolveUser(context);
    if (!user) return error(context, 401, "unauthorized", "Authentication required");
    if (user.role !== "admin") return error(context, 403, "forbidden", "Admin access required");
    context.set("user", user);
    await next();
  };

  app.get("/", (context) => context.json({ name: "Brief API", version: "v1", status: "ok" }));
  app.get("/healthz", (context) => context.json({ status: "ok" }));

  app.post("/v1/auth/register/options", async (context) => {
    const input = registerInput.parse(await context.req.json());
    return context.json(await auth.registrationOptions(input));
  });
  app.post("/v1/auth/register/verify", async (context) => {
    const input = flowInput.parse(await context.req.json());
    const result = await auth.verifyRegistration(
      input.flowId,
      input.response as RegistrationResponseJSON,
    );
    await auth.createSession(context, result.user);
    return context.json({ data: result.user, apiToken: result.apiToken }, 201);
  });
  app.post("/v1/auth/authenticate/options", async (context) => {
    const input = authenticateInput.parse(await context.req.json());
    return context.json(await auth.authenticationOptions(input.email));
  });
  app.post("/v1/auth/authenticate/verify", async (context) => {
    const input = flowInput.parse(await context.req.json());
    const user = await auth.verifyAuthentication(
      input.flowId,
      input.response as AuthenticationResponseJSON,
    );
    await auth.createSession(context, user);
    return context.json({ data: user });
  });

  app.get("/b/:id", async (context) => servePublicBrief(context, repository));
  app.get("/b/:id/:secret", async (context) => servePublicBrief(context, repository));

  app.get("/v1/storage/assets/*", async (context) => {
    const key = context.req.path
      .slice("/v1/storage/assets/".length)
      .split("/")
      .map(decodeURIComponent)
      .join("/");
    const asset = await storage.get(key);
    if (!asset) return error(context, 404, "not_found", "Asset not found");
    return new Response(asset.body, {
      headers: {
        "content-type": asset.contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  });

  app.use("/v1/briefs/*", requireUser);
  app.use("/v1/briefs", requireUser);
  app.get("/v1/briefs", async (context) => {
    const user = context.get("user");
    return context.json({ data: await repository.listBriefs(user.id) });
  });
  app.post("/v1/briefs", async (context) => {
    const body = await context.req.json<{ document?: unknown }>();
    if (!isBriefDocument(body.document))
      return error(context, 422, "invalid_document", "A canonical Brief document is required");
    if (await repository.getBrief(body.document.id))
      return error(context, 409, "already_exists", "This Brief already exists");
    const user = context.get("user");
    const now = new Date().toISOString();
    const document: BriefDocument = {
      ...structuredClone(body.document),
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
      version: 1,
      ...(body.document.visibility === "secret" && !body.document.secret
        ? { secret: randomToken("share") }
        : {}),
    };
    await repository.putBrief(document);
    return context.json({ data: document }, 201);
  });
  app.get("/v1/briefs/:id", async (context) => {
    const document = await repository.getBrief(context.req.param("id"));
    if (!document) return error(context, 404, "not_found", "Brief not found");
    if (document.ownerId !== context.get("user").id && context.get("user").role !== "admin")
      return error(context, 403, "forbidden", "You do not own this Brief");
    return context.json({ data: document });
  });
  app.patch("/v1/briefs/:id", async (context) => {
    const input = updateInput.parse(await context.req.json());
    const document = await repository.getBrief(context.req.param("id"));
    if (!document) return error(context, 404, "not_found", "Brief not found");
    if (document.ownerId !== context.get("user").id && context.get("user").role !== "admin")
      return error(context, 403, "forbidden", "You do not own this Brief");
    if (document.version !== input.expectedVersion)
      return error(
        context,
        409,
        "version_conflict",
        `Expected version ${input.expectedVersion}, found ${document.version}`,
      );
    const updated = applyOperations(
      document,
      input.operations as Parameters<typeof applyOperations>[1],
    );
    if (updated.visibility === "secret" && !updated.secret) updated.secret = randomToken("share");
    await repository.putBrief(updated);
    return context.json({ data: updated });
  });
  app.delete("/v1/briefs/:id", async (context) => {
    const document = await repository.getBrief(context.req.param("id"));
    if (!document) return error(context, 404, "not_found", "Brief not found");
    if (document.ownerId !== context.get("user").id && context.get("user").role !== "admin")
      return error(context, 403, "forbidden", "You do not own this Brief");
    await repository.deleteBrief(document.id);
    return context.body(null, 204);
  });

  app.use("/v1/storage/uploads", requireUser);
  app.post("/v1/storage/uploads", async (context) => {
    const input = uploadInput.parse(await context.req.json());
    const target = await storage.createUpload(
      { ...input, ownerId: context.get("user").id },
      new URL(context.req.url).origin,
    );
    return context.json({ data: { ...target, url: publicUrl(context, target.key) } }, 201);
  });
  app.put("/v1/storage/local/*", requireUser, async (context) => {
    if (!storage.putLocal) return error(context, 404, "not_found", "Local uploads are disabled");
    const key = context.req.path.slice("/v1/storage/local/".length);
    if (!key.startsWith(`${context.get("user").id}/`))
      return error(context, 403, "forbidden", "Invalid storage key");
    await storage.putLocal(
      key,
      new Uint8Array(await context.req.arrayBuffer()),
      context.req.header("content-type") ?? "application/octet-stream",
    );
    return context.body(null, 204);
  });

  app.use("/v1/invites", requireAdmin);
  app.post("/v1/invites", async (context) => {
    const input = inviteInput.parse(await context.req.json());
    const token = randomToken("invite");
    const now = new Date().toISOString();
    const invite: InviteRecord = {
      id: `inv_${crypto.randomUUID().replaceAll("-", "")}`,
      email: input.email.toLowerCase(),
      role: input.role,
      tokenHash: await hashToken(token),
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await repository.createInvite(invite);
    const { tokenHash: _, ...summary } = invite;
    return context.json({ data: summary, token }, 201);
  });

  app.use("/v1/admin/*", requireAdmin);
  app.get("/v1/admin/overview", async (context) => {
    const [users, invites, briefs, storageBytes] = await Promise.all([
      repository.listUsers(),
      repository.listInvites(),
      repository.listBriefs(),
      storage.bytesUsed(),
    ]);
    return context.json({
      users: users.map(({ apiTokenHash: _, ...user }) => user),
      invites: invites.map(({ tokenHash: _, ...invite }) => invite),
      briefs,
      storageBytes,
    });
  });

  app.notFound((context) => error(context, 404, "not_found", "Route not found"));
  app.onError((cause, context) => {
    console.error(cause);
    if (cause instanceof z.ZodError)
      return error(context, 422, "invalid_request", cause.issues[0]?.message ?? "Invalid request");
    if (cause instanceof Error && /invite|account|passkey|credential|flow/i.test(cause.message))
      return error(context, 400, "authentication_error", cause.message);
    return error(
      context,
      400,
      "request_failed",
      cause instanceof Error ? cause.message : "Request failed",
    );
  });
  return app;
}

async function servePublicBrief(context: Context, repository: Repository) {
  const id = context.req.param("id");
  if (!id) return error(context, 404, "not_found", "Brief not found");
  const document = await repository.getBrief(id);
  if (!document) return error(context, 404, "not_found", "Brief not found");
  if (document.expiresAt && document.expiresAt <= new Date().toISOString())
    return error(context, 410, "expired", "This share has expired");
  if (document.visibility === "private") return error(context, 404, "not_found", "Brief not found");
  if (document.visibility === "secret" && context.req.param("secret") !== document.secret)
    return error(context, 404, "not_found", "Brief not found");
  const contentType = negotiateContentType(context.req.header("accept") ?? null);
  if (!contentType) {
    return new Response(
      JSON.stringify({
        error: {
          code: "not_acceptable",
          message: `Supported types: ${briefContentTypes.join(", ")}`,
        },
      }),
      {
        status: 406,
        headers: { "content-type": "application/json", vary: "Accept" },
      },
    );
  }
  const rendered = renderBrief(document, contentType);
  return new Response(rendered.body, {
    headers: {
      "content-type": `${rendered.contentType}; charset=utf-8`,
      "cache-control":
        document.visibility === "public"
          ? "public, max-age=60, stale-while-revalidate=300"
          : "private, no-store",
      etag: `"${document.id}:${document.version}:${rendered.contentType}"`,
      vary: "Accept",
    },
  });
}
