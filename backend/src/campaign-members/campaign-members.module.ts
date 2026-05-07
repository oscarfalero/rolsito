import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignMember } from './entities/campaign-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignMember])],
  exports: [TypeOrmModule],
})
export class CampaignMembersModule {}
