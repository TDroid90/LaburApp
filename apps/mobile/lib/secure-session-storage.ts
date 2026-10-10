import * as aesjs from "aes-js";

export type AsyncStringStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type SecureKeyStorage = AsyncStringStorage;

type SecureSessionStorageOptions = {
  dataStorage: AsyncStringStorage;
  keyStorage: SecureKeyStorage;
  randomBytes: (length: number) => Uint8Array;
};

function isLegacySupabaseSession(value: string) {
  try {
    const parsed = JSON.parse(value) as { access_token?: unknown; refresh_token?: unknown };
    return typeof parsed.access_token === "string" && typeof parsed.refresh_token === "string";
  } catch {
    return false;
  }
}

export class SecureSessionStorage implements AsyncStringStorage {
  private readonly pendingWrites = new Map<string, Promise<void>>();

  constructor(private readonly options: SecureSessionStorageOptions) {}

  private async encrypt(key: string, value: string) {
    const existingKey = await this.options.keyStorage.getItem(key);
    const encryptionKey = existingKey
      ? aesjs.utils.hex.toBytes(existingKey)
      : this.options.randomBytes(256 / 8);
    const nonce = this.options.randomBytes(16);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(nonce));
    const encrypted = `v2:${aesjs.utils.hex.fromBytes(nonce)}:${aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)))}`;

    if (!existingKey) await this.options.keyStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return encrypted;
  }

  private async decrypt(key: string, value: string) {
    const storedKey = await this.options.keyStorage.getItem(key);
    if (!storedKey) return null;

    try {
      const parts = value.startsWith("v2:") ? value.split(":") : null;
      const cipher = new aesjs.ModeOfOperation.ctr(
        aesjs.utils.hex.toBytes(storedKey),
        new aesjs.Counter(parts ? aesjs.utils.hex.toBytes(parts[1]) : 1),
      );
      const decrypted = aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(parts ? parts[2] : value)));
      if (!parts) await this.setItem(key, decrypted);
      return decrypted;
    } catch {
      await this.removeItem(key);
      return null;
    }
  }

  async getItem(key: string) {
    await this.pendingWrites.get(key);
    const stored = await this.options.dataStorage.getItem(key);
    if (!stored) return null;

    if (await this.options.keyStorage.getItem(key)) return this.decrypt(key, stored);

    if (isLegacySupabaseSession(stored)) {
      await this.setItem(key, stored);
      return stored;
    }

    await this.options.dataStorage.removeItem(key);
    return null;
  }

  async setItem(key: string, value: string) {
    const previous = this.pendingWrites.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      const encrypted = await this.encrypt(key, value);
      await this.options.dataStorage.setItem(key, encrypted);
    });
    this.pendingWrites.set(key, next);
    try { await next; }
    finally { if (this.pendingWrites.get(key) === next) this.pendingWrites.delete(key); }
  }

  async removeItem(key: string) {
    await this.pendingWrites.get(key);
    await this.options.dataStorage.removeItem(key);
    await this.options.keyStorage.removeItem(key);
  }
}
