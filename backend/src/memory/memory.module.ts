import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryService } from './memory.service';
import { GameSession } from '../game-sessions/entities/game-session.entity';
import { Message } from '../messages/entities/message.entity';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [TypeOrmModule.forFeature([GameSession, Message]), LlmModule],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
