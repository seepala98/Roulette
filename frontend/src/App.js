import React, { useCallback, useState } from 'react';
import RouletteTableLayout from './components/RouletteTableLayout';
import { GameProvider, useGameContext } from './context/GameContext';
import {
  CHIP_VALUES,
  buildChipPlacement,
  describeWinningNumber,
  summarizeChipPlacements,
  toPayloadBets,
} from './lib/rouletteBoard';
import './App.css';

const getStablePlayerId = () => {
  if (typeof window === 'undefined') {
    return 'web-player-server';
  }

  const existingId = window.localStorage.getItem('roulette-player-id');

  if (existingId) {
    return existingId;
  }

  const hasRandomUuid =
    window.crypto && typeof window.crypto.randomUUID === 'function';
  const nextId = hasRandomUuid
    ? window.crypto.randomUUID()
    : `web-player-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem('roulette-player-id', nextId);
  return nextId;
};

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

const BoardUI = () => {
  const { gameState, isLoading, error, placeBetsAndRunRound } = useGameContext();
  const [selectedChipValue, setSelectedChipValue] = useState(10);
  const [pendingPlacements, setPendingPlacements] = useState([]);
  const [playerId] = useState(getStablePlayerId);

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
    },
    [selectedChipValue],
  );

  const handleUndo = useCallback(() => {
    setPendingPlacements((previous) => previous.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPendingPlacements([]);
  }, []);

  const handleSpin = useCallback(async () => {
    if (pendingPlacements.length === 0) {
      return;
    }

    const payload = toPayloadBets(pendingPlacements, playerId);
    const result = await placeBetsAndRunRound(payload);

    if (result) {
      setPendingPlacements([]);
    }
  }, [pendingPlacements, placeBetsAndRunRound, playerId]);

  return (
    <div className="game-wrapper">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Front-End Audit Rebuild</p>
          <h1>Roulette Table With Geometric Bet Placement</h1>
          <p className="hero-copy">
            The board now resolves clicks against explicit betting hotspots so
            chips land predictably on straights, splits, corners, streets, lines,
            columns, dozens, and outside bets.
          </p>
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
              disabled={pendingPlacements.length === 0 || isLoading}
            >
              Undo Last Chip
            </button>
            <button
              type="button"
              className="action-button ghost"
              onClick={handleClear}
              disabled={pendingPlacements.length === 0 || isLoading}
            >
              Clear Table
            </button>
            <button
              type="button"
              className="action-button primary"
              onClick={handleSpin}
              disabled={pendingPlacements.length === 0 || isLoading}
            >
              {isLoading ? 'Processing Round...' : 'Spin The Wheel'}
            </button>
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
            isLocked={isLoading}
            lastRoundResult={gameState ? gameState.lastRoundResult : null}
          />
        </main>
      </div>
    </div>
  );
};

const AppWrapper = () => (
  <GameProvider>
    <BoardUI />
  </GameProvider>
);

export default AppWrapper;
