import { procedure as pierProcedure } from "@pier/backend/builders";
import { createErrorFactories, platformErrors } from "@pier/backend/errors";
import { defaultErrors, error } from "@pier/backend/responses";

import type { BriefServices } from "./src/runtime/services";

const applicationErrorDefinitions = {
  ...platformErrors,
  ALREADY_EXISTS: { message: "Already exists", status: 409 },
  AUTHENTICATION_ERROR: { message: "Authentication failed", status: 400 },
  DEVICE_CODE_CONSUMED: { message: "Device code consumed", status: 409 },
  DEVICE_CODE_EXPIRED: { message: "Device code expired", status: 410 },
  DEVICE_CODE_UNAVAILABLE: { message: "Device code unavailable", status: 409 },
  INVALID_DOCUMENT: { message: "Invalid document", status: 422 },
  NOT_ACCEPTABLE: { message: "Not acceptable", status: 406 },
  REQUEST_FAILED: { message: "Request failed", status: 400 },
  VERSION_CONFLICT: { message: "Version conflict", status: 409 },
} as const;

const applicationErrors = {
  400: error({
    AUTHENTICATION_ERROR: { message: "Authentication failed" },
    REQUEST_FAILED: { message: "Request failed" },
  }),
  406: error({ NOT_ACCEPTABLE: { message: "Not acceptable" } }),
  409: error({
    ALREADY_EXISTS: { message: "Already exists" },
    DEVICE_CODE_CONSUMED: { message: "Device code consumed" },
    DEVICE_CODE_UNAVAILABLE: { message: "Device code unavailable" },
    VERSION_CONFLICT: { message: "Version conflict" },
  }),
  410: error({ DEVICE_CODE_EXPIRED: { message: "Device code expired" } }),
  422: error({ INVALID_DOCUMENT: { message: "Invalid document" } }),
} as const;

export const apiErrors = createErrorFactories(applicationErrorDefinitions);

export interface BriefContext {
  readonly services: BriefServices;
}

export const procedure = pierProcedure
  .$context<BriefContext>()
  .errors(defaultErrors)
  .errors(applicationErrors);

export function authenticationError(cause: unknown): never {
  const detail = cause instanceof Error ? cause.message : "Authentication failed";
  throw apiErrors.AUTHENTICATION_ERROR({ cause, detail });
}
