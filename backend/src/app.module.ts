import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CampaignMembersModule } from './campaign-members/campaign-members.module';
import { CharactersModule } from './characters/characters.module';
import { GameSessionsModule } from './game-sessions/game-sessions.module';
import { MessagesModule } from './messages/messages.module';
import { GameModule } from './game/game.module';
import { DmModule } from './dm/dm.module';
import { MemoryModule } from './memory/memory.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    UsersModule,
    AuthModule,
    CampaignsModule,
    CampaignMembersModule,
    CharactersModule,
    GameSessionsModule,
    MessagesModule,
    GameModule,
    DmModule,
    MemoryModule,
    LlmModule,
  ],
})
export class AppModule {}
