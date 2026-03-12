import React, { useEffect, useRef } from 'react';
import { phaserConfig, initGame } from "./game/game";
import { Leaderboard } from "./components/parts/leaderboard/Leaderboard";
import { Inventory } from "./components/parts/inventory/Inventory";
import { Lobby } from "./components/parts/lobby/Lobby";
import { KillFeed } from "./components/parts/kill-feed/KillFeed";
import { useGameStore } from './store/useGameStore';

function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const { isJoined } = useGameStore();

  useEffect(() => {
    if (isJoined && !gameRef.current) {
      gameRef.current = initGame();
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [isJoined]);

  if (!isJoined) {
    return <Lobby />;
  }

  return (
    <div className="relative w-full h-screen bg-[#1a1a1a] overflow-hidden">
      <div id="game-container" className="w-full h-full flex items-center justify-center" />
      <KillFeed />
      <Inventory />
      <Leaderboard />
    </div>
  );
}

export default App;
