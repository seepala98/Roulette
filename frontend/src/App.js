import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/game/:sessionId" element={<GamePage />} />
    </Routes>
  );
}

export default App;
