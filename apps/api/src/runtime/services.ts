import type { InferEnv } from "@pier/backend/env";
import { Resource } from "sst";

import type envSchema from "../../env";
import { DynamoRepository } from "../data/dynamo-repository";
import { MemoryRepository, type Repository } from "../data/repository";
import { LocalStorageService, S3StorageService, type StorageService } from "../data/storage";
import { AuthService } from "../routes/auth/auth.service";

export interface CreateTestServicesOptions {
  adminEmail?: string;
  appOrigin?: string;
  repository?: Repository;
  rpId?: string;
  storage?: StorageService;
}

export interface BriefServices {
  readonly auth: AuthService;
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
  return {
    auth: new AuthService(input.repository, {
      adminEmail: input.adminEmail,
      origin: input.appOrigin,
      rpId: input.rpId,
      rpName: "Brief",
    }),
    authOrigin: input.appOrigin,
    repository: input.repository,
    storage: input.storage,
  };
}
