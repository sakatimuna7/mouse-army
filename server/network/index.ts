import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { RoomManager } from "../room/room-manager.js";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const roomManager = new RoomManager(io);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinGame", (data: { userName: string }) => {
    const userName = data.userName || `Guest-${socket.id.substring(0, 4)}`;
    const room = roomManager.findOrCreateRoom(socket.id, userName);
    socket.join(room.roomId);
    console.log(`User ${socket.id} (${userName}) joined room ${room.roomId}`);

    socket.on("playerMovement", (movementData: any) => {
      room.engine.movePlayer(socket.id, movementData);
    });

    socket.on("playerAttack", (attackData: any) => {
      room.engine.handleAttack(socket.id, attackData);
    });

    socket.on("throwBomb", (bombData: any) => {
      room.engine.handleBomb(socket.id, bombData);
    });

    socket.on("playerHooked", (data: any) => {
      room.engine.handleHooked(socket.id, data);
    });

    socket.on("playerKilled", (data: any) => {
      room.engine.handleKilled(socket.id, data);
    });

    socket.on("pickupItem", (itemId: string) => {
      room.engine.handlePickup(socket.id, itemId);
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    roomManager.handleDisconnect(socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

