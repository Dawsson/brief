import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadRequest {
  contentType: string;
  filename: string;
  ownerId: string;
}

export interface UploadTarget {
  headers: Record<string, string>;
  key: string;
  method: "PUT";
  uploadUrl: string;
}

export type StoredAsset =
  | { readonly body: BodyInit; readonly contentType: string; readonly kind: "body" }
  | { readonly kind: "redirect"; readonly url: string };

export interface StorageService {
  bytesUsed(): Promise<number>;
  createUpload(input: UploadRequest, baseUrl: string): Promise<UploadTarget>;
  get(key: string): Promise<StoredAsset | undefined>;
  putLocal?(key: string, body: Uint8Array<ArrayBuffer>, contentType: string): Promise<void>;
}

function safeFilename(filename: string): string {
  return (
    filename
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-|-$/g, "") || "asset"
  );
}

export class LocalStorageService implements StorageService {
  private readonly assets = new Map<
    string,
    { body: Uint8Array<ArrayBuffer>; contentType: string }
  >();
  async bytesUsed() {
    return [...this.assets.values()].reduce((total, asset) => total + asset.body.byteLength, 0);
  }
  async createUpload(input: UploadRequest, baseUrl: string) {
    const key = `${input.ownerId}/${crypto.randomUUID()}/${safeFilename(input.filename)}`;
    return {
      key,
      method: "PUT" as const,
      uploadUrl: `${baseUrl}/v1/storage/local/${key}`,
      headers: { "content-type": input.contentType },
    };
  }
  async get(key: string) {
    const asset = this.assets.get(key);
    return asset ? { ...asset, kind: "body" as const } : undefined;
  }
  async putLocal(key: string, body: Uint8Array<ArrayBuffer>, contentType: string) {
    this.assets.set(key, { body, contentType });
  }
}

export class S3StorageService implements StorageService {
  private readonly client = new S3Client({});
  constructor(private readonly bucket: string) {}
  async bytesUsed() {
    let bytes = 0;
    let continuationToken: string | undefined;
    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
        }),
      );
      bytes += (response.Contents ?? []).reduce((total, item) => total + (item.Size ?? 0), 0);
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    return bytes;
  }
  async createUpload(input: UploadRequest) {
    const key = `${input.ownerId}/${crypto.randomUUID()}/${safeFilename(input.filename)}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: input.contentType,
    });
    return {
      key,
      method: "PUT" as const,
      uploadUrl: await getSignedUrl(this.client, command, { expiresIn: 900 }),
      headers: { "content-type": input.contentType },
    };
  }
  async get(key: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        kind: "redirect" as const,
        url: await getSignedUrl(
          this.client,
          new GetObjectCommand({ Bucket: this.bucket, Key: key }),
          { expiresIn: 300 },
        ),
      };
    } catch (cause) {
      const name = cause instanceof Error ? cause.name : undefined;
      if (name === "NotFound" || name === "NoSuchKey") return undefined;
      throw cause;
    }
  }
}
