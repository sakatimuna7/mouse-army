import React from 'react';
import { useGameStore } from '../../../store/useGameStore';

const TurboIndicator: React.FC = () => {
    const { turboCount } = useGameStore();
    return (
        <div className="turbo-wrap">
            <span className="turbo-label">TURBO [Q]</span>
            <div className="turbo-charges">
                {[...Array(3)].map((_, i) => (
                    <div 
                        key={i} 
                        className={`turbo-charge ${i < turboCount ? 'active' : ''}`}
                    />
                ))}
            </div>
        </div>
    );
};

const HookIndicator: React.FC = () => {
    const { hookCount } = useGameStore();
    return (
        <div className="hook-wrap">
            <span className="hook-label">HOOK [E]</span>
            <div className="hook-charges">
                <div className={`hook-charge ${hookCount > 0 ? 'active' : ''}`}>
                    🪝
                </div>
            </div>
        </div>
    );
};

export const Inventory: React.FC = () => {
    const { inventory } = useGameStore();

    // Filter to only show relevant items as per requirement
    const displayItems = inventory.filter(item => item === 'bomb');

    return (
        <div className="inventory-outer">
            <div className="inventory-track">
                {displayItems.map((item, index) => (
                    <div key={`${item}-${index}`} className={`inventory-slot ${item}`}>
                        <div className="item-icon">
                            {item === 'bomb' ? '💣' : '🪝'}
                        </div>
                    </div>
                ))}
                
                {/* Visual empty slots for premium feel */}
                {Array.from({ length: Math.max(0, 5 - displayItems.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="inventory-slot empty" />
                ))}
            </div>

            {/* Turbo Stack Indicator */}
            <TurboIndicator />

            {/* Hook Indicator */}
            <HookIndicator />

            <style>{`
                .inventory-outer {
                    position: absolute;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 1000;
                    pointer-events: none;
                }

                .inventory-track {
                    display: flex;
                    gap: 12px;
                    background: rgba(15, 15, 15, 0.7);
                    backdrop-filter: blur(15px);
                    padding: 10px;
                    border-radius: 14px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
                }

                .inventory-slot {
                    width: 50px;
                    height: 50px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 2px solid rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                }

                .inventory-slot.empty {
                   opacity: 0.3;
                }

                .inventory-slot:not(.empty) {
                    background: rgba(0, 255, 255, 0.05);
                    border-color: rgba(0, 255, 255, 0.2);
                    animation: slotPop 0.4s ease-out;
                }

                .inventory-slot.hook {
                    border-color: rgba(50, 50, 255, 0.4);
                    background: rgba(50, 50, 255, 0.1);
                }

                @keyframes slotPop {
                    0% { transform: scale(0.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .item-icon {
                    font-size: 1.5rem;
                }

                .turbo-wrap {
                    position: absolute;
                    left: calc(100% + 15px);
                    bottom: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                }

                .turbo-label {
                    color: rgba(255, 255, 0, 0.7);
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: 1px;
                    text-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
                }

                .turbo-charges {
                    display: flex;
                    gap: 4px;
                    background: rgba(0, 0, 0, 0.4);
                    padding: 6px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 0, 0.2);
                }

                .turbo-charge {
                    width: 12px;
                    height: 18px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 3px;
                    transition: all 0.2s ease;
                }

                .turbo-charge.active {
                    background: #ffff00;
                    box-shadow: 0 0 15px #ffff00, inset 0 0 8px rgba(255,255,255,0.8);
                    transform: scale(1.1);
                }

                .hook-wrap {
                    position: absolute;
                    left: calc(100% + 85px);
                    bottom: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                }

                .hook-label {
                    color: rgba(136, 136, 255, 0.7);
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: 1px;
                    text-shadow: 0 0 10px rgba(136, 136, 255, 0.3);
                }

                .hook-charges {
                    background: rgba(0, 0, 0, 0.4);
                    padding: 6px;
                    border-radius: 8px;
                    border: 1px solid rgba(136, 136, 255, 0.2);
                }

                .hook-charge {
                    width: 32px;
                    height: 32px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    transition: all 0.3s ease;
                    opacity: 0.3;
                }

                .hook-charge.active {
                    background: rgba(136, 136, 255, 0.2);
                    border: 1px solid #8888ff;
                    opacity: 1;
                    box-shadow: 0 0 15px rgba(136, 136, 255, 0.4);
                    transform: scale(1.05);
                }
            `}</style>
        </div>
    );
};
