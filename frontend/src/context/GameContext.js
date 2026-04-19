# app/context/GameContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSessionState, runRound } from '../services/gameService';
import { v4 as uuidv4 } from 'uuid';

const GameContext = createContext();

export const useGameContext = () => useContext(GameContext);

export const GameProvider = ({ children, initialSessionId }) => {
    const [gameState, setGameState] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // 1. Load initial state when the session ID is available
    useEffect(() => {
        if (initialSessionId) {
            loadInitialState(initialSessionId);
        }
    }, [initialSessionId]);

    const loadInitialState = useCallback(async (sessionId) => {
        setIsLoading(true);
        setError(null);
        try {
            // Simulate initial API fetch
            const state = await getSessionState(sessionId);
            setGameState(state);
        } catch (err) {
            setError("Failed to load initial game state. Please check the API connection.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Processes the user's bet submission for a round.
     * @param {Array<object>} userBets - A list of {bet_type, amount, selection} submitted by the user.
     */
    const placeBetsAndRunRound = useCallback(async (userBets) => {
        if (!gameState || gameState.status !== 'WAITING') {
            alert("Cannot bet right now. The game must be waiting for players.");
            return null;
        }

        try {
            setIsLoading(true);
            // Call the backend service to run the round (this handles the entire transaction)
            const result = await runRound(gameState.session_id, userBets);

            // Update the local state with the results from the server
            setGameState(prev => ({
                ...prev,
                current_round: result.round_number,
                status: result.new_session_status,
                history: result.round_history_bets,
                players: result.updated_players,
                winning_number: result.winning_number,
                // Add more state updates here
            }));
            return result;
        } catch (e) {
            setError("Error running round: " + e.message);
            console.error(e);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [gameState]);

    // Expose necessary functions and state
    return (
        <GameContext.Provider value={{
            gameState,
            isLoading,
            error,
            placeBetsAndRunRound,
            loadInitialState
        }}>
            {children}
        </GameContext.Provider>
    );
};
