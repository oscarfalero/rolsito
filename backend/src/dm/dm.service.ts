import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Character } from '../characters/entities/character.entity';
import { Message } from '../messages/entities/message.entity';
import { LlmService } from '../llm/llm.service';
import { MemoryService } from '../memory/memory.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class DmService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Character)
    private characterRepository: Repository<Character>,
    private llmService: LlmService,
    private memoryService: MemoryService,
    private messagesService: MessagesService,
  ) {}

  async generateDmResponse(
    campaignId: string,
    sessionId: string,
    playerAction: string,
    characterId?: string,
  ): Promise<Message> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['characters', 'characters.user'],
    });

    const pastSummaries = await this.memoryService.getPastSessionSummaries(campaignId);
    const recentContext = await this.memoryService.getRecentContext(campaignId, sessionId);

    const characterList = campaign.characters
      .filter((c) => c.isActive)
      .map((c) => `- ${c.name} (${c.race} ${c.class}, Level ${c.level})`)
      .join('\n');

    const systemPrompt = this.buildSystemPrompt(campaign, characterList, pastSummaries);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentContext.map((ctx: any) => ({
        role: ctx.senderType === 'player' ? 'user' : 'assistant',
        content: `${ctx.senderType === 'player' ? ctx.characterName || 'Player' : 'DM'}: ${ctx.content}`,
      })),
      { role: 'user', content: `Player: ${playerAction}` },
    ];

    const response = await this.llmService.generateChatCompletion(
      messages,
      campaign.dmModel,
      0.8,
      1500,
    );

    // Save player action
    await this.messagesService.create({
      sessionId,
      senderType: 'player',
      characterId,
      content: playerAction,
      metadata: { actionType: 'player_action' },
    });

    // Save DM response
    const dmMessage = await this.messagesService.create({
      sessionId,
      senderType: 'dm',
      content: response,
      metadata: { actionType: 'dm_response' },
    });

    // Update recent context in Redis
    const updatedContext = [
      ...recentContext,
      { senderType: 'player', content: playerAction, characterId },
      { senderType: 'dm', content: response },
    ];
    await this.memoryService.saveRecentContext(campaignId, sessionId, updatedContext.slice(-30));

    return dmMessage;
  }

  private buildSystemPrompt(
    campaign: Campaign,
    characterList: string,
    pastSummaries: string[],
  ): string {
    return `You are the Dungeon Master (DM) for a fantasy medieval RPG campaign called "${campaign.name}".
${campaign.systemPrompt}

Campaign Context:
- World setting: ${campaign.description || 'A mysterious fantasy world'}
${pastSummaries.length > 0 ? `- Previous session summaries:\n${pastSummaries.map((s, i) => `  Session ${i + 1}: ${s}`).join('\n')}` : ''}

Active Players and Characters:
${characterList}

Rules:
1. Respond in character as the DM.
2. Describe scenes vividly.
3. Ask for dice rolls when appropriate (format: [ROLL: skill_name, ability]).
4. Track health, inventory, and status implicitly.
5. Keep responses concise but atmospheric (2-4 paragraphs max).
6. Maintain continuity with previous events.
7. Address the player by their character name when possible.`;
  }
}
