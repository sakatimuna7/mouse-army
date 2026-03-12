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
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        // Just inform the engine that this socket is gone
        room.engine.handleSocketDisconnect(socketId);
        
        // Shut down the room if no more human players are active
        if (!room.engine.hasActiveHumans()) {
          room.engine.stop();
          this.rooms.delete(roomId);
          console.log(`Shut down empty room: ${roomId}`);
          
          // Clean up all character mappings associated with this room
          for (const [sId, rId] of this.socketToRoom.entries()) {
            if (rId === roomId) this.socketToRoom.delete(sId);
          }
          for (const [pId, rId] of this.persistentToRoom.entries()) {
            if (rId === roomId) this.persistentToRoom.delete(pId);
          }
        }
      }
      this.socketToRoom.delete(socketId);
    }
  }

  public handlePlayerDeath(persistentId: string) {
    this.persistentToRoom.delete(persistentId);
  }

  public getRoomByPlayer(socketId: string): Room | undefined {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }
}
