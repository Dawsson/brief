import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  type NativeAttributeValue,
} from "@aws-sdk/lib-dynamodb";
import type { BriefDocument } from "@brief/core";
import type {
  ApiTokenRecord,
  CredentialRecord,
  DeviceAuthorizationRecord,
  FlowRecord,
  InviteRecord,
  SessionRecord,
  UserRecord,
} from "./model";
import type { Repository } from "./repository";

interface EntityItem {
  data: unknown;
  entity: string;
  expiresAt?: number;
  pk: string;
  sk: string;
}

export class DynamoRepository implements Repository {
  private readonly client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  constructor(private readonly tableName: string) {}

  private async put(entity: string, pk: string, sk: string, data: unknown): Promise<void> {
    const expiresAt = expirationTimestamp(data);
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { entity, pk, sk, data, ...(expiresAt ? { expiresAt } : {}) } satisfies EntityItem,
      }),
    );
  }

  private async get<T>(pk: string, sk: string): Promise<T | undefined> {
    const response = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: { pk, sk } }),
    );
    return response.Item?.data as T | undefined;
  }

  private async scan<T>(entity: string): Promise<T[]> {
    const items: T[] = [];
    let exclusiveStartKey: Record<string, NativeAttributeValue> | undefined;
    do {
      const response = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: "entity = :entity",
          ExpressionAttributeValues: { ":entity": entity },
          ProjectionExpression: "#data",
          ExpressionAttributeNames: { "#data": "data" },
          ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
        }),
      );
      items.push(...(response.Items ?? []).map((item) => item.data as T));
      exclusiveStartKey = response.LastEvaluatedKey;
    } while (exclusiveStartKey);
    return items;
  }

  async consumeDeviceAuthorization(hash: string, consumedAt: string) {
    try {
      const response = await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { pk: `DEVICE#${hash}`, sk: "META" },
          UpdateExpression: "SET #data.#status = :consumed, #data.consumedAt = :consumedAt",
          ConditionExpression: "#data.#status = :approved AND #data.expiresAt > :consumedAt",
          ExpressionAttributeNames: { "#data": "data", "#status": "status" },
          ExpressionAttributeValues: {
            ":approved": "approved",
            ":consumed": "consumed",
            ":consumedAt": consumedAt,
          },
          ReturnValues: "ALL_NEW",
        }),
      );
      return response.Attributes?.data as DeviceAuthorizationRecord | undefined;
    } catch (cause) {
      if (cause instanceof Error && cause.name === "ConditionalCheckFailedException") {
        return undefined;
      }
      throw cause;
    }
  }
  async countUsers() {
    return (await this.listUsers()).length;
  }
  async createInvite(invite: InviteRecord) {
    await this.put("invite", `INVITE#${invite.id}`, "META", invite);
  }
  async deleteApiToken(hash: string) {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { pk: `API_TOKEN#${hash}`, sk: "META" },
      }),
    );
  }
  async deleteBrief(id: string) {
    await this.client.send(
      new DeleteCommand({ TableName: this.tableName, Key: { pk: `BRIEF#${id}`, sk: "META" } }),
    );
  }
  async deleteFlow(id: string) {
    await this.client.send(
      new DeleteCommand({ TableName: this.tableName, Key: { pk: `FLOW#${id}`, sk: "META" } }),
    );
  }
  async deleteSession(hash: string) {
    await this.client.send(
      new DeleteCommand({ TableName: this.tableName, Key: { pk: `SESSION#${hash}`, sk: "META" } }),
    );
  }
  async findDeviceAuthorizationByUserCode(code: string) {
    return (await this.scan<DeviceAuthorizationRecord>("device_authorization")).find(
      (authorization) => authorization.userCode === code,
    );
  }
  async findUserByEmail(email: string) {
    return (await this.listUsers()).find((user) => user.email === email);
  }
  async getBrief(id: string) {
    return this.get<BriefDocument>(`BRIEF#${id}`, "META");
  }
  async getApiToken(hash: string) {
    return this.get<ApiTokenRecord>(`API_TOKEN#${hash}`, "META");
  }
  async getCredential(id: string) {
    return this.get<CredentialRecord>(`CREDENTIAL#${id}`, "META");
  }
  async getDeviceAuthorizationByHash(hash: string) {
    return this.get<DeviceAuthorizationRecord>(`DEVICE#${hash}`, "META");
  }
  async getFlow(id: string) {
    return this.get<FlowRecord>(`FLOW#${id}`, "META");
  }
  async getInviteByHash(hash: string) {
    return (await this.listInvites()).find((invite) => invite.tokenHash === hash);
  }
  async getSession(hash: string) {
    return this.get<SessionRecord>(`SESSION#${hash}`, "META");
  }
  async getUser(id: string) {
    return this.get<UserRecord>(`USER#${id}`, "PROFILE");
  }
  async listBriefs(ownerId?: string) {
    return (await this.scan<BriefDocument>("brief"))
      .filter((brief) => !ownerId || brief.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async listCredentials(userId: string) {
    return (await this.scan<CredentialRecord>("credential")).filter(
      (credential) => credential.userId === userId,
    );
  }
  async listInvites() {
    return this.scan<InviteRecord>("invite");
  }
  async listUsers() {
    return this.scan<UserRecord>("user");
  }
  async putBrief(document: BriefDocument) {
    await this.put("brief", `BRIEF#${document.id}`, "META", document);
  }
  async putApiToken(token: ApiTokenRecord) {
    await this.put("api_token", `API_TOKEN#${token.idHash}`, "META", token);
  }
  async putCredential(credential: CredentialRecord) {
    await this.put("credential", `CREDENTIAL#${credential.credentialId}`, "META", credential);
  }
  async putDeviceAuthorization(authorization: DeviceAuthorizationRecord) {
    await this.put(
      "device_authorization",
      `DEVICE#${authorization.deviceCodeHash}`,
      "META",
      authorization,
    );
  }
  async putFlow(flow: FlowRecord) {
    await this.put("flow", `FLOW#${flow.id}`, "META", flow);
  }
  async putSession(session: SessionRecord) {
    await this.put("session", `SESSION#${session.idHash}`, "META", session);
  }
  async putUser(user: UserRecord) {
    await this.put("user", `USER#${user.id}`, "PROFILE", user);
  }
  async updateCredentialCounter(id: string, counter: number) {
    const credential = await this.getCredential(id);
    if (credential) await this.putCredential({ ...credential, counter });
  }
  async useInvite(id: string, acceptedAt: string) {
    const invite = (await this.listInvites()).find((candidate) => candidate.id === id);
    if (invite) await this.put("invite", `INVITE#${id}`, "META", { ...invite, acceptedAt });
  }
}

function expirationTimestamp(data: unknown): number | undefined {
  if (!data || typeof data !== "object" || !("expiresAt" in data)) return undefined;
  const expiresAt = (data as { expiresAt?: unknown }).expiresAt;
  if (typeof expiresAt !== "string") return undefined;
  const milliseconds = Date.parse(expiresAt);
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : undefined;
}
