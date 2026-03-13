import { Server } from "socket.io";
import { Room } from "./room.js";
import { v4 as uuidv4 } from "uuid";

export class RoomManager {
  private io: Server;
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private persistentToRoom: Map<string, string> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  public findOrCreateRoom(socketId: string, userName: string, persistentId: string): Room {
    // 1. Check if player already belongs to a room
    let roomId = this.persistentToRoom.get(persistentId);
    let room = roomId ? this.rooms.get(roomId) : undefined;

    // 2. If no existing room or room is gone, find an available one
    if (!room) {
      room = Array.from(this.rooms.values()).find(r => !r.isFull());
    }

    // 3. If still no room, create one
    if (!room) {
      const roomId = `room-${uuidv4()}`;
      room = new Room(roomId, this.io, this.handlePlayerDeath.bind(this));
      this.rooms.set(roomId, room);
      console.log(`Created new room: ${roomId}`);
    }

    room.addPlayer(socketId, userName, persistentId);
    this.socketToRoom.set(socketId, room.roomId);
    this.persistentToRoom.set(persistentId, room.roomId);
    return room;
  }

  public handleDisconnect(socketId: string) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      // 1. Notify engine
      room.engine.handleSocketDisconnect(socketId);
      
      // 2. Shut down the room if no more human players are active
      if (!room.engine.hasActiveHumans()) {
        console.log(`Shutting down empty room: ${roomId}`);
        room.engine.stop();
        this.rooms.delete(roomId);
        
        // Exhaustive cleanup of all mappings for this room
        for (const [sId, rId] of Array.from(this.socketToRoom.entries())) {
          if (rId === roomId) this.socketToRoom.delete(sId);
        }
        for (const [pId, rId] of Array.from(this.persistentToRoom.entries())) {
          if (rId === roomId) this.persistentToRoom.delete(pId);
        }
      }
    }
    
    // Explicitly delete the disconnected socket mapping if it still exists
    this.socketToRoom.delete(socketId);
  }

  public handlePlayerDeath(persistentId: string) {
    this.persistentToRoom.delete(persistentId);
  }

  public getRoomByPlayer(socketId: string): Room | undefined {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }
}
