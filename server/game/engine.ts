import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { QuadTree, IQuadEntity, IRect } from "./quadtree.js";

interface IPlayerData extends IQuadEntity {
  userId: string;
  x: number;
  y: number;
  health: number;
  score: number;
  isDead: boolean;
  isStunned: boolean;
  spawnTime: number;
}

interface IItemData extends IQuadEntity {
  itemId: string;
  type: "bomb" | "speed" | "hook";
  x: number;
  y: number;
}

export class GameEngine {
  private io: Server;
  private players: Record<string, IPlayerData> = {};
  private items: Record<string, IItemData> = {};
  private quadTree: QuadTree<IQuadEntity>;
  
  private readonly WORLD_SIZE = 2000;
  private readonly MAX_ITEMS = 20;
  private readonly TICK_RATE = 20;
  private readonly TICK_MS = 1000 / 20;
  private readonly AOI_RADIUS = 600;

  constructor(io: Server) {
    this.io = io;
    this.quadTree = new QuadTree({ x: 0, y: 0, width: this.WORLD_SIZE, height: this.WORLD_SIZE });
    this.startTickLoop();
    this.startItemSpawnLoop();
    this.startSurvivalScoreLoop();
  }

  private startTickLoop() {
    setInterval(() => {
      this.tick();
    }, this.TICK_MS);
  }

  private tick() {
    const startTime = performance.now();
    // 1. Rebuild QuadTree
    this.quadTree.clear();
    Object.values(this.players).forEach(p => this.quadTree.insert(p));
    Object.values(this.items).forEach(i => this.quadTree.insert(i));

    // 2. Interest Management (AOI)
    Object.values(this.players).forEach(player => {
      const socket = this.io.sockets.sockets.get(player.userId);
      if (socket) {
        const nearbyEntities = this.quadTree.query({
          x: player.x - this.AOI_RADIUS,
          y: player.y - this.AOI_RADIUS,
          width: this.AOI_RADIUS * 2,
          height: this.AOI_RADIUS * 2
        });

        const nearbyPlayers: Record<string, IPlayerData> = {};
        const nearbyItems: Record<string, IItemData> = {};

        nearbyEntities.forEach((entity: IQuadEntity) => {
          if (this.players[entity.id]) {
            nearbyPlayers[entity.id] = this.players[entity.id];
          } else if (this.items[entity.id]) {
            nearbyItems[entity.id] = this.items[entity.id];
          }
        });

        // Send tailored update to this player
        socket.emit("gameUpdate", {
          players: nearbyPlayers,
          items: nearbyItems
        });
      }
    });

    const endTime = performance.now();
    const tickDuration = endTime - startTime;
    if (tickDuration > this.TICK_MS) {
      console.warn(`Tick overloaded! Duration: ${tickDuration.toFixed(2)}ms (Limit: ${this.TICK_MS}ms)`);
    } else if (Math.random() < 0.01) {
      console.log(`Tick duration: ${tickDuration.toFixed(2)}ms for ${Object.keys(this.players).length} players`);
    }
  }

  private startItemSpawnLoop() {
    setInterval(() => {
      if (Object.keys(this.items).length < this.MAX_ITEMS) {
        const types: ("bomb" | "speed" | "hook")[] = ["bomb", "speed", "hook"];
        const newItem: IItemData = {
          id: uuidv4(),
          itemId: "", // Keeping for backward compatibility if needed, but 'id' is used by QuadTree
          type: types[Math.floor(Math.random() * types.length)]!,
          x: Math.random() * (this.WORLD_SIZE - 100) + 50,
          y: Math.random() * (this.WORLD_SIZE - 100) + 50,
        };
        newItem.itemId = newItem.id;
        this.items[newItem.id] = newItem;
        this.io.emit("itemSpawned", newItem);
      }
    }, 3000);
  }

  private startSurvivalScoreLoop() {
    setInterval(() => {
      Object.values(this.players).forEach(player => {
        if (!player.isDead) {
          player.score += 1;
        }
      });
      this.broadcastLeaderboard();
    }, 5000);
  }

  private broadcastLeaderboard() {
    const leaderboard = Object.values(this.players)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(p => ({
        userId: p.userId,
        score: p.score
      }));
    this.io.emit("leaderboardUpdate", leaderboard);
  }

  addPlayer(socketId: string) {
    const newPlayer: IPlayerData = {
      id: socketId,
      userId: socketId,
      x: Math.random() * (this.WORLD_SIZE - 100) + 50,
      y: Math.random() * (this.WORLD_SIZE - 100) + 50,
      health: 100,
      score: 0,
      isDead: false,
      isStunned: false,
      spawnTime: Date.now()
    };
    this.players[socketId] = newPlayer;
    
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
        // Initial sync
        socket.emit("currentPlayers", this.players); // Keep original event for now
        socket.emit("currentItems", this.items);
        this.io.emit("newPlayer", newPlayer);
    }
    this.broadcastLeaderboard();
  }

  removePlayer(socketId: string) {
    delete this.players[socketId];
    this.io.emit("playerDisconnected", socketId);
    this.broadcastLeaderboard();
  }

  movePlayer(socketId: string, movementData: any) {
    const player = this.players[socketId];
    if (player && !player.isDead && !player.isStunned) {
      player.x = movementData.x;
      player.y = movementData.y;
      player.health = movementData.health;
      // We don't broadcast immediately anymore, wait for tick
    }
  }

  handleAttack(socketId: string, attackData: any) {
    const player = this.players[socketId];
    if (!player) return;

    // Use QuadTree to find nearby players to inform about the attack
    const nearbyEntities = this.quadTree.query({
      x: attackData.x - this.AOI_RADIUS,
      y: attackData.y - this.AOI_RADIUS,
      width: this.AOI_RADIUS * 2,
      height: this.AOI_RADIUS * 2
    });

    nearbyEntities.forEach((entity: IQuadEntity) => {
      if (this.players[entity.id] && entity.id !== socketId) {
        const socket = this.io.sockets.sockets.get(entity.id);
        if (socket) {
          socket.emit("playerAttack", {
            attackerId: socketId,
            ...attackData,
          });
        }
      }
    });
  }

  handleBomb(socketId: string, bombData: any) {
    this.io.emit("bombSpawned", {
      bombId: uuidv4(),
      ownerId: socketId,
      ...bombData
    });
  }

  handleHooked(socketId: string, data: { victimId: string, x: number, y: number }) {
    const victim = this.players[data.victimId];
    if (victim) {
      victim.isStunned = true;
      this.io.emit("playerHookedEffect", {
        victimId: data.victimId,
        attackerId: socketId,
        x: data.x,
        y: data.y
      });
      
      setTimeout(() => {
        if (this.players[data.victimId]) {
          this.players[data.victimId].isStunned = false;
        }
      }, 1500);
    }
  }

  handleKilled(socketId: string, data: { victimId: string, killerId: string }) {
    const victim = this.players[data.victimId];
    const killer = this.players[data.killerId];

    if (victim && !victim.isDead) {
      victim.isDead = true;
      victim.health = 0;
      this.io.emit("playerDeath", data.victimId);
      
      if (killer) {
        killer.score += 10;
        this.broadcastLeaderboard();
      }

      setTimeout(() => {
        if (this.players[data.victimId]) {
          victim.isDead = false;
          victim.isStunned = false;
          victim.health = 100;
          victim.x = Math.random() * (this.WORLD_SIZE - 100) + 50;
          victim.y = Math.random() * (this.WORLD_SIZE - 100) + 50;
          this.io.emit("playerRespawn", victim);
        }
      }, 3000);
    }
  }

  handlePickup(socketId: string, itemId: string) {
    const item = this.items[itemId];
    if (item) {
      const itemType = item.type;
      delete this.items[itemId];
      this.io.emit("itemDestroyed", itemId);
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("itemAddedToInventory", itemType);
      }
    }
  }
}
