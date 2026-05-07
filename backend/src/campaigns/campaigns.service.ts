import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignMember } from '../campaign-members/entities/campaign-member.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignMember)
    private memberRepository: Repository<CampaignMember>,
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
      relations: ['createdBy', 'members', 'members.user', 'characters'],
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
}
