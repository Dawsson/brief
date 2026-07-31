import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { BriefDocument } from "@brief/core";
import type {
  CredentialRecord,
  FlowRecord,
  InviteRecord,
  SessionRecord,
  UserRecord,
} from "./model";
import type { Repository } from "./repository";

interface EntityItem {
  data: unknown;
  entity: string;
  pk: string;
  sk: string;
}

export class DynamoRepository implements Repository {
  private readonly client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  constructor(private readonly tableName: string) {}

  private async put(entity: string, pk: string, sk: string, data: unknown): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { entity, pk, sk, data } satisfies EntityItem,
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
    const response = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "entity = :entity",
        ExpressionAttributeValues: { ":entity": entity },
        ProjectionExpression: "#data",
        ExpressionAttributeNames: { "#data": "data" },
      }),
    );
    return (response.Items ?? []).map((item) => item.data as T);
  }

  async countUsers() {
    return (await this.listUsers()).length;
  }
  async createInvite(invite: InviteRecord) {
    await this.put("invite", `INVITE#${invite.id}`, "META", invite);
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
  async findUserByApiTokenHash(hash: string) {
    return (await this.listUsers()).find((user) => user.apiTokenHash === hash);
  }
  async findUserByEmail(email: string) {
    return (await this.listUsers()).find((user) => user.email === email);
  }
  async getBrief(id: string) {
    return this.get<BriefDocument>(`BRIEF#${id}`, "META");
  }
  async getCredential(id: string) {
    return this.get<CredentialRecord>(`CREDENTIAL#${id}`, "META");
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
  async putCredential(credential: CredentialRecord) {
    await this.put("credential", `CREDENTIAL#${credential.credentialId}`, "META", credential);
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
