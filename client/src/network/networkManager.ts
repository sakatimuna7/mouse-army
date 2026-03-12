import { io, Socket } from 'socket.io-client';

export interface IPlayerData {
    userId: string;
    x: number;
    y: number;
}

export class NetworkManager {
    private socket: Socket;
    private static instance: NetworkManager;

    private constructor() {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        this.socket = io(`http://${host}:3001`);
    }

    public static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    public on(event: string, callback: (data: any) => void) {
        this.socket.on(event, callback);
    }

    public emit(event: string, data: any) {
        this.socket.emit(event, data);
    }

    public getSocketId(): string | undefined {
        return this.socket.id;
    }
}
