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

export default api;
