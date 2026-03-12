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
      
      <button 
        className="exit-btn"
        onClick={() => useGameStore.getState().setJoined(false)}
      >
        <span>EXIT ROOM</span>
      </button>

      <style>{`
        .exit-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 30, 30, 0.1);
          border: 1px solid rgba(255, 30, 30, 0.3);
          color: #ff4444;
          padding: 8px 16px;
          border-radius: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          z-index: 2000;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .exit-btn:hover {
          background: rgba(255, 30, 30, 0.2);
          border-color: #ff4444;
          box-shadow: 0 0 20px rgba(255, 30, 30, 0.2);
          transform: translateY(-2px);
        }

        .exit-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

export default App;
