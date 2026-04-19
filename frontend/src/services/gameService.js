# app/services/gameService.js
// This service abstracts the API calls, making the UI clean and reactive.

import axios from 'axios';

const API_BASE_URL = "http://localhost:8000/api/v1"; // Must match Django backend URL

/**
 * Fetches the latest session details and all connected players.
 * @param {string} sessionId
 * @returns {Promise<object>} Session and Player data.
 */
export const getSessionState = async (sessionId) => {
    const response = await axios.get(`${API_BASE_URL}/sessions/detail/?session_id=${sessionId}`);
    return response.data;
};

/**
 * Submits all placed bets for a round and triggers the game spin and payout calculation.
 * @param {string} sessionId
 * @param {Array<object>} bets - List of bets submitted by players.
 * @returns {Promise<object>} The structured round result payload.
 */
export const runRound = async (sessionId, bets) => {
    const response = await axios.post(`${API_BASE_URL}/games/run_round/`, {
        session_id: sessionId,
        bets: bets
    }, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

// This service will also handle WebSocket connections for real-time updates
// const socket = io("http://localhost:3001/ws/game");
// export const connectSocket = (sessionId) => { ... };
