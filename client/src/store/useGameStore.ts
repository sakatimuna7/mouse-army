import { create } from 'zustand';

export interface ILeaderboardEntry {
    userId: string;
    userName: string;
    score: number;
    isLocalPlayer?: boolean;
}

export interface IKillLog {
    id: string;
    killerName: string;
    victimName: string;
    timestamp: number;
}

interface IGameStore {
    leaderboard: ILeaderboardEntry[];
    inventory: string[];
    playerName: string;
    isJoined: boolean;
    persistentId: string;
    killLogs: IKillLog[];
    setLeaderboard: (data: ILeaderboardEntry[]) => void;
    setInventory: (items: string[]) => void;
    setPlayerName: (name: string) => void;
    setJoined: (status: boolean) => void;
    addKillLog: (log: Omit<IKillLog, 'id'>) => void;
}

const getPersistentId = () => {
    let id = localStorage.getItem('mouse_army_persistent_id');
    if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('mouse_army_persistent_id', id);
    }
    return id;
};

export const useGameStore = create<IGameStore>((set) => ({
    leaderboard: [],
    inventory: [],
    playerName: localStorage.getItem('mouse_army_player_name') || '',
    isJoined: localStorage.getItem('mouse_army_is_joined') === 'true',
    persistentId: getPersistentId(),
    killLogs: [],
    setLeaderboard: (data) => set({ leaderboard: data }),
    setInventory: (items) => set({ inventory: items }),
    setPlayerName: (name) => {
        localStorage.setItem('mouse_army_player_name', name);
        set({ playerName: name });
    },
    setJoined: (status) => {
        localStorage.setItem('mouse_army_is_joined', status ? 'true' : 'false');
        set({ isJoined: status });
    },
    addKillLog: (log) => set((state) => ({ 
        killLogs: [...state.killLogs, { ...log, id: Math.random().toString(36).substring(7) }].slice(-5) 
    })),
}));
