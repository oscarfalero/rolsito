import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('campaign_members')
@Unique(['userId', 'campaignId'])
export class CampaignMember extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  campaignId: string;

  @Column({ default: 'player' })
  role: string;

  @ManyToOne(() => User, (user) => user.campaignMemberships)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Campaign, (campaign) => campaign.members)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
}
