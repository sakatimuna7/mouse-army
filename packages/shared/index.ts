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

export interface IPlayerData {
    id: string;
    userId: string;
    userName: string;
    x: number;
    y: number;
    rotation: number;
    health: number;
    score: number;
    isDead: boolean;
    isStunned: boolean;
    spawnTime: number;
    persistentId: string;
    isBot?: boolean;
    botType?: "Hunter" | "Scavenger" | "Wanderer";
    targetId?: string;
    inventory: string[];
    turboCount: number;
    hookCount: number;
    lastActionTime?: number;
}

export interface IItemData {
    id: string;
    itemId: string;
    type: "bomb" | "speed" | "hook" | "magnet";
    x: number;
    y: number;
}

export enum BlackHoleState {
    None,
    Warning,
    Active,
    Collapse
}

export interface IBlackHole {
    x: number;
    y: number;
    state: BlackHoleState;
    startTime: number;
}
