import React from 'react';
import { useGameStore } from '../../../store/useGameStore';

export const Inventory: React.FC = () => {
    const { inventory } = useGameStore();

    // Filter to only show relevant items as per requirement
    const displayItems = inventory.filter(item => item === 'bomb' || item === 'hook');

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
            `}</style>
        </div>
    );
};
