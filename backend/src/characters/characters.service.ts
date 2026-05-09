import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Character } from './entities/character.entity';
import { CampaignMember } from '../campaign-members/entities/campaign-member.entity';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { calculateMaxHp, calculateAc } from '../common/config/class-base-hp.config';

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

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

    const existing = await this.characterRepository.findOne({
      where: { userId, campaignId },
    });
    if (existing) {
      throw new ConflictException('You already have a character in this campaign');
    }

    const statValues = Object.values(dto.stats || {});
    const sortedInput = [...statValues].sort((a, b) => b - a);
    const sortedStandard = [...STANDARD_ARRAY].sort((a, b) => b - a);
    if (JSON.stringify(sortedInput) !== JSON.stringify(sortedStandard)) {
      throw new ForbiddenException('Stats must use the Standard Array (15, 14, 13, 12, 10, 8)');
    }

    const stats = dto.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const maxHp = calculateMaxHp(dto.class || '', 1, stats.con);
    const ac = calculateAc(stats.dex);

    const character = this.characterRepository.create({
      ...dto,
      userId,
      campaignId,
      level: 1,
      stats,
      maxHp,
      currentHp: maxHp,
      ac,
    });

    return this.characterRepository.save(character);
  }

  async findByCampaign(campaignId: string): Promise<Character[]> {
    return this.characterRepository.find({
      where: { campaignId },
      relations: ['user', 'inventory', 'inventory.item'],
    });
  }

  async findOne(id: string): Promise<Character> {
    const character = await this.characterRepository.findOne({
      where: { id },
      relations: ['user', 'campaign', 'inventory', 'inventory.item'],
    });
    if (!character) {
      throw new NotFoundException('Character not found');
    }
    return character;
  }

  async update(id: string, userId: string, dto: UpdateCharacterDto, isDm: boolean): Promise<Character> {
    const character = await this.findOne(id);

    if (!isDm && character.userId !== userId) {
      throw new ForbiddenException('You can only update your own character');
    }

    const allowedFields = isDm
      ? ['stats', 'currentHp', 'maxHp', 'ac', 'backstory']
      : ['currentHp', 'backstory'];

    const updates: any = {};
    for (const field of allowedFields) {
      if ((dto as any)[field] !== undefined) {
        updates[field] = (dto as any)[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ForbiddenException('No valid fields to update');
    }

    if (updates.stats) {
      const maxHp = calculateMaxHp(character.class || '', character.level, updates.stats.con);
      const ac = calculateAc(updates.stats.dex);
      updates.maxHp = maxHp;
      updates.ac = ac;
    }

    if (updates.maxHp !== undefined && updates.currentHp === undefined) {
      if (character.currentHp > updates.maxHp) {
        updates.currentHp = updates.maxHp;
      }
    }

    if (updates.currentHp !== undefined) {
      updates.currentHp = Math.min(updates.currentHp, updates.maxHp || character.maxHp);
      updates.currentHp = Math.max(0, updates.currentHp);
    }

    Object.assign(character, updates);
    return this.characterRepository.save(character);
  }
}
