import Phaser from "phaser";
import { Player } from "./player";
import { NetworkManager, IPlayerData } from "../network/networkManager";
import { useGameStore } from "../store/useGameStore";

interface IItemData {
  itemId: string;
  type: "bomb" | "speed" | "hook";
  x: number;
  y: number;
}

interface IBombData {
  bombId: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private otherPlayers: Map<string, Player> = new Map();
  private items: Map<
    string,
    Phaser.GameObjects.Sprite | Phaser.GameObjects.Container
  > = new Map();
  private bombs: Phaser.Physics.Arcade.Group | null = null;
  private networkManager!: NetworkManager;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private minimapPointers!: Phaser.GameObjects.Graphics;
  private minimapContainer!: Phaser.GameObjects.Container;
  private hookRangeGraphics!: Phaser.GameObjects.Graphics;

  // World & Config
  private readonly WORLD_SIZE = 5000;
  private readonly GRID_SIZE = 50;
  private lastEmitTime: number = 0;
  private emitInterval: number = 50;

  // Combat & Settings
  private readonly ATTACK_RADIUS = 150;
  private readonly ATTACK_FORCE = 400;
  private readonly ATTACK_DAMAGE = 10;
  private readonly BOMB_THROW_FORCE = 500;
  private readonly BOMB_EXPLOSION_RADIUS = 250;
  private readonly BOMB_EXPLOSION_FORCE = 1500;
  private readonly BOMB_DAMAGE = 60;
  private readonly HOOK_RANGE = 160;
  private readonly STUN_DURATION = 1500;
  private lastTurboTime: number = 0;
  private readonly TURBO_COOLDOWN = 1200;
  private readonly TURBO_DURATION = 5000;

  // Particles
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: "MainScene" });
  }

  preload() {
    // 1. Particle assets (remote is fine for sparks)
    this.load.image("spark", "https://labs.phaser.io/assets/particles/muzzleflash2.png");
  }

  create() {
    this.networkManager = NetworkManager.getInstance();
    this.bombs = this.physics.add.group();
    this.hookRangeGraphics = this.add.graphics();
    this.hookRangeGraphics.setDepth(1);

    // 1. Generate ALL asset textures in-engine for perfect transparency
    this.generateVectorTextures();

    // 2. World & Grid
    this.physics.world.setBounds(0, 0, this.WORLD_SIZE, this.WORLD_SIZE);
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x222222, 1);
    for (let x = 0; x <= this.WORLD_SIZE; x += this.GRID_SIZE) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, this.WORLD_SIZE);
    }
    for (let y = 0; y <= this.WORLD_SIZE; y += this.GRID_SIZE) {
      graphics.moveTo(0, y);
      graphics.lineTo(this.WORLD_SIZE, y);
    }
    graphics.strokePath();

    // 3. Camera Setup
    this.cameras.main.setBounds(0, 0, this.WORLD_SIZE, this.WORLD_SIZE);

    // 4. Particles
    this.explosionEmitter = this.add.particles(0, 0, "spark", {
      speed: { min: -200, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      quantity: 50,
      emitting: false,
    });
    this.explosionEmitter.setDepth(5);

    // 5. Input Handling
    this.setupInputs();

    // 6. Setup Listeners
    this.setupNetworkListeners();

    // 7. Setup Minimap
    this.setupMinimap();

    // 8. Join Game
    const { playerName, persistentId } = useGameStore.getState();
    this.networkManager.emit('joinGame', { userName: playerName, persistentId });

    // 8. Cleanup on Shutdown
    this.events.once("shutdown", () => {
      this.networkManager.off("leaderboardUpdate");
      this.networkManager.off("currentPlayers");
      this.networkManager.off("newPlayer");
      this.networkManager.off("currentItems");
      this.networkManager.off("itemSpawned");
      this.networkManager.off("itemDestroyed");
      this.networkManager.off("itemAddedToInventory");
      this.networkManager.off("bombSpawned");
      this.networkManager.off("playerMoved");
      this.networkManager.off("playerAttack");
      this.networkManager.off("playerHookedEffect");
      this.networkManager.off("playerDeath");
      this.networkManager.off("playerRespawn");
      this.networkManager.off("playerDisconnected");
      this.networkManager.off("killLog");
    });
  }

  private generateVectorTextures() {
    // A. Player Cursor Textures (Pink & Azure)
    this.drawNeonCursor("mouse_pink", 0xff00ff);
    this.drawNeonCursor("mouse_azure", 0x00ffff);

    // B. Item Textures (Bomb, Speed, Hook) matching Inventory UI
    const itemConfig = [
      { key: "bomb", emoji: "💣", color: 0xff4444 },
      { key: "speed", emoji: "⚡", color: 0xffff00 },
      { key: "hook", emoji: "🪝", color: 0x4444ff },
    ];

    itemConfig.forEach(cfg => {
      this.drawItemIcon(cfg.key, cfg.emoji, cfg.color);
    });

    // C. Physical Bomb (thrown)
    this.drawPhysicalBomb();
  }

  private drawNeonCursor(key: string, color: number) {
    const size = 64;
    const g = this.make.graphics({ x: 0, y: 0 });
    
    // Outer Glow
    g.lineStyle(6, color, 0.3);
    g.beginPath();
    g.moveTo(size / 2, 8);
    g.lineTo(size - 12, size - 12);
    g.lineTo(size / 2, size - 24);
    g.lineTo(12, size - 12);
    g.closePath();
    g.strokePath();

    // Main Sharp Cursor
    g.lineStyle(3, 0xffffff, 1);
    g.fillStyle(color, 0.8);
    g.beginPath();
    g.moveTo(size / 2, 12);
    g.lineTo(size - 16, size - 16);
    g.lineTo(size / 2, size - 28);
    g.lineTo(16, size - 16);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private drawItemIcon(key: string, emoji: string, color: number) {
    const size = 64;
    const g = this.make.graphics({ x: 0, y: 0 });
    
    // Inventory-style rounded block
    g.fillStyle(0x0f0f0f, 0.9);
    g.lineStyle(2, color, 1);
    g.fillRoundedRect(4, 4, size-8, size-8, 12);
    g.strokeRoundedRect(4, 4, size-8, size-8, 12);

    // Subtle Glow
    g.lineStyle(4, color, 0.3);
    g.strokeRoundedRect(2, 2, size-4, size-4, 14);

    const txt = this.make.text({
        x: size/2, y: size/2,
        text: emoji,
        style: { fontSize: '32px' }
    }).setOrigin(0.5);

    const rt = this.add.renderTexture(0, 0, size, size);
    rt.draw(g);
    rt.draw(txt);
    rt.saveTexture(key);
    
    rt.destroy();
    g.destroy();
    txt.destroy();
  }

  private drawPhysicalBomb() {
      const size = 32;
      const g = this.make.graphics({ x: 0, y: 0 });
      
      // Core
      g.fillStyle(0x111111, 1);
      g.fillCircle(size/2, size/2, 10);
      
      // Neon Ring
      g.lineStyle(2, 0xff4400, 1);
      g.strokeCircle(size/2, size/2, 10);
      
      // Glow
      g.lineStyle(4, 0xff4400, 0.4);
      g.strokeCircle(size/2, size/2, 12);
      
      g.generateTexture("bomb_phys", size, size);
      g.destroy();
  }

  private setupInputs() {
    this.input.on("pointerdown", () => {
      if (this.player && this.player.visible && !this.player.isStunned) {
        this.performAttack();
      }
    });

    const spaceKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    spaceKey?.on("down", () => {
      if (
        this.player &&
        this.player.visible &&
        !this.player.isStunned &&
        this.player.hasItem("bomb")
      ) {
        this.throwBomb();
      }
    });

    const eKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    eKey?.on("down", () => {
      if (
        this.player &&
        this.player.visible &&
        !this.player.isStunned
      ) {
         const { hookCount } = useGameStore.getState();
         if (hookCount > 0) {
            if (!this.player.isAimingHook) {
                // Stage 1: Aiming
                // 1. Block if Turbo is active
                if (this.player.isSpeedBoostActive()) {
                    this.showFloatingText(this.player.x, this.player.y - 40, "BLOCK BY TURBO!", 0xff4444);
                    return;
                }
                this.player.setAimingHook(true, this.time.now);
                this.showFloatingText(this.player.x, this.player.y - 40, "HOOK READY", 0x8888ff);
            } else {
                // Stage 2: Fire
                this.useHook();
                this.player.setAimingHook(false);
            }
         }
      }
    });

    const qKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    qKey?.on("down", () => {
      this.useTurbo();
    });
  }

  private setupNetworkListeners() {
    this.networkManager.on("leaderboardUpdate", (data: any[]) => {
      useGameStore.getState().setLeaderboard(
        data.map((entry) => ({
          ...entry,
          isLocalPlayer: entry.userId === this.networkManager.getSocketId(),
        })),
      );
    });

    this.networkManager.on("currentPlayers", (players: Record<string, any>) => {
      Object.keys(players).forEach((id) => {
        if (id === this.networkManager.getSocketId()) {
          if (!this.player) this.addPlayer(players[id]);
        } else if (!this.otherPlayers.has(id)) {
          this.addOtherPlayer(players[id]);
        }
      });
    });

    this.networkManager.on("newPlayer", (playerInfo: any) => {
      if (playerInfo.userId === this.networkManager.getSocketId()) {
        if (!this.player) this.addPlayer(playerInfo);
      } else if (!this.otherPlayers.has(playerInfo.userId)) {
        this.addOtherPlayer(playerInfo);
      }
    });

    this.networkManager.on(
      "currentItems",
      (items: Record<string, IItemData>) => {
        Object.values(items).forEach((item) => this.addItem(item));
      },
    );

    this.networkManager.on("itemSpawned", (item: IItemData) => {
      this.addItem(item);
    });

    this.networkManager.on("itemDestroyed", (itemId: string) => {
      const itemSprite = this.items.get(itemId);
      if (itemSprite) {
        itemSprite.destroy();
        this.items.delete(itemId);
      }
    });

    this.networkManager.on("itemAddedToInventory", (type: string) => {
      if (this.player) {
        if (type === "speed") {
          const { turboCount, setTurboCount } = useGameStore.getState();
          if (turboCount < 3) {
            setTurboCount(turboCount + 1);
            this.showFloatingText(
                this.player.x,
                this.player.y - 40,
                "+1 TURBO CHARGE",
                0xffff00,
            );
          } else {
             this.showFloatingText(
                this.player.x,
                this.player.y - 40,
                "TURBO FULL!",
                0xffaa00,
            );
          }
        } else if (type === "hook") {
             const { hookCount, setHookCount } = useGameStore.getState();
             if (hookCount < 1) {
                setHookCount(1);
                this.showFloatingText(
                    this.player.x,
                    this.player.y - 40,
                    "HOOK ACQUIRED",
                    0x8888ff,
                );
             }
        } else {
          this.player.addToInventory(type);
          this.showFloatingText(
            this.player.x,
            this.player.y - 40,
            `+ ${type.toUpperCase()}`,
            0x00ffff,
          );
        }
      }
    });

    this.networkManager.on("bombSpawned", (bombData: IBombData) => {
      this.createBombEntity(bombData);
    });

    this.networkManager.on("gameUpdate", (data: { players: Record<string, any>, items: Record<string, any> }) => {
      // 1. Sync Players
      Object.entries(data.players).forEach(([id, info]) => {
        if (id === this.networkManager.getSocketId()) {
          // Sync local player if needed (usually client is authoritative for own movement)
          return;
        }

        let other = this.otherPlayers.get(id);
        if (!other) {
          // Spawn if not exists
          other = new Player(this, id, info.x, info.y, "player_atlas", info.userName);
          this.otherPlayers.set(id, other);
        }

        // Update properties
        other.health = info.health;
        other.isBot = !!info.isBot;
        other.isDead = !!info.isDead;

        if (other.isDead) {
            other.setVisible(false);
        } else {
            other.setVisible(true);
            if (other.isBot) {
                other.setTint(0xcccccc);
            } else {
                other.clearTint(); // Clear tint if not a bot
            }
        }
        
        // Simple interpolation
        this.tweens.add({
          targets: other,
          x: info.x,
          y: info.y,
          duration: 50, // Match server tick rate (20Hz = 50ms)
          ease: "Linear",
          overwrite: true
        });
      });

      // 2. Sync Items
      Object.entries(data.items).forEach(([id, info]) => {
        if (!this.items.has(id)) {
           this.addItem(info as IItemData);
        }
      });
    });

    this.networkManager.on(
      "playerAttack",
      (data: {
        attackerId: string;
        x: number;
        y: number;
        radius: number;
        force: number;
      }) => {
        this.showAttackEffect(data.x, data.y, data.radius, 0x00ffff);
        this.handleExplosionDamage(
          data.x,
          data.y,
          data.radius,
          data.force,
          this.ATTACK_DAMAGE,
          data.attackerId,
          false // canHitOwner = false (Basic attack doesn't hit self)
        );
      },
    );

    this.networkManager.on(
      "playerHookedEffect",
      (data: {
        victimId: string;
        attackerId: string;
        x: number;
        y: number;
      }) => {
        const victim =
          data.victimId === this.networkManager.getSocketId()
            ? this.player
            : this.otherPlayers.get(data.victimId);
        const attacker =
          data.attackerId === this.networkManager.getSocketId()
            ? this.player
            : this.otherPlayers.get(data.attackerId);

        if (victim && attacker) {
          const line = this.add.graphics();
          line.lineStyle(4, 0x0000ff, 0.8);
          line.lineBetween(attacker.x, attacker.y, victim.x, victim.y);
          this.tweens.add({
            targets: line,
            alpha: 0,
            duration: 800,
            onComplete: () => line.destroy(),
          });

          victim.setStun(true);
          this.time.delayedCall(this.STUN_DURATION, () =>
            victim.setStun(false),
          );

          this.tweens.add({
            targets: victim,
            x: attacker.x,
            y: attacker.y,
            duration: 350,
            ease: "Cubic.easeOut",
          });

          this.showFloatingText(
            victim.x,
            victim.y - 40,
            "REELING IN!",
            0x4444ff,
          );
        }
      },
    );

    this.networkManager.on("playerDeath", (userId: string) => {
      const victim =
        userId === this.networkManager.getSocketId()
          ? this.player
          : this.otherPlayers.get(userId);
      if (victim) {
        this.createExplosion(victim.x, victim.y, 100);
        victim.setVisible(false);
        if (userId === this.networkManager.getSocketId()) {
          this.handleLocalDeath();
          // Persistent session mapping is cleared on server upon death.
          // If we want the player to return to lobby on death, we'd call:
          // useGameStore.getState().setJoined(false);
        }
      }
    });

    this.networkManager.on("playerRespawn", (playerInfo: any) => {
      const target =
        playerInfo.userId === this.networkManager.getSocketId()
          ? this.player
          : this.otherPlayers.get(playerInfo.userId);
      if (target) target.respawn(playerInfo.x, playerInfo.y);
    });

    this.networkManager.on("playerDisconnected", (userId: string) => {
      const otherPlayer = this.otherPlayers.get(userId);
      if (otherPlayer) {
        otherPlayer.destroy();
        this.otherPlayers.delete(userId);
      }
    });

    this.networkManager.on("killLog", (data: { killerName: string, victimName: string, timestamp: number }) => {
      useGameStore.getState().addKillLog(data);
    });
  }

  private useHook() {
    const { hookCount, setHookCount } = useGameStore.getState();
    if (hookCount <= 0) return;

    const pointer = this.input.activePointer;
    const worldPointer = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    let targetPlayer: Player | null = null;
    let minDist = this.HOOK_RANGE;

    this.otherPlayers.forEach((other) => {
      if (!other.visible) return;
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        other.x,
        other.y,
      );
      if (d < minDist) {
        const angleToTarget = Phaser.Math.Angle.Between(
          this.player.x,
          this.player.y,
          other.x,
          other.y,
        );
        const angleToMouse = Phaser.Math.Angle.Between(
          this.player.x,
          this.player.y,
          worldPointer.x,
          worldPointer.y,
        );
        const diff = Phaser.Math.Angle.Wrap(angleToTarget - angleToMouse);
        if (Math.abs(diff) < 0.8) {
          minDist = d;
          targetPlayer = other;
        }
      }
    });
      setHookCount(0);
      this.player.setAimingHook(false);

      if (targetPlayer) {
        this.networkManager.emit("playerHooked", {
          victimId: (targetPlayer as Player).playerId,
          attackerId: this.networkManager.getSocketId(),
          x: this.player.x,
          y: this.player.y,
        });
        console.log(`Sending playerHooked for victim: ${(targetPlayer as Player).playerId}`);
      }
  }

  handleExplosionDamage(
    x: number,
    y: number,
    radius: number,
    force: number,
    damage: number,
    attackerId: string,
    canHitOwner: boolean = true,
    shouldReport: boolean = false
  ) {
    const myId = this.networkManager.getSocketId();
    if (!myId) return;

    // 1. Check Local Player
    if (this.player && this.player.visible && !this.player.isDead) {
      const isOwner = attackerId === myId;
      if (!isOwner || canHitOwner) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
        if (dist < radius) {
          const angle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
          const forceScale = 1 - dist / radius;
          this.player.applyKnockback(Math.cos(angle) * force * forceScale, Math.sin(angle) * force * forceScale);
          const finalDamage = Math.floor(damage * forceScale);
          this.player.takeDamage(finalDamage);
          
          if (this.player.health <= 0) {
            this.networkManager.emit("playerKilled", {
              victimId: this.networkManager.getSocketId(),
              killerId: attackerId,
            });
          }
        }
      }
    }

    // 2. Check Other Players (especially Bots)
    // Who reports damage to bots from non-player sources?
    const isOwner = attackerId === myId;
    
    // Identify humans in the room
    const humanIds = [myId];
    this.otherPlayers.forEach((p, id) => {
        if (!p.isBot) humanIds.push(id);
    });
    humanIds.sort();
    const amIDelegate = humanIds[0] === myId;

    // Determine if the attacker is a known human player
    const attackerIsHuman = humanIds.includes(attackerId);
    
    // Reporting Logic: 
    // - If it's your own attack, you report for everyone you hit.
    // - If it's a bot's attack (or env), ONLY the 'delegate' (first human) reports for all bots hit.
    const shouldIReportForOthers = attackerIsHuman ? isOwner : amIDelegate;

    if (shouldIReportForOthers) {
        this.otherPlayers.forEach(other => {
            if (other.visible && !other.isDead) {
                const dist = Phaser.Math.Distance.Between(other.x, other.y, x, y);
                if (dist < radius) {
                    const forceScale = 1 - dist / radius;
                    const finalDamage = Math.floor(damage * forceScale);
                    
                    // Predict damage on client
                    other.takeDamage(finalDamage);
                    
                    // Report to server (especially for Bots)
                    if (shouldReport) {
                        this.networkManager.emit("playerAttack", {
                            x: x,
                            y: y,
                            radius: radius,
                            force: force
                        });
                        // Only report once per explosion
                        shouldReport = false; 
                    }
                }
            }
        });
    }
  }

  private createExplosion(x: number, y: number, radius: number) {
    this.explosionEmitter.emitParticleAt(x, y);
    this.showAttackEffect(x, y, radius, 0xffa500);
    this.cameras.main.shake(250, 0.015);
  }

  private handleLocalDeath() {
    this.cameras.main.flash(500, 255, 0, 0);
    this.showFloatingText(this.player.x, this.player.y, "WASTED", 0xff0000);
    if (this.player.body) this.player.body.enable = false;
  }

  private throwBomb() {
    const pointer = this.input.activePointer;
    const worldPointer = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      worldPointer.x,
      worldPointer.y,
    );
    const vx = Math.cos(angle) * this.BOMB_THROW_FORCE;
    const vy = Math.sin(angle) * this.BOMB_THROW_FORCE;
    this.player.removeItem("bomb");
    this.networkManager.emit("throwBomb", {
      x: this.player.x,
      y: this.player.y,
      vx,
      vy,
    });
    this.createBombEntity({
      bombId: "local-" + Date.now(),
      ownerId: this.networkManager.getSocketId() || "local",
      x: this.player.x,
      y: this.player.y,
      vx,
      vy,
    });
  }

  private createBombEntity(data: IBombData) {
    if (!this.bombs) return;
    const bombSprite = this.physics.add.sprite(data.x, data.y, "bomb_phys");
    bombSprite.setDepth(1);
    bombSprite.setVelocity(data.vx, data.vy);
    bombSprite.setDrag(120);
    bombSprite.setCollideWorldBounds(true);
    bombSprite.setBounce(0.8);
    this.bombs.add(bombSprite);

    this.tweens.add({
        targets: bombSprite,
        scale: 1.5,
        alpha: 0.5,
        duration: 200,
        yoyo: true,
        repeat: 8,
        onComplete: () => {
            this.handleExplosionDamage(
                bombSprite.x, bombSprite.y,
                this.BOMB_EXPLOSION_RADIUS, this.BOMB_EXPLOSION_FORCE,
                this.BOMB_DAMAGE, data.ownerId,
                true, // canHitOwner
                true  // shouldReport = true (Bombs need client report)
            );
            this.createExplosion(bombSprite.x, bombSprite.y, this.BOMB_EXPLOSION_RADIUS);
            bombSprite.destroy();
        }
    });
  }

  private performAttack() {
    this.showAttackEffect(
      this.player.x,
      this.player.y,
      this.ATTACK_RADIUS,
      0xff00ff,
    );
    this.networkManager.emit("playerAttack", {
      x: this.player.x,
      y: this.player.y,
      radius: this.ATTACK_RADIUS,
      force: this.ATTACK_FORCE,
    });

    // LOCAL PREDICTION: Immediately check for hits (especially for bots)
    this.handleExplosionDamage(
        this.player.x,
        this.player.y,
        this.ATTACK_RADIUS,
        this.ATTACK_FORCE,
        this.ATTACK_DAMAGE,
        this.networkManager.getSocketId() || 'local',
        false // canHitOwner = false (Basic attack doesn't hit self)
    );
  }

  private useTurbo() {
    if (!this.player || !this.player.visible || this.player.isStunned) return;
    
    // 1. Cannot activate during active boost
    if (this.player.isSpeedBoostActive()) {
        this.showFloatingText(this.player.x, this.player.y - 40, "TURBO ACTIVE!", 0xffff00);
        return;
    }

    // BLOCK BY HOOK
    if (this.player.isAimingHook) {
        this.showFloatingText(this.player.x, this.player.y - 40, "BLOCK BY HOOK!", 0xff4444);
        return;
    }
    
    const { turboCount, setTurboCount } = useGameStore.getState();
    const now = this.time.now;

    // 2. Cooldown 1.2s starts AFTER duration 5s
    const totalCycle = this.TURBO_DURATION + this.TURBO_COOLDOWN;

    if (turboCount > 0 && now - this.lastTurboTime > totalCycle) {
      this.lastTurboTime = now;
      setTurboCount(turboCount - 1);
      this.player.activateSpeedBoost(this.TURBO_DURATION);

      this.showFloatingText(
        this.player.x,
        this.player.y - 40,
        "SPEED BOOST!",
        0xffff00,
      );
    } else if (turboCount > 0) {
        const remainingCd = Math.ceil((totalCycle - (now - this.lastTurboTime)) / 1000);
        this.showFloatingText(
            this.player.x,
            this.player.y - 40,
            `WAIT ${remainingCd}s`,
            0xff4444,
        );
    }
  }

  private showAttackEffect(
    x: number,
    y: number,
    radius: number,
    color: number,
  ) {
    const circle = this.add.circle(x, y, 10, color, 0.4);
    this.tweens.add({
      targets: circle,
      radius,
      alpha: 0,
      duration: 400,
      onComplete: () => circle.destroy(),
    });
  }

  private drawHookRange() {
    this.hookRangeGraphics.clear();
    if (this.player && this.player.visible && this.player.isAimingHook) {
      this.hookRangeGraphics.lineStyle(2, 0x8888ff, 0.3);
      this.hookRangeGraphics.strokeCircle(this.player.x, this.player.y, this.HOOK_RANGE);
      
      // Pulse effect
      const pulse = (Math.sin(this.time.now / 200) + 1) * 0.1;
      this.hookRangeGraphics.fillStyle(0x8888ff, 0.05 + pulse);
      this.hookRangeGraphics.fillCircle(this.player.x, this.player.y, this.HOOK_RANGE);
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: number) {
    const t = this.add.text(x, y, text, {
      fontSize: "28px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 8,
    });
    t.setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: y - 120,
      alpha: 0,
      duration: 1500,
      onComplete: () => t.destroy(),
    });
  }

  private addPlayer(playerInfo: any) {
    this.player = new Player(
      this,
      playerInfo.userId,
      playerInfo.x,
      playerInfo.y,
      "mouse_pink",
      playerInfo.userName || 'You'
    );
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private addItem(item: IItemData) {
    const itemSprite = this.physics.add.sprite(item.x, item.y, item.type);
    itemSprite.setDepth(1);
    itemSprite.setScale(0.5); // Global scale reduction for items
    this.tweens.add({
      targets: itemSprite,
      y: item.y - 12,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.items.set(item.itemId, itemSprite);
    if (this.player) {
      this.physics.add.overlap(this.player, itemSprite, () => {
        this.networkManager.emit("pickupItem", item.itemId);
      });
    }
  }

  private addOtherPlayer(playerInfo: any) {
    const otherPlayer = new Player(
      this,
      playerInfo.userId,
      playerInfo.x,
      playerInfo.y,
      "mouse_azure",
      playerInfo.userName || 'Player'
    );
    this.otherPlayers.set(playerInfo.userId, otherPlayer);
  }

  update(time: number) {
    if (this.player && this.player.visible) {
      this.player.update(this.input.activePointer, this.cameras.main);
      if (time - this.lastEmitTime > this.emitInterval) {
        this.networkManager.emit("playerMovement", this.player.getEntityData());
        this.lastEmitTime = time;
      }
      this.drawHookRange();

      // Check Hook Timeout
      if (this.player.isAimingHook && this.time.now - this.player.hookAimStartTime > 1500) {
          const { setHookCount } = useGameStore.getState();
          setHookCount(0);
          this.player.setAimingHook(false);
          this.showFloatingText(this.player.x, this.player.y - 40, "HOOK FAILED!", 0xff4444);
      }
    }
    
    // Sync UI for all other players (important for bots and those moved by tweens)
    this.otherPlayers.forEach(other => {
        other.syncUI();
    });

    this.updateMinimap();
  }

  private setupMinimap() {
    const size = 150;
    const padding = 20;
    
    this.minimapContainer = this.add.container(padding + size/2, padding + size/2);
    this.minimapContainer.setScrollFactor(0);
    this.minimapContainer.setDepth(100);

    // Background circle
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.lineStyle(2, 0xffffff, 0.3);
    bg.fillCircle(0, 0, size/2);
    bg.strokeCircle(0, 0, size/2);
    this.minimapContainer.add(bg);

    // Mask for items/players
    this.minimapGraphics = this.add.graphics();
    this.minimapPointers = this.add.graphics(); // This one sits outside the mask
    this.minimapContainer.add([this.minimapGraphics, this.minimapPointers]);

    const maskMask = this.make.graphics({ x: 0, y: 0 });
    maskMask.fillStyle(0xffffff, 1);
    maskMask.fillCircle(padding + size/2, padding + size/2, size/2);
    maskMask.setScrollFactor(0);
    
    const geomMask = maskMask.createGeometryMask();
    this.minimapGraphics.setMask(geomMask);
    this.minimapGraphics.setDepth(1); // Ensure it's above the background

    // Compass
    const compassStyle = { fontSize: '12px', fontStyle: 'bold', color: '#ffffff' };
    const n = this.add.text(0, -size/2 + 10, 'N', compassStyle).setOrigin(0.5);
    const s = this.add.text(0, size/2 - 10, 'S', compassStyle).setOrigin(0.5);
    const e = this.add.text(size/2 - 10, 0, 'E', compassStyle).setOrigin(0.5);
    const w = this.add.text(-size/2 + 10, 0, 'W', compassStyle).setOrigin(0.5);
    this.minimapContainer.add([n, s, e, w]);
  }

  private updateMinimap() {
    if (!this.minimapGraphics || !this.minimapPointers) return;
    this.minimapGraphics.clear();
    this.minimapPointers.clear();
    const size = 150;
    const radius = size / 2;
    const scale = size / this.WORLD_SIZE;

    const drawIndicator = (worldX: number, worldY: number, color: number, dotSize: number, isLocal: boolean = false) => {
        const relX = (worldX * scale) - radius;
        const relY = (worldY * scale) - radius;
        const dist = Math.sqrt(relX * relX + relY * relY);

        if (dist <= radius) {
            this.minimapGraphics.fillStyle(color, isLocal ? 1 : 0.8);
            this.minimapGraphics.fillCircle(relX, relY, dotSize);
            if (isLocal) {
                this.minimapGraphics.lineStyle(1, 0xffffff, 1);
                this.minimapGraphics.strokeCircle(relX, relY, dotSize + 1);
            }
        } else {
            // Out of bounds: Draw pointer arrow at the edge
            const angle = Math.atan2(relY, relX);
            
            this.minimapPointers.fillStyle(color, 0.7); // Slightly transparent
            this.minimapPointers.beginPath();
            
            // Draw a sharper, smaller triangle pointing outwards
            const arrowSize = 4;
            const p1x = Math.cos(angle) * (radius - 2);
            const p1y = Math.sin(angle) * (radius - 2);
            const p2x = Math.cos(angle - 0.2) * (radius - 2 - arrowSize);
            const p2y = Math.sin(angle - 0.2) * (radius - 2 - arrowSize);
            const p3x = Math.cos(angle + 0.2) * (radius - 2 - arrowSize);
            const p3y = Math.sin(angle + 0.2) * (radius - 2 - arrowSize);
            
            this.minimapPointers.fillPoints([
                new Phaser.Geom.Point(p1x, p1y),
                new Phaser.Geom.Point(p2x, p2y),
                new Phaser.Geom.Point(p3x, p3y)
            ]);
        }
    };

    // Items
    this.items.forEach((sprite) => {
        drawIndicator(sprite.x, sprite.y, 0xffff00, 2);
    });

    // Other Players
    this.otherPlayers.forEach(other => {
        if (!other.visible) return;
        drawIndicator(other.x, other.y, 0x00ffff, 2);
    });

    // Local Player
    if (this.player) {
        drawIndicator(this.player.x, this.player.y, 0xff00ff, 3, true);
    }
  }
}
