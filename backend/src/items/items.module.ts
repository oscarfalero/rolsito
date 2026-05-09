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
