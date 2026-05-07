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
  stats: Record<string, any>;
  backstory?: string;
  isActive: boolean;
  user?: User;
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
