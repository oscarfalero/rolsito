import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './entities/item.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
  ) {}

  async findByCampaign(campaignId: string): Promise<Item[]> {
    return this.itemRepository.find({ where: { campaignId } });
  }

  async create(campaignId: string, userId: string, dto: CreateItemDto): Promise<Item> {
    await this.verifyOwnership(campaignId, userId);
    const item = this.itemRepository.create({ ...dto, campaignId });
    return this.itemRepository.save(item);
  }

  async update(id: string, userId: string, dto: UpdateItemDto): Promise<Item> {
    const item = await this.itemRepository.findOne({ where: { id }, relations: ['campaign'] });
    if (!item) throw new NotFoundException('Item not found');
    await this.verifyOwnership(item.campaignId, userId);
    Object.assign(item, dto);
    return this.itemRepository.save(item);
  }

  async remove(id: string, userId: string): Promise<void> {
    const item = await this.itemRepository.findOne({ where: { id }, relations: ['campaign'] });
    if (!item) throw new NotFoundException('Item not found');
    await this.verifyOwnership(item.campaignId, userId);
    await this.itemRepository.remove(item);
  }

  private async verifyOwnership(campaignId: string, userId: string): Promise<void> {
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign || campaign.createdById !== userId) {
      throw new ForbiddenException('Only campaign owner can manage items');
    }
  }
}
