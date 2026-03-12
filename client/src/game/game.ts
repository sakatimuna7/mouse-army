import Phaser from "phaser";
import { MainScene } from "./scene";

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1200,
  height: 700,
  parent: "game-container",
  backgroundColor: "#1a1a1a",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [MainScene],
};

export const initGame = () => {
  return new Phaser.Game(phaserConfig);
};
