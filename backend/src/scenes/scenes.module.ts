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
