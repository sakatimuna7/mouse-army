import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";
const PLAYER_COUNT = 500;
const WORLD_SIZE = 2000;

console.log(`Starting load test with ${PLAYER_COUNT} players...`);

for (let i = 0; i < PLAYER_COUNT; i++) {
  const socket = io(SERVER_URL);

  socket.on("connect", () => {
    // console.log(`Player ${i} connected`);
    
    // Simulate movement
    setInterval(() => {
        if (socket.connected) {
            socket.emit("playerMovement", {
                x: Math.random() * WORLD_SIZE,
                y: Math.random() * WORLD_SIZE,
                health: 100
            });
        }
    }, 100); // Send movement every 100ms
  });

  socket.on("gameUpdate", (data: any) => {
    // Only logged occasionally to avoid flooding
    if (i === 0 && Math.random() < 0.01) {
        console.log(`Player 0 received update: ${Object.keys(data.players).length} players nearby`);
    }
  });

  socket.on("disconnect", () => {
    // console.log(`Player ${i} disconnected`);
  });
}
