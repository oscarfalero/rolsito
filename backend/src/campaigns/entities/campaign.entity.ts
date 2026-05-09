import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CampaignMember } from '../../campaign-members/entities/campaign-member.entity';
import { Character } from '../../characters/entities/character.entity';
import { GameSession } from '../../game-sessions/entities/game-session.entity';
import { Scene } from '../../scenes/entities/scene.entity';
import { Item } from '../../items/entities/item.entity';

@Entity('campaigns')
export class Campaign extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  systemPrompt: string;

  @Column({ default: 'gpt-4o' })
  dmModel: string;

  @Column({ default: 4 })
  maxPlayers: number;

  @Column({ default: 'draft' })
  status: string;

  @Column()
  createdById: string;

  @Column({ nullable: true })
  currentSceneId: string;

  @ManyToOne(() => Scene, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'currentSceneId' })
  currentScene: Scene;

  @ManyToOne(() => User, (user) => user.campaigns)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => CampaignMember, (member) => member.campaign)
  members: CampaignMember[];

  @OneToMany(() => Character, (character) => character.campaign)
  characters: Character[];

  @OneToMany(() => GameSession, (session) => session.campaign)
  sessions: GameSession[];

  @OneToMany(() => Scene, (scene) => scene.campaign)
  scenes: Scene[];

  @OneToMany(() => Item, (item) => item.campaign)
  items: Item[];
}
