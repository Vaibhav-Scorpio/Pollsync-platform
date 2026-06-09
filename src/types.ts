export interface Option {
  id: string;
  text: string;
  votes: number;
  imageUrl?: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  options: Option[];
  createdAt: string;
  durationMinutes: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'paused';
  saveAsTemplate: boolean;
  category: string;
  allowMultipleChoices: boolean;
}

export interface VoteRecord {
  pollId: string;
  optionId: string;
  votedAt: string;
  fingerprint: string;
}

export interface PollTemplate {
  id: string;
  title: string;
  description: string;
  options: string[];
  durationMinutes: number;
  category: string;
}

export interface VoteEvent {
  pollId: string;
  optionId: string;
  votedAt: string;
  fingerprint: string;
}

export interface AnalyticsTimeline {
  timestamp: string;
  votes: number;
}
