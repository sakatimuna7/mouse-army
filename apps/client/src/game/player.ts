import Phaser from 'phaser';
import { useGameStore } from '../store/useGameStore';

export class Player extends Phaser.Physics.Arcade.Sprite {
    public playerId: string;
    private baseMaxSpeed: number = 400;
    private currentMaxSpeed: number = 400;
    private lerpFactor: number = 0.1;
    
    // States
    public isStunned: boolean = false;
    private speedBoostTimer: number = 0;
    public isAimingHook: boolean = false;
    public hookAimStartTime: number = 0;

    // Health & Name properties
    public health: number = 100;
    public maxHealth: number = 100;
    public playerName: string = "";
    public isBot: boolean = false;
    public isDead: boolean = false;
    private healthBar: Phaser.GameObjects.Graphics;
    public userName: string;
    private nameTag: Phaser.GameObjects.Text;
    
    // Score
    public score: number = 0;

    // Knockback properties
    private knockbackForce: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
    private knockbackDecay: number = 0.9;

    // Inventory
    public inventory: string[] = [];

    // Visual Effects
    private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    constructor(scene: Phaser.Scene, id: string, x: number, y: number, texture: string, userName: string) {
        super(scene, x, y, texture);
        this.playerId = id;
        this.userName = userName;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setDepth(2);
        
        // Sizing optimization: Vector cursors are drawn at 64px, 
        // we scale them down to 32px (0.5) for a crisp IO game look.
        this.setScale(0.5);

        if (this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.setAllowGravity(false);
            // Tight circular collider for the smaller cursor
            this.body.setCircle(16); 
            this.body.setOffset(16, 16);
        }

        // Initialize Health Bar
        this.healthBar = scene.add.graphics();
        this.healthBar.setDepth(3);
        
        // Initialize Name Tag
        this.nameTag = scene.add.text(x, y - 40, this.userName, {
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setDepth(3);

        this.updateHealthBar();

        // Initialize Trail
        this.createTrail();
    }

    private createTrail() {
        const particles = this.scene.add.particles(0, 0, this.texture.key, {
            speed: 0,
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.4, end: 0 },
            lifespan: 200,
            blendMode: 'ADD',
            follow: this,
            frequency: 30
        });
        particles.setDepth(1);
        this.trailEmitter = particles;
    }

    public update(pointer: Phaser.Input.Pointer, camera: Phaser.Cameras.Scene2D.Camera) {
        if (!this.body) return;

        // 0. Handle Stun
        if (this.isStunned) {
            this.setVelocity(0, 0);
            this.syncUI();
            if (this.trailEmitter) this.trailEmitter.stop();
            return;
        } else {
            if (this.trailEmitter && !this.trailEmitter.active) this.trailEmitter.start();
        }

        // 1. Handle Speed Boost Timer
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= 16.6; 
            if (this.speedBoostTimer <= 0) {
                this.currentMaxSpeed = this.baseMaxSpeed;
                if (!this.isBot && !this.isAimingHook) {
                    this.clearTint();
                }
            }
        }

        const worldPointer = camera.getWorldPoint(pointer.x, pointer.y);

        // 2. Base Movement & Rotation
        const dx = worldPointer.x - this.x;
        const dy = worldPointer.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let targetVx = 0;
        let targetVy = 0;

        if (distance > 15) {
            // Adjusting target angle by 90 deg because our drawn triangle faces UP
            const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, worldPointer.x, worldPointer.y) + Math.PI / 2;
            this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetAngle, 0.15);

            targetVx = (dx / distance) * this.currentMaxSpeed;
            targetVy = (dy / distance) * this.currentMaxSpeed;

            // Apply Hook Aiming Slow (2.5%)
            if (this.isAimingHook) {
                targetVx *= 0.975;
                targetVy *= 0.975;
            }
        } else {
            targetVx = 0;
            targetVy = 0;
            this.body.velocity.scale(0.8);
        }

        // 4. Apply Lerp to Base Velocity
        const currentVelocity = this.body.velocity;
        let newVx = Phaser.Math.Linear(currentVelocity.x, targetVx, this.lerpFactor);
        let newVy = Phaser.Math.Linear(currentVelocity.y, targetVy, this.lerpFactor);

        // 5. Add & Decay Knockback Force
        newVx += this.knockbackForce.x;
        newVy += this.knockbackForce.y;
        
        this.knockbackForce.scale(this.knockbackDecay);
        if (this.knockbackForce.length() < 1) {
            this.knockbackForce.set(0, 0);
        }

        if (this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.setVelocity(newVx, newVy);
        }

        this.syncUI();
    }

    public syncUI() {
        if (!this.visible || this.isDead || !this.active) {
            if (this.healthBar) this.healthBar.setVisible(false);
            if (this.nameTag) this.nameTag.setVisible(false);
            return;
        }

        if (this.healthBar) {
            this.healthBar.setVisible(true);
            this.updateHealthBar();
        }
        if (this.nameTag) {
            this.nameTag.setVisible(true);
            this.nameTag.setPosition(this.x, this.y - 40);
        }
    }

    public updateHealthBar() {
        this.healthBar.clear();
        
        const barWidth = 30; // Smaller health bar for smaller player
        const barHeight = 4;
        const x = this.x - barWidth / 2;
        const y = this.y - 25;

        // Background
        this.healthBar.fillStyle(0x000000, 0.5);
        this.healthBar.fillRect(x, y, barWidth, barHeight);

        // Health Fill
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        const fillColor = healthPercent > 0.5 ? 0x00ff00 : (healthPercent > 0.2 ? 0xffff00 : 0xff0000);
        
        this.healthBar.fillStyle(fillColor, 1);
        this.healthBar.fillRect(x + 1, y + 1, (barWidth - 2) * healthPercent, barHeight - 2);
    }

    public isSpeedBoostActive(): boolean {
        return this.speedBoostTimer > 0;
    }

    public activateSpeedBoost(durationMs: number) {
        this.currentMaxSpeed = this.baseMaxSpeed * 3.0;
        this.speedBoostTimer = durationMs;
        this.setTint(0xffff00);
    }

    public setStun(stunned: boolean) {
        this.isStunned = stunned;
        if (stunned) {
            this.setTint(0x0000ff);
            if (this.trailEmitter) this.trailEmitter.stop();
        } else {
            if (this.speedBoostTimer <= 0) {
                this.clearTint();
                if (this.trailEmitter) {
                    this.trailEmitter.start();
                }
            }
        }
    }

    public setAimingHook(aiming: boolean, startTime: number = 0) {
        this.isAimingHook = aiming;
        this.hookAimStartTime = aiming ? startTime : 0;
        if (aiming) {
            this.setTint(0x8888ff); // Bluish tint for aiming
        } else {
            if (!this.isStunned && this.speedBoostTimer <= 0) {
                this.clearTint();
            }
        }
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        this.updateHealthBar();
        this.scene.tweens.add({
            targets: this,
            alpha: 0.3,
            duration: 50,
            yoyo: true,
            repeat: 1
        });
    }

    public respawn(x: number, y: number) {
        this.health = this.maxHealth;
        this.isStunned = false;
        this.speedBoostTimer = 0;
        this.currentMaxSpeed = this.baseMaxSpeed;
        this.setPosition(x, y);
        this.updateHealthBar();
        this.setVisible(true);
        this.clearTint();
        if (this.body) this.body.enable = true;
        if (this.trailEmitter) this.trailEmitter.start();
    }

    public applyKnockback(forceX: number, forceY: number) {
        this.knockbackForce.add(new Phaser.Math.Vector2(forceX, forceY));
    }

    public addToInventory(itemType: string) {
        if (this.inventory.length >= 5) {
            // Show feedback that inventory is full
            return;
        }
        if (itemType === 'bomb' || itemType === 'magnet') {
            this.inventory.push(itemType);
            this.syncInventoryToStore();
        } else if (itemType === 'hook') {
            const { hookCount, setHookCount } = useGameStore.getState();
            if (hookCount < 1) {
                setHookCount(1);
            }
        }
    }

    public hasItem(itemType: string): boolean {
        return this.inventory.includes(itemType);
    }

    public removeItem(itemType: string) {
        const index = this.inventory.indexOf(itemType);
        if (index > -1) {
            this.inventory.splice(index, 1);
            this.syncInventoryToStore();
        }
    }

    private syncInventoryToStore() {
        if (this.playerId === useGameStore.getState().leaderboard.find(e => e.isLocalPlayer)?.userId || this.playerId.startsWith('local')) {
             useGameStore.getState().setInventory([...this.inventory]);
        }
    }

    public getEntityData() {
        return {
            id: this.playerId,
            x: this.x,
            y: this.y,
            health: this.health,
            score: this.score,
            isStunned: this.isStunned,
            velocity: {
                x: this.body ? this.body.velocity.x : 0,
                y: this.body ? this.body.velocity.y : 0
            }
        };
    }

    public destroy(fromScene?: boolean) {
        this.healthBar.destroy();
        this.nameTag.destroy();
        if (this.trailEmitter) this.trailEmitter.destroy();
        super.destroy(fromScene);
    }
}
