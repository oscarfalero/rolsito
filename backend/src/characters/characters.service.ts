import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Character } from './entities/character.entity';
import { CampaignMember } from '../campaign-members/entities/campaign-member.entity';
import { CreateCharacterDto } from './dto/create-character.dto';

@Injectable()
export class CharactersService {
  constructor(
    @InjectRepository(Character)
    private characterRepository: Repository<Character>,
    @InjectRepository(CampaignMember)
    private memberRepository: Repository<CampaignMember>,
  ) {}

  async create(userId: string, campaignId: string, dto: CreateCharacterDto): Promise<Character> {
    const membership = await this.memberRepository.findOne({
      where: { userId, campaignId },
    });

    if (!membership) {
      throw new ForbiddenException('You must be a member of this campaign');
    }

    const character = this.characterRepository.create({
      ...dto,
      userId,
      campaignId,
    });

    return this.characterRepository.save(character);
  }

  async findByCampaign(campaignId: string): Promise<Character[]> {
    return this.characterRepository.find({
      where: { campaignId },
      relations: ['user'],
    });
  }

  async findOne(id: string): Promise<Character> {
    const character = await this.characterRepository.findOne({
      where: { id },
      relations: ['user', 'campaign'],
    });
    if (!character) {
      throw new NotFoundException('Character not found');
    }
    return character;
  }
}
