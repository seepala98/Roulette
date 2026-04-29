import React, { useCallback, useState } from 'react';
import RouletteTableLayout from './RouletteTableLayout';
import { useGameContext } from '../context/GameContext';
import {
  CHIP_VALUES,
  buildChipPlacement,
  describeWinningNumber,
  summarizeChipPlacements,
  toPayloadBets,
} from '../lib/rouletteBoard';
import '../App.css';

const PendingBetList = ({ bets }) => {
  if (bets.length === 0) {
    return <p className="empty-copy">No chips on the felt yet.</p>;
  }

  return (
    <div className="bet-list">
      {bets.map((bet) => (
        <article key={bet.spotId} className="bet-pill">
          <span>{bet.label}</span>
          <strong>{bet.totalAmount}</strong>
        </article>
      ))}
    </div>
  );
};

const RoundSummary = ({ result, playerId }) => {
  if (!result) {
    return <p className="empty-copy">Spin a round to see the resolved outcome here.</p>;
  }

  const winningInfo = describeWinningNumber(result.winning_number);
  const balance =
    result.player_chips && playerId ? result.player_chips[playerId] : undefined;

  return (
    <div className="round-summary">
      <div className="result-banner">
        <span>Winning pocket</span>
        <strong className={`result-number ${winningInfo ? winningInfo.color : ''}`}>
          {winningInfo ? winningInfo.label : '-'}
        </strong>
      </div>
      <div className="summary-grid">
        <div>
          <span>Round</span>
          <strong>{result.round_number}</strong>
        </div>
        <div>
          <span>Total payout</span>
          <strong>{result.total_payout}</strong>
        </div>
        <div>
          <span>Your balance</span>
          <strong>{balance !== undefined ? balance : 'Pending'}</strong>
        </div>
      </div>
    </div>
  );
};

const PlayerList = ({ players, timeRemaining, phase }) => {
  return (
    <div className="player-list">
      <div className="section-heading">
        <h2>Players</h2>
      </div>
      {players.length === 0 ? (
        <p className="empty-copy">Waiting for players to join...</p>
      ) : (
        <div className="player-entries">
          {players.map((p) => (
            <div key={p.player_unique_id} className="player-entry">
              <span className="player-name">{p.player_name}</span>
              <span className="player-chips">{p.current_chips}</span>
              {phase === 'betting' && (
                <span className={`ready-indicator ${p.ready_to_spin ? 'ready' : 'not-ready'}`}>
                  {p.ready_to_spin ? 'Ready' : 'Betting'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {timeRemaining !== null && phase === 'betting' && (
        <div className="timer-display">
          <span className="timer-label">Time remaining</span>
          <strong className={`timer-value ${timeRemaining <= 10 ? 'urgent' : ''}`}>
            {timeRemaining}s
          </strong>
        </div>
      )}
    </div>
  );
};

const BoardUI = () => {
  const { gameState, isLoading, error, timerSeconds, players, phase, wsStatus, placeBet, undoBet, clearBets, markReady, playerId } = useGameContext();
  const [selectedChipValue, setSelectedChipValue] = useState(10);
  const [pendingPlacements, setPendingPlacements] = useState([]);

  const summarizedBets = summarizeChipPlacements(pendingPlacements);
  const totalStake = pendingPlacements.reduce(
    (runningTotal, placement) => runningTotal + placement.amount,
    0,
  );

  const handleAddBet = useCallback(
    (spot) => {
      setPendingPlacements((previous) => [
        ...previous,
        buildChipPlacement(spot, selectedChipValue),
      ]);
      // Send bet via WebSocket
      placeBet(spot.betType, spot.selection, selectedChipValue);
    },
    [selectedChipValue, placeBet],
  );

  const handleUndo = useCallback(() => {
    setPendingPlacements((previous) => previous.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPendingPlacements([]);
    clearBets();
  }, [clearBets]);

  const handleReady = useCallback(() => {
    markReady();
  }, [markReady]);

  return (
    <div className="game-wrapper">
    <header className="hero-panel">
      <div>
        <p className="eyebrow">Multiplayer Roulette</p>
        <h1>American Roulette</h1>
        <p className="hero-copy">
          Place your bets on the geometric board. Other players' bets are shown in real-time.
        </p>
        {wsStatus === 'disconnected' && (
          <p className="hero-copy" style={{ color: '#e74c3c' }}>Connection lost. Reconnecting...</p>
        )}
        {wsStatus === 'reconnecting' && (
          <p className="hero-copy" style={{ color: '#f39c12' }}>Reconnecting to server...</p>
        )}
        {wsStatus === 'error' && (
          <p className="hero-copy" style={{ color: '#e74c3c' }}>Connection error. Please refresh.</p>
        )}
      </div>
        <div className="hero-stats">
          <div className="stat-card">
            <span>Session</span>
            <strong>
              {gameState && gameState.sessionId
                ? String(gameState.sessionId).slice(0, 8)
                : 'Loading'}
            </strong>
          </div>
          <div className="stat-card">
            <span>Round</span>
            <strong>{((gameState && gameState.currentRound) || 0) + 1}</strong>
          </div>
          <div className="stat-card">
            <span>Total stake</span>
            <strong>{totalStake}</strong>
          </div>
        </div>
      </header>

      {error ? <div className="error-message">{error}</div> : null}

      <div className="experience-grid">
        <aside className="control-panel">
          <PlayerList players={players} timeRemaining={timerSeconds} phase={phase} />

          <section className="panel-section">
            <div className="section-heading">
              <h2>Chip Tray</h2>
              <span>Choose the denomination before placing bets.</span>
            </div>
            <div className="chip-selector">
              {CHIP_VALUES.map((chipValue) => (
                <button
                  key={chipValue}
                  type="button"
                  className={`chip-button ${
                    chipValue === selectedChipValue ? 'is-selected' : ''
                  }`}
                  onClick={() => setSelectedChipValue(chipValue)}
                >
                  {chipValue}
                </button>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-heading">
              <h2>Pending Bets</h2>
              <span>
                {summarizedBets.length} active position{summarizedBets.length === 1 ? '' : 's'}
              </span>
            </div>
            <PendingBetList bets={summarizedBets} />
          </section>

          <section className="panel-section action-section">
            <button
              type="button"
              className="action-button secondary"
              onClick={handleUndo}
              disabled={pendingPlacements.length === 0 || phase !== 'betting'}
            >
              Undo Last Chip
            </button>
            <button
              type="button"
              className="action-button ghost"
              onClick={handleClear}
              disabled={pendingPlacements.length === 0 || phase !== 'betting'}
            >
              Clear Table
            </button>
            {phase === 'betting' && (
              <button
                type="button"
                className="action-button primary"
                onClick={handleReady}
              >
                Ready to Spin
              </button>
            )}
          </section>

          <section className="panel-section">
            <div className="section-heading">
              <h2>Latest Result</h2>
              <span>Round resolution and balance feedback.</span>
            </div>
            <RoundSummary
              result={gameState ? gameState.lastRoundResult : null}
              playerId={playerId}
            />
          </section>
        </aside>

        <main className="table-area">
          <RouletteTableLayout
            chipValue={selectedChipValue}
            currentPlacements={pendingPlacements}
            onSpotSelect={handleAddBet}
            isLocked={isLoading || phase !== 'betting'}
            lastRoundResult={gameState ? gameState.lastRoundResult : null}
          />
        </main>
      </div>
    </div>
  );
};

export default BoardUI;