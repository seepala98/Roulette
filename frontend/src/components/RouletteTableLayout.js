// src/components/RouletteTableLayout.js
import React from 'react';
import './RouletteTableLayout.css';

const ROULETTE_LAYOUT = {
  // Numbers 1-36 in 3 columns and 12 rows
  numbers: [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], // Row 1
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35], // Row 2
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]  // Row 3
  ],
  
  // Special bets
  specialBets: [
    { type: '0', label: '0', position: 'top-left' },
    { type: '00', label: '00', position: 'top-right' } // For American roulette
  ]
};

const getNumberColor = (number) => {
  if (number === 0 || number === '00') return 'green';
  
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  return redNumbers.includes(number) ? 'red' : 'black';
};

const RouletteTableLayout = ({ onBetPlace, currentBets }) => {
  const handlePlaceBet = (betType, selection, amount = 5) => {
    onBetPlace({
      bet_type: betType,
      amount: amount,
      selection: selection,
      player_id: 'web_player_' + Math.random().toString(36).substr(2, 9)
    });
  };

  return (
    <div className="roulette-table-layout">
      {/* Zero and Double Zero (American style) */}
      <div className="zero-bets">
        <div 
          className="bet-cell zero-cell" 
          onClick={() => handlePlaceBet('STRAIGHT_UP', '0', 5)}
          title="Bet on 0"
        >
          0
        </div>
        <div 
          className="bet-cell zero-cell" 
          onClick={() => handlePlaceBet('STRAIGHT_UP', '00', 5)}
          title="Bet on 00"
        >
          00
        </div>
      </div>

      {/* Main Number Grid (3 columns x 12 rows) */}
      <div className="number-grid">
        {ROULETTE_LAYOUT.numbers.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="number-row">
            {row.map((num, colIndex) => {
              const color = getNumberColor(num);
              return (
                <div 
                  key={`num-${num}`}
                  className={`bet-cell number-cell ${color}`}
                  onClick={() => handlePlaceBet('STRAIGHT_UP', num.toString(), 5)}
                  title={`Bet on ${num}`}
                >
                  <div className="number">{num}</div>
                  <div className="color-indicator" 
                       style={{ backgroundColor: color === 'red' ? '#c41e3a' : color === 'black' ? '#000' : '#64a650' }}>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Side Bets (Columns, Dozens, etc.) */}
      <div className="side-bets">
        {/* Columns bets */}
        <div className="column-bets">
          {[1, 2, 3].map(col => (
            <div 
              key={`col-${col}`}
              className="bet-cell column-cell"
              onClick={() => handlePlaceBet('COLUMN', `2to1col${col}`, 5)}
              title={`Bet on Column ${col}`}
            >
              2 to 1<br/>Column {col}
            </div>
          ))}
        </div>
        
        {/* Dozens bets */}
        <div className="dozen-bets">
          ['1st 12', '2nd 12', '3rd 12'].map((label, index) => (
            <div 
              key={`dozen-${index}`}
              className="bet-cell dozen-cell"
              onClick={() => handlePlaceBet('DOZEN', label.replace('nd ', '').replace('rd ', '').replace('st ', ''), 5)}
              title={`Bet on ${label}`}
            >
              {label}
            </div>
          ))}
        </div>
        
        {/* Even Money Bets */}
        <div className="even-money-bets">
          <div 
            className="bet-cell even-cell"
            onClick={() => handlePlaceBet('EVEN_ODD', 'even', 5)}
            title="Bet on Even"
          >
            Even
          </div>
          <div 
            className="bet-cell even-cell"
            onClick={() => handlePlaceBet('RED_BLACK', 'black', 5)}
            title="Bet on Black"
          >
            Black
          </div>
          <div 
            className="bet-cell even-cell"
            onClick={() => handlePlaceBet('EVEN_ODD', 'odd', 5)}
            title="Bet on Odd"
          >
            Odd
          </div>
          <div 
            className="bet-cell even-cell"
            onClick={() => handlePlaceBet('RED_BLACK', 'red', 5)}
            title="Bet on Red"
          >
            Red
          </div>
          <div 
            className="bet-cell even-cell"
            onClick={() => handlePlaceBet('HI_LO', '1to18', 5)}
            title="Bet on Low (1-18)"
          >
            1 to 18
          </div>
          <div 
            className="bet-cell even-cell"
            onClick={() => handlePlaceBet('HI_LO', '19to36', 5)}
            title="Bet on High (19-36)"
          >
            19 to 36
          </div>
        </div>
      </div>

      {/* Street, Corner, Split bets would go here in a full implementation */}
      <div className="info-panel">
        <div className="bet-info">
          <p><strong>How to Play:</strong></p>
          <ul>
            <li>Click on any number to place a straight-up bet</li>
            <li>Click on side bets for columns, dozens, even/odd, etc.</li>
            <li>Click "Spin Wheel" when ready</li>
            <li>Minimum bet: 5 chips</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RouletteTableLayout;