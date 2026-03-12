import React, { useEffect, useState } from 'react';
import { useGameStore, IKillLog } from '../../../store/useGameStore';
import './KillFeed.css';

const KillFeedItem: React.FC<{ log: IKillLog }> = ({ log }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
        }, 4500); // Start fade slightly before 5s
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div className="kill-feed-item animate-in">
            <span className="killer">{log.killerName}</span>
            <span className="action">killed</span>
            <span className="victim">{log.victimName}</span>
        </div>
    );
};

export const KillFeed: React.FC = () => {
    const killLogs = useGameStore((state) => state.killLogs);

    return (
        <div className="kill-feed-container">
            {killLogs.map((log) => (
                <KillFeedItem key={log.id} log={log} />
            ))}
        </div>
    );
};
