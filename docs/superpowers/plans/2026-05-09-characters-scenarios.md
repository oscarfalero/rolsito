# Characters & Scenarios MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement detailed character creation with stats/modifiers/HP/AC, basic inventory, simple scene management, and enhanced AI DM context.

**Architecture:** Backend gets new Items, Inventory, and Scenes modules. Character entity expands with HP/AC. Campaign gets currentScene tracking. DM prompt includes scene + party summaries. Scene transitions via parsed tags. Frontend gets a character creation wizard, character sheet, scene manager, and enhanced game UI.

**Tech Stack:** NestJS + TypeORM + SQLite, React + Vite + Tailwind, Socket.io, @nestjs/event-emitter

---

## Chunk 1: Database Schema & Entities

### Task 1: Update Character Entity

**Files:**
- Modify: `backend/src/characters/entities/character.entity.ts`

- [ ] **Step 1: Add new columns to Character entity**

Add `currentHp`, `maxHp`, `ac` integer columns and `inventory` OneToMany relation.

```typescript
@Column({ default: 0 })
currentHp: number;

@Column({ default: 0 })
maxHp: number;

@Column({ default: 0 })
ac: number;

@OneToMany(() => CharacterInventory, (inv) => inv.character)
inventory: CharacterInventory[];
```

- [ ] **Step 2: Verify no compilation errors**

Run: `cd backend && npm run build`
Expected: Compiles successfully (will fail later when CharacterInventory is not yet defined, but entity file itself should be valid)

---

### Task 2: Create Item Entity

**Files:**
- Create: `backend/src/items/entities/item.entity.ts`

- [ ] **Step 1: Create Item entity**

```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('items')
export class Item extends BaseEntity {
  @Column()
  campaignId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ['weapon', 'armor', 'consumable', 'misc'] })
  type: string;

  @Column({ default: 'common' })
  rarity: string;

  @Column({ type: 'json', default: '{}' })
  stats: Record<string, any>;

  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;

  @ManyToOne(() => Campaign, (campaign) => campaign.items)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
}
```

---

### Task 3: Create CharacterInventory Entity

**Files:**
- Create: `backend/src/inventory/entities/character-inventory.entity.ts`

- [ ] **Step 1: Create CharacterInventory entity with unique index**

```typescript
import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Character } from '../../characters/entities/character.entity';
import { Item } from '../../items/entities/item.entity';

@Entity('character_inventory')
@Unique(['characterId', 'itemId'])
export class CharacterInventory extends BaseEntity {
  @Column()
  characterId: string;

  @Column()
  itemId: string;

  @Column({ default: 1 })
  quantity: number;

  @ManyToOne(() => Character, (character) => character.inventory)
  @JoinColumn({ name: 'characterId' })
  character: Character;

  @ManyToOne(() => Item, (item) => item.id)
  @JoinColumn({ name: 'itemId' })
  item: Item;
}
```

---

### Task 4: Create Scene Entity

**Files:**
- Create: `backend/src/scenes/entities/scene.entity.ts`

- [ ] **Step 1: Create Scene entity**

```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('scenes')
export class Scene extends BaseEntity {
  @Column()
  campaignId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ['indoor', 'outdoor', 'dungeon', 'town', 'wilderness'] })
  type: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.scenes)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
}
```

---

### Task 5: Update Campaign Entity

**Files:**
- Modify: `backend/src/campaigns/entities/campaign.entity.ts`

- [ ] **Step 1: Add currentSceneId and relations**

Add to Campaign entity:
```typescript
import { Scene } from '../../scenes/entities/scene.entity';
import { Item } from '../../items/entities/item.entity';

@Column({ nullable: true })
currentSceneId: string;

@ManyToOne(() => Scene, { onDelete: 'SET NULL' })
@JoinColumn({ name: 'currentSceneId' })
currentScene: Scene;

@OneToMany(() => Scene, (scene) => scene.campaign)
scenes: Scene[];

@OneToMany(() => Item, (item) => item.campaign)
items: Item[];
```

---

## Chunk 2: Backend Modules (Items, Inventory, Scenes)

### Task 6: Create Items Module

**Files:**
- Create: `backend/src/items/items.module.ts`
- Create: `backend/src/items/items.service.ts`
- Create: `backend/src/items/items.controller.ts`
- Create: `backend/src/items/dto/create-item.dto.ts`
- Create: `backend/src/items/dto/update-item.dto.ts`

- [ ] **Step 1: Create DTOs**

`create-item.dto.ts`:
```typescript
import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['weapon', 'armor', 'consumable', 'misc'])
  type: string;
}
```

`update-item.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateItemDto } from './create-item.dto';

export class UpdateItemDto extends PartialType(CreateItemDto) {}
```

- [ ] **Step 2: Create ItemsService**

```typescript
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
```

- [ ] **Step 3: Create ItemsController**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('campaigns/:campaignId/items')
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findByCampaign(@Param('campaignId') campaignId: string) {
    return this.itemsService.findByCampaign(campaignId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('campaignId') campaignId: string,
    @Body() dto: CreateItemDto,
    @Request() req,
  ) {
    return this.itemsService.create(campaignId, req.user.userId, dto);
  }
}

@Controller('items')
export class ItemManagementController {
  constructor(private itemsService: ItemsService) {}

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateItemDto, @Request() req) {
    return this.itemsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    return this.itemsService.remove(id, req.user.userId);
  }
}
```

- [ ] **Step 4: Create ItemsModule**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsService } from './items.service';
import { ItemsController, ItemManagementController } from './items.controller';
import { Item } from './entities/item.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Item, Campaign])],
  providers: [ItemsService],
  controllers: [ItemsController, ItemManagementController],
  exports: [ItemsService],
})
export class ItemsModule {}
```

---

### Task 7: Create Inventory Module

**Files:**
- Create: `backend/src/inventory/inventory.module.ts`
- Create: `backend/src/inventory/inventory.service.ts`
- Create: `backend/src/inventory/inventory.controller.ts`
- Create: `backend/src/inventory/dto/create-inventory.dto.ts`
- Create: `backend/src/inventory/dto/update-inventory.dto.ts`

- [ ] **Step 1: Create DTOs**

`create-inventory.dto.ts`:
```typescript
import { IsString, IsInt, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
```

`update-inventory.dto.ts`:
```typescript
import { IsInt, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsInt()
  @Min(0)
  quantity: number;
}
```

- [ ] **Step 2: Create InventoryService**

```typescript
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
```

- [ ] **Step 3: Create InventoryController**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('characters/:characterId/inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findByCharacter(@Param('characterId') characterId: string) {
    return this.inventoryService.findByCharacter(characterId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async addItem(
    @Param('characterId') characterId: string,
    @Body() dto: CreateInventoryDto,
    @Request() req,
  ) {
    return this.inventoryService.addItem(characterId, req.user.userId, dto);
  }

  @Patch(':itemId')
  @UseGuards(JwtAuthGuard)
  async updateQuantity(
    @Param('characterId') characterId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInventoryDto,
    @Request() req,
  ) {
    return this.inventoryService.updateQuantity(characterId, itemId, req.user.userId, dto);
  }

  @Delete(':itemId')
  @UseGuards(JwtAuthGuard)
  async removeItem(
    @Param('characterId') characterId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    return this.inventoryService.removeItem(characterId, itemId, req.user.userId);
  }
}
```

- [ ] **Step 4: Create InventoryModule**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { CharacterInventory } from './entities/character-inventory.entity';
import { Character } from '../characters/entities/character.entity';
import { Item } from '../items/entities/item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CharacterInventory, Character, Item])],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
```

---

### Task 8: Create Scenes Module

**Files:**
- Create: `backend/src/scenes/scenes.module.ts`
- Create: `backend/src/scenes/scenes.service.ts`
- Create: `backend/src/scenes/scenes.controller.ts`
- Create: `backend/src/scenes/dto/create-scene.dto.ts`
- Create: `backend/src/scenes/dto/update-scene.dto.ts`

- [ ] **Step 1: Create DTOs**

`create-scene.dto.ts`:
```typescript
import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateSceneDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['indoor', 'outdoor', 'dungeon', 'town', 'wilderness'])
  type: string;
}
```

`update-scene.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateSceneDto } from './create-scene.dto';

export class UpdateSceneDto extends PartialType(CreateSceneDto) {}
```

- [ ] **Step 2: Create ScenesService**

```typescript
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
```

- [ ] **Step 3: Create ScenesController**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('campaigns/:campaignId/scenes')
export class ScenesController {
  constructor(private scenesService: ScenesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findByCampaign(@Param('campaignId') campaignId: string) {
    return this.scenesService.findByCampaign(campaignId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('campaignId') campaignId: string,
    @Body() dto: CreateSceneDto,
    @Request() req,
  ) {
    return this.scenesService.create(campaignId, req.user.userId, dto);
  }

  @Post(':sceneId/activate')
  @UseGuards(JwtAuthGuard)
  async activate(
    @Param('campaignId') campaignId: string,
    @Param('sceneId') sceneId: string,
    @Request() req,
  ) {
    return this.scenesService.setCurrentScene(campaignId, sceneId, req.user.userId);
  }
}

@Controller('scenes')
export class SceneManagementController {
  constructor(private scenesService: ScenesService) {}

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateSceneDto, @Request() req) {
    return this.scenesService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    return this.scenesService.remove(id, req.user.userId);
  }
}
```

- [ ] **Step 4: Create ScenesModule**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScenesService } from './scenes.service';
import { ScenesController, SceneManagementController } from './scenes.controller';
import { Scene } from './entities/scene.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Scene, Campaign])],
  providers: [ScenesService],
  controllers: [ScenesController, SceneManagementController],
  exports: [ScenesService],
})
export class ScenesModule {}
```

---

## Chunk 3: Update Core Backend Services

### Task 9: Update Characters Service with HP/AC Calculations

**Files:**
- Modify: `backend/src/characters/characters.service.ts`
- Create: `backend/src/common/config/class-base-hp.config.ts`
- Create: `backend/src/characters/dto/update-character.dto.ts`

- [ ] **Step 1: Create class base HP config**

```typescript
export const CLASS_BASE_HP: Record<string, number> = {
  fighter: 10,
  wizard: 6,
  rogue: 8,
  cleric: 8,
  ranger: 10,
  paladin: 10,
  barbarian: 12,
  bard: 8,
};

export function calculateModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

export function calculateMaxHp(className: string, level: number, con: number): number {
  const baseHp = CLASS_BASE_HP[className.toLowerCase()] || 8;
  const conMod = calculateModifier(con);
  return baseHp + conMod * level;
}

export function calculateAc(dex: number): number {
  return 10 + calculateModifier(dex);
}
```

- [ ] **Step 2: Create UpdateCharacterDto**

```typescript
import { IsString, IsOptional, IsObject, IsInt, Min } from 'class-validator';

export class UpdateCharacterDto {
  @IsObject()
  @IsOptional()
  stats?: Record<string, number>;

  @IsInt()
  @IsOptional()
  @Min(0)
  currentHp?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxHp?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  ac?: number;

  @IsString()
  @IsOptional()
  backstory?: string;
}
```

- [ ] **Step 3: Rewrite CharactersService**

```typescript
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

    // Validate Standard Array
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

    // Filter allowed fields
    const allowedFields = isDm
      ? ['stats', 'currentHp', 'maxHp', 'ac', 'backstory']
      : ['currentHp', 'backstory'];

    const updates: any = {};
    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        updates[field] = dto[field];
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
```

- [ ] **Step 4: Update CharactersController**

```typescript
import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('campaigns/:campaignId/characters')
export class CharactersController {
  constructor(private charactersService: CharactersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('campaignId') campaignId: string,
    @Body() dto: CreateCharacterDto,
    @Request() req,
  ) {
    return this.charactersService.create(req.user.userId, campaignId, dto);
  }

  @Get()
  async findByCampaign(@Param('campaignId') campaignId: string) {
    return this.charactersService.findByCampaign(campaignId);
  }
}

@Controller('characters')
export class CharacterManagementController {
  constructor(private charactersService: CharactersService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.charactersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCharacterDto,
    @Request() req,
  ) {
    const character = await this.charactersService.findOne(id);
    const isDm = character.campaign.createdById === req.user.userId;
    return this.charactersService.update(id, req.user.userId, dto, isDm);
  }
}
```

---

### Task 10: Update Campaigns Service with Seed Data and State

**Files:**
- Modify: `backend/src/campaigns/campaigns.service.ts`

- [ ] **Step 1: Inject dependencies and add seeding**

Add imports:
```typescript
import { Scene } from '../scenes/entities/scene.entity';
import { Item } from '../items/entities/item.entity';
import { Character } from '../characters/entities/character.entity';
```

Update constructor:
```typescript
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
```

Add after `const saved = await this.campaignRepository.save(campaign);` in `create()`:
```typescript
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
```

- [ ] **Step 2: Add getCampaignState method**

```typescript
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
```

---

### Task 11: Update Campaigns Controller

**Files:**
- Modify: `backend/src/campaigns/campaigns.controller.ts`

- [ ] **Step 1: Add state endpoint**

Add after the existing `@Get(':id')`:
```typescript
@Get(':id/state')
@UseGuards(JwtAuthGuard)
async getState(@Param('id') id: string, @Request() req) {
  return this.campaignsService.getCampaignState(id, req.user.userId);
}
```

---

### Task 12: Update DM Service with Scene Context and Transitions

**Files:**
- Modify: `backend/src/dm/dm.service.ts`

- [ ] **Step 1: Add EventEmitter2 and scene parsing**

Add imports:
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { calculateModifier } from '../common/config/class-base-hp.config';
```

Update constructor:
```typescript
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
```

- [ ] **Step 2: Rewrite generateDmResponse with scene context**

Replace the method with:
```typescript
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
      // Validate scene belongs to campaign
      const sceneRepo = this.campaignRepository.manager.getRepository('Scene');
      const scene = await sceneRepo.findOne({ where: { id: sceneId } });
      if (scene && scene.campaignId === campaignId) {
        campaign.currentSceneId = sceneId;
        await this.campaignRepository.save(campaign);
        this.eventEmitter.emit('scene.changed', {
          campaignId,
          scene: { id: scene.id, name: scene.name, description: scene.description, type: scene.type },
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
```

- [ ] **Step 3: Update buildSystemPrompt**

Replace with:
```typescript
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
```

---

### Task 13: Update Game Gateway for Scene Events

**Files:**
- Modify: `backend/src/game/game.gateway.ts`

- [ ] **Step 1: Add OnEvent listener for scene changes**

Add imports:
```typescript
import { OnEvent } from '@nestjs/event-emitter';
```

Add method to GameGateway:
```typescript
@OnEvent('scene.changed')
handleSceneChanged(payload: { campaignId: string; scene: any }) {
  this.server.to(`campaign_${payload.campaignId}`).emit('scene_changed', payload.scene);
}
```

---

### Task 14: Install Dependencies and Update App Module

**Files:**
- Modify: `backend/src/app.module.ts`
- Shell command

- [ ] **Step 1: Install @nestjs/event-emitter**

Run: `cd backend && npm install @nestjs/event-emitter`

- [ ] **Step 2: Update AppModule**

Add imports:
```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ItemsModule } from './items/items.module';
import { InventoryModule } from './inventory/inventory.module';
import { ScenesModule } from './scenes/scenes.module';
```

Add to imports array (before other modules):
```typescript
EventEmitterModule.forRoot(),
```

Add at end of imports array:
```typescript
ItemsModule,
InventoryModule,
ScenesModule,
```

- [ ] **Step 3: Update CharactersModule**

Modify `backend/src/characters/characters.module.ts` to export CharacterManagementController:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersService } from './characters.service';
import { CharactersController, CharacterManagementController } from './characters.controller';
import { Character } from './entities/character.entity';
import { CampaignMember } from '../campaign-members/entities/campaign-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Character, CampaignMember])],
  providers: [CharactersService],
  controllers: [CharactersController, CharacterManagementController],
  exports: [CharactersService],
})
export class CharactersModule {}
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd backend && npm run build`
Expected: Compiles successfully with no errors

---

## Chunk 4: Frontend Implementation

### Task 15: Update Types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add new types**

Add to the file:
```typescript
export interface Item {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc';
  rarity: string;
  stats: Record<string, any>;
  metadata: Record<string, any>;
}

export interface CharacterInventory {
  id: string;
  characterId: string;
  itemId: string;
  quantity: number;
  item: Item;
}

export interface Scene {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  type: 'indoor' | 'outdoor' | 'dungeon' | 'town' | 'wilderness';
}

export interface CampaignState {
  currentScene: Scene | null;
  myCharacter: Character | null;
}
```

Update Character interface:
```typescript
export interface Character {
  id: string;
  userId: string;
  campaignId: string;
  name: string;
  race?: string;
  class?: string;
  level: number;
  stats: Record<string, number>;
  currentHp: number;
  maxHp: number;
  ac: number;
  backstory?: string;
  isActive: boolean;
  inventory?: CharacterInventory[];
  user?: User;
}
```

---

### Task 16: Update API Service

**Files:**
- Modify: `frontend/src/services/api.service.ts`

- [ ] **Step 1: Add new service methods**

Add after existing services:
```typescript
export const itemService = {
  async getByCampaign(campaignId: string) {
    const response = await api.get(`/campaigns/${campaignId}/items`);
    return response.data;
  },
  async create(campaignId: string, data: { name: string; description?: string; type: string }) {
    const response = await api.post(`/campaigns/${campaignId}/items`, data);
    return response.data;
  },
  async update(id: string, data: Partial<{ name: string; description?: string; type: string }>) {
    const response = await api.patch(`/items/${id}`, data);
    return response.data;
  },
  async remove(id: string) {
    await api.delete(`/items/${id}`);
  },
};

export const sceneService = {
  async getByCampaign(campaignId: string) {
    const response = await api.get(`/campaigns/${campaignId}/scenes`);
    return response.data;
  },
  async create(campaignId: string, data: { name: string; description?: string; type: string }) {
    const response = await api.post(`/campaigns/${campaignId}/scenes`, data);
    return response.data;
  },
  async update(id: string, data: Partial<{ name: string; description?: string; type: string }>) {
    const response = await api.patch(`/scenes/${id}`, data);
    return response.data;
  },
  async remove(id: string) {
    await api.delete(`/scenes/${id}`);
  },
  async activate(campaignId: string, sceneId: string) {
    const response = await api.post(`/campaigns/${campaignId}/scenes/${sceneId}/activate`);
    return response.data;
  },
};

export const inventoryService = {
  async getByCharacter(characterId: string) {
    const response = await api.get(`/characters/${characterId}/inventory`);
    return response.data;
  },
  async addItem(characterId: string, data: { itemId: string; quantity: number }) {
    const response = await api.post(`/characters/${characterId}/inventory`, data);
    return response.data;
  },
  async updateQuantity(characterId: string, itemId: string, quantity: number) {
    const response = await api.patch(`/characters/${characterId}/inventory/${itemId}`, { quantity });
    return response.data;
  },
  async removeItem(characterId: string, itemId: string) {
    await api.delete(`/characters/${characterId}/inventory/${itemId}`);
  },
};

export const campaignStateService = {
  async getState(campaignId: string) {
    const response = await api.get(`/campaigns/${campaignId}/state`);
    return response.data;
  },
};

export const characterManagementService = {
  async getOne(id: string) {
    const response = await api.get(`/characters/${id}`);
    return response.data;
  },
  async update(id: string, data: Partial<{ currentHp?: number; backstory?: string }>) {
    const response = await api.patch(`/characters/${id}`, data);
    return response.data;
  },
};
```

---

### Task 17: Rewrite CharacterNew as 3-Step Wizard

**Files:**
- Modify: `frontend/src/pages/CharacterNew.tsx`

- [ ] **Step 1: Implement full wizard**

Replace the entire file:
```typescript
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { characterService } from '../services/api.service';

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Orc', 'Tiefling'];
const CLASSES = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Paladin', 'Barbarian', 'Bard'];
const CLASS_BASE_HP: Record<string, number> = {
  Fighter: 10, Wizard: 6, Rogue: 8, Cleric: 8,
  Ranger: 10, Paladin: 10, Barbarian: 12, Bard: 8,
};

function calculateModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

function calculateHp(className: string, con: number): number {
  const base = CLASS_BASE_HP[className] || 8;
  return base + calculateModifier(con);
}

function calculateAc(dex: number): number {
  return 10 + calculateModifier(dex);
}

export default function CharacterNew() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [race, setRace] = useState('');
  const [className, setClassName] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({
    str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0,
  });
  const [backstory, setBackstory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getAvailableValues = (statKey: string): number[] => {
    const used = Object.entries(stats)
      .filter(([k]) => k !== statKey)
      .map(([, v]) => v)
      .filter((v) => v > 0);
    return STANDARD_ARRAY.filter((v) => !used.includes(v));
  };

  const handleStatChange = (stat: string, value: number) => {
    setStats((prev) => ({ ...prev, [stat]: value }));
  };

  const hp = className && stats.con > 0 ? calculateHp(className, stats.con) : 0;
  const ac = stats.dex > 0 ? calculateAc(stats.dex) : 0;

  const canProceedStep2 = () => {
    return Object.values(stats).every((v) => v > 0) &&
      new Set(Object.values(stats)).size === 6;
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await characterService.create(id!, {
        name,
        race,
        class: className,
        stats,
        backstory,
      });
      navigate(`/campaigns/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create character');
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Character Name</label>
        <input
          type="text"
          required
          minLength={2}
          maxLength={50}
          className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Aldric the Brave"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Race</label>
          <select
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white"
            value={race}
            onChange={(e) => setRace(e.target.value)}
          >
            <option value="">Select race</option>
            {RACES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Class</label>
          <select
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          >
            <option value="">Select class</option>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <button
        onClick={() => setStep(2)}
        disabled={!name || !race || !className}
        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
      >
        Next: Assign Stats
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {STATS.map((stat) => (
          <div key={stat}>
            <label className="block text-sm font-medium text-gray-300 mb-1 uppercase">
              {stat} {stats[stat] > 0 && (
                <span className={calculateModifier(stats[stat]) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  ({calculateModifier(stats[stat]) >= 0 ? '+' : ''}{calculateModifier(stats[stat])})
                </span>
              )}
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white"
              value={stats[stat] || ''}
              onChange={(e) => handleStatChange(stat, Number(e.target.value))}
            >
              <option value="">Select</option>
              {getAvailableValues(stat).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="bg-gray-800 p-4 rounded-md">
        <div className="flex justify-between text-sm text-gray-300">
          <span>HP Preview: <span className="text-green-400 font-bold">{hp}</span></span>
          <span>AC Preview: <span className="text-blue-400 font-bold">{ac}</span></span>
        </div>
      </div>
      <div className="flex space-x-4">
        <button onClick={() => setStep(1)} className="px-4 py-2 border border-gray-600 rounded-md text-gray-300">
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!canProceedStep2()}
          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
        >
          Next: Review
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Backstory</label>
        <textarea
          rows={4}
          maxLength={2000}
          className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white"
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          placeholder="Tell us about your character's past..."
        />
      </div>
      <div className="bg-gray-800 p-4 rounded-md space-y-2">
        <h3 className="font-bold text-white">{name}</h3>
        <p className="text-gray-400">{race} {className} (Level 1)</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {STATS.map((s) => (
            <div key={s} className="text-gray-300">
              {s.toUpperCase()}: {stats[s]} ({calculateModifier(stats[s]) >= 0 ? '+' : ''}{calculateModifier(stats[s])})
            </div>
          ))}
        </div>
        <div className="flex space-x-4 text-sm">
          <span className="text-green-400">HP: {hp}</span>
          <span className="text-blue-400">AC: {ac}</span>
        </div>
      </div>
      <div className="flex space-x-4">
        <button onClick={() => setStep(2)} className="px-4 py-2 border border-gray-600 rounded-md text-gray-300">
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Character'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create Character</h1>
        <p className="text-gray-400 mb-8">Step {step} of 3</p>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
}
```

---

### Task 18: Create CharacterSheet Page

**Files:**
- Create: `frontend/src/pages/CharacterSheet.tsx`

- [ ] **Step 1: Create CharacterSheet component**

```typescript
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { characterManagementService } from '../services/api.service';
import { Character } from '../types';

function calculateModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

export default function CharacterSheet() {
  const { id, characterId } = useParams<{ id: string; characterId: string }>();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    characterManagementService.getOne(characterId!).then((data) => {
      setCharacter(data);
      setLoading(false);
    });
  }, [characterId]);

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
  if (!character) return <div className="min-h-screen bg-gray-900 text-white p-8">Character not found</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to={`/campaigns/${id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">← Back to Campaign</Link>
        
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{character.name}</h1>
              <p className="text-gray-400 mt-1">{character.race} {character.class} (Level {character.level})</p>
            </div>
            <div className="flex space-x-4">
              <div className="bg-red-900 px-4 py-2 rounded text-center">
                <div className="text-xs text-red-300">HP</div>
                <div className="text-xl font-bold">{character.currentHp}/{character.maxHp}</div>
              </div>
              <div className="bg-blue-900 px-4 py-2 rounded text-center">
                <div className="text-xs text-blue-300">AC</div>
                <div className="text-xl font-bold">{character.ac}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          {Object.entries(character.stats).map(([stat, value]) => (
            <div key={stat} className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-400 uppercase">{stat}</div>
              <div className="text-2xl font-bold">{value}</div>
              <div className={`text-sm ${calculateModifier(value) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {calculateModifier(value) >= 0 ? '+' : ''}{calculateModifier(value)}
              </div>
            </div>
          ))}
        </div>

        {character.backstory && (
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-2">Backstory</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{character.backstory}</p>
          </div>
        )}

        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Inventory</h2>
          {character.inventory && character.inventory.length > 0 ? (
            <div className="space-y-2">
              {character.inventory.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                  <div>
                    <span className="font-medium">{inv.item.name}</span>
                    <span className="text-gray-400 text-sm ml-2">({inv.item.type})</span>
                  </div>
                  <span className="text-gray-400">x{inv.quantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No items</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Task 19: Create ScenesManager Page

**Files:**
- Create: `frontend/src/pages/ScenesManager.tsx`

- [ ] **Step 1: Create ScenesManager component**

```typescript
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sceneService } from '../services/api.service';
import { Scene } from '../types';

const SCENE_TYPES = ['indoor', 'outdoor', 'dungeon', 'town', 'wilderness'];

export default function ScenesManager() {
  const { id } = useParams<{ id: string }>();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('indoor');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadScenes();
  }, [id]);

  const loadScenes = () => {
    sceneService.getByCampaign(id!).then(setScenes);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await sceneService.create(id!, { name, description, type });
    setName('');
    setDescription('');
    setType('indoor');
    loadScenes();
    setLoading(false);
  };

  const handleActivate = async (sceneId: string) => {
    await sceneService.activate(id!, sceneId);
    loadScenes();
  };

  const handleDelete = async (sceneId: string) => {
    if (!confirm('Delete this scene?')) return;
    await sceneService.remove(sceneId);
    loadScenes();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to={`/campaigns/${id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">← Back to Campaign</Link>
        <h1 className="text-3xl font-bold mt-4 mb-8">Scene Management</h1>

        <form onSubmit={handleCreate} className="bg-gray-800 rounded-lg p-6 mb-8 space-y-4">
          <h2 className="text-lg font-bold">Create New Scene</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {SCENE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
          >
            Create Scene
          </button>
        </form>

        <div className="space-y-4">
          {scenes.map((scene) => (
            <div key={scene.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{scene.name}</h3>
                  <p className="text-gray-400 text-sm">{scene.type}</p>
                  {scene.description && <p className="text-gray-300 mt-1">{scene.description}</p>}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleActivate(scene.id)}
                    className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm"
                  >
                    Set Active
                  </button>
                  <button
                    onClick={() => handleDelete(scene.id)}
                    className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### Task 20: Update GamePlay with Scene Panel and Character Sidebar

**Files:**
- Modify: `frontend/src/pages/GamePlay.tsx`
- Modify: `frontend/src/hooks/useSocket.ts`

- [ ] **Step 1: Update useSocket hook to handle scene changes**

Add to `useSocket.ts`:
```typescript
const [currentScene, setCurrentScene] = useState<any>(null);
```

In the socket event listeners section, add:
```typescript
socket.on('scene_changed', (scene) => {
  setCurrentScene(scene);
});
```

Add `currentScene` to the return object.

- [ ] **Step 2: Update GamePlay component**

Replace the imports and add state:
```typescript
import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { GameMessage, CampaignState } from '../types';
import { campaignStateService } from '../services/api.service';

function calculateModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}
```

Add state:
```typescript
const [campaignState, setCampaignState] = useState<CampaignState | null>(null);
```

Add useEffect:
```typescript
useEffect(() => {
  campaignStateService.getState(id!).then(setCampaignState);
}, [id]);
```

Add Scene Panel before messages:
```typescript
{currentScene && (
  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4 animate-fadeIn">
    <h3 className="text-lg font-bold text-indigo-400">{currentScene.name}</h3>
    <p className="text-gray-300 text-sm">{currentScene.description}</p>
    <span className="text-xs text-gray-500">{currentScene.type}</span>
  </div>
)}
```

Add Character Sidebar section:
```typescript
<div className="p-4 border-t border-gray-700">
  <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">Character</h3>
  {campaignState?.myCharacter ? (
    <div className="space-y-2">
      <div className="text-sm text-white font-medium">{campaignState.myCharacter.name}</div>
      <div className="flex space-x-2 text-xs">
        <span className="text-red-400">HP: {campaignState.myCharacter.currentHp}/{campaignState.myCharacter.maxHp}</span>
        <span className="text-blue-400">AC: {campaignState.myCharacter.ac}</span>
      </div>
      {campaignState.myCharacter.inventory && campaignState.myCharacter.inventory.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 uppercase">Inventory</div>
          {campaignState.myCharacter.inventory.map((inv) => (
            <div key={inv.id} className="text-xs text-gray-300 flex justify-between">
              <span>{inv.item.name}</span>
              <span className="text-gray-500">x{inv.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : (
    <Link
      to={`/campaigns/${id}/characters/new`}
      className="text-sm text-indigo-400 hover:text-indigo-300"
    >
      + Create Character
    </Link>
  )}
</div>
```

- [ ] **Step 3: Verify frontend compiles**

Run: `cd frontend && npm run build`
Expected: Builds successfully

---

### Task 21: Update CampaignDetail with Links

**Files:**
- Modify: `frontend/src/pages/CampaignDetail.tsx`

- [ ] **Step 1: Add links to character sheet and scene manager**

In the character list section, wrap each character name with a Link to `/campaigns/:id/characters/:characterId`.

Add a "Manage Scenes" button for the campaign owner.

---

### Task 22: Update App.tsx Routes

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add new routes**

Add imports:
```typescript
import CharacterSheet from './pages/CharacterSheet';
import ScenesManager from './pages/ScenesManager';
```

Add routes:
```typescript
<Route
  path="/campaigns/:id/characters/:characterId"
  element={
    <PrivateRoute>
      <CharacterSheet />
    </PrivateRoute>
  }
/>
<Route
  path="/campaigns/:id/scenes"
  element={
    <PrivateRoute>
      <ScenesManager />
    </PrivateRoute>
  }
/>
```

---

## Chunk 5: Verification

### Task 23: End-to-End Verification

- [ ] **Step 1: Start backend**

Run: `cd backend && npm run start:dev`
Expected: Starts without errors, TypeORM synchronizes new tables

- [ ] **Step 2: Start frontend**

Run: `cd frontend && npm run dev`
Expected: Starts without errors

- [ ] **Step 3: Test character creation**

1. Log in, go to a campaign
2. Create a character using the wizard
3. Verify stats are calculated correctly
4. Check character sheet displays properly

- [ ] **Step 4: Test scenes**

1. Go to scene manager
2. Create a new scene
3. Activate it
4. Verify game UI shows the scene

- [ ] **Step 5: Test DM scene transitions**

1. Start a game session
2. Have the DM respond with a scene change
3. Verify all players see the new scene

- [ ] **Step 6: Commit all changes**

```bash
git add .
git commit -m "feat(sp2): implement characters & scenarios MVP"
```
