export interface CaptchaStore {
  set(key: string, value: string, expiryMode: 'EX', ttlSeconds: number): Promise<unknown>;
  getdel(key: string): Promise<string | null>;
  quit(): Promise<unknown>;
}

export class MemoryCaptchaStore implements CaptchaStore {
  private readonly entries = new Map<string, { value: string; expiresAt: number }>();

  async set(key: string, value: string, _expiryMode: 'EX', ttlSeconds: number) {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return 'OK';
  }

  async getdel(key: string) {
    const entry = this.entries.get(key);
    this.entries.delete(key);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.value;
  }

  async quit() {
    this.entries.clear();
    return 'OK';
  }
}
