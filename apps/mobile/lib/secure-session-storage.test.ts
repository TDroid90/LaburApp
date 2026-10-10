import { describe, expect, it } from "vitest";
import * as aesjs from "aes-js";
import { SecureSessionStorage, type AsyncStringStorage } from "./secure-session-storage";

function memoryStorage(initial: Record<string, string> = {}): AsyncStringStorage & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial));
  return {
    values,
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
}

function adapter(data = memoryStorage(), keys = memoryStorage()) {
  return {
    data,
    keys,
    storage: new SecureSessionStorage({
      dataStorage: data,
      keyStorage: keys,
      randomBytes: (length) => Uint8Array.from({ length }, (_, index) => index + 1),
    }),
  };
}

const session = JSON.stringify({ access_token: "access-token", refresh_token: "refresh-token" });

describe("SecureSessionStorage", () => {
  it("persists and restores the complete Supabase session without plaintext tokens", async () => {
    const { storage, data, keys } = adapter();
    await storage.setItem("session", session);
    expect(data.values.get("session")).not.toContain("access-token");
    expect(keys.values.get("session")).toHaveLength(64);
    await expect(storage.getItem("session")).resolves.toBe(session);
  });

  it("keeps the encryption key stable while Supabase refreshes the session", async () => {
    const { storage, data, keys } = adapter();
    await storage.setItem("session", session);
    const originalKey = keys.values.get("session");
    const originalCiphertext = data.values.get("session");
    const refreshed = JSON.stringify({ access_token: "new-access", refresh_token: "new-refresh" });
    await storage.setItem("session", refreshed);
    expect(keys.values.get("session")).toBe(originalKey);
    expect(data.values.get("session")).not.toBe(originalCiphertext);
    expect(data.values.get("session")).not.toContain("new-access");
    await expect(storage.getItem("session")).resolves.toBe(refreshed);
  });

  it("migrates a valid legacy AsyncStorage session", async () => {
    const data = memoryStorage({ session });
    const { storage, keys } = adapter(data);
    await expect(storage.getItem("session")).resolves.toBe(session);
    expect(data.values.get("session")).not.toBe(session);
    expect(keys.values.has("session")).toBe(true);
  });

  it("reads sessions encrypted by the previous adapter and upgrades their format", async () => {
    const key = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    const oldCipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1));
    const data = memoryStorage({ session: aesjs.utils.hex.fromBytes(oldCipher.encrypt(aesjs.utils.utf8.toBytes(session))) });
    const keys = memoryStorage({ session: aesjs.utils.hex.fromBytes(key) });
    const { storage } = adapter(data, keys);
    await expect(storage.getItem("session")).resolves.toBe(session);
    expect(data.values.get("session")).toMatch(/^v2:/);
    await expect(storage.getItem("session")).resolves.toBe(session);
  });

  it("deletes ciphertext and Keystore material on logout", async () => {
    const { storage, data, keys } = adapter();
    await storage.setItem("session", session);
    await storage.removeItem("session");
    expect(data.values.has("session")).toBe(false);
    expect(keys.values.has("session")).toBe(false);
  });

  it("fails closed and removes unreadable ciphertext when the Keystore key is missing", async () => {
    const { storage, data, keys } = adapter();
    await storage.setItem("session", session);
    keys.values.clear();
    await expect(storage.getItem("session")).resolves.toBeNull();
    expect(data.values.has("session")).toBe(false);
  });

  it("returns null for a missing session", async () => {
    const { storage } = adapter();
    await expect(storage.getItem("session")).resolves.toBeNull();
  });
});
