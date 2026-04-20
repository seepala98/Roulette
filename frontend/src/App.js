/*
 * App.js (Main Component)
 */

import React, { useState, useCallback } from 'react';
import RouletteTableLayout from './components/RouletteTableLayout';
import { GameProvider, useGameContext } from './context/GameContext';
import './App.css'; // Assume this file holds global styling

const BoardUI = () => {
    const { gameState, isLoading, error, placeBetsAndRunRound } = useGameContext();
    const [pendingBets, setPendingBets] = useState([]); // State for bets before hitting spin

    // This function is called by the betting UI when a player places a bet
    const handleAddBet = (betDetails) => {
        setPendingBets(prev => [...prev, betDetails]);
    };

    // This function is called when the user explicitly clicks 'Spin'
    const handleSpin = async () => {
        if (pendingBets.length === 0) {
            alert("Please place at least one bet before spinning.");
            return;
        }

        // Pass the gathered bets to the context function
        await placeBetsAndRunRound(pendingBets);

        // Clear local bets after a successful spin
        setPendingBets([]);
    };

    // This is passed down to the RouletteTable component
    const handleSpinComplete = useCallback((winnerNumber, payouts) => {
        console.log("Round completed! Winner:", winnerNumber, "Payouts:", payouts);
        // Handle any post-round actions, like displaying a 'next round' button
    }, []);

    return (
        <div className="game-wrapper">
            <h1>American Roulette Simulation</h1>

            {error && <div className="error-message">{error}</div>}

            <div className="betting-panel">
                <h2>Your Bets (Round {gameState?.current_round + 1 || 1})</h2>
                {/* We'll keep the old betting interface for now or remove it */}
                <div className="current-bets-list">
                    {pendingBets.length > 0 ? (
                        <div>
                            <h3>Active Bets:</h3>
                            {pendingBets.map((bet, index) => (
                                <p key={index}>{bet.bet_type} on {bet.selection} | Amount: {bet.amount}</p>
                            ))}
                        </div>
                    ) : (
                        <p>No bets placed yet for this round.</p>
                    )}
                </div>
                <button
                    onClick={handleSpin}
                    disabled={isLoading || pendingBets.length === 0}
                    className="spin-button"
                >
                    {isLoading ? 'Processing Round...' : 'Spin the Wheel'}
                </button>
            </div>

            <div className="table-area">
                <RouletteTableLayout
                    onBetPlace={handleAddBet}
                    currentBets={pendingBets}
                />
            </div>
        </div>
    );
};

const AppWrapper = () => {
    // Placeholder: We need the session ID somehow (e.g., from a URL query param)
    const SESSION_ID = "a-placeholder-uuid-for-dev";
    return (
        <GameProvider initialSessionId={SESSION_ID}>
            <BoardUI />
        </GameProvider>
    );
};

export default AppWrapper;