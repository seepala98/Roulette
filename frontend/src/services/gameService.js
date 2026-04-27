import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

const normalizeSession = (payload) => ({
  sessionId: payload.session_uuid || payload.session_id,
  status: payload.status || 'WAITING',
  currentRound: payload.current_round || 0,
  maxPlayers: payload.max_players || 4,
});

export const createSession = async (maxPlayers = 4) => {
  const response = await axios.post(`${API_BASE_URL}/sessions/`, {
    max_players: maxPlayers,
  });

  return normalizeSession(response.data);
};

export const getSessionState = async (sessionId) => {
  const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}/`);
  return normalizeSession(response.data);
};

export const placeBets = async (sessionId, bets) => {
  const response = await axios.post(
    `${API_BASE_URL}/sessions/${sessionId}/place_bets/`,
    { bets },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data;
};

export const runRound = async (sessionId) => {
  const response = await axios.post(
    `${API_BASE_URL}/sessions/${sessionId}/run_round/`,
    {},
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data;
};
