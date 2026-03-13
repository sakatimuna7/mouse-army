import React, { useEffect, useState } from 'react';
import { useGameStore, IKillLog } from '../../../store/useGameStore';
import { Target } from 'lucide-react';

const KillFeedItem: React.FC<{ log: IKillLog }> = ({ log }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
        }, 4500); 
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div className="kill-item">
            <span className="killer-name">{log.killerName}</span>
            <Target size={12} className="kill-icon" />
            <span className="victim-name">{log.victimName}</span>
        </div>
    );
};

export const KillFeed: React.FC = () => {
    const killLogs = useGameStore((state) => state.killLogs);

    return (
        <div className="kill-feed-root">
            {killLogs.map((log) => (
                <KillFeedItem key={log.id} log={log} />
            ))}

            <style>{`
                .kill-feed-root {
                    position: absolute;
                    top: 100px;
                    left: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    pointer-events: none;
                    z-index: 100;
                    font-family: 'Outfit', sans-serif;
                }

                .kill-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(10, 10, 12, 0.5);
                    backdrop-filter: blur(10px);
                    padding: 8px 16px;
                    border-radius: 12px;
                    border-left: 3px solid #ff00ff;
                    color: white;
                    animation: killIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                @keyframes killIn {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                .killer-name {
                    font-weight: 800;
                    font-size: 0.85rem;
                    color: #00ffff;
                }

                .kill-icon {
                    color: rgba(255, 255, 255, 0.3);
                }

                .victim-name {
                    font-weight: 800;
                    font-size: 0.85rem;
                    color: #ff00ff;
                    opacity: 0.8;
                }

                /* Mobile Adjustment */
                @media (max-width: 768px) {
                    .kill-feed-root {
                        top: 80px;
                        left: 10px;
                    }
                    .kill-item {
                        padding: 6px 12px;
                        font-size: 0.75rem;
                    }
                    .killer-name, .victim-name {
                        font-size: 0.75rem;
                    }
                }
            `}</style>
        </div>
    );
};
