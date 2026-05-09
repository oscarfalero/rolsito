import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    private eventEmitter: EventEmitter2,
  ) {}

  async generateDmResponse(
    campaignId: string,
    sessionId: string,
    playerAction: string,
    characterId?: string,
  ): Promise<{ message: Message; sceneChanged?: boolean }> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['characters', 'characters.user', 'currentScene'],
    });

    const pastSummaries = await this.memoryService.getPastSessionSummaries(campaignId);
    const recentContext = await this.memoryService.getRecentContext(campaignId, sessionId);

    const systemPrompt = this.buildSystemPrompt(campaign, pastSummaries);

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

    // Parse scene transitions
    let cleanedResponse = response;
    let sceneChanged = false;
    const sceneMatch = response.match(/\[SCENE_CHANGE:\s*([a-f0-9-]+)\]/);
    if (sceneMatch) {
      const sceneId = sceneMatch[1];
      try {
        const sceneRepo = this.campaignRepository.manager.getRepository('Scene');
        const scene = await sceneRepo.findOne({ where: { id: sceneId } });
        if (scene && (scene as any).campaignId === campaignId) {
          campaign.currentSceneId = sceneId;
          await this.campaignRepository.save(campaign);
          this.eventEmitter.emit('scene.changed', {
            campaignId,
            scene: { id: (scene as any).id, name: (scene as any).name, description: (scene as any).description, type: (scene as any).type },
          });
          sceneChanged = true;
        }
      } catch (e) {
        // Silently ignore invalid scene changes
      }
      cleanedResponse = response.replace(/\[SCENE_CHANGE:\s*[a-f0-9-]+\]/g, '').trim();
    }

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
      content: cleanedResponse,
      metadata: { actionType: 'dm_response' },
    });

    // Update recent context in Redis
    const updatedContext = [
      ...recentContext,
      { senderType: 'player', content: playerAction, characterId },
      { senderType: 'dm', content: cleanedResponse },
    ];
    await this.memoryService.saveRecentContext(campaignId, sessionId, updatedContext.slice(-30));

    return { message: dmMessage, sceneChanged };
  }

  private buildSystemPrompt(
    campaign: Campaign,
    pastSummaries: string[],
  ): string {
    const characters = campaign.characters
      .filter((c) => c.isActive)
      .map((c) => {
        const race = c.race || 'Unknown';
        const className = c.class || 'Unknown';
        return `${c.name}: ${race} ${className} Lv${c.level}, HP: ${c.currentHp}/${c.maxHp}, AC: ${c.ac}`;
      })
      .join('\n');

    const sceneBlock = campaign.currentScene
      ? `\n--- CURRENT SCENE ---\nLocation: ${campaign.currentScene.name}\nDescription: ${campaign.currentScene.description}\nType: ${campaign.currentScene.type}`
      : '';

    return `You are the Dungeon Master (DM) for a fantasy medieval RPG campaign called "${campaign.name}".
${campaign.systemPrompt}

Campaign Context:
- World setting: ${campaign.description || 'A mysterious fantasy world'}
${pastSummaries.length > 0 ? `- Previous session summaries:\n${pastSummaries.map((s, i) => `  Session ${i + 1}: ${s}`).join('\n')}` : ''}
${sceneBlock}

--- PARTY SUMMARY ---
${characters}

Rules:
1. Respond in character as the DM.
2. Describe scenes vividly.
3. Ask for dice rolls when appropriate (format: [ROLL: skill_name, ability]).
4. Track health, inventory, and status implicitly.
5. Keep responses concise but atmospheric (2-4 paragraphs max).
6. Maintain continuity with previous events.
7. Address the player by their character name when possible.
8. To change the current scene, include [SCENE_CHANGE: scene_id] at the end of your response.`;
  }
}
