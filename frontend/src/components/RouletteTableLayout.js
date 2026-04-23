import React, { useRef, useState } from 'react';
import './RouletteTableLayout.css';
import {
  BOARD_DEFINITION,
  CHIP_STYLES,
  describeWinningNumber,
  getNumberColor,
  resolveBetSpot,
  summarizeChipPlacements,
} from '../lib/rouletteBoard';

const renderHighlight = (spot) => {
  if (!spot) {
    return null;
  }

  if (spot.highlight.type === 'circle') {
    return (
      <circle
        cx={spot.highlight.cx}
        cy={spot.highlight.cy}
        r={spot.highlight.radius}
        className="spot-highlight"
      />
    );
  }

  return (
    <rect
      x={spot.highlight.x}
      y={spot.highlight.y}
      width={spot.highlight.width}
      height={spot.highlight.height}
      rx={spot.highlight.rx || 10}
      className="spot-highlight"
    />
  );
};

const renderChipStack = (bet) => {
  const chipsToRender = bet.chips.slice(-3);
  const radius = 18;

  return (
    <g key={bet.spotId} transform={`translate(${bet.anchor.x}, ${bet.anchor.y})`}>
      {chipsToRender.map((chipValue, index) => {
        const style = CHIP_STYLES[chipValue] || CHIP_STYLES[5];
        const xOffset = (index - (chipsToRender.length - 1) / 2) * 7;
        const yOffset = (chipsToRender.length - index - 1) * -6;

        return (
          <g key={`${bet.spotId}-${chipValue}-${index}`} transform={`translate(${xOffset}, ${yOffset})`}>
            <circle cx="2" cy="4" r={radius + 3} className="chip-shadow" />
            <circle r={radius} fill={style.fill} stroke={style.stroke} strokeWidth="4" />
            <circle r={radius - 7} className="chip-core" />
          </g>
        );
      })}
      <text className="chip-total" textAnchor="middle" dy="5">
        {bet.totalAmount}
      </text>
    </g>
  );
};

const RouletteTableLayout = ({
  chipValue,
  currentPlacements,
  onSpotSelect,
  isLocked,
  lastRoundResult,
}) => {
  const svgRef = useRef(null);
  const [hoveredSpotId, setHoveredSpotId] = useState(null);
  const summarizedBets = summarizeChipPlacements(currentPlacements);
  const hoveredSpot = hoveredSpotId
    ? BOARD_DEFINITION.spotMap.get(hoveredSpotId)
    : null;
  const winningInfo = describeWinningNumber(
    lastRoundResult ? lastRoundResult.winning_number : null,
  );

  const getBoardPoint = (event) => {
    if (!svgRef.current) {
      return null;
    }

    const bounds = svgRef.current.getBoundingClientRect();

    if (!bounds.width || !bounds.height) {
      return null;
    }

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * BOARD_DEFINITION.width,
      y: ((event.clientY - bounds.top) / bounds.height) * BOARD_DEFINITION.height,
    };
  };

  const updateHoveredSpot = (event) => {
    const point = getBoardPoint(event);

    if (!point) {
      setHoveredSpotId(null);
      return null;
    }

    const spot = resolveBetSpot(point);
    setHoveredSpotId(spot ? spot.id : null);
    return spot;
  };

  const handlePointerMove = (event) => {
    updateHoveredSpot(event);
  };

  const handlePointerLeave = () => {
    setHoveredSpotId(null);
  };

  const handlePointerDown = (event) => {
    if (isLocked) {
      return;
    }

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const spot = updateHoveredSpot(event);

    if (spot) {
      onSpotSelect(spot);
    }
  };

  return (
    <section className="roulette-table-layout">
      <div className="table-copy">
        <div>
          <p className="eyebrow">Precision Betting Surface</p>
          <h2>Interactive American Table</h2>
        </div>
        <div className="table-status">
          <span>Selected chip</span>
          <strong>{chipValue}</strong>
        </div>
      </div>

      <div className="table-shell">
        <div className="board-scroll">
          <svg
            ref={svgRef}
            className={`betting-board ${isLocked ? 'is-locked' : ''}`}
            viewBox={BOARD_DEFINITION.viewBox}
            role="img"
            aria-label="Interactive roulette betting board"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={handlePointerDown}
          >
            <rect
              x="8"
              y="8"
              width={BOARD_DEFINITION.width - 16}
              height={BOARD_DEFINITION.height - 16}
              rx="28"
              className="board-frame"
            />

            <text
              className="board-label"
              x={BOARD_DEFINITION.gridX}
              y={BOARD_DEFINITION.gridY - 34}
            >
              Street bets sit on the top rail between grid lines.
            </text>

            {BOARD_DEFINITION.zeroCells.map((cell) => (
              <g key={cell.id}>
                <rect
                  x={cell.x}
                  y={cell.y}
                  width={cell.width}
                  height={cell.height}
                  rx="18"
                  className="zero-cell-shape"
                />
                <text
                  x={cell.x + cell.width / 2}
                  y={cell.labelY}
                  className="zero-label"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {cell.number}
                </text>
              </g>
            ))}

            {BOARD_DEFINITION.numberCells.map((cell) => (
              <g key={cell.id}>
                <rect
                  x={cell.x}
                  y={cell.y}
                  width={cell.width}
                  height={cell.height}
                  className={`number-cell-shape ${getNumberColor(cell.number)}`}
                />
                <text
                  x={cell.anchor.x}
                  y={cell.anchor.y + 3}
                  className="number-label"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {cell.number}
                </text>
              </g>
            ))}

            {BOARD_DEFINITION.columnBoxes.map((box) => (
              <g key={box.id}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  rx="12"
                  className="outside-box"
                />
                <text
                  x={box.anchor.x}
                  y={box.anchor.y}
                  className="outside-box-label small"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  2 to 1
                </text>
              </g>
            ))}

            {BOARD_DEFINITION.dozenBoxes.map((box) => (
              <g key={box.id}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  rx="12"
                  className="outside-box"
                />
                <text
                  x={box.anchor.x}
                  y={box.anchor.y}
                  className="outside-box-label"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {box.label}
                </text>
              </g>
            ))}

            {BOARD_DEFINITION.outsideBoxes.map((box) => (
              <g key={box.id}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  rx="12"
                  className={`outside-box ${box.betType === 'RED' ? 'is-red' : ''} ${
                    box.betType === 'BLACK' ? 'is-black' : ''
                  }`}
                />
                <text
                  x={box.anchor.x}
                  y={box.anchor.y}
                  className="outside-box-label"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {box.label}
                </text>
              </g>
            ))}

            {renderHighlight(hoveredSpot)}

            {winningInfo &&
              BOARD_DEFINITION.spotMap.has(`straight-${winningInfo.label}`) &&
              renderHighlight(
                BOARD_DEFINITION.spotMap.get(`straight-${winningInfo.label}`),
              )}

            {summarizedBets.map((bet) => renderChipStack(bet))}
          </svg>
        </div>
      </div>

      <div className="table-guidance">
        <p>
          Click a number center for straight bets, the line between two numbers for
          splits, an intersection for corners, and the top rail for street or line
          bets.
        </p>
        <div className="table-readout">
          <span>
            Hovered bet:
            <strong>{hoveredSpot ? ` ${hoveredSpot.label}` : ' none'}</strong>
          </span>
          <span>
            Last winner:
            <strong>{winningInfo ? ` ${winningInfo.label}` : ' pending'}</strong>
          </span>
        </div>
      </div>
    </section>
  );
};

export default RouletteTableLayout;
