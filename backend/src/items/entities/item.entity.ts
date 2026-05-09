import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('items')
export class Item extends BaseEntity {
  @Column()
  campaignId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-enum', enum: ['weapon', 'armor', 'consumable', 'misc'] })
  type: string;

  @Column({ default: 'common' })
  rarity: string;

  @Column({ type: 'json', default: '{}' })
  stats: Record<string, any>;

  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;

  @ManyToOne(() => Campaign, (campaign) => campaign.items)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
}
