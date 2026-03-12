import { create } from 'zustand';

export interface ILeaderboardEntry {
    userId: string;
    userName: string;
    score: number;
    isLocalPlayer?: boolean;
}

interface IGameStore {
    leaderboard: ILeaderboardEntry[];
    inventory: string[];
    setLeaderboard: (data: ILeaderboardEntry[]) => void;
    setInventory: (items: string[]) => void;
}

export const useGameStore = create<IGameStore>((set) => ({
    leaderboard: [],
    inventory: [],
    setLeaderboard: (data) => set({ leaderboard: data }),
    setInventory: (items) => set({ inventory: items }),
}));
