import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { QuadTree, IQuadEntity, IRect } from "./quadtree.js";
import { BOT_NAMES } from "./bot-names.js";

interface IPlayerData extends IQuadEntity {
  userId: string;
  userName: string;
  x: number;
  y: number;
  health: number;
  score: number;
  isDead: boolean;
  isStunned: boolean;
  spawnTime: number;
  persistentId: string;
  isBot?: boolean;
  botType?: "Hunter" | "Scavenger" | "Wanderer";
  targetId?: string;
  inventory?: string[];
  lastActionTime?: number;
}

interface IItemData extends IQuadEntity {
  itemId: string;
  type: "bomb" | "speed" | "hook";
  x: number;
  y: number;
}

export class GameEngine {
  private io: Server;
  private roomId: string;
  private players: Record<string, IPlayerData> = {};
  private items: Record<string, IItemData> = {};
  private quadTree: QuadTree<IQuadEntity>;
  
  private readonly WORLD_SIZE = 5000;
  private readonly MAX_ITEMS = 20;
  private readonly TICK_RATE = 20;
  private readonly TICK_MS = 1000 / 20;
  private readonly AOI_RADIUS = 600;
  private onPlayerDeath?: (persistentId: string) => void;
  
  private tickInterval: any;
  private itemInterval: any;
  private scoreInterval: any;
  private botInterval: any;

  constructor(io: Server, roomId: string, onPlayerDeath?: (persistentId: string) => void) {
    this.io = io;
    this.roomId = roomId;
    this.onPlayerDeath = onPlayerDeath;
    this.quadTree = new QuadTree({ x: 0, y: 0, width: this.WORLD_SIZE, height: this.WORLD_SIZE });
    this.startTickLoop();
    this.startItemSpawnLoop();
    this.startSurvivalScoreLoop();
    this.startBotSpawnLoop();
  }

  private startTickLoop() {
    this.tickInterval = setInterval(() => {
      this.tick();
    }, this.TICK_MS);
  }

  private tick() {
    const startTime = performance.now();
    // 1. Rebuild QuadTree
    this.quadTree.clear();
    Object.values(this.players).forEach(p => this.quadTree.insert(p));
    Object.values(this.items).forEach(i => this.quadTree.insert(i));

    // Update Bots AI
    this.updateBots();

    // 2. Interest Management (AOI)
    Object.values(this.players).forEach(player => {
      if (player.isBot) return; // Bots don't have sockets
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
    this.itemInterval = setInterval(() => {
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
        this.io.to(this.roomId).emit("itemSpawned", newItem);
      }
    }, 3000);
  }

  private startSurvivalScoreLoop() {
    this.scoreInterval = setInterval(() => {
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
        userName: p.userName,
        score: p.score
      }));
    this.io.to(this.roomId).emit("leaderboardUpdate", leaderboard);
  }

  public stop() {
    clearInterval(this.tickInterval);
    clearInterval(this.itemInterval);
    clearInterval(this.scoreInterval);
    clearInterval(this.botInterval);
    console.log(`GameEngine for room ${this.roomId} stopped.`);
  }

  public hasActiveHumans(): boolean {
    return Object.values(this.players).some(p => !p.isBot && !this.io.sockets.sockets.get(p.userId)?.disconnected);
  }

  public getPlayerByPersistentId(persistentId: string) {
    return Object.values(this.players).find(p => p.persistentId === persistentId);
  }

  addPlayer(socketId: string, userName: string, persistentId: string) {
    // Check if player already exists by persistentId
    let existingPlayer = Object.values(this.players).find(p => p.persistentId === persistentId);

    if (existingPlayer) {
      // Reconnect: update userId (socketId) and inform everyone
      delete this.players[existingPlayer.userId];
      existingPlayer.userId = socketId;
      existingPlayer.id = socketId;
      this.players[socketId] = existingPlayer;
      
      console.log(`Player ${userName} reconnected with new socket ${socketId}`);
    } else {
      // New player
      const newPlayer: IPlayerData = {
        id: socketId,
        userId: socketId,
        userName: userName,
        persistentId: persistentId,
        x: Math.random() * (this.WORLD_SIZE - 100) + 50,
        y: Math.random() * (this.WORLD_SIZE - 100) + 50,
        health: 100,
        score: 0,
        isDead: false,
        isStunned: false,
        spawnTime: Date.now()
      };
      this.players[socketId] = newPlayer;
    }
    
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
        // Initial sync
        socket.emit("currentPlayers", this.players);
        socket.emit("currentItems", this.items);
        this.io.to(this.roomId).emit("newPlayer", this.players[socketId]);
    }
    this.broadcastLeaderboard();
  }

  handleSocketDisconnect(socketId: string) {
    // We don't remove the player immediately, just log it
    // They will be removed if they die or if the room is cleared
    const player = this.players[socketId];
    if (player) {
      console.log(`Player ${player.userName} disconnected (Socket: ${socketId})`);
      this.io.to(this.roomId).emit("playerDisconnected", socketId);
    }
  }

  removePlayer(socketId: string) {
    delete this.players[socketId];
    this.io.to(this.roomId).emit("playerDisconnected", socketId);
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
      const player = this.players[entity.id];
      if (player && !player.isDead) {
        // Calculate Distance
        const dx = player.x - attackData.x;
        const dy = player.y - attackData.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < attackData.radius) {
          const forceScale = 1 - (dist / attackData.radius);
          const damage = Math.floor(10 * forceScale); // Assuming 10 is base ATTACK_DAMAGE

          // Apply Knockback (Server position update)
          const angle = Math.atan2(dy, dx);
          player.x += Math.cos(angle) * attackData.force * forceScale * 0.05; // 0.05 is a small factor for server-side push
          player.y += Math.sin(angle) * attackData.force * forceScale * 0.05;

          // Apply Damage
          player.health -= damage;
          if (player.health <= 0) {
            player.health = 0;
            if (player.isBot) {
              this.handleKilled(socketId, { victimId: player.id, killerId: socketId });
            }
          }
        }

        // Broadcast to neighbors (excluding attacker for humans)
        if (entity.id !== socketId) {
          const socket = this.io.sockets.sockets.get(entity.id);
          if (socket) {
            socket.emit("playerAttack", {
              attackerId: socketId,
              ...attackData,
            });
          }
        }
      }
    });
  }

  handleBomb(socketId: string, bombData: any) {
    this.io.to(this.roomId).emit("bombSpawned", {
      bombId: uuidv4(),
      ownerId: socketId,
      ...bombData
    });
  }

  handleHooked(socketId: string, data: { victimId: string, x: number, y: number }) {
    const victim = this.players[data.victimId];
    if (victim) {
      victim.isStunned = true;
      // Authoritative position update: Move victim to the hooker's position
      victim.x = data.x;
      victim.y = data.y;

      this.io.to(this.roomId).emit("playerHookedEffect", {
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
      this.io.to(this.roomId).emit("playerDeath", data.victimId);
      
      this.io.to(this.roomId).emit("killLog", {
        killerName: killer ? killer.userName : "Environment",
        victimName: victim.userName,
        timestamp: Date.now()
      });
      
      if (this.onPlayerDeath) {
        this.onPlayerDeath(victim.persistentId);
      }
      
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
          this.io.to(this.roomId).emit("playerRespawn", victim);
        }
      }, 3000);
    }
  }

  handlePlayerDamage(socketId: string, data: { victimId: string, damage: number }) {
    const victim = this.players[data.victimId];
    if (victim && !victim.isDead) {
      victim.health -= data.damage;
      if (victim.health <= 0) {
        victim.health = 0;
        this.handleKilled(socketId, { victimId: data.victimId, killerId: socketId });
      }
    }
  }

  handlePickup(socketId: string, itemId: string) {
    const item = this.items[itemId];
    if (item) {
      const itemType = item.type;
      delete this.items[itemId];
      this.io.to(this.roomId).emit("itemDestroyed", itemId);
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("itemAddedToInventory", itemType);
      }
    }
  }

  private startBotSpawnLoop() {
    setInterval(() => {
      const currentTotal = Object.keys(this.players).length;
      if (currentTotal < 20) {
        this.spawnBot();
      }
    }, 5000);
  }

  private spawnBot() {
    const botId = `bot-${uuidv4()}`;
    const types: ("Hunter" | "Scavenger" | "Wanderer")[] = ["Hunter", "Scavenger", "Wanderer"];
    const botType = types[Math.floor(Math.random() * types.length)]!;
    
    const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] + "_" + Math.floor(Math.random() * 100);

    const newBot: IPlayerData = {
      id: botId,
      userId: botId,
      userName: `[BOT] ${randomName}`,
      persistentId: `bot-persistent-${botId}`,
      x: Math.random() * (this.WORLD_SIZE - 200) + 100,
      y: Math.random() * (this.WORLD_SIZE - 200) + 100,
      health: 100,
      score: 0,
      isDead: false,
      isStunned: false,
      spawnTime: Date.now(),
      isBot: true,
      botType: botType,
      inventory: [],
      lastActionTime: 0
    };

    this.players[botId] = newBot;
    this.io.to(this.roomId).emit("newPlayer", newBot);
  }

  private updateBots() {
    Object.values(this.players).forEach(bot => {
      if (!bot.isBot || bot.isDead || bot.isStunned) return;

      const now = Date.now();
      
      switch (bot.botType) {
        case "Hunter":
          this.logicHunter(bot, now);
          break;
        case "Scavenger":
          this.logicScavenger(bot, now);
          break;
        case "Wanderer":
          this.logicWanderer(bot, now);
          break;
      }

      // Smooth move towards target (Server-side simplified)
      // Actual movement logic: bots just interpolate x,y
    });
  }

  private logicHunter(bot: IPlayerData, now: number) {
    // Attack nearest player
    let target = this.getNearestTarget(bot, (p) => !p.isDead && p.id !== bot.id);
    if (target) {
      const dist = this.getDist(bot, target);
      this.moveTowards(bot, target.x, target.y, 160); // Base speed 160

      if (dist < 200 && now - (bot.lastActionTime || 0) > 2000) {
        // Use bomb
        this.handleBomb(bot.id, { x: bot.x, y: bot.y, targetX: target.x, targetY: target.y });
        bot.lastActionTime = now;
      }
    } else {
        this.logicWanderer(bot, now);
    }
  }

  private logicScavenger(bot: IPlayerData, now: number) {
    // Find nearest item
    let item = this.getNearestItem(bot);
    if (item) {
      this.moveTowards(bot, item.x, item.y, 180); // Scavengers are slightly faster
      if (this.getDist(bot, item) < 40) {
        this.handlePickup(bot.id, item.id);
      }
    } else {
      this.logicWanderer(bot, now);
    }
  }

  private logicWanderer(bot: IPlayerData, now: number) {
    if (!bot.targetId || Math.random() < 0.02) {
      bot.targetId = `pos-${Math.random()}-${Math.random()}`;
      (bot as any).targetX = Math.random() * this.WORLD_SIZE;
      (bot as any).targetY = Math.random() * this.WORLD_SIZE;
    }
    
    this.moveTowards(bot, (bot as any).targetX, (bot as any).targetY, 120);
  }

  private moveTowards(bot: IPlayerData, tx: number, ty: number, speed: number) {
    const dx = tx - bot.x;
    const dy = ty - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      const vx = (dx / dist) * (speed / this.TICK_RATE);
      const vy = (dy / dist) * (speed / this.TICK_RATE);
      bot.x += vx;
      bot.y += vy;
      
      // Wrap/Clamp to world
      bot.x = Math.max(0, Math.min(this.WORLD_SIZE, bot.x));
      bot.y = Math.max(0, Math.min(this.WORLD_SIZE, bot.y));
    }
  }

  private getNearestTarget(bot: IPlayerData, filter: (p: IPlayerData) => boolean): IPlayerData | null {
    let nearest: IPlayerData | null = null;
    let minDist = 1000; // Search radius
    
    Object.values(this.players).forEach(p => {
      if (filter(p)) {
        const d = this.getDist(bot, p);
        if (d < minDist) {
          minDist = d;
          nearest = p;
        }
      }
    });
    return nearest;
  }

  private getNearestItem(bot: IPlayerData): IItemData | null {
    let nearest: IItemData | null = null;
    let minDist = 2000;
    
    Object.values(this.items).forEach(i => {
      const d = this.getDist(bot, i);
      if (d < minDist) {
        minDist = d;
        nearest = i;
      }
    });
    return nearest;
  }

  private getDist(a: {x: number, y: number}, b: {x: number, y: number}) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
