import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import {
  clearStoredCredentials,
  readStoredCredentials,
  writeStoredCredentials,
} from "../src/credentials";

describe("Brief CLI credentials", () => {
  test("writes private credentials and removes them", async () => {
    const directory = await mkdtemp(join(tmpdir(), "brief-credentials-"));
    const path = join(directory, "nested", "credentials.json");
    const credentials = {
      version: 1 as const,
      apiUrl: "https://brief.harbr.run",
      email: "hello@dawson.gg",
      token: "brief_live_test",
    };

    try {
      await writeStoredCredentials(credentials, path);
      expect(await readStoredCredentials(path)).toEqual(credentials);
      expect((await stat(path)).mode & 0o777).toBe(0o600);
      expect(await clearStoredCredentials(path)).toBe(true);
      expect(await readStoredCredentials(path)).toBeUndefined();
      expect(await clearStoredCredentials(path)).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
