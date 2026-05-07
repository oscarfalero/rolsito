import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { TurnService } from './turn.service';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Character } from '../characters/entities/character.entity';
import { CampaignMember } from '../campaign-members/entities/campaign-member.entity';
import { GameSessionsModule } from '../game-sessions/game-sessions.module';
import { MemoryModule } from '../memory/memory.module';
import { DmModule } from '../dm/dm.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CharactersModule } from '../characters/characters.module';
import { RedisService } from '../common/services/redis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Character, CampaignMember]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
    GameSessionsModule,
    MemoryModule,
    DmModule,
    CampaignsModule,
    CharactersModule,
  ],
  providers: [GameGateway, GameService, TurnService, RedisService],
})
export class GameModule {}
