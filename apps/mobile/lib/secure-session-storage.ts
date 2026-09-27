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
  constructor(private readonly options: SecureSessionStorageOptions) {}

  private async encrypt(key: string, value: string) {
    const encryptionKey = this.options.randomBytes(256 / 8);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)));

    await this.options.keyStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return encrypted;
  }

  private async decrypt(key: string, value: string) {
    const storedKey = await this.options.keyStorage.getItem(key);
    if (!storedKey) return null;

    try {
      const cipher = new aesjs.ModeOfOperation.ctr(
        aesjs.utils.hex.toBytes(storedKey),
        new aesjs.Counter(1),
      );
      return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
    } catch {
      await this.removeItem(key);
      return null;
    }
  }

  async getItem(key: string) {
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
    const encrypted = await this.encrypt(key, value);
    await this.options.dataStorage.setItem(key, encrypted);
  }

  async removeItem(key: string) {
    await this.options.dataStorage.removeItem(key);
    await this.options.keyStorage.removeItem(key);
  }
}
