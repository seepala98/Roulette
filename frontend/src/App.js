# App.js (Main Component)

import React from 'react';
import RouletteTable from './components/RouletteTable';
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
                <BettingInterface onBetPlaced={handleAddBet} />
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
                <RouletteTable
                    initialBets={pendingBets}
                    onSpinComplete={handleSpinComplete}
                />
            </div>
        </div>
    );
}

// Note: BetInputComponent will be defined here or in a separate file.
// I'm using a placeholder for now.
const BettingInterface = ({ onBetPlaced }) => {
    const [betType, setBetType] = useState('RED');
    const [selection, setSelection] = useState('17');
    const [amount, setAmount] = useState(10);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (amount <= 0) return;

        const bet = {
            bet_type: betType,
            amount: parseInt(amount),
            selection: selection,
            // Player ID will be retrieved from context/user session in a real build
            player_id: 'current_user_uuid'
        };
        onBetPlaced(bet);
    };

    return (
        <form onSubmit={handleSubmit} className="bet-form">
            <select value={betType} onChange={(e) => setBetType(e.target.value)}>
                <option value="RED">Red</option>
                <option value="DOZEN">Dozen</option>
                <option value="STRAIGHT_UP">Straight Up</option>
            </select>
            <input type="text" value={selection} onChange={(e) => setSelection(e.target.value)} placeholder="Selection (e.g., 17)" required />
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Chips" required />
            <button type="submit">Place Bet</button>
        </form>
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
}

export default AppWrapper;
