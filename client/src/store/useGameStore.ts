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
    playerName: string;
    isJoined: boolean;
    setLeaderboard: (data: ILeaderboardEntry[]) => void;
    setInventory: (items: string[]) => void;
    setPlayerName: (name: string) => void;
    setJoined: (status: boolean) => void;
}

export const useGameStore = create<IGameStore>((set) => ({
    leaderboard: [],
    inventory: [],
    playerName: '',
    isJoined: false,
    setLeaderboard: (data) => set({ leaderboard: data }),
    setInventory: (items) => set({ inventory: items }),
    setPlayerName: (name) => set({ playerName: name }),
    setJoined: (status) => set({ isJoined: status }),
}));
