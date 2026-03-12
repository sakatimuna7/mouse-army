import { Server } from "socket.io";
import { GameEngine } from "../game/engine.js";

export class Room {
  public roomId: string;
  public engine: GameEngine;
  private io: Server;
  private players: Set<string> = new Set();
  private readonly MAX_PLAYERS = 100;

  constructor(roomId: string, io: Server, onPlayerDeath?: (persistentId: string) => void) {
    this.roomId = roomId;
    this.io = io;
    this.engine = new GameEngine(io, roomId, onPlayerDeath);
  }

  public addPlayer(socketId: string, userName: string, persistentId: string): boolean {
    if (this.isFull() && !this.engine.getPlayerByPersistentId(persistentId)) return false;
    
    this.players.add(socketId);
    this.engine.addPlayer(socketId, userName, persistentId);
    return true;
  }

  public removePlayer(socketId: string) {
    this.players.delete(socketId);
    this.engine.removePlayer(socketId);
  }

  public isFull(): boolean {
    return this.players.size >= this.MAX_PLAYERS;
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public isEmpty(): boolean {
    return this.players.size === 0;
  }
}
