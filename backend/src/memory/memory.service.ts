import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSession } from '../game-sessions/entities/game-session.entity';
import { Message } from '../messages/entities/message.entity';
import { LlmService } from '../llm/llm.service';
import { RedisService } from '../common/services/redis.service';

@Injectable()
export class MemoryService {
  constructor(
    @InjectRepository(GameSession)
    private sessionRepository: Repository<GameSession>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private llmService: LlmService,
    private redisService: RedisService,
  ) {}

  async generateSessionSummary(sessionId: string): Promise<string> {
    const messages = await this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    const transcript = messages
      .map((m) => `${m.senderType}: ${m.content}`)
      .join('\n');

    const summary = await this.llmService.generateSummary(transcript);

    await this.sessionRepository.update(sessionId, {
      summaryText: summary,
    });

    return summary;
  }

  async getPastSessionSummaries(campaignId: string, limit: number = 5): Promise<string[]> {
    const sessions = await this.sessionRepository.find({
      where: { campaignId, status: 'completed' },
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['summaryText'],
    });

    return sessions
      .filter((s) => s.summaryText)
      .map((s) => s.summaryText);
  }

  async saveRecentContext(campaignId: string, sessionId: string, messages: any[]): Promise<void> {
    const key = `campaign:${campaignId}:session:${sessionId}:recent_context`;
    const values = messages.map((m) => JSON.stringify(m));
    await this.redisService.setListWithExpiry(key, values, 172800); // 48 hours
  }

  async getRecentContext(campaignId: string, sessionId: string, limit: number = 30): Promise<any[]> {
    const key = `campaign:${campaignId}:session:${sessionId}:recent_context`;
    const values = await this.redisService.getListRange(key, -limit, -1);
    return values.map((v) => {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    });
  }

  async clearRecentContext(campaignId: string, sessionId: string): Promise<void> {
    const key = `campaign:${campaignId}:session:${sessionId}:recent_context`;
    await this.redisService.deleteKey(key);
  }
}
