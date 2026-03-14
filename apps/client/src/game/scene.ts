import Phaser from "phaser";
import { Player } from "./player";
import { NetworkManager } from "../network/networkManager";
import { IPlayerData, IItemData } from "@mouse-army/shared";
import { useGameStore } from "../store/useGameStore";
import { soundSynth } from "./audioSynth";

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
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private worldLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;

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
  private readonly TURBO_COOLDOWN = 4000;
  private readonly TURBO_DURATION = 600;

  // Particles
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private vortexEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Mobile Controls
  private isMobile: boolean = false;
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private joystickThumb: Phaser.GameObjects.Arc | null = null;
  private joystickActive: boolean = false;
  private joystickVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private mobileButtons: Map<string, Phaser.GameObjects.Container> = new Map();

  // Black Hole Visuals
  private blackHoleContainer: Phaser.GameObjects.Container | null = null;
  private blackHoleTelegraph: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: "MainScene" });
  }

  preload() {
    // 1. Particle assets
    this.load.image("spark", "https://labs.phaser.io/assets/particles/muzzleflash2.png");
  }

  private playSound(key: string, _volume: number = 0.5) {
      if (useGameStore.getState().isMuted) return;
      
      switch(key) {
          case "sfx_click": soundSynth.playClick(); break;
          case "sfx_slash": soundSynth.playSlash(); break;
          case "sfx_explosion": soundSynth.playExplosion(); break;
          case "sfx_pickup": soundSynth.playPickup(); break;
          case "sfx_dash": soundSynth.playDash(); break;
          case "sfx_hook": soundSynth.playHook(); break;
          case "sfx_alert": soundSynth.playAlert(); break;
          case "sfx_magnet": soundSynth.playMagnet(); break;
          case "sfx_vortex": soundSynth.playVortex(); break;
          case "sfx_spin": soundSynth.playSpin(); break;
          case "sfx_rocket": soundSynth.playRocket(this.TURBO_DURATION / 1000); break;
      }
  }

  create() {
    this.networkManager = NetworkManager.getInstance();
    this.bombs = this.physics.add.group();
    this.hookRangeGraphics = this.add.graphics();
    this.hookRangeGraphics.setDepth(1);

    // 1. Layer Setup (MUST BE FIRST)
    this.worldLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);
    this.uiLayer.setScrollFactor(0);
    this.uiLayer.setDepth(10000);

    // 1. Generate ALL asset textures in-engine for perfect transparency
    this.generateVectorTextures();

    // 2. World & Grid
    this.physics.world.setBounds(0, 0, this.WORLD_SIZE, this.WORLD_SIZE);
    const graphics = this.add.graphics();
    this.worldLayer.add(graphics);
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
    const { width, height } = this.scale;
    this.cameras.main.setBounds(0, 0, this.WORLD_SIZE, this.WORLD_SIZE);
    
    // UI Camera (Overlays the main camera)
    this.uiCamera = this.cameras.add(0, 0, width, height);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setName('UI');
    
    // STRICT ISOLATION: Cameras hide what they don't own
    this.cameras.main.ignore(this.uiLayer);
    this.uiCamera.ignore(this.worldLayer);
    // 4. Particles
    this.explosionEmitter = this.add.particles(0, 0, "spark", {
      speed: { min: 50, max: 150 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      emitting: false,
      blendMode: 'ADD',
    });
    this.explosionEmitter.setDepth(5);

    this.vortexEmitter = this.add.particles(0, 0, "spark", {
      speed: 0,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 1500,
      quantity: 10,
      emitting: false,
      blendMode: 'ADD',
      tint: 0x4400ff,
      moveToX: 0,
      moveToY: 0,
    });
    this.vortexEmitter.setDepth(4);

    // 4. Input Handling
    this.isMobile = !this.sys.game.device.os.desktop || this.sys.game.device.input.touch;
    this.setupInputs();
    if (this.isMobile) {
        this.createMobileControls();
    }

    // 7. Setup Minimap
    this.setupMinimap();
    
    // 8. Assign UI to UI Layer
    if (this.minimapContainer) {
        this.uiLayer.add(this.minimapContainer);
    }
    
    // worldLayer isolation
    this.worldLayer.add([this.hookRangeGraphics, this.explosionEmitter, this.vortexEmitter]);

    // 6. Setup Listeners
    this.setupNetworkListeners();
    this.scale.on('resize', this.handleResize, this);
    this.handleResize();

    // 9. Join Game
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
      this.networkManager.off("blackHoleWarning");
      this.networkManager.off("blackHoleSpawned");
      this.networkManager.off("blackHoleCollapsed");
    });
  }

  private generateVectorTextures() {
    // A. Player Cursor Textures (Pink & Azure)
    this.drawNeonCursor("mouse_pink", 0xff00ff);
    this.drawNeonCursor("mouse_azure", 0x00ffff);

    // B. Item Textures (Bomb, Speed, Hook) matching Inventory UI
    const itemConfig = [
      { key: "bomb", emoji: "💣", color: 0xff4400 },
      { key: "speed", emoji: "⚡", color: 0xffff00 },
      { key: "hook", emoji: "🪝", color: 0x8888ff },
      { key: "magnet", emoji: "🧲", color: 0xff00ff },
    ];

    itemConfig.forEach(cfg => {
      this.drawItemIcon(cfg.key, cfg.emoji, cfg.color);
    });

    // C. Physical Bomb (thrown)
    this.drawPhysicalBomb();

    // D. Black Hole Assets
    this.drawBlackHoleAssets();
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
      g.lineStyle(4, 0xff4444, 0.4);
      g.strokeCircle(size/2, size/2, 12);
      
      g.generateTexture("bomb_phys", size, size);
      g.destroy();
  }

  private drawBlackHoleAssets() {
      // 1. Vortex Spiral
      const size = 256;
      const g = this.make.graphics({ x: 0, y: 0 });
      
      g.lineStyle(2, 0x4400ff, 0.8);
      for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          g.beginPath();
          for (let r = 0; r < size / 2; r += 2) {
              const spiralAngle = angle + (r / 20);
              const x = size / 2 + Math.cos(spiralAngle) * r;
              const y = size / 2 + Math.sin(spiralAngle) * r;
              if (r === 0) g.moveTo(x, y);
              else g.lineTo(x, y);
          }
          g.strokePath();
      }
      
      g.generateTexture("vortex_spiral", size, size);
      g.destroy();

      // 2. Core
      const coreG = this.make.graphics({ x: 0, y: 0 });
      coreG.fillStyle(0x000000, 1);
      coreG.fillCircle(size / 2, size / 2, 40);
      coreG.lineStyle(4, 0x4400ff, 1);
      coreG.strokeCircle(size / 2, size / 2, 40);
      coreG.generateTexture("vortex_core", size, size);
      coreG.destroy();
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
        !this.player.isStunned
      ) {
        const { inventory, selectedInventoryIndex } = useGameStore.getState();
        const selectedItem = inventory[selectedInventoryIndex];
        
        if (selectedItem === "bomb") {
            this.throwBomb();
        } else if (selectedItem === "magnet") {
            this.useMagnet();
        }
      }
    });

    const aKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    aKey?.on("down", () => {
        const { inventory, selectedInventoryIndex, setInventoryIndex } = useGameStore.getState();
        if (inventory.length > 0) {
            const nextIndex = (selectedInventoryIndex - 1 + inventory.length) % inventory.length;
            setInventoryIndex(nextIndex);
        }
    });

    const dKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    dKey?.on("down", () => {
        const { inventory, selectedInventoryIndex, setInventoryIndex } = useGameStore.getState();
        if (inventory.length > 0) {
            const nextIndex = (selectedInventoryIndex + 1) % inventory.length;
            setInventoryIndex(nextIndex);
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

    this.networkManager.on("magnetActivated", (data: { attractorId: string, x: number, y: number, radius: number }) => {
        this.showMagnetEffect(data.x, data.y, data.radius);
        this.playSound("sfx_magnet", 0.6);
    });

    this.networkManager.on("playerPushed", (data: { forceX: number, forceY: number }) => {
        if (this.player && this.player.visible) {
            // Resist gravity if Turbo is active (50% resistance)
            let fx = data.forceX;
            let fy = data.forceY;
            
            if (this.player.isSpeedBoostActive()) {
                fx *= 0.5;
                fy *= 0.5;
                if (Math.random() < 0.1) this.playSound("sfx_dash", 0.05); // Tiny sound for resistance
            } else {
                // If force is strong (Black Hole), play spinning sound
                const magnitude = Math.sqrt(fx*fx + fy*fy);
                if (magnitude > 10) {
                    this.playSound("sfx_spin", 0.3);
                }
            }

            this.tweens.add({
                targets: this.player,
                x: this.player.x + fx,
                y: this.player.y + fy,
                duration: 200,
                ease: "Cubic.out"
            });
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
            this.playSound("sfx_pickup", 0.5);
          } else {
             this.showFloatingText(
                this.player.x,
                this.player.y - 40,
                "TURBO FULL!",
                0xffaa00,
            );
            this.playSound("sfx_click", 0.3);
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
                this.playSound("sfx_pickup", 0.5);
             }
        } else {
          this.player.addToInventory(type);
          this.showFloatingText(
            this.player.x,
            this.player.y - 40,
            `+ ${type.toUpperCase()}`,
            0x00ffff,
          );
          this.playSound("sfx_pickup", 0.5);
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
          other = new Player(this, id, info.x, info.y, "mouse_azure", info.userName, this.worldLayer);
          this.otherPlayers.set(id, other);
        }

        // Update properties
        other.health = info.health;
        other.isBot = !!info.isBot;
        other.isDead = !!info.isDead;
        other.lastUpdate = Date.now();

        if (other.isDead) {
            other.setVisible(false);
        } else {
            other.setVisible(true);
            if (other.isBot) {
                other.setTint(0xcccccc);
            } else {
                other.clearTint();
            }
        }
        
        // Robust interpolation
        this.tweens.add({
          targets: other,
          x: info.x,
          y: info.y,
          rotation: info.rotation || 0,
          duration: 100, // Bridging 2 packets (50ms x 2) for smoother jitter handling
          ease: "Power1", // Smoother than linear for jitter
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
        this.playSound("sfx_slash", 0.4);
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
          this.playSound("sfx_hook", 0.6);

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

    this.networkManager.on("blackHoleWarning", (data: { x: number, y: number }) => {
        this.handleBlackHoleWarning(data.x, data.y);
        this.playSound("sfx_alert", 0.5);
    });

    this.networkManager.on("blackHoleSpawned", (data: { x: number, y: number }) => {
        this.handleBlackHoleSpawned(data.x, data.y);
        this.playSound("sfx_vortex", 0.7);
    });

    this.networkManager.on("blackHoleCollapsed", (data: { x: number, y: number }) => {
        this.handleBlackHoleCollapsed(data.x, data.y);
        this.playSound("sfx_explosion", 0.8);
    });
  }

  private handleBlackHoleWarning(x: number, y: number) {
      useGameStore.getState().setBlackHoleMessage("⚠ GRAVITY ANOMALY DETECTED");
      this.cameras.main.shake(1000, 0.005);
      
      if (this.blackHoleTelegraph) this.blackHoleTelegraph.destroy();
      
      this.blackHoleTelegraph = this.add.graphics();
      this.worldLayer.add(this.blackHoleTelegraph);
      this.blackHoleTelegraph.setDepth(1);
      
      // Animated expanding ring
      this.tweens.addCounter({
          from: 0,
          to: 500,
          duration: 2000,
          onUpdate: (tween) => {
              const val = tween.getValue();
              if (this.blackHoleTelegraph && val !== null) {
                  this.blackHoleTelegraph.clear();
                  this.blackHoleTelegraph.lineStyle(2, 0xff0000, 1 - (val / 500));
                  this.blackHoleTelegraph.strokeCircle(x, y, val);
                  this.blackHoleTelegraph.lineStyle(4, 0xff4444, 0.3);
                  this.blackHoleTelegraph.strokeCircle(x, y, 90); // Core indicator
              }
          }
      });
  }

  private handleBlackHoleSpawned(x: number, y: number) {
      useGameStore.getState().setBlackHoleMessage("");
      if (this.blackHoleTelegraph) {
          this.blackHoleTelegraph.destroy();
          this.blackHoleTelegraph = null;
      }

      this.blackHoleContainer = this.add.container(x, y);
      this.worldLayer.add(this.blackHoleContainer);
      this.blackHoleContainer.setDepth(4);

      const spiral = this.add.sprite(0, 0, "vortex_spiral");
      const core = this.add.sprite(0, 0, "vortex_core");
      
      this.blackHoleContainer.add([spiral, core]);

      // State visual: Grace Period (Orbiting)
      core.setTint(0x00ffff); // Cyan during grace
      spiral.setTint(0x00ffff);
      
      // Animations
      this.tweens.add({
          targets: spiral,
          angle: 360,
          duration: 800, // Faster during orbit
          repeat: -1,
          ease: 'Linear'
      });

      this.tweens.add({
          targets: core,
          scale: 1.4,
          duration: 300,
          repeat: -1,
          yoyo: true,
          ease: 'Cubic.easeInOut'
      });

      // Transition to Lethal State after 1.2s
      this.time.delayedCall(1200, () => {
          if (core.active) {
              core.clearTint();
              spiral.clearTint();
              this.showFloatingText(x, y, "CORE COMPRESSION", 0xff0000);
              this.cameras.main.shake(200, 0.02);
              
              // Slow down rotation slightly for 'heavy' feel
              this.tweens.add({
                  targets: spiral,
                  angle: 360,
                  duration: 1200,
                  repeat: -1,
                  ease: 'Linear'
              });
          }
      });

      // Particle system setup
      this.vortexEmitter.setPosition(x, y);
      this.vortexEmitter.start();
      
      // Radial attraction particles
      this.vortexEmitter.addEmitZone({
          type: 'edge',
          source: new Phaser.Geom.Circle(0, 0, 500),
          quantity: 20
      });

      this.cameras.main.shake(3000, 0.01);
  }

  private handleBlackHoleCollapsed(x: number, y: number) {
      if (this.blackHoleContainer) {
          this.blackHoleContainer.destroy();
          this.blackHoleContainer = null;
      }
      this.vortexEmitter.stop();

      // Shockwave
      const shockwave = this.add.circle(x, y, 10, 0xffffff, 0.8);
      shockwave.setDepth(5);
      this.tweens.add({
          targets: shockwave,
          radius: 600,
          alpha: 0,
          duration: 800,
          ease: 'Cubic.out',
          onComplete: () => shockwave.destroy()
      });

      this.createExplosion(x, y, 300);
      this.cameras.main.shake(500, 0.03);
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
      this.networkManager.emit("useHook", {});

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

  private useMagnet() {
    if (!this.player || !this.player.visible || this.player.isStunned) return;

    this.networkManager.emit("useMagnet", {
        x: this.player.x,
        y: this.player.y
    });
    
    // Optimistic UI update: remove from local inventory
    const { inventory, selectedInventoryIndex } = useGameStore.getState();
    const newInventory = [...inventory];
    newInventory.splice(selectedInventoryIndex, 1);
    this.player.inventory = newInventory;
    useGameStore.getState().setInventory(newInventory);
    
    this.showFloatingText(this.player.x, this.player.y - 40, "MAGNET ACTIVATED!", 0xff00ff);
  }

  private showMagnetEffect(x: number, y: number, radius: number) {
      const circle = this.add.circle(x, y, 10, 0xff00ff, 0.4);
      circle.setDepth(5);
      
      this.tweens.add({
          targets: circle,
          radius: radius,
          alpha: 0,
          duration: 600,
          ease: "Cubic.out",
          onComplete: () => circle.destroy()
      });

      // Particle burst
      const particles = this.add.particles(x, y, "magnet", {
          scale: { start: 0.2, end: 0 },
          alpha: { start: 1, end: 0 },
          speed: { min: 100, max: 300 },
          lifespan: 400,
          blendMode: "ADD",
          maxParticles: 20
      });
      particles.setDepth(5);
      this.time.delayedCall(400, () => particles.destroy());
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
    this.playSound("sfx_explosion", 0.8);
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
    this.worldLayer.add(bombSprite);

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
    this.playSound("sfx_slash", 0.4);

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
      this.networkManager.emit("useTurbo", {});

      this.showFloatingText(
        this.player.x,
        this.player.y - 40,
        "SPEED BOOST!",
        0xffff00,
      );
      this.playSound("sfx_rocket", 0.8);
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
    this.worldLayer.add(circle);
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
    this.worldLayer.add(t);
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
      playerInfo.userName || 'You',
      this.worldLayer
    );
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private addItem(item: IItemData) {
    const itemSprite = this.physics.add.sprite(item.x, item.y, item.type);
    itemSprite.setDepth(1);
    itemSprite.setScale(0.5); // Global scale reduction for items
    this.worldLayer.add(itemSprite);
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
      playerInfo.userName || 'Player',
      this.worldLayer
    );
    this.otherPlayers.set(playerInfo.userId, otherPlayer);
  }

  update(time: number) {
    if (this.player && this.player.visible) {
      if (this.isMobile && this.joystickActive) {
          // Calculate world target based on joystick vector
          const targetX = this.player.x + this.joystickVector.x * 200;
          const targetY = this.player.y + this.joystickVector.y * 200;
          const dummyPointer = { x: targetX, y: targetY } as any;
          this.player.update(dummyPointer, this.cameras.main);
      } else if (!this.isMobile) {
          this.player.update(this.input.activePointer, this.cameras.main);
      }
      
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
          this.playSound("sfx_click", 0.3);
      }
    }
    
    // Sync UI for all other players and Handle AOI Cleanup
    const now = Date.now();
    this.otherPlayers.forEach((other, id) => {
        if (now - other.lastUpdate > 1000) { // If no update for 1s, they are out of range
            other.destroy();
            this.otherPlayers.delete(id);
        } else {
            other.syncUI();
        }
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

  private handleResize() {
    const { width, height } = this.scale;
    
    // Sync UI camera
    if (this.uiCamera) {
        this.uiCamera.setSize(width, height);
        this.uiCamera.setViewport(0, 0, width, height);
    }

    // Set deterministic zoom for world
    // Larger base resolution = Wider Field of View (more map visible)
    const baseWidth = 2000;
    const baseHeight = 1125;
    const zoomX = width / baseWidth;
    const zoomY = height / baseHeight;
    const zoom = Math.min(zoomX, zoomY);
    
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setViewport(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, this.WORLD_SIZE, this.WORLD_SIZE);

    // Reposition minimap
    if (this.minimapContainer) {
        const size = 150;
        const padding = 20;
        this.minimapContainer.setPosition(padding + size/2, padding + size/2);
    }

    // Reposition Mobile Controls
    if (this.isMobile) {
        this.repositionMobileControls(width, height);
    }
  }

  private createMobileControls() {
    // 1. Initial Position (will be updated by handleResize)
    const { width, height } = this.scale;
    const joystickX = 220;
    const joystickY = height - 220;
    
    // Joystick Base
    this.joystickBase = this.add.circle(joystickX, joystickY, 90, 0xffffff, 0.1);
    this.joystickBase.setStrokeStyle(4, 0xffffff, 0.3);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(2000);
    
    // Joystick Thumb
    this.joystickThumb = this.add.circle(joystickX, joystickY, 45, 0xffffff, 0.3);
    this.joystickThumb.setStrokeStyle(2, 0xffffff, 0.5);
    this.joystickThumb.setScrollFactor(0);
    this.joystickThumb.setDepth(2001);
    
    // Listeners (Only added ONCE)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isMobile || !this.joystickBase) return;
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.joystickBase.x, this.joystickBase.y);
        if (dist < 140) {
            this.joystickActive = true;
            this.updateJoystick(pointer);
        }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (this.isMobile && this.joystickActive) {
            this.updateJoystick(pointer);
        }
    });

    this.input.on('pointerup', () => {
        if (!this.isMobile) return;
        this.joystickActive = false;
        if (this.joystickThumb && this.joystickBase) {
            this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
        }
        this.joystickVector.set(0, 0);
    });

    // Action Buttons
    this.setupMobileButtons();
    
    // Assign mobile controls to UI Layer
    if (this.joystickBase) this.uiLayer.add(this.joystickBase);
    if (this.joystickThumb) this.uiLayer.add(this.joystickThumb);
    this.mobileButtons.forEach(btn => this.uiLayer.add(btn));

    // Initial reposition
    this.repositionMobileControls(width, height);
  }

  private setupMobileButtons() {
    // Just create placeholders, reposition will put them in the right spot
    const attackBtn = this.createMobileButton(0, 0, "⚔️", 0xff00ff, 75, () => {
        if (this.player && this.player.visible && !this.player.isStunned) this.performAttack();
    });
    this.mobileButtons.set('attack', attackBtn);

    const turboBtn = this.createMobileButton(0, 0, "⚡", 0xffff00, 55, () => this.useTurbo());
    this.mobileButtons.set('turbo', turboBtn);

    const hookBtn = this.createMobileButton(0, 0, "🪝", 0x8888ff, 55, () => {
        if (this.player && this.player.visible && !this.player.isStunned) {
            const { hookCount } = useGameStore.getState();
            if (hookCount > 0) {
                if (!this.player.isAimingHook) this.player.setAimingHook(true, this.time.now);
                else this.useHook();
            }
        }
    });
    this.mobileButtons.set('hook', hookBtn);

    const itemBtn = this.createMobileButton(0, 0, "📦", 0xff4400, 55, () => {
        const { inventory, selectedInventoryIndex } = useGameStore.getState();
        const selectedItem = inventory[selectedInventoryIndex];
        if (selectedItem === "bomb") this.throwBomb();
        else if (selectedItem === "magnet") this.useMagnet();
    });
    this.mobileButtons.set('item', itemBtn);
  }

  private repositionMobileControls(width: number, height: number) {
      // 1. Reposition Joystick (Fixed position relative to bottom-left)
      const joystickX = 140;
      const joystickY = height - 140;
      if (this.joystickBase) this.joystickBase.setPosition(joystickX, joystickY);
      if (this.joystickThumb) this.joystickThumb.setPosition(joystickX, joystickY);

      // 2. Reposition Buttons (Fixed position relative to bottom-right)
      const rightMargin = width - 120;
      const bottomMargin = height - 120;

      const attack = this.mobileButtons.get('attack');
      if (attack) attack.setPosition(rightMargin, bottomMargin);

      const turbo = this.mobileButtons.get('turbo');
      if (turbo) turbo.setPosition(rightMargin - 140, bottomMargin);

      const hook = this.mobileButtons.get('hook');
      if (hook) hook.setPosition(rightMargin, bottomMargin - 140);

      const item = this.mobileButtons.get('item');
      if (item) item.setPosition(rightMargin - 140, bottomMargin - 140);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer) {
      if (!this.joystickBase || !this.joystickThumb) return;
      
      const joystickX = this.joystickBase.x;
      const joystickY = this.joystickBase.y;
      
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, joystickX, joystickY);
      const angle = Phaser.Math.Angle.Between(joystickX, joystickY, pointer.x, pointer.y);
      
      const maxDist = 70; // Slightly smaller range
      const cappedDist = Math.min(dist, maxDist);
      
      const thumbX = joystickX + Math.cos(angle) * cappedDist;
      const thumbY = joystickY + Math.sin(angle) * cappedDist;
      
      this.joystickThumb.setPosition(thumbX, thumbY);
      
      // Update vector (-1 to 1)
      this.joystickVector.set(
          Math.cos(angle) * (cappedDist / maxDist),
          Math.sin(angle) * (cappedDist / maxDist)
      );
  }

  private createMobileButton(x: number, y: number, icon: string, color: number, size: number, callback: () => void) {
      const container = this.add.container(x, y);
      container.setScrollFactor(0);
      container.setDepth(3000);

      const circle = this.add.circle(0, 0, size, color, 0.2);
      circle.setStrokeStyle(4, color, 0.5);
      
      const text = this.add.text(0, 0, icon, { fontSize: `${size * 0.6}px` }).setOrigin(0.5);
      
      container.add([circle, text]);
      
      circle.setInteractive();
      circle.on('pointerdown', () => {
          container.setScale(0.9);
          callback();
      });
      circle.on('pointerup', () => container.setScale(1));
      circle.on('pointerout', () => container.setScale(1));
      
      return container;
  }
}
