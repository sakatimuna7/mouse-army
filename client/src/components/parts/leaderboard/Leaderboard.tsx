import React from 'react';
import { useGameStore, ILeaderboardEntry } from '../../../store/useGameStore';

export const Leaderboard: React.FC = () => {
    const { leaderboard } = useGameStore();

    return (
        <div className="leaderboard-container">
            <h2 className="leaderboard-title">Leaderboard</h2>
            <div className="leaderboard-list">
                {leaderboard.map((entry: ILeaderboardEntry, index: number) => (
                    <div 
                        key={entry.userId} 
                        className={`leaderboard-item ${entry.isLocalPlayer ? 'local-player' : ''}`}
                    >
                        <span className="rank">#{index + 1}</span>
                        <span className="flex-1 font-bold text-white truncate">
                            {entry.userName || `Guest-${entry.userId.substring(0, 5)}`}
                            {entry.isLocalPlayer && <span className="ml-2 text-[10px] text-pink-500">(YOU)</span>}
                        </span>
                        <span className="score">{entry.score} pts</span>
                    </div>
                ))}
            </div>

            <style>{`
                .leaderboard-container {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    width: 280px;
                    background: rgba(15, 15, 15, 0.85);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 20px;
                    color: white;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    user-select: none;
                    pointer-events: auto;
                    z-index: 1000;
                    animation: slideIn 0.5s ease-out;
                }

                @keyframes slideIn {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                .leaderboard-title {
                    margin: 0 0 16px 0;
                    font-size: 1.2rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    background: linear-gradient(90deg, #ff00ff, #00ffff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    border-bottom: 2px solid rgba(255, 255, 255, 0.05);
                    padding-bottom: 10px;
                }

                .leaderboard-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .leaderboard-item {
                    display: flex;
                    align-items: center;
                    padding: 10px 14px;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 10px;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }

                .leaderboard-item:hover {
                    background: rgba(255, 255, 255, 0.08);
                    transform: scale(1.02);
                }

                .leaderboard-item.local-player {
                    background: rgba(255, 0, 255, 0.1);
                    border: 1px solid rgba(255, 0, 255, 0.3);
                }

                .rank {
                    font-weight: 800;
                    color: rgba(255, 255, 255, 0.4);
                    margin-right: 12px;
                    width: 30px;
                }

                .username {
                    flex: 1;
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .score {
                    font-weight: 700;
                    color: #00ffff;
                }

                .leaderboard-item.local-player .score {
                    color: #ff00ff;
                }

                .leaderboard-item:nth-child(1) .rank { color: #ffd700; } /* Gold */
                .leaderboard-item:nth-child(2) .rank { color: #c0c0c0; } /* Silver */
                .leaderboard-item:nth-child(3) .rank { color: #cd7f32; } /* Bronze */
            `}</style>
        </div>
    );
};
