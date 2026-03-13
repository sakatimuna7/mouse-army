import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";
const PLAYER_COUNT = 150; // Should trigger 2 rooms (100 in first, 50 in second)

console.log(`Starting room test with ${PLAYER_COUNT} players to verify automatic room creation...`);

const sockets: any[] = [];
let connectedCount = 0;

for (let i = 0; i < PLAYER_COUNT; i++) {
  const socket = io(SERVER_URL);
  sockets.push(socket);

  socket.on("connect", () => {
    connectedCount++;
    if (connectedCount === PLAYER_COUNT) {
        console.log(`All ${PLAYER_COUNT} players connected.`);
        console.log("Check server logs for room distribution.");
        
        // After some time, disconnect all
        setTimeout(() => {
            console.log("Disconnecting all players...");
            sockets.forEach(s => s.disconnect());
            process.exit(0);
        }, 5000);
    }
  });

  socket.on("gameUpdate", (data: any) => {
    // Optional: verify that players only see a subset if they are in different rooms
    // But since they are all new, they might not see each other if they are far apart anyway
  });
}
