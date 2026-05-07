import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DmService } from './dm.service';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Character } from '../characters/entities/character.entity';
import { LlmModule } from '../llm/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Character]),
    LlmModule,
    MemoryModule,
    MessagesModule,
  ],
  providers: [DmService],
  exports: [DmService],
})
export class DmModule {}
