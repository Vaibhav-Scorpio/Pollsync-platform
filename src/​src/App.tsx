import { Poll, Option, VoteRecord, PollTemplate, AnalyticsTimeline } from '../types';

const POLLS_KEY = 'live_polling_polls';
const VOTES_KEY = 'live_polling_votes';
const TEMPLATES_KEY = 'live_polling_templates';
const SYNC_CHANNEL_NAME = 'poll_platform_channel';

const DEFAULT_TEMPLATES: PollTemplate[] = [
  {
    id: 't-1',
    title: 'Favorite Frontend Framework in 2026',
    description: 'Poll for developer meetups and tech talks regarding modern frameworks.',
    options: ['React (with Vite/Next)', 'Vue.js (with Nuxt)', 'Svelte (SvelteKit)', 'Solid / Qwik', 'Angular'],
    durationMinutes: 5,
    category: 'Technology'
  },
  {
    id: 't-2',
    title: 'Team Retrospective: Sprint Happiness Check',
    description: 'Quick check-in on team sentiment and performance during the last sprint.',
    options: ['Stellar - Everything was smooth!', 'Good - Minimal issues, happy with progress.', 'Average - Some friction, but we managed.', 'Frustrated - Encountered major roadblocks.'],
    durationMinutes: 3,
    category: 'Agile Team'
  },
  {
    id: 't-3',
    title: 'Next Destination for Team Retreat',
    description: 'Vote on where we should go for our annual company retreat.',
    options: ['Mountain Cabin Haven 🌲', 'Beachfront Resort Villa 🏖️', 'Vibrant Metro Exploration 🏙️', 'Remote Eco-Lodge in Outer Space 🚀'],
    durationMinutes: 10,
    category: 'Company Culture'
  }
];

const DEFAULT_POLLS: Poll[] = [
  {
    id: 'p-1',
    title: 'Ultimate AI Assistant Preference',
    description: 'Which interface or development style do you prefer for coding tasks?',
    options: [
      { id: 'opt-a', text: 'Full Agent (Autonomous file edits & terminal executions)', votes: 142, imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80' },
      { id: 'opt-b', text: 'Chat Assistant (Copy-paste code hints & codeblocks)', votes: 89, imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=200&q=80' },
      { id: 'opt-c', text: 'Autocomplete Inline (tab-completion only)', votes: 64, imageUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=200&q=80' },
      { id: 'opt-d', text: 'Vanilla Manual Coding (No AI tools whatsoever)', votes: 21, imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=200&q=80' }
    ],
    createdAt: new Date(Date.now() - 120000).toISOString(),
    durationMinutes: 15,
    expiresAt: new Date(Date.now() + 13 * 60000).toISOString(),
    status: 'active',
    saveAsTemplate: true,
    category: 'Technology',
    allowMultipleChoices: false
  }
];

const SEED_VOTES = (pollId: string, options: Option[]): VoteRecord[] => {
  const list: VoteRecord[] = [];
  const baseTime = Date.now() - 120000;
  options.forEach((opt) => {
    for (let i = 0; i < opt.votes; i++) {
      const randomOffset = Math.random() * 120000;
      list.push({
        pollId,
        optionId: opt.id,
        votedAt: new Date(baseTime + randomOffset).toISOString(),
        fingerprint: `seed-${Math.random().toString(36).substring(2, 9)}`
      });
    }
  });
  return list;
};

export function getDeviceFingerprint(): string {
  try {
    const key = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 4
    ].join('###');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 150;
      canvas.height = 30;
      ctx.textBaseline = "top";
      ctx.font = "12px 'Arial'";
      ctx.fillStyle = "#f60";
      ctx.fillRect(10, 5, 100, 15);
      ctx.fillStyle = "#069";
      ctx.fillText("LivePolling,Fingerprint!", 2, 2);
      const dataUrl = canvas.toDataURL();
      let canvasHash = 0;
      for (let j = 0; j < dataUrl.length; j++) {
        const char = dataUrl.charCodeAt(j);
        canvasHash = (canvasHash << 5) - canvasHash + char;
        canvasHash |= 0;
      }
      return `fp_${Math.abs(hash).toString(16)}_${Math.abs(canvasHash).toString(16)}`;
    }
    return `fp_${Math.abs(hash).toString(16)}`;
  } catch (e) {
    let fallback = localStorage.getItem('poll_voter_fallback_id');
    if (!fallback) {
      fallback = 'fb_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('poll_voter_fallback_id', fallback);
    }
    return fallback;
  }
}

let syncChannel: BroadcastChannel | null = null;
try {
  syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
} catch (e) {
  console.warn("BroadcastChannel not supported.", e);
}

export function getStoredPolls(): Poll[] {
  const data = localStorage.getItem(POLLS_KEY);
  if (!data) {
    const defaultPolls = DEFAULT_POLLS;
    localStorage.setItem(POLLS_KEY, JSON.stringify(defaultPolls));
    const initialVotes = seedInitialVotesForDefaultPolls(defaultPolls);
    localStorage.setItem(VOTES_KEY, JSON.stringify(initialVotes));
    return defaultPolls;
  }
  return JSON.parse(data);
}

function seedInitialVotesForDefaultPolls(defaultPolls: Poll[]): VoteRecord[] {
  let allVotes: VoteRecord[] = [];
  defaultPolls.forEach(p => {
    allVotes = allVotes.concat(SEED_VOTES(p.id, p.options));
  });
  return allVotes;
}

export function getStoredVotes(): VoteRecord[] {
  const data = localStorage.getItem(VOTES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export function getStoredTemplates(): PollTemplate[] {
  const data = localStorage.getItem(TEMPLATES_KEY);
  if (!data) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    return DEFAULT_TEMPLATES;
  }
  return JSON.parse(data);
}

export const pollEngine = {
  getStoredVotes(): VoteRecord[] {
    return getStoredVotes();
  },

  getPolls(): Poll[] {
    const polls = getStoredPolls();
    let changed = false;
    const now = new Date();
    const evaluated = polls.map(poll => {
      if (poll.status === 'active' && new Date(poll.expiresAt) <= now) {
        changed = true;
        return { ...poll, status: 'expired' as const };
      }
      return poll;
    });
    if (changed) {
      localStorage.setItem(POLLS_KEY, JSON.stringify(evaluated));
      this.broadcast({ type: 'POLLS_UPDATED' });
    }
    return evaluated;
  },

  createPoll(data: Omit<Poll, 'id' | 'createdAt' | 'status' | 'options' | 'expiresAt'> & { options: string[], optionImages?: string[] }): Poll {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + data.durationMinutes * 60 * 1000).toISOString();
    const configuredOptions: Option[] = data.options.map((optText, index) => ({
      id: `opt-${Math.random().toString(36).substring(2, 9)}`,
      text: optText,
      votes: 0,
      imageUrl: data.optionImages?.[index] || undefined
    }));

    const newPoll: Poll = {
      id: `poll-${Math.random().toString(36).substring(2, 11)}`,
      title: data.title,
      description: data.description || '',
      options: configuredOptions,
      createdAt: now.toISOString(),
      durationMinutes: data.durationMinutes,
      expiresAt,
      status: 'active',
      saveAsTemplate: data.saveAsTemplate,
      category: data.category || 'General',
      allowMultipleChoices: data.allowMultipleChoices
    };

    const currentPolls = this.getPolls();
    currentPolls.unshift(newPoll);
    localStorage.setItem(POLLS_KEY, JSON.stringify(currentPolls));

    if (data.saveAsTemplate) {
      this.saveTemplate({
        title: data.title,
        description: data.description,
        options: data.options,
        durationMinutes: data.durationMinutes,
        category: data.category || 'General'
      });
    }

    this.broadcast({ type: 'POLL_CREATED', pollId: newPoll.id });
    return newPoll;
  },

  castVote(pollId: string, optionId: string, fingerprint: string): { success: boolean; error?: string } {
    const polls = this.getPolls();
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return { success: false, error: 'Poll not found.' };
    if (poll.status !== 'active') return { success: false, error: 'Closed.' };

    if (new Date(poll.expiresAt) <= new Date()) {
      poll.status = 'expired';
      localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
      this.broadcast({ type: 'POLLS_UPDATED' });
      return { success: false, error: 'Expired.' };
    }

    const votes = getStoredVotes();
    const hasVoted = votes.some(v => v.pollId === pollId && v.fingerprint === fingerprint);
    if (hasVoted) return { success: false, error: 'Voted already.' };

    const option = poll.options.find(o => o.id === optionId);
    if (!option) return { success: false, error: 'Invalid choice.' };

    option.votes += 1;
    const newVote: VoteRecord = {
      pollId,
      optionId,
      votedAt: new Date().toISOString(),
      fingerprint
    };
    votes.push(newVote);
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    this.broadcast({ type: 'VOTE_CAST', pollId, optionId, vote: newVote });
    return { success: true };
  },

  updatePollStatus(pollId: string, status: 'active' | 'paused' | 'expired'): Poll | null {
    const polls = this.getPolls();
    const pollIndex = polls.findIndex(p => p.id === pollId);
    if (pollIndex === -1) return null;
    polls[pollIndex].status = status;
    if (status === 'active') {
      const now = new Date();
      polls[pollIndex].expiresAt = new Date(now.getTime() + polls[pollIndex].durationMinutes * 60 * 1000).toISOString();
      polls[pollIndex].createdAt = now.toISOString();
    }
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
    this.broadcast({ type: 'POLLS_UPDATED', pollId });
    return polls[pollIndex];
  },

  resetPoll(pollId: string): Poll | null {
    const polls = this.getPolls();
    const pollIndex = polls.findIndex(p => p.id === pollId);
    if (pollIndex === -1) return null;
    polls[pollIndex].options = polls[pollIndex].options.map(opt => ({ ...opt, votes: 0 }));
    const now = new Date();
    polls[pollIndex].createdAt = now.toISOString();
    polls[pollIndex].expiresAt = new Date(now.getTime() + polls[pollIndex].durationMinutes * 60 * 1000).toISOString();
    polls[pollIndex].status = 'active';

    let votes = getStoredVotes();
    votes = votes.filter(v => v.pollId !== pollId);
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    this.broadcast({ type: 'POLL_RESET', pollId });
    return polls[pollIndex];
  },

  deletePoll(pollId: string): boolean {
    let polls = this.getPolls();
    if (!polls.some(p => p.id === pollId)) return false;
    polls = polls.filter(p => p.id !== pollId);
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));

    let votes = getStoredVotes();
    votes = votes.filter(v => v.pollId !== pollId);
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    this.broadcast({ type: 'POLLS_UPDATED' });
    return true;
  },

  saveTemplate(data: Omit<PollTemplate, 'id'>): PollTemplate {
    const templates = getStoredTemplates();
    const newTemplate: PollTemplate = {
      id: `t-${Math.random().toString(36).substring(2, 9)}`,
      title: data.title,
      description: data.description,
      options: data.options,
      durationMinutes: data.durationMinutes,
      category: data.category
    };
    templates.push(newTemplate);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return newTemplate;
  },

  getTemplates(): PollTemplate[] {
    return getStoredTemplates();
  },

  deleteTemplate(id: string): boolean {
    let templates = this.getTemplates();
    if (!templates.some(t => t.id === id)) return false;
    templates = templates.filter(t => t.id !== id);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  },

  getTimelineData(pollId: string): AnalyticsTimeline[] {
    const votes = getStoredVotes().filter(v => v.pollId === pollId);
    const poll = this.getPolls().find(p => p.id === pollId);
    if (!poll || votes.length === 0) return [];

    const sortedVotes = [...votes].sort((a, b) => new Date(a.votedAt).getTime() - new Date(b.votedAt).getTime());
    const tStart = new Date(poll.createdAt).getTime();
    const tEnd = Math.min(Date.now(), new Date(poll.expiresAt).getTime());
    const duration = Math.max(tEnd - tStart, 1000);

    const segments = 8;
    const step = duration / segments;
    const timeline: AnalyticsTimeline[] = [];

    for (let i = 1; i <= segments; i++) {
      const segmentTime = tStart + i * step;
      const count = sortedVotes.filter(v => new Date(v.votedAt).getTime() <= segmentTime).length;
      const timeStr = new Date(segmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      timeline.push({ timestamp: timeStr, votes: count });
    }
    return timeline;
  },

  broadcast(message: { type: string; pollId?: string; optionId?: string; vote?: VoteRecord }) {
    if (syncChannel) syncChannel.postMessage(message);
  },

  subscribe(callback: (msg: any) => void): () => void {
    if (!syncChannel) return () => {};
    const handler = (event: MessageEvent) => callback(event.data);
    syncChannel.addEventListener('message', handler);
    return () => syncChannel?.removeEventListener('message', handler);
  },

  simulateVoterActivity(pollId: string, count: number, onNewVoteCast?: (optionId: string) => void) {
    const polls = this.getPolls();
    const poll = polls.find(p => p.id === pollId);
    if (!poll || poll.status !== 'active') return;

    const optIds = poll.options.map(opt => opt.id);
    const votes = getStoredVotes();

    for (let i = 0; i < count; i++) {
      let selectedOptionId = optIds[0];
      const r = Math.random();
      if (optIds.length > 1) {
        if (r > 0.4) selectedOptionId = optIds[1];
        if (r > 0.75 && optIds.length > 2) selectedOptionId = optIds[2];
        if (r > 0.92 && optIds.length > 3) selectedOptionId = optIds[3];
      }
      const opt = poll.options.find(o => o.id === selectedOptionId);
      if (opt) {
        opt.votes += 1;
        votes.push({
          pollId,
          optionId: selectedOptionId,
          votedAt: new Date(Date.now() - Math.random() * 5000).toISOString(),
          fingerprint: `fp_sim_${Math.random().toString(36).substring(2, 10)}_${Date.now()}_idx_${i}`
        });
        if (onNewVoteCast) onNewVoteCast(selectedOptionId);
      }
    }
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    this.broadcast({ type: 'POLLS_UPDATED', pollId });
  }
};
