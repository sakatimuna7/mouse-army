import React from 'react';
import { useGameStore } from '../../../store/useGameStore';
import { Zap, Anchor, Box, MousePointer2, ChevronLeft, ChevronRight } from 'lucide-react';

const TurboIndicator: React.FC = () => {
    const { turboCount } = useGameStore();
    return (
        <div className="ability-wrap">
            <div className="ability-label">
                <Zap size={10} className="text-yellow-400" />
                <span>TURBO [Q]</span>
            </div>
            <div className="charge-dots">
                {[...Array(3)].map((_, i) => (
                    <div 
                        key={i} 
                        className={`charge-dot turbo ${i < turboCount ? 'active' : ''}`}
                    />
                ))}
            </div>
        </div>
    );
};

const HookIndicator: React.FC = () => {
    const { hookCount } = useGameStore();
    return (
        <div className="ability-wrap">
            <div className="ability-label">
                <Anchor size={10} className="text-blue-400" />
                <span>HOOK [E]</span>
            </div>
            <div className={`hook-status ${hookCount > 0 ? 'active' : ''}`}>
                <Anchor size={16} />
            </div>
        </div>
    );
};

export const Inventory: React.FC = () => {
    const { inventory, selectedInventoryIndex } = useGameStore();

    return (
        <div className="hud-bottom">
            <div className="inventory-container">
                <div className="inventory-grid">
                    {Array.from({ length: 5 }).map((_, index) => {
                        const item = inventory[index];
                        const isSelected = index === selectedInventoryIndex;
                        
                        return (
                            <div 
                                key={index} 
                                className={`inventory-slot ${item || 'empty'} ${isSelected ? 'selected' : ''}`}
                                onClick={() => useGameStore.getState().setInventoryIndex(index)}
                            >
                                <div className="slot-num">{index + 1}</div>
                                {item && (
                                    <div className="item-icon">
                                        {item === 'bomb' ? '💣' : '🧲'}
                                    </div>
                                )}
                                {isSelected && (
                                    <div className="item-controls">
                                        <ChevronLeft size={10} />
                                        <span>AD</span>
                                        <ChevronRight size={10} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="abilities-section">
                    <TurboIndicator />
                    <div className="divider" />
                    <HookIndicator />
                </div>
            </div>

            <style>{`
                .hud-bottom {
                    position: absolute;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 1000;
                    pointer-events: none;
                }

                .inventory-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    pointer-events: auto;
                }

                .inventory-grid {
                    display: flex;
                    gap: 10px;
                    background: rgba(10, 10, 12, 0.6);
                    backdrop-filter: blur(25px);
                    padding: 10px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                }

                .inventory-slot {
                    width: 50px;
                    height: 50px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    cursor: pointer;
                }

                .slot-num {
                    position: absolute;
                    top: 4px;
                    left: 6px;
                    font-size: 8px;
                    font-weight: 900;
                    color: rgba(255, 255, 255, 0.2);
                    font-family: 'Outfit', sans-serif;
                }

                .inventory-slot.selected {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(0, 255, 255, 0.5);
                    box-shadow: 0 0 20px rgba(0, 255, 255, 0.15);
                    transform: scale(1.1) translateY(-8px);
                }

                .item-icon {
                    font-size: 1.6rem;
                    filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));
                    animation: itemPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes itemPop {
                    0% { transform: scale(0.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .item-controls {
                    position: absolute;
                    bottom: -18px;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    font-size: 8px;
                    font-weight: 900;
                    color: #00ffff;
                    letter-spacing: 1px;
                }

                .abilities-section {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    background: rgba(10, 10, 12, 0.4);
                    backdrop-filter: blur(10px);
                    padding: 8px 16px;
                    border-radius: 100px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .divider {
                    width: 1px;
                    height: 16px;
                    background: rgba(255, 255, 255, 0.1);
                }

                .ability-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                }

                .ability-label {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 8px;
                    font-weight: 800;
                    color: rgba(255, 255, 255, 0.4);
                    letter-spacing: 1px;
                    font-family: 'Outfit', sans-serif;
                }

                .charge-dots {
                    display: flex;
                    gap: 4px;
                }

                .charge-dot {
                    width: 14px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                    transition: all 0.3s;
                }

                .charge-dot.turbo.active {
                    background: #ffff00;
                    box-shadow: 0 0 10px rgba(255, 255, 0, 0.5);
                }

                .hook-status {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    color: rgba(255, 255, 255, 0.2);
                    transition: all 0.3s;
                }

                .hook-status.active {
                    background: rgba(0, 255, 255, 0.1);
                    color: #00ffff;
                    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
                }

                /* Mobile Support */
                @media (max-width: 640px) {
                    .hud-bottom {
                        bottom: 20px;
                        width: 90%;
                    }
                    .inventory-grid {
                        gap: 8px;
                        padding: 8px;
                    }
                    .inventory-slot {
                        width: 44px;
                        height: 44px;
                    }
                    .item-icon {
                        font-size: 1.3rem;
                    }
                }
            `}</style>
        </div>
    );
};
