import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  createSession,
  getSessionState,
} from '../services/gameService';
import wsService, { generateUUID } from '../services/websocketService';

const GameContext = createContext(null);

export const useGameContext = () => useContext(GameContext);

function getOrCreatePlayerId() {
  let pid = localStorage.getItem('roulette_player_id');
  if (!pid) {
    pid = generateUUID();
    localStorage.setItem('roulette_player_id', pid);
  }
  return pid;
}

export const GameProvider = ({
  children,
  initialSessionId = null,
  playerName = 'Player',
  startingChips = 1000,
}) => {
  const [gameState, setGameState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [players, setPlayers] = useState([]);
  const [timerSeconds, setTimerSeconds] = useState(null);
  const [phase, setPhase] = useState('waiting');
  const [playerId] = useState(() => getOrCreatePlayerId());
  const [sessionId, setSessionId] = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting');
  const wsListenersRegistered = useRef(false);
  const playerNameRef = useRef(playerName);
  const startingChipsRef = useRef(startingChips);
  playerNameRef.current = playerName;
  startingChipsRef.current = startingChips;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const init = async () => {
      try {
        const session = initialSessionId
          ? await getSessionState(initialSessionId)
          : await createSession();
        if (!cancelled) {
          setGameState({ ...session, lastRoundResult: null });
          setSessionId(session.sessionId);
        }
      } catch {
        try {
          const fallback = await createSession();
          if (!cancelled) {
            setGameState({ ...fallback, lastRoundResult: null });
            setSessionId(fallback.sessionId);
          }
        } catch (err) {
          if (!cancelled) {
            setError('Unable to create a roulette session. Is the backend running?');
            console.error(err);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [initialSessionId]);

  useEffect(() => {
    if (!sessionId) return;

    if (!wsListenersRegistered.current) {
      wsListenersRegistered.current = true;

      wsService.on('connected', () => {
        setWsStatus('connected');
      });

      wsService.on('disconnected', () => {
        setWsStatus('disconnected');
      });

      wsService.on('reconnecting', (data) => {
        setWsStatus('reconnecting');
      });

      wsService.on('error', () => {
        setWsStatus('error');
      });

      wsService.on('joined_session', (data) => {
        if (data.player_unique_id) {
          localStorage.setItem('roulette_player_id', data.player_unique_id);
        }
        if (data.players) setPlayers(data.players);
        setPhase('betting');
        setWsStatus('connected');
      });

      wsService.on('player_joined', (data) => {
        if (data.players) setPlayers(data.players);
      });

      wsService.on('bet_placed', () => {});

      wsService.on('bet_broadcast', () => {});

      wsService.on('bet_removed', () => {});

      wsService.on('timer_tick', (data) => {
        setTimerSeconds(data.seconds_remaining);
        setPhase('betting');
      });

      wsService.on('spin_result', (data) => {
        setPhase('spinning');
        setTimerSeconds(null);
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                lastRoundResult: data,
                currentRound: data.round_number || prev.currentRound + 1,
              }
            : prev,
        );
        if (data.players) setPlayers(data.players);
      });

      wsService.on('new_round', () => {
        setPhase('betting');
        setTimerSeconds(null);
        setGameState((prev) =>
          prev ? { ...prev, status: 'WAITING' } : prev,
        );
      });

      wsService.on('player_ready', (data) => {
        if (data.all_ready) setPhase('spinning');
      });
    }

    wsService.connect(sessionId, playerId);

    wsService.send('join_session', {
      player_unique_id: playerId,
      player_name: playerNameRef.current,
      initial_budget: startingChipsRef.current,
    });

    return () => {
      wsService.disconnect();
    };
  }, [sessionId, playerId]);

  const placeBet = useCallback(
    (betType, selection, amount) => {
      wsService.send('place_bet', {
        player_unique_id: playerId,
        bet_type: betType,
        selection,
        amount,
      });
    },
    [playerId],
  );

  const undoBet = useCallback(
    (betId) => {
      wsService.send('undo_bet', {
        player_unique_id: playerId,
        bet_id: betId,
      });
    },
    [playerId],
  );

  const clearBets = useCallback(() => {
    wsService.send('clear_bets', {
      player_unique_id: playerId,
    });
  }, [playerId]);

  const markReady = useCallback(() => {
    wsService.send('player_ready', {
      player_unique_id: playerId,
    });
  }, [playerId]);

  return (
    <GameContext.Provider
      value={{
        gameState,
        isLoading,
        error,
        players,
        timerSeconds,
        phase,
        wsStatus,
        placeBet,
        undoBet,
        clearBets,
        markReady,
        playerId,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
