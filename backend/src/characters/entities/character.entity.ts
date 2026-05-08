import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { Message } from '../../messages/entities/message.entity';

@Entity('characters')
export class Character extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  campaignId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  race: string;

  @Column({ nullable: true })
  class: string;

  @Column({ default: 1 })
  level: number;

  @Column({ type: 'json', default: '{}' })
  stats: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  backstory: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.characters)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Campaign, (campaign) => campaign.characters)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @OneToMany(() => Message, (message) => message.character)
  messages: Message[];
}
