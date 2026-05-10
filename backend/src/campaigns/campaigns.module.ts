import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Campaign } from './entities/campaign.entity';
import { CampaignMember } from '../campaign-members/entities/campaign-member.entity';
import { Scene } from '../scenes/entities/scene.entity';
import { Item } from '../items/entities/item.entity';
import { Character } from '../characters/entities/character.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, CampaignMember, Scene, Item, Character])],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
