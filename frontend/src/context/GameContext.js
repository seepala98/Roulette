import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  createSession,
  getSessionState,
  placeBets,
  runRound,
} from '../services/gameService';

const GameContext = createContext(null);

export const useGameContext = () => useContext(GameContext);

export const GameProvider = ({ children, initialSessionId = null }) => {
  const [gameState, setGameState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const initializeSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const session = initialSessionId
        ? await getSessionState(initialSessionId)
        : await createSession();

      setGameState({
        ...session,
        lastRoundResult: null,
      });
    } catch (initialLoadError) {
      try {
        const fallbackSession = await createSession();
        setGameState({
          ...fallbackSession,
          lastRoundResult: null,
        });
      } catch (creationError) {
        setError(
          'Unable to create a roulette session. Please verify the backend is running.',
        );
        console.error(creationError);
      }

      console.error(initialLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [initialSessionId]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const refreshSession = useCallback(async () => {
    if (!gameState || !gameState.sessionId) {
      return null;
    }

    try {
      const session = await getSessionState(gameState.sessionId);
      setGameState((previous) => ({
        ...previous,
        ...session,
      }));
      return session;
    } catch (refreshError) {
      setError('Unable to refresh the current table state.');
      console.error(refreshError);
      return null;
    }
  }, [gameState]);

  const placeBetsAndRunRound = useCallback(
    async (userBets) => {
      if (!gameState || !gameState.sessionId) {
        setError('The roulette table is still initializing.');
        return null;
      }

      if (userBets.length === 0) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        await placeBets(gameState.sessionId, userBets);
        const result = await runRound(gameState.sessionId);

        setGameState((previous) => ({
          ...previous,
          currentRound:
            result.round_number !== undefined
              ? result.round_number
              : previous.currentRound + 1,
          status: 'WAITING',
          lastRoundResult: result,
        }));

        return result;
      } catch (roundError) {
        const responseError =
          roundError &&
          roundError.response &&
          roundError.response.data &&
          roundError.response.data.error;
        setError(
          responseError || 'There was a problem processing this round.',
        );
        console.error(roundError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [gameState],
  );

  return (
    <GameContext.Provider
      value={{
        gameState,
        isLoading,
        error,
        initializeSession,
        placeBetsAndRunRound,
        refreshSession,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
