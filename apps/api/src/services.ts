import { AuthService } from "./auth";
import { DynamoRepository } from "./dynamo-repository";
import { MemoryRepository, type Repository } from "./repository";
import { LocalStorageService, S3StorageService, type StorageService } from "./storage";

export interface CreateServicesOptions {
  adminEmail?: string;
  appOrigin?: string;
  bucketName?: string;
  repository?: Repository;
  rpId?: string;
  storage?: StorageService;
  tableName?: string;
}

export interface BriefServices {
  readonly auth: AuthService;
  readonly authOrigin: string;
  readonly repository: Repository;
  readonly storage: StorageService;
}

export function createServices(options: CreateServicesOptions = {}): BriefServices {
  const tableName = options.tableName ?? process.env.BRIEF_TABLE;
  const bucketName = options.bucketName ?? process.env.BRIEF_BUCKET;
  const repository =
    options.repository ?? (tableName ? new DynamoRepository(tableName) : new MemoryRepository());
  const storage =
    options.storage ?? (bucketName ? new S3StorageService(bucketName) : new LocalStorageService());
  const appOrigin = options.appOrigin ?? process.env.BRIEF_APP_ORIGIN ?? "http://localhost:5174";

  return {
    auth: new AuthService(repository, {
      adminEmail: options.adminEmail ?? process.env.BRIEF_ADMIN_EMAIL ?? "hello@dawson.gg",
      origin: appOrigin,
      rpId: options.rpId ?? process.env.BRIEF_RP_ID ?? new URL(appOrigin).hostname,
      rpName: "Brief",
    }),
    authOrigin: appOrigin,
    repository,
    storage,
  };
}
