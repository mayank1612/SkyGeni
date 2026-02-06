import type {
  SummaryResponse,
  DriversResponse,
  RiskFactorsResponse,
  RecommendationsResponse,
  QuartersResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function fetchApi<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  getQuarters: () => fetchApi<QuartersResponse>('/quarters'),

  getSummary: (quarter?: string, compareWith?: string) =>
    fetchApi<SummaryResponse>('/summary', { quarter: quarter || '', compareWith: compareWith || '' }),

  getDrivers: (quarter?: string, compareWith?: string) =>
    fetchApi<DriversResponse>('/drivers', { quarter: quarter || '', compareWith: compareWith || '' }),

  getRiskFactors: (quarter?: string) =>
    fetchApi<RiskFactorsResponse>('/risk-factors', { quarter: quarter || '' }),

  getRecommendations: (quarter?: string, compareWith?: string) =>
    fetchApi<RecommendationsResponse>('/recommendations', { quarter: quarter || '', compareWith: compareWith || '' }),
};

export default api;
