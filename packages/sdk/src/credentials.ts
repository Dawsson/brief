import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface StoredCredentials {
  apiUrl: string;
  email: string;
  token: string;
  version: 1;
}

export function credentialsPath(): string {
  const configRoot = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(configRoot, "brief", "credentials.json");
}

export async function readStoredCredentials(
  path: string = credentialsPath(),
): Promise<StoredCredentials | undefined> {
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!isStoredCredentials(value)) return undefined;
    return value;
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") return undefined;
    throw cause;
  }
}

export async function writeStoredCredentials(
  credentials: StoredCredentials,
  path: string = credentialsPath(),
): Promise<void> {
  const directory = dirname(path);
  const temporaryPath = `${path}.${crypto.randomUUID()}.tmp`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await writeFile(temporaryPath, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
    await rename(temporaryPath, path);
    await chmod(path, 0o600);
  } catch (cause) {
    await rm(temporaryPath, { force: true });
    throw cause;
  }
}

export async function clearStoredCredentials(path: string = credentialsPath()): Promise<boolean> {
  try {
    await rm(path);
    return true;
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") return false;
    throw cause;
  }
}

function isStoredCredentials(value: unknown): value is StoredCredentials {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredCredentials>;
  return (
    candidate.version === 1 &&
    typeof candidate.apiUrl === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.token === "string"
  );
}
