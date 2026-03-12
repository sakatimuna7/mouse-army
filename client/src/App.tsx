import React, { useEffect, useRef } from 'react';
import { phaserConfig, initGame } from "./game/game";
import { Leaderboard } from "./components/parts/leaderboard/Leaderboard";
import { Inventory } from "./components/parts/inventory/Inventory";

function App() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = initGame();
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#1a1a1a] overflow-hidden">
      <div id="game-container" className="w-full h-full flex items-center justify-center" />
      <Inventory />
      <Leaderboard />
    </div>
  );
}

export default App;
