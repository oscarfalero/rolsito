import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CharacterInventory } from './entities/character-inventory.entity';
import { Character } from '../characters/entities/character.entity';
import { Item } from '../items/entities/item.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(CharacterInventory)
    private inventoryRepository: Repository<CharacterInventory>,
    @InjectRepository(Character)
    private characterRepository: Repository<Character>,
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
  ) {}

  async findByCharacter(characterId: string): Promise<CharacterInventory[]> {
    return this.inventoryRepository.find({
      where: { characterId },
      relations: ['item'],
    });
  }

  async addItem(characterId: string, userId: string, dto: CreateInventoryDto): Promise<CharacterInventory> {
    await this.verifyCharacterOwnership(characterId, userId);

    const character = await this.characterRepository.findOne({ where: { id: characterId } });
    const item = await this.itemRepository.findOne({ where: { id: dto.itemId } });

    if (!item) throw new NotFoundException('Item not found');
    if (item.campaignId !== character.campaignId) {
      throw new ForbiddenException('Item does not belong to this campaign');
    }

    const existing = await this.inventoryRepository.findOne({
      where: { characterId, itemId: dto.itemId },
    });

    if (existing) {
      existing.quantity += dto.quantity;
      return this.inventoryRepository.save(existing);
    }

    const inventory = this.inventoryRepository.create({
      characterId,
      itemId: dto.itemId,
      quantity: dto.quantity,
    });
    return this.inventoryRepository.save(inventory);
  }

  async updateQuantity(
    characterId: string,
    itemId: string,
    userId: string,
    dto: UpdateInventoryDto,
  ): Promise<CharacterInventory> {
    await this.verifyCharacterOwnership(characterId, userId);

    const inventory = await this.inventoryRepository.findOne({
      where: { characterId, itemId },
    });
    if (!inventory) throw new NotFoundException('Item not in inventory');

    if (dto.quantity === 0) {
      await this.inventoryRepository.remove(inventory);
      return { ...inventory, quantity: 0 } as CharacterInventory;
    }

    inventory.quantity = dto.quantity;
    return this.inventoryRepository.save(inventory);
  }

  async removeItem(characterId: string, itemId: string, userId: string): Promise<void> {
    await this.verifyCharacterOwnership(characterId, userId);
    const inventory = await this.inventoryRepository.findOne({
      where: { characterId, itemId },
    });
    if (!inventory) throw new NotFoundException('Item not in inventory');
    await this.inventoryRepository.remove(inventory);
  }

  private async verifyCharacterOwnership(characterId: string, userId: string): Promise<void> {
    const character = await this.characterRepository.findOne({ where: { id: characterId } });
    if (!character) throw new NotFoundException('Character not found');
    if (character.userId !== userId) {
      throw new ForbiddenException('You can only manage your own inventory');
    }
  }
}
