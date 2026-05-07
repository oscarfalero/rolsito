import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async create(data: Partial<Message>): Promise<Message> {
    const message = this.messageRepository.create(data);
    return this.messageRepository.save(message);
  }

  async findBySession(sessionId: string, limit: number = 50): Promise<Message[]> {
    return this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: limit,
      relations: ['sender', 'character'],
    });
  }

  async findRecentByCampaign(campaignId: string, limit: number = 30): Promise<Message[]> {
    return this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.session', 'session')
      .where('session.campaignId = :campaignId', { campaignId })
      .orderBy('message.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }
}
