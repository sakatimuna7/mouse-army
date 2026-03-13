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
  inventory: string[];
  turboCount: number;
  hookCount: number;
  lastActionTime?: number;
}

interface IItemData extends IQuadEntity {
  itemId: string;
  type: "bomb" | "speed" | "hook" | "magnet";
  x: number;
  y: number;
}

enum BlackHoleState {
  None,
  Warning,
  Active,
  Collapse
}

interface IBlackHole {
  x: number;
  y: number;
  state: BlackHoleState;
  startTime: number;
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
  private blackHoleInterval: any;

  // Black Hole Properties
  private blackHole: IBlackHole = { x: 0, y: 0, state: BlackHoleState.None, startTime: 0 };
  private readonly BLACK_HOLE_SPAWN_INTERVAL = [25000, 40000]; // 25-40 seconds
  private readonly BLACK_HOLE_WARNING_DURATION = 2000;
  private readonly BLACK_HOLE_GRACE_DURATION = 1200;
  private readonly BLACK_HOLE_ACTIVE_DURATION = 5000; // Total active time (including 1.2s grace)
  private readonly BLACK_HOLE_OUTER_RADIUS = 500;
  private readonly BLACK_HOLE_EFFECTIVE_RADIUS = 300;
  private readonly BLACK_HOLE_CORE_RADIUS = 90;
  private readonly BLACK_HOLE_GRAVITY_STRENGTH = 1000; // Adjusted for 20 TPS

  constructor(io: Server, roomId: string, onPlayerDeath?: (persistentId: string) => void) {
    this.io = io;
    this.roomId = roomId;
    this.onPlayerDeath = onPlayerDeath;
    this.quadTree = new QuadTree({ x: 0, y: 0, width: this.WORLD_SIZE, height: this.WORLD_SIZE });
    this.startTickLoop();
    this.startItemSpawnLoop();
    this.startSurvivalScoreLoop();
    this.startBotSpawnLoop();
    this.startBlackHoleLoop();
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

    // 3. Update Black Hole
    this.updateBlackHole();

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
        const types: ("bomb" | "speed" | "hook" | "magnet")[] = ["bomb", "speed", "hook", "magnet"];
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
    clearInterval(this.blackHoleInterval);
    console.log(`GameEngine for room ${this.roomId} stopped.`);
  }

  public hasActiveHumans(): boolean {
    return Object.values(this.players).some(p => {
      if (p.isBot) return false;
      const socket = this.io.sockets.sockets.get(p.userId);
      return socket !== undefined && socket.connected;
    });
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
        spawnTime: Date.now(),
        inventory: [],
        turboCount: 0,
        hookCount: 0
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
    const player = this.players[socketId];
    if (player && player.inventory.includes("bomb")) {
      const index = player.inventory.indexOf("bomb");
      player.inventory.splice(index, 1);
      
      this.io.to(this.roomId).emit("bombSpawned", {
        bombId: uuidv4(),
        ownerId: socketId,
        ...bombData
      });
    }
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

      // DROP LOGIC
      const dropItems: ("bomb" | "speed" | "hook" | "magnet")[] = [];
      // 1. Drop bombs and magnets
      victim.inventory.forEach(type => {
        if (type === "bomb" || type === "magnet") dropItems.push(type);
      });
      // 2. Drop turbos
      for (let i = 0; i < victim.turboCount; i++) dropItems.push("speed");
      // 3. Drop hook
      if (victim.hookCount > 0) dropItems.push("hook");

      // Spawn dropped items
      dropItems.forEach(type => {
        const newItem: IItemData = {
          id: uuidv4(),
          itemId: "",
          type: type,
          x: victim.x + (Math.random() * 40 - 20),
          y: victim.y + (Math.random() * 40 - 20)
        };
        newItem.itemId = newItem.id;
        this.items[newItem.id] = newItem;
        this.io.to(this.roomId).emit("itemSpawned", newItem);
      });

      // Clear victim inventory
      victim.inventory = [];
      victim.turboCount = 0;
      victim.hookCount = 0;

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
    const player = this.players[socketId];
    if (!player || player.isDead) return;

    const item = this.items[itemId];
    if (item) {
      const itemType = item.type;
      let canPickup = false;

      if (itemType === "speed") {
        if (player.turboCount < 3) {
          player.turboCount++;
          canPickup = true;
        }
      } else if (itemType === "hook") {
        if (player.hookCount < 1) {
          player.hookCount++;
          canPickup = true;
        }
      } else if (itemType === "bomb" || itemType === "magnet") {
        if (player.inventory.length < 5) {
          player.inventory.push(itemType);
          canPickup = true;
        }
      }

      if (canPickup) {
        delete this.items[itemId];
        this.io.to(this.roomId).emit("itemDestroyed", itemId);
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit("itemAddedToInventory", itemType);
        }
      }
    }
  }

  handleUseTurbo(socketId: string) {
    const player = this.players[socketId];
    if (player && player.turboCount > 0) {
      player.turboCount--;
      console.log(`Player ${player.userName} used Turbo. Remaining: ${player.turboCount}`);
    }
  }

  handleUseHook(socketId: string) {
    const player = this.players[socketId];
    if (player && player.hookCount > 0) {
      player.hookCount--;
      console.log(`Player ${player.userName} used Hook. Remaining: ${player.hookCount}`);
    }
  }

  handleMagnet(socketId: string, data: { x: number, y: number }) {
    const player = this.players[socketId];
    if (player && player.inventory.includes("magnet")) {
      const index = player.inventory.indexOf("magnet");
      player.inventory.splice(index, 1);

      // Notify clients to play visual effect
      this.io.to(this.roomId).emit("magnetActivated", {
        attractorId: socketId,
        x: data.x,
        y: data.y,
        radius: 250
      });

      // Server-side attraction logic
      const radius = 250;
      const attractionForce = 15;

      Object.values(this.players).forEach(victim => {
        if (victim.userId === socketId || victim.isDead) return;

        const dist = Math.sqrt(Math.pow(victim.x - data.x, 2) + Math.pow(victim.y - data.y, 2));
        if (dist < radius) {
          // Calculate vector towards attractor
          const angle = Math.atan2(data.y - victim.y, data.x - victim.x);
          
          // Move victim towards attractor
          // For bots, we can update their position directly
          // For players, the actual movement is client-side, but server-side validation might catch up
          // We'll emit a "pushed" event to force client-side displacement
          if (victim.isBot) {
              victim.x += Math.cos(angle) * attractionForce;
              victim.y += Math.sin(angle) * attractionForce;
          } else {
              const socket = this.io.sockets.sockets.get(victim.userId);
              if (socket) {
                  socket.emit("playerPushed", {
                      forceX: Math.cos(angle) * attractionForce,
                      forceY: Math.sin(angle) * attractionForce
                  });
              }
          }
        }
      });
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
      botType: botType as any,
      inventory: [],
      turboCount: 0,
      hookCount: 0,
      lastActionTime: 0,
      targetId: undefined
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

  private startBlackHoleLoop() {
    const scheduleNext = () => {
      const waitTime = Math.random() * (this.BLACK_HOLE_SPAWN_INTERVAL[1] - this.BLACK_HOLE_SPAWN_INTERVAL[0]) + this.BLACK_HOLE_SPAWN_INTERVAL[0];
      this.blackHoleInterval = setTimeout(() => {
        this.initiateBlackHole();
        scheduleNext();
      }, waitTime);
    };
    scheduleNext();
  }

  private initiateBlackHole() {
    if (this.blackHole.state !== BlackHoleState.None) return;

    // Algorithm: Choose spawn near player clusters
    const allPlayers = Object.values(this.players);
    if (allPlayers.length === 0) return;

    const randomPlayer = allPlayers[Math.floor(Math.random() * allPlayers.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 200;

    let spawnX = randomPlayer.x + Math.cos(angle) * dist;
    let spawnY = randomPlayer.y + Math.sin(angle) * dist;

    // Clamp to map bounds
    spawnX = Math.max(100, Math.min(this.WORLD_SIZE - 100, spawnX));
    spawnY = Math.max(100, Math.min(this.WORLD_SIZE - 100, spawnY));

    this.blackHole = {
      x: spawnX,
      y: spawnY,
      state: BlackHoleState.Warning,
      startTime: Date.now()
    };

    console.log(`Black Hole WARNING at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
    this.io.to(this.roomId).emit("blackHoleWarning", { x: spawnX, y: spawnY });
  }

  private updateBlackHole() {
    if (this.blackHole.state === BlackHoleState.None) return;

    const now = Date.now();
    const elapsed = now - this.blackHole.startTime;

    if (this.blackHole.state === BlackHoleState.Warning) {
      if (elapsed >= this.BLACK_HOLE_WARNING_DURATION) {
        this.blackHole.state = BlackHoleState.Active;
        this.blackHole.startTime = now;
        this.io.to(this.roomId).emit("blackHoleSpawned", { x: this.blackHole.x, y: this.blackHole.y });
        console.log("Black Hole ACTIVE");
      }
    } else if (this.blackHole.state === BlackHoleState.Active) {
      this.applyBlackHoleGravity();

      if (elapsed >= this.BLACK_HOLE_ACTIVE_DURATION) {
        this.blackHole.state = BlackHoleState.Collapse;
        this.blackHole.startTime = now;
        this.io.to(this.roomId).emit("blackHoleCollapsed", { x: this.blackHole.x, y: this.blackHole.y });
        console.log("Black Hole COLLAPSED");
        
        // Final collapse effect (knockback)
        this.applyBlackHoleCollapse();
        
        // Reset after a short delay for animations
        setTimeout(() => {
          this.blackHole.state = BlackHoleState.None;
        }, 1000);
      }
    }
  }

  private applyBlackHoleGravity() {
    Object.values(this.players).forEach(player => {
      if (player.isDead) return;

      const dx = this.blackHole.x - player.x;
      const dy = this.blackHole.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const elapsed = Date.now() - this.blackHole.startTime;
      const isGracePeriod = elapsed < this.BLACK_HOLE_GRACE_DURATION;

      // Death logic (only after grace period)
      if (dist < this.BLACK_HOLE_CORE_RADIUS && !isGracePeriod) {
        this.handleKilled("environment", { victimId: player.id, killerId: "environment" });
        return;
      }

      // Gravity logic
      if (dist < this.BLACK_HOLE_OUTER_RADIUS) {
        // force = gravityStrength * (1 - distance / influenceRadius)^2
        const forceMag = this.BLACK_HOLE_GRAVITY_STRENGTH * Math.pow(1 - dist / this.BLACK_HOLE_OUTER_RADIUS, 2);
        
        // normalize direction
        const dirX = dx / dist;
        const dirY = dy / dist;

        // Apply force
        let appliedForceX = dirX * forceMag;
        let appliedForceY = dirY * forceMag;

        // Add orbital (tangential) force during grace period or for core swirling
        if (isGracePeriod || dist < 150) {
          const orbitalStrength = forceMag * 1.5; // Strong swirling
          const tangentX = -dirY; // Clockwise
          const tangentY = dirX;
          
          appliedForceX += tangentX * orbitalStrength;
          appliedForceY += tangentY * orbitalStrength;
        }

        // Turbo Interaction
        // playerVelocity * turboResistanceFactor (implied as part of server-side movement sync)
        // If the player is actively moving away (checked via their input/velocity), we reduce the force
        // Since movement is client-side authoritative in this engine, we emit a 'pushed' event
        // but with a negative force (pull).
        
        const socket = this.io.sockets.sockets.get(player.userId);
        if (socket) {
          socket.emit("playerPushed", {
            forceX: appliedForceX / this.TICK_RATE,
            forceY: appliedForceY / this.TICK_RATE,
            source: "blackhole"
          });
        }
        
        if (player.isBot) {
          player.x += appliedForceX / this.TICK_RATE;
          player.y += appliedForceY / this.TICK_RATE;
        }
      }
    });
  }

  private applyBlackHoleCollapse() {
    const collapseRadius = 400;
    const knockbackForce = 50;

    Object.values(this.players).forEach(player => {
      if (player.isDead) return;

      const dx = player.x - this.blackHole.x;
      const dy = player.y - this.blackHole.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < collapseRadius) {
        const angle = Math.atan2(dy, dx);
        const forceScale = 1 - (dist / collapseRadius);
        
        if (player.isBot) {
          player.x += Math.cos(angle) * knockbackForce * forceScale;
          player.y += Math.sin(angle) * knockbackForce * forceScale;
        } else {
          const socket = this.io.sockets.sockets.get(player.userId);
          if (socket) {
            socket.emit("playerPushed", {
              forceX: Math.cos(angle) * knockbackForce * forceScale,
              forceY: Math.sin(angle) * knockbackForce * forceScale,
              source: "blackhole_collapse"
            });
          }
        }
      }
    });
  }
}
