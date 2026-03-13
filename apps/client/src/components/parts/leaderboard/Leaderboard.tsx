import React from 'react';
import { useGameStore } from '../../../store/useGameStore';
import { ILeaderboardEntry } from '@mouse-army/shared';
import { Trophy, Medal, User } from 'lucide-react';

export const Leaderboard: React.FC = () => {
    const { leaderboard } = useGameStore();

    return (
        <div className="leaderboard-wrapper">
            <div className="leaderboard-header">
                <Trophy size={18} className="text-secondary" />
                <h2 className="leaderboard-title">LEADERBOARD</h2>
            </div>
            
            <div className="leaderboard-list">
                {leaderboard.slice(0, 10).map((entry: ILeaderboardEntry, index: number) => {
                    const isTop3 = index < 3;
                    return (
                        <div 
                            key={entry.userId} 
                            className={`leaderboard-item ${entry.isLocalPlayer ? 'local-player' : ''} ${isTop3 ? 'top-rank' : ''}`}
                        >
                            <div className="rank-badge">
                                {index === 0 ? <Medal size={14} color="#FFD700" /> : 
                                 index === 1 ? <Medal size={14} color="#C0C0C0" /> :
                                 index === 2 ? <Medal size={14} color="#CD7F32" /> :
                                 <span className="rank-num">{index + 1}</span>}
                            </div>
                            
                            <div className="player-info">
                                <span className="username">
                                    {entry.userName || `Guest-${entry.userId.substring(0, 5)}`}
                                    {entry.isLocalPlayer && <span className="you-tag">YOU</span>}
                                </span>
                                <span className="score">{entry.score.toLocaleString()}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                .leaderboard-wrapper {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    width: 240px;
                    background: rgba(10, 10, 12, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    padding: 16px;
                    color: white;
                    font-family: 'Outfit', sans-serif;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    user-select: none;
                    pointer-events: auto;
                    z-index: 1000;
                    animation: slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideInRight {
                    from { transform: translateX(50px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                .leaderboard-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .leaderboard-title {
                    margin: 0;
                    font-size: 0.8rem;
                    font-weight: 800;
                    letter-spacing: 2px;
                    color: rgba(255, 255, 255, 0.6);
                }

                .leaderboard-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .leaderboard-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 10px;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid transparent;
                    border-radius: 12px;
                    transition: all 0.3s ease;
                }

                .leaderboard-item.local-player {
                    background: rgba(255, 0, 255, 0.1);
                    border-color: rgba(255, 0, 255, 0.2);
                }

                .leaderboard-item.top-rank {
                    background: rgba(255, 255, 255, 0.04);
                }

                .rank-badge {
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 6px;
                }

                .rank-num {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: rgba(255, 255, 255, 0.4);
                }

                .player-info {
                    flex: 1;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    min-width: 0;
                }

                .username {
                    font-size: 0.85rem;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-right: 8px;
                }

                .you-tag {
                    font-size: 9px;
                    font-weight: 900;
                    padding: 1px 4px;
                    background: #ff00ff;
                    color: white;
                    border-radius: 4px;
                    margin-left: 6px;
                }

                .score {
                    font-size: 0.85rem;
                    font-weight: 800;
                    color: #00ffff;
                }

                .local-player .score {
                    color: #ff00ff;
                }

                /* Mobile Support */
                @media (max-width: 900px) {
                    .leaderboard-wrapper {
                        width: 140px;
                        top: 8px;
                        right: 8px;
                        padding: 8px;
                        border-radius: 10px;
                        transform: scale(0.85);
                        transform-origin: top right;
                    }
                    .leaderboard-header {
                        margin-bottom: 6px;
                        padding-bottom: 4px;
                        gap: 4px;
                    }
                    .leaderboard-list {
                        gap: 2px;
                    }
                    .leaderboard-item {
                        padding: 2px 6px;
                        gap: 4px;
                        border-radius: 6px;
                    }
                    .username, .score {
                        font-size: 0.65rem;
                    }
                    .rank-badge {
                        width: 18px;
                        height: 18px;
                    }
                    .leaderboard-title {
                        font-size: 0.55rem;
                    }
                }
                
                @media (max-width: 600px) {
                    .leaderboard-wrapper {
                        transform: scale(0.7);
                    }
                }
            `}</style>
        </div>
    );
};
