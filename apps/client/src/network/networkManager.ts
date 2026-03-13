import { io, Socket } from 'socket.io-client';
import { IPlayerData } from '@mouse-army/shared';

export class NetworkManager {
    private socket: Socket;
    private static instance: NetworkManager;

    private constructor() {
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
        this.socket = io(serverUrl);
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

    public off(event: string, callback?: (data: any) => void) {
        this.socket.off(event, callback);
    }

    public emit(event: string, data: any) {
        this.socket.emit(event, data);
    }

    public getSocketId(): string | undefined {
        return this.socket.id;
    }
}
