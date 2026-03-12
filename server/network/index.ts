import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { GameEngine } from "../game/engine.js";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const engine = new GameEngine(io);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  engine.addPlayer(socket.id);

  socket.on("playerMovement", (movementData: any) => {
    engine.movePlayer(socket.id, movementData);
  });

  socket.on("playerAttack", (attackData: any) => {
    engine.handleAttack(socket.id, attackData);
  });

  socket.on("throwBomb", (bombData: any) => {
    engine.handleBomb(socket.id, bombData);
  });

  socket.on("playerHooked", (data: any) => {
    engine.handleHooked(socket.id, data);
  });

  socket.on("playerKilled", (data: any) => {
    engine.handleKilled(socket.id, data);
  });

  socket.on("pickupItem", (itemId: string) => {
    engine.handlePickup(socket.id, itemId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    engine.removePlayer(socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

