import {
  GetObjectCommand,
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

export interface StoredAsset {
  body: BodyInit;
  contentType: string;
}

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
    return this.assets.get(key);
  }
  async putLocal(key: string, body: Uint8Array<ArrayBuffer>, contentType: string) {
    this.assets.set(key, { body, contentType });
  }
}

export class S3StorageService implements StorageService {
  private readonly client = new S3Client({});
  constructor(private readonly bucket: string) {}
  async bytesUsed() {
    const response = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket }));
    return (response.Contents ?? []).reduce((total, item) => total + (item.Size ?? 0), 0);
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
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!response.Body) return undefined;
      return {
        body: response.Body.transformToWebStream() as ReadableStream<Uint8Array>,
        contentType: response.ContentType ?? "application/octet-stream",
      };
    } catch (cause) {
      if (cause instanceof Error && cause.name === "NoSuchKey") return undefined;
      throw cause;
    }
  }
}
