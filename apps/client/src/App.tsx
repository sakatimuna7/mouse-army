import React, { useEffect, useRef } from 'react';
import { phaserConfig, initGame } from "./game/game";
import { Leaderboard } from "./components/parts/leaderboard/Leaderboard";
import { Inventory } from "./components/parts/inventory/Inventory";
import { Lobby } from "./components/parts/lobby/Lobby";
import { KillFeed } from "./components/parts/kill-feed/KillFeed";
import { useGameStore } from './store/useGameStore';
import { soundSynth } from './game/audioSynth';

function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const { isJoined, blackHoleMessage } = useGameStore();
  const [isPortrait, setIsPortrait] = React.useState(false);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const [isMouseDown, setIsMouseDown] = React.useState(false);
  const isMobile = window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMobile]);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

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

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  if (!isJoined) {
    return <Lobby />;
  }

  return (
    <div className="game-wrapper fixed inset-0 w-full h-full bg-[#1a1a1a] overflow-hidden touch-none select-none">
      <div id="game-container" className="w-full h-full overflow-hidden" />
      
      {/* Custom Cursor */}
      {!isMobile && (
        <div 
          className={`custom-cursor ${isMouseDown ? 'active' : ''}`}
          style={{ 
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`
          }}
        />
      )}
      
      {isPortrait && (
        <div className="absolute inset-0 bg-[#0a0a0a] z-[5000] flex flex-col items-center justify-center p-8 text-center">
            <div className="rotate-icon">📱</div>
            <h2 className="text-white text-2xl font-black mt-4 mb-2">PLEASE ROTATE DEVICE</h2>
            <p className="text-white/60 text-sm">This game is best experienced in landscape mode.</p>
        </div>
      )}

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

      <div className={`hud-settings ${isMenuOpen ? 'open' : ''}`}>
        <button 
            className="settings-toggle"
            onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                soundSynth.playClick();
            }}
        >
            <div className="toggle-icon">{isMenuOpen ? '✕' : '⚙'}</div>
        </button>

        {isMenuOpen && (
          <div className="settings-menu">
            <button 
                className="action-btn exit"
                onClick={() => {
                    useGameStore.getState().setJoined(false);
                    soundSynth.playClick();
                }}
            >
                <div className="btn-icon">↩</div>
                <span>LEAVE</span>
            </button>

            <button 
                className="action-btn fullscreen"
                onClick={() => {
                   toggleFullScreen();
                   soundSynth.playClick();
                }}
            >
                <div className="btn-icon">⛶</div>
                <span>SCREEN</span>
            </button>

            <button 
                className={`action-btn ${useGameStore.getState().isMuted ? 'muted' : ''}`}
                onClick={() => {
                    useGameStore.getState().toggleMute();
                    soundSynth.playClick();
                }}
            >
                <div className="btn-icon">{useGameStore.getState().isMuted ? '🔇' : '🔊'}</div>
                <span>{useGameStore.getState().isMuted ? 'UNMUTE' : 'MUTE'}</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        * {
          cursor: none !important;
        }

        .custom-cursor {
          position: fixed;
          width: 8px;
          height: 8px;
          background: #ffffff;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.4);
          transform: translate(-50%, -50%);
          transition: width 0.2s ease, height 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
          mix-blend-mode: difference;
        }

        .custom-cursor.active {
          width: 6px;
          height: 6px;
          opacity: 0.8;
          box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
        }

        .hud-settings {
          position: absolute;
          top: 20px;
          left: 190px; /* To the right of minimap (150px size + padding) */
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 2000;
        }

        .settings-toggle {
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .settings-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .toggle-icon {
          font-size: 20px;
        }

        .settings-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: menuSlideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes menuSlideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1024px) {
          .hud-settings {
            top: 20px; /* Keep at top */
            left: 190px; /* Keep to the right of minimap */
          }
        }

        #game-container canvas {
          width: 100% !important;
          height: 100% !important;
          display: block;
          touch-action: none;
        }

        .action-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          padding: 8px 16px;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          transition: all 0.3s ease;
          backdrop-filter: blur(15px);
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
        }

        .action-btn.exit {
          color: #ff4444;
          background: rgba(255, 68, 68, 0.1);
          border-color: rgba(255, 68, 68, 0.2);
        }

        .action-btn.exit:hover {
          background: rgba(255, 68, 68, 0.2);
          border-color: #ff4444;
          box-shadow: 0 0 20px rgba(255, 68, 68, 0.2);
        }

        .action-btn.fullscreen:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .btn-icon {
          font-size: 14px;
        }

        .rotate-icon {
          font-size: 64px;
          animation: rotateDevice 2s infinite ease-in-out;
        }

        @keyframes rotateDevice {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(90deg); }
          100% { transform: rotate(0deg); }
        }

        @media (max-width: 900px) {
           #game-container {
             width: 100%;
             height: 100%;
           }
        }

        @media (max-width: 768px) {
          .action-btn {
            padding: 6px 12px;
            font-size: 9px;
            border-radius: 8px;
          }
          .btn-icon {
            font-size: 12px;
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
