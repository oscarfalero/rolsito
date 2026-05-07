import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class TurnService {
  constructor(private redisService: RedisService) {}

  async initializeTurnQueue(campaignId: string, playerIds: string[]): Promise<void> {
    const key = `campaign:${campaignId}:turn_queue`;
    await this.redisService.deleteKey(key);
    await this.redisService.pushToList(key, ...playerIds);
    
    if (playerIds.length > 0) {
      await this.redisService.setValue(
        `campaign:${campaignId}:current_turn`,
        playerIds[0],
      );
    }
  }

  async getCurrentTurn(campaignId: string): Promise<string | null> {
    return this.redisService.getValue(`campaign:${campaignId}:current_turn`);
  }

  async advanceTurn(campaignId: string): Promise<string | null> {
    const queueKey = `campaign:${campaignId}:turn_queue`;
    const currentTurnKey = `campaign:${campaignId}:current_turn`;
    
    const queue = await this.redisService.getListRange(queueKey);
    if (queue.length === 0) return null;

    const currentTurn = await this.redisService.getValue(currentTurnKey);
    let nextIndex = 0;

    if (currentTurn) {
      const currentIndex = queue.indexOf(currentTurn);
      nextIndex = (currentIndex + 1) % queue.length;
    }

    const nextPlayer = queue[nextIndex];
    await this.redisService.setValue(currentTurnKey, nextPlayer);
    
    return nextPlayer;
  }

  async addPlayerToQueue(campaignId: string, playerId: string): Promise<void> {
    const key = `campaign:${campaignId}:turn_queue`;
    const queue = await this.redisService.getListRange(key);
    
    if (!queue.includes(playerId)) {
      await this.redisService.pushToList(key, playerId);
    }
  }

  async removePlayerFromQueue(campaignId: string, playerId: string): Promise<void> {
    const key = `campaign:${campaignId}:turn_queue`;
    await this.redisService.getClient().lrem(key, 0, playerId);
    
    const currentTurn = await this.getCurrentTurn(campaignId);
    if (currentTurn === playerId) {
      await this.advanceTurn(campaignId);
    }
  }

  async isPlayerTurn(campaignId: string, playerId: string): Promise<boolean> {
    const currentTurn = await this.getCurrentTurn(campaignId);
    return currentTurn === playerId;
  }

  async getTurnQueue(campaignId: string): Promise<string[]> {
    return this.redisService.getListRange(`campaign:${campaignId}:turn_queue`);
  }
}
