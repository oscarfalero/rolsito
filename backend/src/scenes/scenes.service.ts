import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scene } from './entities/scene.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';

@Injectable()
export class ScenesService {
  constructor(
    @InjectRepository(Scene)
    private sceneRepository: Repository<Scene>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
  ) {}

  async findByCampaign(campaignId: string): Promise<Scene[]> {
    return this.sceneRepository.find({ where: { campaignId } });
  }

  async create(campaignId: string, userId: string, dto: CreateSceneDto): Promise<Scene> {
    await this.verifyOwnership(campaignId, userId);
    const scene = this.sceneRepository.create({ ...dto, campaignId });
    return this.sceneRepository.save(scene);
  }

  async update(id: string, userId: string, dto: UpdateSceneDto): Promise<Scene> {
    const scene = await this.sceneRepository.findOne({ where: { id }, relations: ['campaign'] });
    if (!scene) throw new NotFoundException('Scene not found');
    await this.verifyOwnership(scene.campaignId, userId);
    Object.assign(scene, dto);
    return this.sceneRepository.save(scene);
  }

  async remove(id: string, userId: string): Promise<void> {
    const scene = await this.sceneRepository.findOne({ where: { id }, relations: ['campaign'] });
    if (!scene) throw new NotFoundException('Scene not found');
    await this.verifyOwnership(scene.campaignId, userId);
    await this.sceneRepository.remove(scene);
  }

  async setCurrentScene(campaignId: string, sceneId: string, userId: string): Promise<Campaign> {
    await this.verifyOwnership(campaignId, userId);
    const scene = await this.sceneRepository.findOne({ where: { id: sceneId } });
    if (!scene || scene.campaignId !== campaignId) {
      throw new NotFoundException('Scene not found in this campaign');
    }
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    campaign.currentSceneId = sceneId;
    return this.campaignRepository.save(campaign);
  }

  private async verifyOwnership(campaignId: string, userId: string): Promise<void> {
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign || campaign.createdById !== userId) {
      throw new ForbiddenException('Only campaign owner can manage scenes');
    }
  }
}
