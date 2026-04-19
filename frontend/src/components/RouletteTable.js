# app/components/RouletteTable.js

import React, { useState, useEffect, useCallback } from 'react';
// Assuming we have a hook or context to manage global game state and connection
// const { gameState, dispatch } = useGameState();

const COLORS = {
    RED: '#c41e3a',
    BLACK: '#2b2b2b',
    GREEN: '#64a650', // 0
};

const spinAnimationStyle = {
    transition: 'transform 5s cubic-bezier(0.25, 1, 0.5, 1)',
    transform: 'rotate(0deg)',
};

/**
 * Main component simulating the physical roulette table.
 * @param {object} initialBets - List of bets placed by players on the current round.
 * @param {function} onSpinComplete - Callback function fired when the spin resolves.
 */
const RouletteTable = React.memo(({ initialBets, onSpinComplete }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [winnerNumber, setWinnerNumber] = useState(null);
    const [animationStyle, setAnimationStyle] = useState(spinAnimationStyle);

    // Effect to handle the spin completion logic
    useEffect(() => {
        if (!isSpinning) return;

        // Mocking the spin resolution time
        const timer = setTimeout(() => {
            // 1. API call to resolve the winner and process payouts would happen here
            // api.resolveRound(session_id, initialBets)

            // 2. Receive winningNumber and updatedPlayerStates from the backend
            const finalWinnerNumber = Math.floor(Math.random() * 37); // 0-36
            const finalPayouts = { /* ... results from API ... */ };

            setWinnerNumber(finalWinnerNumber);
            setIsSpinning(false);
            onSpinComplete(finalWinnerNumber, finalPayouts);

        }, 5000); // 5 second simulation delay

        return () => clearTimeout(timer);
    }, [isSpinning, onSpinComplete]);

    // Handler to initiate the spin
    const handleSpin = useCallback(async () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setWinnerNumber(null);
        // Reset animation style to start
        setAnimationStyle({ transform: 'rotate(0deg)' });
    }, [isSpinning]);


    // Function to render the wheel segments (Simplified representation)
    const renderWheelSegments = () => {
        const segments = [];
        // In a real app, this would be highly complex geometry
        for (let i = 1; i <= 36; i++) {
            const color = i % 2 == 0 ? COLORS.RED : COLORS.BLACK; // Basic color pattern
            segments.push(
                <div key={i} style={{ backgroundColor: color, flex: 1 }}>
                    {i}
                </div>
            );
        }
        return <div className="roulette-wheel">{segments}</div>;
    };

    return (
        <div className="roulette-container">
            {/* Visualization Area */}
            <div className="wheel-display" style={{ transform: animationStyle.transform }}>
                {renderWheelSegments()}
                <div className="indicator">▼</div>
            </div>

            {/* Action Controls */}
            <div className="controls">
                {isSpinning ? (
                    <button disabled>Spinning...</button>
                ) : (
                    <button onClick={handleSpin} disabled={!initialBets || initialBets.length === 0}>
                        Spin the Wheel
                    </button>
                )}
            </div>

            {/* Winner Display */}
            {winnerNumber !== null && (
                <div className="winner-display">
                    The ball landed on: <span style={{ color: COLORS[winning_number % 2 === 0 ? 'RED' : 'BLACK'] }}>{winnerNumber}</span>
                </div>
            )}
        </div>
    );
});

export default RouletteTable;
