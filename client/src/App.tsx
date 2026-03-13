import React, { useEffect, useRef } from 'react';
import { phaserConfig, initGame } from "./game/game";
import { Leaderboard } from "./components/parts/leaderboard/Leaderboard";
import { Inventory } from "./components/parts/inventory/Inventory";
import { Lobby } from "./components/parts/lobby/Lobby";
import { KillFeed } from "./components/parts/kill-feed/KillFeed";
import { useGameStore } from './store/useGameStore';

function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const { isJoined, blackHoleMessage } = useGameStore();

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
      
      {blackHoleMessage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3000]">
          <div className="anomaly-warning">
            <div className="anomaly-icon">⚠</div>
            <div className="anomaly-text">{blackHoleMessage}</div>
            <div className="anomaly-scanner"></div>
          </div>
        </div>
      )}

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

        .anomaly-warning {
          background: rgba(255, 0, 0, 0.1);
          border: 2px solid #ff4444;
          padding: 24px 48px;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          backdrop-filter: blur(20px);
          animation: warningPulse 0.5s infinite alternate ease-in-out, warningEntry 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 0 50px rgba(255, 0, 0, 0.2), inset 0 0 20px rgba(255, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        @keyframes warningEntry {
          0% { transform: scale(0.8) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        @keyframes warningPulse {
          0% { border-color: #ff4444; box-shadow: 0 0 30px rgba(255, 0, 0, 0.2); }
          100% { border-color: #ffffff; box-shadow: 0 0 60px rgba(255, 0, 0, 0.4); }
        }

        .anomaly-icon {
          font-size: 48px;
          color: #ff4444;
          filter: drop-shadow(0 0 10px #ff4444);
        }

        .anomaly-text {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 4px;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .anomaly-scanner {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          animation: scanning 2s infinite linear;
        }

        @keyframes scanning {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}

export default App;
