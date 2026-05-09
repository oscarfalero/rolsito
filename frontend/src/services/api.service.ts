import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(credentials: RegisterCredentials) {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },
};

export const campaignService = {
  async getAll() {
    const response = await api.get('/campaigns');
    return response.data;
  },

  async getMyCampaigns() {
    const response = await api.get('/campaigns/my');
    return response.data;
  },

  async getOne(id: string) {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },

  async create(data: { name: string; description?: string; systemPrompt: string; maxPlayers?: number }) {
    const response = await api.post('/campaigns', data);
    return response.data;
  },

  async join(id: string) {
    const response = await api.post(`/campaigns/${id}/join`);
    return response.data;
  },
};

export const characterService = {
  async getByCampaign(campaignId: string) {
    const response = await api.get(`/campaigns/${campaignId}/characters`);
    return response.data;
  },

  async create(campaignId: string, data: { name: string; race?: string; class?: string; stats?: Record<string, any>; backstory?: string }) {
    const response = await api.post(`/campaigns/${campaignId}/characters`, data);
    return response.data;
  },
};

export const itemService = {
  async getByCampaign(campaignId: string) {
    const response = await api.get(`/campaigns/${campaignId}/items`);
    return response.data;
  },
  async create(campaignId: string, data: { name: string; description?: string; type: string }) {
    const response = await api.post(`/campaigns/${campaignId}/items`, data);
    return response.data;
  },
  async update(id: string, data: Partial<{ name: string; description?: string; type: string }>) {
    const response = await api.patch(`/items/${id}`, data);
    return response.data;
  },
  async remove(id: string) {
    await api.delete(`/items/${id}`);
  },
};

export const sceneService = {
  async getByCampaign(campaignId: string) {
    const response = await api.get(`/campaigns/${campaignId}/scenes`);
    return response.data;
  },
  async create(campaignId: string, data: { name: string; description?: string; type: string }) {
    const response = await api.post(`/campaigns/${campaignId}/scenes`, data);
    return response.data;
  },
  async update(id: string, data: Partial<{ name: string; description?: string; type: string }>) {
    const response = await api.patch(`/scenes/${id}`, data);
    return response.data;
  },
  async remove(id: string) {
    await api.delete(`/scenes/${id}`);
  },
  async activate(campaignId: string, sceneId: string) {
    const response = await api.post(`/campaigns/${campaignId}/scenes/${sceneId}/activate`);
    return response.data;
  },
};

export const inventoryService = {
  async getByCharacter(characterId: string) {
    const response = await api.get(`/characters/${characterId}/inventory`);
    return response.data;
  },
  async addItem(characterId: string, data: { itemId: string; quantity: number }) {
    const response = await api.post(`/characters/${characterId}/inventory`, data);
    return response.data;
  },
  async updateQuantity(characterId: string, itemId: string, quantity: number) {
    const response = await api.patch(`/characters/${characterId}/inventory/${itemId}`, { quantity });
    return response.data;
  },
  async removeItem(characterId: string, itemId: string) {
    await api.delete(`/characters/${characterId}/inventory/${itemId}`);
  },
};

export const campaignStateService = {
  async getState(campaignId: string) {
    const response = await api.get(`/campaigns/${campaignId}/state`);
    return response.data;
  },
};

export const characterManagementService = {
  async getOne(id: string) {
    const response = await api.get(`/characters/${id}`);
    return response.data;
  },
  async update(id: string, data: Partial<{ currentHp?: number; backstory?: string }>) {
    const response = await api.patch(`/characters/${id}`, data);
    return response.data;
  },
};

export default api;
