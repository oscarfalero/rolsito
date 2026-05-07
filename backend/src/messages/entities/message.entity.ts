import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { GameSession } from '../../game-sessions/entities/game-session.entity';
import { User } from '../../users/entities/user.entity';
import { Character } from '../../characters/entities/character.entity';

@Entity('messages')
export class Message extends BaseEntity {
  @Column()
  sessionId: string;

  @Column()
  senderType: string;

  @Column({ nullable: true })
  senderId: string;

  @Column({ nullable: true })
  characterId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ManyToOne(() => GameSession, (session) => session.messages)
  @JoinColumn({ name: 'sessionId' })
  session: GameSession;

  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => Character, (character) => character.messages)
  @JoinColumn({ name: 'characterId' })
  character: Character;
}
