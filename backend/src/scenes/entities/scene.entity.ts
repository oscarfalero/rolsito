import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('scenes')
export class Scene extends BaseEntity {
  @Column()
  campaignId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-enum', enum: ['indoor', 'outdoor', 'dungeon', 'town', 'wilderness'] })
  type: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.scenes)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
}
