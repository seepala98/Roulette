import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../services/gameService';

const CHIP_OPTIONS = [500, 1000, 2500, 5000, 10000];

const LobbyPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [startingChips, setStartingChips] = useState(1000);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [sessionIdInput, setSessionIdInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [createdSessionId, setCreatedSessionId] = useState(null);

  const handleCreate = async () => {
    if (!playerName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const session = await createSession(maxPlayers);
      setCreatedSessionId(session.sessionId);
    } catch (e) {
      setError('Failed to create session. Is the backend running?');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = () => {
    if (!playerName.trim()) return;
    const sid = sessionIdInput.trim();
    if (!sid) return;
    navigate(`/game/${sid}?name=${encodeURIComponent(playerName.trim())}&chips=${startingChips}`);
  };

  const handleStartGame = () => {
    navigate(`/game/${createdSessionId}?name=${encodeURIComponent(playerName.trim())}&chips=${startingChips}`);
  };

  const shareLink = createdSessionId
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port || '3000'}/game/${createdSessionId}?name=${encodeURIComponent(playerName.trim())}&chips=${startingChips}`
    : null;

  if (createdSessionId) {
    return (
      <div className="lobby-page">
        <div className="lobby-card">
          <h1>Game Created!</h1>
          <p className="lobby-copy">Share this link with other players:</p>
          <div className="share-link-box">
            <code>{shareLink}</code>
            <button
              className="action-button secondary"
              onClick={() => navigator.clipboard.writeText(shareLink)}
            >
              Copy Link
            </button>
          </div>
          <p className="lobby-copy">Your name: <strong>{playerName}</strong></p>
          <p className="lobby-copy">Starting chips: <strong>{startingChips}</strong></p>
          <button className="action-button primary" onClick={handleStartGame}>
            Enter Game Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <div className="lobby-card">
        <h1>American Roulette</h1>
        <p className="lobby-copy">Enter your name and choose your starting chips to begin.</p>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={30}
          />
        </div>

        <div className="form-group">
          <label>Starting Chips</label>
          <div className="chip-options">
            {CHIP_OPTIONS.map(amount => (
              <button
                key={amount}
                className={`chip-button ${startingChips === amount ? 'is-selected' : ''}`}
                onClick={() => setStartingChips(amount)}
              >
                {amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {!mode && (
          <div className="button-group">
            <button
              className="action-button primary"
              onClick={() => setMode('create')}
              disabled={!playerName.trim()}
            >
              Create New Game
            </button>
            <button
              className="action-button secondary"
              onClick={() => setMode('join')}
              disabled={!playerName.trim()}
            >
              Join Existing Game
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="form-group">
            <label>Max Players</label>
            <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
              {[2, 3, 4, 5, 6, 7, 8].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button
              className="action-button primary"
              onClick={handleCreate}
              disabled={isCreating || !playerName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Game Room'}
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="form-group">
            <label>Session ID or Link</label>
            <input
              type="text"
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value)}
              placeholder="Paste session ID or share link"
            />
            <button
              className="action-button primary"
              onClick={handleJoin}
              disabled={!sessionIdInput.trim() || !playerName.trim()}
            >
              Join Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LobbyPage;
