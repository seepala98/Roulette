import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { GameProvider } from '../context/GameContext';
import BoardUI from '../components/BoardUI';

const GamePage = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get('name') || 'Player';
  const startingChips = parseInt(searchParams.get('chips'), 10) || 1000;

  // For now we'll use a simple component, but we should get these from URL params or context
  return (
    <GameProvider initialSessionId={sessionId} playerName={playerName} startingChips={startingChips}>
      <BoardUI />
    </GameProvider>
  );
};

export default GamePage;