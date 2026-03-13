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
        <div className="exit-icon">↩</div>
        <span>LEAVE MATCH</span>
      </button>

      <style>{`
        .exit-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(255, 30, 30, 0.1);
          border: 1px solid rgba(255, 30, 30, 0.2);
          color: #ff4444;
          padding: 8px 16px;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(15px);
          z-index: 2000;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
        }

        .exit-btn:hover {
          background: rgba(255, 30, 30, 0.2);
          border-color: #ff4444;
          box-shadow: 0 0 20px rgba(255, 30, 30, 0.2);
          transform: translateY(-2px);
        }

        .exit-icon {
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .exit-btn {
            top: 10px;
            left: 10px;
            padding: 6px 12px;
            font-size: 9px;
          }
        }

        .anomaly-warning {
          background: rgba(20, 0, 0, 0.4);
          border: 1px solid rgba(255, 0, 0, 0.3);
          padding: 32px 64px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          backdrop-filter: blur(40px);
          animation: warningPulse 1s infinite alternate ease-in-out, warningEntry 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 40px 100px rgba(255, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        @keyframes warningEntry {
          0% { transform: scale(0.9) translateY(40px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        @keyframes warningPulse {
          0% { border-color: rgba(255, 68, 68, 0.3); box-shadow: 0 0 40px rgba(255, 0, 0, 0.1); }
          100% { border-color: rgba(255, 68, 68, 0.8); box-shadow: 0 0 80px rgba(255, 0, 0, 0.3); }
        }

        .anomaly-icon {
          font-size: 48px;
          color: #ff4444;
          filter: drop-shadow(0 0 20px #ff4444);
        }

        .anomaly-text {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 2px;
          text-align: center;
          text-transform: uppercase;
        }

        .anomaly-scanner {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: scanning 3s infinite linear;
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
