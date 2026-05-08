import { Injectable } from '@nestjs/common';

/**
 * In-memory Redis mock for development environments.
 * Implements the same interface as RedisService.
 */
@Injectable()
export class RedisMockService {
  private store: Map<string, any> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  getClient(): any {
    return {
      lrem: (key: string, count: number, value: string) => this.lrem(key, count, value),
    };
  }

  async addToSet(key: string, ...members: string[]): Promise<number> {
    const set = this.getSet(key);
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    this.store.set(key, set);
    return added;
  }

  async removeFromSet(key: string, ...members: string[]): Promise<number> {
    const set = this.getSet(key);
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed++;
      }
    }
    this.store.set(key, set);
    return removed;
  }

  async getSetMembers(key: string): Promise<string[]> {
    const set = this.getSet(key);
    return Array.from(set);
  }

  async setValue(key: string, value: string, ttl?: number): Promise<void> {
    this.store.set(key, value);
    if (ttl) {
      this.setExpiry(key, ttl);
    }
  }

  async getValue(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async deleteKey(key: string): Promise<number> {
    const existed = this.store.has(key) ? 1 : 0;
    this.store.delete(key);
    this.clearTimer(key);
    return existed;
  }

  async pushToList(key: string, ...values: string[]): Promise<number> {
    const list = this.getList(key);
    list.push(...values);
    this.store.set(key, list);
    return list.length;
  }

  async getListRange(key: string, start: number = 0, end: number = -1): Promise<string[]> {
    const list = this.getList(key);
    const actualEnd = end === -1 ? list.length : end + 1;
    return list.slice(start, actualEnd);
  }

  async setListWithExpiry(key: string, values: string[], ttlSeconds: number): Promise<void> {
    this.store.set(key, [...values]);
    this.setExpiry(key, ttlSeconds);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    const list = this.getList(key);
    const initialLength = list.length;
    const index = list.indexOf(value);
    if (index !== -1) {
      list.splice(index, 1);
      this.store.set(key, list);
    }
    return initialLength - list.length;
  }

  // Pipeline mock
  pipeline(): any {
    const operations: (() => void)[] = [];
    return {
      del: (k: string) => {
        operations.push(() => this.deleteKey(k));
        return this;
      },
      rpush: (k: string, ...vals: string[]) => {
        operations.push(() => this.pushToList(k, ...vals));
        return this;
      },
      expire: (k: string, ttl: number) => {
        operations.push(() => this.setExpiry(k, ttl));
        return this;
      },
      exec: async () => {
        for (const op of operations) {
          op();
        }
        return [];
      },
    };
  }

  private getSet(key: string): Set<string> {
    const existing = this.store.get(key);
    if (existing instanceof Set) {
      return existing;
    }
    return new Set();
  }

  private getList(key: string): string[] {
    const existing = this.store.get(key);
    if (Array.isArray(existing)) {
      return existing;
    }
    return [];
  }

  private setExpiry(key: string, seconds: number): void {
    this.clearTimer(key);
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, seconds * 1000);
    this.timers.set(key, timer);
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}
