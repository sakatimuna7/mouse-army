import React, { useState } from 'react';
import { useGameStore } from '../../../store/useGameStore';
import { NetworkManager } from '../../../network/networkManager';

export const Lobby: React.FC = () => {
    const { setPlayerName, setJoined } = useGameStore();
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        setPlayerName(name);
        setJoined(true);
    };

    return (
        <div className="lobby-overlay">
            <div className="lobby-card">
                <h1 className="lobby-title">Mouse Army</h1>
                <p className="lobby-subtitle">Enter your character name to join the battle</p>
                
                <form onSubmit={handleJoin} className="lobby-form">
                    <input 
                        type="text" 
                        placeholder="Character Name..." 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={15}
                        className="lobby-input"
                        autoFocus
                    />
                    <button 
                        type="submit" 
                        disabled={!name.trim() || isLoading}
                        className="lobby-button"
                    >
                        {isLoading ? 'Joining...' : 'BATTLE START'}
                    </button>
                </form>

                <div className="lobby-footer">
                    <span>100 Players Max Per Room</span>
                    <span className="dot"></span>
                    <span>Proximity Chat coming soon</span>
                </div>
            </div>

            <style>{`
                .lobby-overlay {
                    position: fixed;
                    inset: 0;
                    background: radial-gradient(circle at center, #1a1a1a 0%, #050505 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    font-family: 'Inter', system-ui, sans-serif;
                }

                .lobby-card {
                    background: rgba(20, 20, 20, 0.8);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 48px;
                    width: 100%;
                    max-width: 440px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    text-align: center;
                    animation: fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes fadeInScale {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .lobby-title {
                    font-size: 3rem;
                    font-weight: 900;
                    margin: 0 0 12px 0;
                    letter-spacing: -2px;
                    background: linear-gradient(135deg, #ff00ff 0%, #00ffff 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .lobby-subtitle {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 1rem;
                    margin-bottom: 32px;
                }

                .lobby-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .lobby-input {
                    background: rgba(255, 255, 255, 0.05);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 16px 20px;
                    color: white;
                    font-size: 1.1rem;
                    transition: all 0.3s ease;
                    outline: none;
                }

                .lobby-input:focus {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: #00ffff;
                    box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
                }

                .lobby-button {
                    background: linear-gradient(135deg, #ff00ff 0%, #7000ff 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 18px;
                    font-size: 1.1rem;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    letter-spacing: 1px;
                }

                .lobby-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(255, 0, 255, 0.3);
                    filter: brightness(1.1);
                }

                .lobby-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .lobby-footer {
                    margin-top: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.3);
                }

                .dot {
                    width: 4px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                }
            `}</style>
        </div>
    );
};
