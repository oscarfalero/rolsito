import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Character } from '../characters/entities/character.entity';
import { GameSession } from '../game-sessions/entities/game-session.entity';
import { CampaignMember } from '../campaign-members/entities/campaign-member.entity';
import { GameSessionsService } from '../game-sessions/game-sessions.service';
import { MemoryService } from '../memory/memory.service';
import { RedisService } from '../common/services/redis.service';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Character)
    private characterRepository: Repository<Character>,
    @InjectRepository(CampaignMember)
    private memberRepository: Repository<CampaignMember>,
    private gameSessionsService: GameSessionsService,
    private memoryService: MemoryService,
    private redisService: RedisService,
  ) {}

  async getCampaignWithPlayers(campaignId: string): Promise<{
    campaign: Campaign;
    players: any[];
    characters: Character[];
  }> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['members', 'members.user', 'characters', 'characters.user'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const players = campaign.members.map((member) => ({
      userId: member.userId,
      username: member.user.username,
      displayName: member.user.displayName,
      role: member.role,
    }));

    return { campaign, players, characters: campaign.characters };
  }

  async startSession(campaignId: string): Promise<GameSession> {
    const existingSession = await this.gameSessionsService.findActiveByCampaign(campaignId);
    if (existingSession) {
      return existingSession;
    }

    return this.gameSessionsService.create(campaignId);
  }

  async endSession(campaignId: string, sessionId: string): Promise<void> {
    const summary = await this.memoryService.generateSessionSummary(sessionId);
    await this.gameSessionsService.completeSession(sessionId, summary);
    await this.memoryService.clearRecentContext(campaignId, sessionId);
  }

  async addActivePlayer(campaignId: string, socketId: string, userId: string): Promise<void> {
    await this.redisService.addToSet(
      `campaign:${campaignId}:active_players`,
      JSON.stringify({ socketId, userId }),
    );
  }

  async removeActivePlayer(campaignId: string, socketId: string): Promise<void> {
    const players = await this.redisService.getSetMembers(
      `campaign:${campaignId}:active_players`,
    );
    
    for (const playerStr of players) {
      try {
        const player = JSON.parse(playerStr);
        if (player.socketId === socketId) {
          await this.redisService.removeFromSet(
            `campaign:${campaignId}:active_players`,
            playerStr,
          );
          break;
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  async getActivePlayers(campaignId: string): Promise<Array<{ socketId: string; userId: string }>> {
    const players = await this.redisService.getSetMembers(
      `campaign:${campaignId}:active_players`,
    );
    
    return players
      .map((p) => {
        try {
          return JSON.parse(p);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  async setTyping(campaignId: string, username: string, isTyping: boolean): Promise<string[]> {
    const key = `campaign:${campaignId}:typing`;
    
    if (isTyping) {
      await this.redisService.addToSet(key, username);
    } else {
      await this.redisService.removeFromSet(key, username);
    }

    return this.redisService.getSetMembers(key);
  }
}
