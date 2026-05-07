import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSession } from './entities/game-session.entity';

@Injectable()
export class GameSessionsService {
  constructor(
    @InjectRepository(GameSession)
    private sessionRepository: Repository<GameSession>,
  ) {}

  async create(campaignId: string, name?: string): Promise<GameSession> {
    const session = this.sessionRepository.create({
      campaignId,
      name: name || `Session ${new Date().toLocaleDateString()}`,
      status: 'active',
    });
    return this.sessionRepository.save(session);
  }

  async findActiveByCampaign(campaignId: string): Promise<GameSession | null> {
    return this.sessionRepository.findOne({
      where: { campaignId, status: 'active' },
    });
  }

  async completeSession(id: string, summaryText?: string): Promise<GameSession> {
    const session = await this.sessionRepository.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    session.status = 'completed';
    session.endedAt = new Date();
    if (summaryText) {
      session.summaryText = summaryText;
    }
    return this.sessionRepository.save(session);
  }

  async findByCampaign(campaignId: string): Promise<GameSession[]> {
    return this.sessionRepository.find({
      where: { campaignId },
      order: { createdAt: 'DESC' },
    });
  }
}
