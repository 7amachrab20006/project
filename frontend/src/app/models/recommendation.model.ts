export interface RecommendedProduct {
  name: string;
  price: number;
  cpu: string;
  ram: number;
  battery_hours: number;
  score: number;
  reason: string;
  source_url: string;
}

export interface FinalRecommendation {
  user_request: string;
  recommended_products: RecommendedProduct[];
  summary: string;
}

export interface RecommendationRequest {
  user_request: string;
}

export interface SearchHistoryItem {
  _id?: string;
  user_request: string;
  recommendation: FinalRecommendation;
  timestamp?: string;
}

export interface AgentStep {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  details?: string;
}

export interface SystemHealth {
  status: 'online' | 'offline' | 'checking';
  message?: string;
  lastChecked?: Date;
}
