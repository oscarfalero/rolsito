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
