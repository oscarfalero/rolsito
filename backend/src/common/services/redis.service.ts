import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async addToSet(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async removeFromSet(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async getSetMembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async setValue(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async getValue(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async deleteKey(key: string): Promise<number> {
    return this.client.del(key);
  }

  async pushToList(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async getListRange(key: string, start: number = 0, end: number = -1): Promise<string[]> {
    return this.client.lrange(key, start, end);
  }

  async setListWithExpiry(key: string, values: string[], ttlSeconds: number): Promise<void> {
    const pipeline = this.client.pipeline();
    pipeline.del(key);
    if (values.length > 0) {
      pipeline.rpush(key, ...values);
    }
    pipeline.expire(key, ttlSeconds);
    await pipeline.exec();
  }
}
