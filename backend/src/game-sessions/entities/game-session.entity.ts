import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { Message } from '../../messages/entities/message.entity';

@Entity('game_sessions')
export class GameSession extends BaseEntity {
  @Column()
  campaignId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  summaryText: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date;

  @ManyToOne(() => Campaign, (campaign) => campaign.sessions)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @OneToMany(() => Message, (message) => message.session)
  messages: Message[];
}
