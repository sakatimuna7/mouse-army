import React, { useState } from 'react';
import { useGameStore } from '../../../store/useGameStore';
import { soundSynth } from '../../../game/audioSynth';
import { Users, Shield, Zap, Sword } from 'lucide-react';

export const Lobby: React.FC = () => {
    const { setPlayerName, setJoined } = useGameStore();
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        soundSynth.playClick();
        setIsLoading(true);
        // Simulate a slight delay for "premium" feel
        setTimeout(() => {
            setPlayerName(name);
            setJoined(true);
        }, 800);
    };

    return (
        <div className="lobby-container">
            {/* Animated Background */}
            <div className="lobby-bg">
                <div className="grid-overlay"></div>
                <div className="blobs">
                    <div className="blob blob-1"></div>
                    <div className="blob blob-2"></div>
                    <div className="blob blob-3"></div>
                </div>
            </div>

            <div className="lobby-content">
                <div className="lobby-card">
                    <div className="lobby-header">
                        <div className="brand-badge">
                            <Shield size={14} className="text-secondary" />
                            <span>BETA v1.0.4</span>
                        </div>
                        <h1 className="lobby-title">MOUSE ARMY</h1>
                        <p className="lobby-subtitle">Survival of the Quickest</p>
                    </div>

                    <form onSubmit={handleJoin} className="lobby-form">
                        <div className="input-group">
                            <input 
                                type="text" 
                                placeholder="Enter Character Name..." 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={15}
                                className="lobby-input"
                                autoFocus
                            />
                            <div className="input-glow"></div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={!name.trim() || isLoading}
                            className={`lobby-button ${isLoading ? 'loading' : ''}`}
                        >
                            <span className="btn-content">
                                {isLoading ? (
                                    <div className="loader"></div>
                                ) : (
                                    <>
                                        <Sword size={20} className="mr-2" />
                                        COMMENCE BATTLE
                                    </>
                                )}
                            </span>
                        </button>
                    </form>

                    <div className="lobby-features">
                        <div className="feature-item">
                            <Users size={18} />
                            <span>100 PLRS</span>
                        </div>
                        <div className="feature-item">
                            <Zap size={18} />
                            <span>ULTRA LOW LATENCY</span>
                        </div>
                    </div>

                    <div className="lobby-footer">
                        <p>PROXIMITY CHAT & SKINS COMING SOON</p>
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');

                :root {
                    --primary: #ff00ff;
                    --secondary: #00ffff;
                    --bg-dark: #0a0a0b;
                    --card-bg: rgba(18, 18, 20, 0.7);
                    --font-main: 'Outfit', sans-serif;
                }

                .lobby-container {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-dark);
                    font-family: var(--font-main);
                    overflow: hidden;
                    z-index: 9999;
                }

                /* Background Effects */
                .lobby-bg {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                }

                .grid-overlay {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                    background-size: 50px 50px;
                    mask-image: radial-gradient(circle at center, black, transparent 80%);
                }

                .blobs {
                    filter: blur(80px);
                    opacity: 0.4;
                }

                .blob {
                    position: absolute;
                    width: 400px;
                    height: 400px;
                    border-radius: 50%;
                    animation: blobFloat 20s infinite alternate;
                }

                .blob-1 { background: var(--primary); top: -100px; left: -100px; }
                .blob-2 { background: var(--secondary); bottom: -100px; right: -100px; animation-delay: -5s; }
                .blob-3 { background: #7000ff; top: 50%; left: 50%; transform: translate(-50%, -50%); animation-delay: -10s; }

                @keyframes blobFloat {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(100px, 50px) scale(1.2); }
                }

                .lobby-content {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    max-width: 480px;
                    padding: 20px;
                }

                .lobby-card {
                    background: var(--card-bg);
                    backdrop-filter: blur(30px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 32px;
                    padding: 48px 40px;
                    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6),
                                inset 0 0 20px rgba(255, 255, 255, 0.02);
                    text-align: center;
                    animation: cardEntry 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes cardEntry {
                    0% { transform: translateY(40px) scale(0.95); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }

                .brand-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 6px 12px;
                    border-radius: 100px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    color: rgba(255, 255, 255, 0.5);
                    margin-bottom: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .lobby-title {
                    font-size: 3.5rem;
                    font-weight: 900;
                    margin: 0;
                    line-height: 1;
                    letter-spacing: -3px;
                    background: linear-gradient(to bottom, #fff 0%, rgba(255,255,255,0.7) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));
                }

                .lobby-subtitle {
                    color: var(--secondary);
                    font-size: 0.9rem;
                    font-weight: 700;
                    letter-spacing: 4px;
                    text-transform: uppercase;
                    margin: 8px 0 40px 0;
                    opacity: 0.8;
                }

                .lobby-form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .input-group {
                    position: relative;
                }

                .lobby-input {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 20px 24px;
                    color: white;
                    font-size: 1.1rem;
                    font-weight: 600;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    outline: none;
                    box-sizing: border-box;
                }

                .lobby-input:focus {
                    border-color: var(--secondary);
                    background: rgba(0, 0, 0, 0.5);
                    transform: translateY(-2px);
                }

                .input-glow {
                    position: absolute;
                    inset: 0;
                    border-radius: 16px;
                    pointer-events: none;
                    box-shadow: 0 0 30px rgba(0, 255, 255, 0);
                    transition: all 0.4s;
                }

                .lobby-input:focus + .input-glow {
                    box-shadow: 0 0 30px rgba(0, 255, 255, 0.15);
                }

                .lobby-button {
                    position: relative;
                    background: linear-gradient(135deg, var(--primary) 0%, #7000ff 100%);
                    color: white;
                    border: none;
                    border-radius: 16px;
                    padding: 20px;
                    font-size: 1.1rem;
                    font-weight: 900;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    overflow: hidden;
                }

                .btn-content {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    letter-spacing: 1px;
                }

                .lobby-button::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
                    opacity: 0;
                    transition: opacity 0.3s;
                }

                .lobby-button:hover:not(:disabled) {
                    transform: scale(1.02) translateY(-2px);
                    box-shadow: 0 20px 40px rgba(255, 0, 255, 0.3);
                }

                .lobby-button:hover::before { opacity: 1; }

                .lobby-button:disabled {
                    opacity: 0.5;
                    filter: grayscale(1);
                }

                .lobby-features {
                    margin-top: 40px;
                    display: flex;
                    justify-content: center;
                    gap: 24px;
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 0.75rem;
                    font-weight: 800;
                }

                .lobby-footer {
                    margin-top: 32px;
                    padding-top: 24px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.2);
                    letter-spacing: 2px;
                }

                .loader {
                    width: 24px;
                    height: 24px;
                    border: 3px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    border-top-color: #fff;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Mobile Optimizations */
                @media (max-width: 640px) {
                    .lobby-card {
                        padding: 40px 24px;
                        border-radius: 24px;
                    }
                    .lobby-title {
                        font-size: 2.8rem;
                    }
                    .lobby-subtitle {
                        letter-spacing: 2px;
                        font-size: 0.8rem;
                    }
                    .lobby-input, .lobby-button {
                        padding: 18px;
                        font-size: 1rem;
                    }
                    .lobby-features {
                        flex-direction: column;
                        gap: 12px;
                        align-items: center;
                    }
                }
            `}</style>
        </div>
    );
};
