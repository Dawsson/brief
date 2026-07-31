import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";

import { authenticationError, apiErrors, procedure } from "../../../procedure";
import { requireUser } from "../../auth-middleware";
import type { UserRecord } from "../../model";
import { emptyInputSchema, publicUser, userSchema } from "../../schemas";
import type { BriefServices } from "../../services";

const registerInput = z.object({ email: z.email(), inviteToken: z.string().nullable().optional() });
const flowInput = z.object({ flowId: z.string().min(1), response: z.unknown() });
const authenticateInput = z.object({ email: z.email() });
const deviceTokenInput = z.object({ deviceCode: z.string().min(1) });
const devicePathInput = z.object({ userCode: z.string().min(1) });
const passkeyOptionsOutput = z.object({ flowId: z.string(), options: z.unknown() });
const deviceStatusOutput = z.object({ data: z.object({ status: z.string() }) });

const secureCookie = (origin: string) => new URL(origin).protocol === "https:";

export const registrationOptions = procedure
  .POST("/v1/auth/register/options")
  .input(registerInput)
  .output({ 200: passkeyOptionsOutput })
  .openapi({ summary: "Begin passkey registration", tags: ["Authentication"] })
  .handler(async ({ ctx, input }) => {
    try {
      return await ctx.services.auth.registrationOptions(input);
    } catch (cause) {
      authenticationError(cause);
    }
  });

export const registrationVerify = procedure
  .POST("/v1/auth/register/verify")
  .input(flowInput)
  .output({ 201: z.object({ data: userSchema }) })
  .openapi({ summary: "Complete passkey registration", tags: ["Authentication"] })
  .handler(async ({ ctx, input, res }) => {
    try {
      const result = await ctx.services.auth.verifyRegistration(
        input.flowId,
        input.response as RegistrationResponseJSON,
      );
      const token = await ctx.services.auth.createSession(result.user);
      res.cookie("brief_session", token, {
        httpOnly: true,
        maxAge: "30d",
        path: "/",
        sameSite: "lax",
        secure: secureCookie(ctx.services.authOrigin),
      });
      return res.created({ data: publicUser(result.user) });
    } catch (cause) {
      authenticationError(cause);
    }
  });

export const authenticationOptions = procedure
  .POST("/v1/auth/authenticate/options")
  .input(authenticateInput)
  .output({ 200: passkeyOptionsOutput })
  .openapi({ summary: "Begin passkey authentication", tags: ["Authentication"] })
  .handler(async ({ ctx, input }) => {
    try {
      return await ctx.services.auth.authenticationOptions(input.email);
    } catch (cause) {
      authenticationError(cause);
    }
  });

export const authenticationVerify = procedure
  .POST("/v1/auth/authenticate/verify")
  .input(flowInput)
  .output({ 200: z.object({ data: userSchema }) })
  .openapi({ summary: "Complete passkey authentication", tags: ["Authentication"] })
  .handler(async ({ ctx, input, res }) => {
    try {
      const user = await ctx.services.auth.verifyAuthentication(
        input.flowId,
        input.response as AuthenticationResponseJSON,
      );
      const token = await ctx.services.auth.createSession(user);
      res.cookie("brief_session", token, {
        httpOnly: true,
        maxAge: "30d",
        path: "/",
        sameSite: "lax",
        secure: secureCookie(ctx.services.authOrigin),
      });
      return { data: publicUser(user) };
    } catch (cause) {
      authenticationError(cause);
    }
  });

export const session = procedure
  .use(requireUser)
  .GET("/v1/auth/session")
  .input(emptyInputSchema)
  .output({ 200: z.object({ data: userSchema }) })
  .openapi({ summary: "Read the current session", tags: ["Authentication"] })
  .handler(({ ctx }) => ({ data: publicUser(ctx.user) }));

export const deviceCode = procedure
  .POST("/v1/auth/device/code")
  .output({
    201: z.object({
      data: z.object({
        deviceCode: z.string(),
        expiresIn: z.number(),
        interval: z.number(),
        userCode: z.string(),
        verificationUri: z.string(),
      }),
    }),
  })
  .openapi({ summary: "Create a device authorization", tags: ["Authentication"] })
  .handler(async ({ ctx, res }) =>
    res.created({ data: await ctx.services.auth.createDeviceAuthorization() }),
  );

export const deviceToken = procedure
  .POST("/v1/auth/device/token")
  .input(deviceTokenInput)
  .output({
    200: z.object({
      data: z.object({ token: z.string(), tokenType: z.literal("Bearer"), user: userSchema }),
    }),
    202: z.object({ data: z.object({ interval: z.number(), status: z.literal("pending") }) }),
  })
  .openapi({ summary: "Exchange a device code", tags: ["Authentication"] })
  .handler(async ({ ctx, input, res }) => {
    const result = await ctx.services.auth.exchangeDeviceCode(input.deviceCode);
    if (result.status === "pending") {
      return res.accepted({ data: { interval: result.intervalSeconds, status: result.status } });
    }
    if (result.status === "denied") {
      throw apiErrors.FORBIDDEN({ detail: "Device authorization was denied" });
    }
    if (result.status === "consumed") {
      throw apiErrors.DEVICE_CODE_CONSUMED({ detail: "This device code was already used" });
    }
    if (result.status === "expired") {
      throw apiErrors.DEVICE_CODE_EXPIRED({ detail: "This device code is invalid or expired" });
    }
    return {
      data: {
        token: result.token,
        tokenType: "Bearer" as const,
        user: publicUser(result.user),
      },
    };
  });

export const deviceAuthorization = procedure
  .use(requireUser)
  .GET("/v1/auth/device/:userCode")
  .input(devicePathInput)
  .output({
    200: z.object({
      data: z.object({ expiresAt: z.string(), status: z.string(), userCode: z.string() }),
    }),
  })
  .openapi({ summary: "Read a device authorization", tags: ["Authentication"] })
  .handler(async ({ ctx, input }) => {
    const authorization = await ctx.services.auth.getDeviceAuthorization(input.userCode);
    if (!authorization) throw apiErrors.NOT_FOUND({ detail: "Device code not found" });
    if (authorization.expiresAt <= new Date().toISOString()) {
      throw apiErrors.DEVICE_CODE_EXPIRED({ detail: "This device code has expired" });
    }
    return {
      data: {
        expiresAt: authorization.expiresAt,
        status: authorization.status,
        userCode: authorization.userCode,
      },
    };
  });

export const deviceApprove = procedure
  .use(requireUser)
  .POST("/v1/auth/device/:userCode/approve")
  .input(devicePathInput)
  .output({ 200: deviceStatusOutput })
  .openapi({ summary: "Approve a device authorization", tags: ["Authentication"] })
  .handler(async ({ ctx, input }) => decideDevice(ctx, input.userCode, "approve"));

export const deviceDeny = procedure
  .use(requireUser)
  .POST("/v1/auth/device/:userCode/deny")
  .input(devicePathInput)
  .output({ 200: deviceStatusOutput })
  .openapi({ summary: "Deny a device authorization", tags: ["Authentication"] })
  .handler(async ({ ctx, input }) => decideDevice(ctx, input.userCode, "deny"));

async function decideDevice(
  ctx: { readonly services: BriefServices; readonly user: UserRecord },
  userCode: string,
  decision: "approve" | "deny",
) {
  const authorization = await ctx.services.auth.decideDeviceAuthorization(
    userCode,
    ctx.user,
    decision,
  );
  if (!authorization) throw apiErrors.NOT_FOUND({ detail: "Device code not found" });
  if (authorization.expiresAt <= new Date().toISOString()) {
    throw apiErrors.DEVICE_CODE_EXPIRED({ detail: "This device code has expired" });
  }
  const expectedStatus = decision === "approve" ? "approved" : "denied";
  if (authorization.status !== expectedStatus) {
    throw apiErrors.DEVICE_CODE_UNAVAILABLE({ detail: "This device code is no longer active" });
  }
  return { data: { status: authorization.status } };
}
