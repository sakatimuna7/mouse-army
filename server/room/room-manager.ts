import { Server } from "socket.io";
import { Room } from "./room.js";
import { v4 as uuidv4 } from "uuid";

export class RoomManager {
  private io: Server;
  private rooms: Map<string, Room> = new Map();
  private playerToRoom: Map<string, string> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  public findOrCreateRoom(socketId: string, userName: string): Room {
    // Try to find an available room
    let room = Array.from(this.rooms.values()).find(r => !r.isFull());

    if (!room) {
      const roomId = `room-${uuidv4()}`;
      room = new Room(roomId, this.io);
      this.rooms.set(roomId, room);
      console.log(`Created new room: ${roomId}`);
    }

    room.addPlayer(socketId, userName);
    this.playerToRoom.set(socketId, room.roomId);
    return room;
  }

  public handleDisconnect(socketId: string) {
    const roomId = this.playerToRoom.get(socketId);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.removePlayer(socketId);
        if (room.isEmpty()) {
          this.rooms.delete(roomId);
          console.log(`Removed empty room: ${roomId}`);
        }
      }
      this.playerToRoom.delete(socketId);
    }
  }

  public getRoomByPlayer(socketId: string): Room | undefined {
    const roomId = this.playerToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }
}
