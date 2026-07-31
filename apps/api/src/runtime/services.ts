import type { InferEnv } from "@pier/backend/env";
import { Resource } from "sst";

import type envSchema from "../../env";
import { DynamoRepository } from "../data/dynamo-repository";
import { MemoryRepository, type Repository } from "../data/repository";
import { LocalStorageService, S3StorageService, type StorageService } from "../data/storage";
import { ApiKeyService } from "../routes/auth/api-keys.service";
import type { AuthConfiguration } from "../routes/auth/auth.types";
import { DeviceAuthorizationService } from "../routes/auth/device-authorization.service";
import { PasskeyService } from "../routes/auth/passkeys.service";
import { PrincipalService } from "../routes/auth/principal.service";
import { SessionService } from "../routes/auth/sessions.service";

export interface CreateTestServicesOptions {
  adminEmail?: string;
  appOrigin?: string;
  repository?: Repository;
  rpId?: string;
  storage?: StorageService;
}

export interface BriefServices {
  readonly auth: {
    readonly devices: DeviceAuthorizationService;
    readonly passkeys: PasskeyService;
    readonly principals: PrincipalService;
    readonly sessions: SessionService;
  };
  readonly authOrigin: string;
  readonly repository: Repository;
  readonly storage: StorageService;
}

type BriefEnv = InferEnv<typeof envSchema>;

export function createRuntimeServices(env: BriefEnv): BriefServices {
  return createServices({
    adminEmail: env.BRIEF_ADMIN_EMAIL,
    appOrigin: env.BRIEF_APP_ORIGIN,
    repository: new DynamoRepository(Resource.Database.name),
    rpId: env.BRIEF_RP_ID,
    storage: new S3StorageService(Resource.Storage.name),
  });
}

export function createTestServices(options: CreateTestServicesOptions = {}): BriefServices {
  const appOrigin = options.appOrigin ?? "http://localhost:5174";
  return createServices({
    adminEmail: options.adminEmail ?? "hello@dawson.gg",
    appOrigin,
    repository: options.repository ?? new MemoryRepository(),
    rpId: options.rpId ?? new URL(appOrigin).hostname,
    storage: options.storage ?? new LocalStorageService(),
  });
}

function createServices(input: {
  readonly adminEmail: string;
  readonly appOrigin: string;
  readonly repository: Repository;
  readonly rpId: string;
  readonly storage: StorageService;
}): BriefServices {
  const authConfiguration: AuthConfiguration = {
    adminEmail: input.adminEmail,
    origin: input.appOrigin,
    rpId: input.rpId,
    rpName: "Brief",
  };
  const apiKeys = new ApiKeyService(input.repository);
  const sessions = new SessionService(input.repository);
  return {
    auth: {
      devices: new DeviceAuthorizationService(input.repository, apiKeys, input.appOrigin),
      passkeys: new PasskeyService(input.repository, authConfiguration),
      principals: new PrincipalService(apiKeys, sessions),
      sessions,
    },
    authOrigin: input.appOrigin,
    repository: input.repository,
    storage: input.storage,
  };
}
