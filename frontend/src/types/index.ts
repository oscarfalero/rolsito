export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  dmModel: string;
  maxPlayers: number;
  status: string;
  createdById: string;
  createdAt: string;
  members?: CampaignMember[];
  characters?: Character[];
  currentScene?: Scene;
}

export interface CampaignMember {
  id: string;
  userId: string;
  campaignId: string;
  role: string;
  user?: User;
}

export interface Character {
  id: string;
  userId: string;
  campaignId: string;
  name: string;
  race?: string;
  class?: string;
  level: number;
  stats: Record<string, number>;
  currentHp: number;
  maxHp: number;
  ac: number;
  backstory?: string;
  isActive: boolean;
  inventory?: CharacterInventory[];
  user?: User;
}

export interface Item {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc';
  rarity: string;
  stats: Record<string, any>;
  metadata: Record<string, any>;
}

export interface CharacterInventory {
  id: string;
  characterId: string;
  itemId: string;
  quantity: number;
  item: Item;
}

export interface Scene {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  type: 'indoor' | 'outdoor' | 'dungeon' | 'town' | 'wilderness';
}

export interface CampaignState {
  currentScene: Scene | null;
  myCharacter: Character | null;
}

export interface GameMessage {
  id?: string;
  senderType: 'player' | 'dm' | 'system';
  senderId?: string;
  characterId?: string;
  characterName?: string;
  content: string;
  createdAt: string;
}
