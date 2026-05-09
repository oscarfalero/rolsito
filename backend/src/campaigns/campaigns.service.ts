import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignMember } from '../campaign-members/entities/campaign-member.entity';
import { Scene } from '../scenes/entities/scene.entity';
import { Item } from '../items/entities/item.entity';
import { Character } from '../characters/entities/character.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignMember)
    private memberRepository: Repository<CampaignMember>,
    @InjectRepository(Scene)
    private sceneRepository: Repository<Scene>,
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    @InjectRepository(Character)
    private characterRepository: Repository<Character>,
  ) {}

  async create(userId: string, createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      createdById: userId,
      status: 'draft',
    });

    const saved = await this.campaignRepository.save(campaign);

    // Add creator as owner
    const member = this.memberRepository.create({
      userId,
      campaignId: saved.id,
      role: 'owner',
    });
    await this.memberRepository.save(member);

    // Seed default scenes
    const tavern = await this.sceneRepository.save(
      this.sceneRepository.create({
        campaignId: saved.id,
        name: 'Tavern',
        description: 'A cozy tavern with a roaring fireplace, filled with the murmur of patrons and the clink of mugs.',
        type: 'indoor',
      }),
    );
    await this.sceneRepository.save([
      this.sceneRepository.create({
        campaignId: saved.id,
        name: 'Town Square',
        description: 'The bustling center of town, with merchants calling out their wares and children playing.',
        type: 'town',
      }),
      this.sceneRepository.create({
        campaignId: saved.id,
        name: 'Wilderness Camp',
        description: 'A makeshift camp under the stars, surrounded by the sounds of the forest at night.',
        type: 'wilderness',
      }),
    ]);

    saved.currentSceneId = tavern.id;
    await this.campaignRepository.save(saved);

    // Seed default items
    await this.itemRepository.save([
      this.itemRepository.create({
        campaignId: saved.id,
        name: 'Health Potion',
        description: 'Restores health when consumed',
        type: 'consumable',
      }),
      this.itemRepository.create({
        campaignId: saved.id,
        name: 'Rusty Dagger',
        description: 'An old but functional blade',
        type: 'weapon',
      }),
      this.itemRepository.create({
        campaignId: saved.id,
        name: 'Leather Armor',
        description: 'Basic protection',
        type: 'armor',
      }),
      this.itemRepository.create({
        campaignId: saved.id,
        name: 'Rations',
        description: 'Food for one day',
        type: 'misc',
      }),
    ]);

    return saved;
  }

  async findAll(): Promise<Campaign[]> {
    return this.campaignRepository.find({
      relations: ['createdBy', 'members', 'members.user'],
    });
  }

  async findByUser(userId: string): Promise<Campaign[]> {
    const memberships = await this.memberRepository.find({
      where: { userId },
      relations: ['campaign', 'campaign.createdBy'],
    });
    return memberships.map((m) => m.campaign);
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['createdBy', 'members', 'members.user', 'characters', 'currentScene'],
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async join(campaignId: string, userId: string): Promise<CampaignMember> {
    const campaign = await this.findOne(campaignId);
    
    if (campaign.status !== 'active' && campaign.status !== 'draft') {
      throw new ForbiddenException('Campaign is not accepting new players');
    }

    const currentMembers = await this.memberRepository.count({
      where: { campaignId },
    });

    if (currentMembers >= campaign.maxPlayers) {
      throw new ForbiddenException('Campaign is full');
    }

    const existing = await this.memberRepository.findOne({
      where: { campaignId, userId },
    });

    if (existing) {
      throw new ForbiddenException('Already a member of this campaign');
    }

    const member = this.memberRepository.create({
      userId,
      campaignId,
      role: 'player',
    });

    return this.memberRepository.save(member);
  }

  async getCampaignState(campaignId: string, userId: string): Promise<{ currentScene: Scene | null; myCharacter: Character | null }> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['currentScene'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const myCharacter = await this.characterRepository.findOne({
      where: { campaignId, userId },
      relations: ['inventory', 'inventory.item'],
    });

    return {
      currentScene: campaign.currentScene || null,
      myCharacter: myCharacter || null,
    };
  }
}
