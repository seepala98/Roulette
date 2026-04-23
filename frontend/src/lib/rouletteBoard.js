export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const CHIP_VALUES = [5, 10, 25, 100];

export const CHIP_STYLES = {
  5: { fill: '#f4efe1', stroke: '#3a2e1f', text: '#24180f' },
  10: { fill: '#d65745', stroke: '#fff8ed', text: '#fff8ed' },
  25: { fill: '#237a8b', stroke: '#f5fbff', text: '#f5fbff' },
  100: { fill: '#151515', stroke: '#f4cf72', text: '#f4cf72' },
};

const BOARD_CONFIG = {
  margin: 32,
  topRail: 64,
  zeroWidth: 88,
  zeroGap: 18,
  cellWidth: 78,
  cellHeight: 78,
  gridColumns: 12,
  gridRows: 3,
  rightRailWidth: 82,
  dozenHeight: 56,
  outsideHeight: 64,
  bottomGap: 18,
};

const numberRows = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

const sortedSelection = (numbers) =>
  [...numbers].sort((left, right) => left - right).join(',');

const buildBoardDefinition = () => {
  const {
    margin,
    topRail,
    zeroWidth,
    zeroGap,
    cellWidth,
    cellHeight,
    gridColumns,
    gridRows,
    rightRailWidth,
    dozenHeight,
    outsideHeight,
    bottomGap,
  } = BOARD_CONFIG;

  const gridX = margin + zeroWidth + zeroGap;
  const gridY = margin + topRail;
  const gridWidth = gridColumns * cellWidth;
  const gridHeight = gridRows * cellHeight;
  const dozenY = gridY + gridHeight + bottomGap;
  const outsideY = dozenY + dozenHeight + 12;
  const boardWidth = gridX + gridWidth + rightRailWidth + margin;
  const boardHeight = outsideY + outsideHeight + margin;

  const numberCells = [];
  const zeroCells = [
    {
      id: 'zero-0',
      number: '0',
      x: margin,
      y: gridY,
      width: zeroWidth,
      height: gridHeight / 2,
      labelY: gridY + gridHeight / 4,
    },
    {
      id: 'zero-00',
      number: '00',
      x: margin,
      y: gridY + gridHeight / 2,
      width: zeroWidth,
      height: gridHeight / 2,
      labelY: gridY + (gridHeight * 3) / 4,
    },
  ];

  const spots = [];

  const pushSpot = (spot) => {
    spots.push(spot);
    return spot;
  };

  numberRows.forEach((row, rowIndex) => {
    row.forEach((number, columnIndex) => {
      const x = gridX + columnIndex * cellWidth;
      const y = gridY + rowIndex * cellHeight;
      const anchor = { x: x + cellWidth / 2, y: y + cellHeight / 2 };

      numberCells.push({
        id: `cell-${number}`,
        number,
        rowIndex,
        columnIndex,
        color: RED_NUMBERS.has(number) ? 'red' : 'black',
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        anchor,
      });

      pushSpot({
        id: `straight-${number}`,
        kind: 'inside',
        betType: 'STRAIGHT_UP',
        selection: String(number),
        label: number,
        anchor,
        priority: 6,
        shape: {
          type: 'rect',
          x: x + 12,
          y: y + 12,
          width: cellWidth - 24,
          height: cellHeight - 24,
        },
        highlight: {
          type: 'rect',
          x: x + 4,
          y: y + 4,
          width: cellWidth - 8,
          height: cellHeight - 8,
          rx: 10,
        },
      });
    });
  });

  zeroCells.forEach((cell) => {
    const anchor = {
      x: cell.x + cell.width / 2,
      y: cell.y + cell.height / 2,
    };

    pushSpot({
      id: `straight-${cell.number}`,
      kind: 'zero',
      betType: 'STRAIGHT_UP',
      selection: cell.number,
      label: cell.number,
      anchor,
      priority: 6,
      shape: {
        type: 'rect',
        x: cell.x + 10,
        y: cell.y + 10,
        width: cell.width - 20,
        height: cell.height - 20,
      },
      highlight: {
        type: 'rect',
        x: cell.x + 4,
        y: cell.y + 4,
        width: cell.width - 8,
        height: cell.height - 8,
        rx: 14,
      },
    });
  });

  for (let columnIndex = 0; columnIndex < gridColumns - 1; columnIndex += 1) {
    for (let rowIndex = 0; rowIndex < gridRows; rowIndex += 1) {
      const leftNumber = numberRows[rowIndex][columnIndex];
      const rightNumber = numberRows[rowIndex][columnIndex + 1];
      const anchor = {
        x: gridX + (columnIndex + 1) * cellWidth,
        y: gridY + rowIndex * cellHeight + cellHeight / 2,
      };

      pushSpot({
        id: `split-h-${leftNumber}-${rightNumber}`,
        kind: 'inside',
        betType: 'SPLIT',
        selection: sortedSelection([leftNumber, rightNumber]),
        label: `${Math.min(leftNumber, rightNumber)} / ${Math.max(leftNumber, rightNumber)}`,
        anchor,
        priority: 1,
        shape: { type: 'circle', cx: anchor.x, cy: anchor.y, radius: 18 },
        highlight: { type: 'circle', cx: anchor.x, cy: anchor.y, radius: 24 },
      });
    }
  }

  for (let columnIndex = 0; columnIndex < gridColumns; columnIndex += 1) {
    for (let rowIndex = 0; rowIndex < gridRows - 1; rowIndex += 1) {
      const upperNumber = numberRows[rowIndex][columnIndex];
      const lowerNumber = numberRows[rowIndex + 1][columnIndex];
      const anchor = {
        x: gridX + columnIndex * cellWidth + cellWidth / 2,
        y: gridY + (rowIndex + 1) * cellHeight,
      };

      pushSpot({
        id: `split-v-${upperNumber}-${lowerNumber}`,
        kind: 'inside',
        betType: 'SPLIT',
        selection: sortedSelection([upperNumber, lowerNumber]),
        label: `${Math.min(upperNumber, lowerNumber)} / ${Math.max(upperNumber, lowerNumber)}`,
        anchor,
        priority: 1,
        shape: { type: 'circle', cx: anchor.x, cy: anchor.y, radius: 18 },
        highlight: { type: 'circle', cx: anchor.x, cy: anchor.y, radius: 24 },
      });
    }
  }

  for (let columnIndex = 0; columnIndex < gridColumns; columnIndex += 1) {
    const streetNumbers = [
      columnIndex * 3 + 1,
      columnIndex * 3 + 2,
      columnIndex * 3 + 3,
    ];
    const anchor = {
      x: gridX + columnIndex * cellWidth + cellWidth / 2,
      y: gridY - 18,
    };

    pushSpot({
      id: `street-${columnIndex + 1}`,
      kind: 'inside',
      betType: 'STREET',
      selection: sortedSelection(streetNumbers),
      label: `${streetNumbers[0]}-${streetNumbers[2]} street`,
      anchor,
      priority: 2,
      shape: { type: 'circle', cx: anchor.x, cy: anchor.y, radius: 17 },
      highlight: { type: 'circle', cx: anchor.x, cy: anchor.y, radius: 23 },
    });
  }

  for (let columnIndex = 0; columnIndex < gridColumns - 1; columnIndex += 1) {
    const lineNumbers = [
      columnIndex * 3 + 1,
      columnIndex * 3 + 2,
      columnIndex * 3 + 3,
      columnIndex * 3 + 4,
      columnIndex * 3 + 5,
      columnIndex * 3 + 6,
    ];
    const anchor = {
      x: gridX + (columnIndex + 1) * cellWidth,
      y: gridY - 18,
    };

    pushSpot({
      id: `line-${columnIndex + 1}-${columnIndex + 2}`,
      kind: 'inside',
      betType: 'LINE',
      selection: sortedSelection(lineNumbers),
      label: `${lineNumbers[0]}-${lineNumbers[5]} line`,
      anchor,
      priority: 2,
      shape: { type: 'circle', cx: anchor.x, cy: anchor.y, radius: 17 },
      highlight: { type: 'circle', cx: anchor.x, cy: anchor.y, radius: 23 },
    });
  }

  for (let columnIndex = 0; columnIndex < gridColumns - 1; columnIndex += 1) {
    for (let rowIndex = 0; rowIndex < gridRows - 1; rowIndex += 1) {
      const numbers = [
        numberRows[rowIndex][columnIndex],
        numberRows[rowIndex][columnIndex + 1],
        numberRows[rowIndex + 1][columnIndex],
        numberRows[rowIndex + 1][columnIndex + 1],
      ];
      const anchor = {
        x: gridX + (columnIndex + 1) * cellWidth,
        y: gridY + (rowIndex + 1) * cellHeight,
      };

      pushSpot({
        id: `corner-${columnIndex + 1}-${rowIndex + 1}`,
        kind: 'inside',
        betType: 'CORNER',
        selection: sortedSelection(numbers),
        label: `${sortedSelection(numbers).replace(/,/g, ' / ')}`,
        anchor,
        priority: 0,
        shape: { type: 'circle', cx: anchor.x, cy: anchor.y, radius: 18 },
        highlight: { type: 'circle', cx: anchor.x, cy: anchor.y, radius: 24 },
      });
    }
  }

  const columnBoxes = [
    { id: 'column-1', rowIndex: 0, betType: 'COLUMN', selection: 'col1', label: '2 to 1' },
    { id: 'column-2', rowIndex: 1, betType: 'COLUMN', selection: 'col2', label: '2 to 1' },
    { id: 'column-3', rowIndex: 2, betType: 'COLUMN', selection: 'col3', label: '2 to 1' },
  ].map((box) => {
    const y = gridY + box.rowIndex * cellHeight;
    const rect = {
      x: gridX + gridWidth,
      y,
      width: rightRailWidth,
      height: cellHeight,
    };
    const anchor = {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };

    pushSpot({
      id: box.id,
      kind: 'outside',
      betType: box.betType,
      selection: box.selection,
      label: box.selection.toUpperCase(),
      anchor,
      priority: 5,
      shape: { type: 'rect', ...rect },
      highlight: { type: 'rect', ...rect, rx: 12 },
    });

    return { ...box, ...rect, anchor };
  });

  const dozenBoxes = [
    { id: 'dozen-1', betType: 'DOZEN', selection: '1st12', label: '1st 12', columnStart: 0 },
    { id: 'dozen-2', betType: 'DOZEN', selection: '2nd12', label: '2nd 12', columnStart: 4 },
    { id: 'dozen-3', betType: 'DOZEN', selection: '3rd12', label: '3rd 12', columnStart: 8 },
  ].map((box) => {
    const rect = {
      x: gridX + box.columnStart * cellWidth,
      y: dozenY,
      width: cellWidth * 4,
      height: dozenHeight,
    };
    const anchor = {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };

    pushSpot({
      id: box.id,
      kind: 'outside',
      betType: box.betType,
      selection: box.selection,
      label: box.label,
      anchor,
      priority: 5,
      shape: { type: 'rect', ...rect },
      highlight: { type: 'rect', ...rect, rx: 12 },
    });

    return { ...box, ...rect, anchor };
  });

  const outsideBoxes = [
    { id: 'outside-lo', betType: 'LO', selection: 'LO', label: '1 to 18', columnStart: 0 },
    { id: 'outside-even', betType: 'EVEN', selection: 'EVEN', label: 'Even', columnStart: 2 },
    { id: 'outside-red', betType: 'RED', selection: 'RED', label: 'Red', columnStart: 4 },
    { id: 'outside-black', betType: 'BLACK', selection: 'BLACK', label: 'Black', columnStart: 6 },
    { id: 'outside-odd', betType: 'ODD', selection: 'ODD', label: 'Odd', columnStart: 8 },
    { id: 'outside-hi', betType: 'HI', selection: 'HI', label: '19 to 36', columnStart: 10 },
  ].map((box) => {
    const rect = {
      x: gridX + box.columnStart * cellWidth,
      y: outsideY,
      width: cellWidth * 2,
      height: outsideHeight,
    };
    const anchor = {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };

    pushSpot({
      id: box.id,
      kind: 'outside',
      betType: box.betType,
      selection: box.selection,
      label: box.label,
      anchor,
      priority: 5,
      shape: { type: 'rect', ...rect },
      highlight: { type: 'rect', ...rect, rx: 12 },
    });

    return { ...box, ...rect, anchor };
  });

  return {
    config: BOARD_CONFIG,
    viewBox: `0 0 ${boardWidth} ${boardHeight}`,
    width: boardWidth,
    height: boardHeight,
    gridX,
    gridY,
    gridWidth,
    gridHeight,
    numberRows,
    numberCells,
    zeroCells,
    columnBoxes,
    dozenBoxes,
    outsideBoxes,
    betSpots: spots,
    spotMap: new Map(spots.map((spot) => [spot.id, spot])),
  };
};

export const BOARD_DEFINITION = buildBoardDefinition();

export const getNumberColor = (number) =>
  RED_NUMBERS.has(Number(number)) ? 'red' : 'black';

const pointToRectDistance = (point, rect) => {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.sqrt(dx * dx + dy * dy);
};

const containsPoint = (shape, point) => {
  if (shape.type === 'circle') {
    return (
      Math.hypot(point.x - shape.cx, point.y - shape.cy) <= shape.radius
    );
  }

  return (
    point.x >= shape.x &&
    point.x <= shape.x + shape.width &&
    point.y >= shape.y &&
    point.y <= shape.y + shape.height
  );
};

const distanceToShape = (shape, point) => {
  if (shape.type === 'circle') {
    return Math.max(
      0,
      Math.hypot(point.x - shape.cx, point.y - shape.cy) - shape.radius,
    );
  }

  return pointToRectDistance(point, shape);
};

export const resolveBetSpot = (point, board = BOARD_DEFINITION) => {
  const directHits = board.betSpots
    .filter((spot) => containsPoint(spot.shape, point))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return (
        distanceToShape(left.shape, point) - distanceToShape(right.shape, point)
      );
    });

  if (directHits.length > 0) {
    return directHits[0];
  }

  const nearbySpot = board.betSpots
    .map((spot) => ({
      spot,
      distance: distanceToShape(spot.shape, point),
    }))
    .filter(({ spot, distance }) => spot.shape.type === 'circle' && distance <= 12)
    .sort((left, right) => {
      if (left.spot.priority !== right.spot.priority) {
        return left.spot.priority - right.spot.priority;
      }

      return left.distance - right.distance;
    })[0];

  return nearbySpot ? nearbySpot.spot : null;
};

export const buildChipPlacement = (spot, amount) => ({
  placementId: `${spot.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  spotId: spot.id,
  betType: spot.betType,
  selection: spot.selection,
  amount,
  label: spot.label,
});

export const summarizeChipPlacements = (placements, board = BOARD_DEFINITION) => {
  const summary = new Map();

  placements.forEach((placement) => {
    const existing = summary.get(placement.spotId);

    if (existing) {
      existing.totalAmount += placement.amount;
      existing.count += 1;
      existing.chips.push(placement.amount);
      existing.lastAmount = placement.amount;
      return;
    }

    const spot = board.spotMap.get(placement.spotId);
    summary.set(placement.spotId, {
      spotId: placement.spotId,
      label: placement.label,
      betType: placement.betType,
      selection: placement.selection,
      totalAmount: placement.amount,
      count: 1,
      chips: [placement.amount],
      lastAmount: placement.amount,
      anchor: spot ? spot.anchor : { x: 0, y: 0 },
    });
  });

  return Array.from(summary.values());
};

export const toPayloadBets = (placements, playerId) =>
  summarizeChipPlacements(placements).map((bet) => ({
    player_id: playerId,
    bet_type: bet.betType,
    selection: bet.selection,
    amount: bet.totalAmount,
  }));

export const describeWinningNumber = (winningNumber) => {
  if (winningNumber === null || winningNumber === undefined) {
    return null;
  }

  if (winningNumber === 0 || winningNumber === '0') {
    return { label: '0', color: 'green' };
  }

  return {
    label: String(winningNumber),
    color: RED_NUMBERS.has(Number(winningNumber)) ? 'red' : 'black',
  };
};
