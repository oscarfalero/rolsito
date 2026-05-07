import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { Character } from '../../characters/entities/character.entity';
import { CampaignMember } from '../../campaign-members/entities/campaign-member.entity';
import { Message } from '../../messages/entities/message.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ default: 'player' })
  role: string;

  @OneToMany(() => Campaign, (campaign) => campaign.createdBy)
  campaigns: Campaign[];

  @OneToMany(() => CampaignMember, (member) => member.user)
  campaignMemberships: CampaignMember[];

  @OneToMany(() => Character, (character) => character.user)
  characters: Character[];

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];
}
