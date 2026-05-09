import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Character } from '../../characters/entities/character.entity';
import { Item } from '../../items/entities/item.entity';

@Entity('character_inventory')
@Unique(['characterId', 'itemId'])
export class CharacterInventory extends BaseEntity {
  @Column()
  characterId: string;

  @Column()
  itemId: string;

  @Column({ default: 1 })
  quantity: number;

  @ManyToOne(() => Character, (character) => character.inventory)
  @JoinColumn({ name: 'characterId' })
  character: Character;

  @ManyToOne(() => Item, (item) => item.id)
  @JoinColumn({ name: 'itemId' })
  item: Item;
}
