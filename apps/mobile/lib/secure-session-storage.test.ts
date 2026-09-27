import { describe, expect, it } from "vitest";
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

  it("migrates a valid legacy AsyncStorage session", async () => {
    const data = memoryStorage({ session });
    const { storage, keys } = adapter(data);
    await expect(storage.getItem("session")).resolves.toBe(session);
    expect(data.values.get("session")).not.toBe(session);
    expect(keys.values.has("session")).toBe(true);
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
