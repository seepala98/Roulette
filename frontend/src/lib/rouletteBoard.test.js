import {
  BOARD_DEFINITION,
  PORTRAIT_BOARD_DEFINITION,
  describeWinningNumber,
  resolveBetSpot,
  summarizeChipPlacements,
  toPayloadBets,
} from './rouletteBoard';

describe('roulette board geometry', () => {
  test('resolves a straight-up bet from a cell center', () => {
    const spot = resolveBetSpot(
      BOARD_DEFINITION.spotMap.get('straight-17').anchor,
      BOARD_DEFINITION,
    );

    expect(spot.betType).toBe('STRAIGHT_UP');
    expect(spot.selection).toBe('17');
  });

  test('resolves a street bet from the desktop top rail anchor', () => {
    const spot = resolveBetSpot(
      BOARD_DEFINITION.spotMap.get('street-1,2,3').anchor,
      BOARD_DEFINITION,
    );

    expect(spot.betType).toBe('STREET');
    expect(spot.selection).toBe('1,2,3');
  });

  test('resolves a zero split at the seam between 0 and 00', () => {
    const spot = resolveBetSpot(
      BOARD_DEFINITION.spotMap.get('split-0,00').anchor,
      BOARD_DEFINITION,
    );

    expect(spot.betType).toBe('SPLIT');
    expect(spot.selection).toBe('0,00');
  });

  test('uses the same logical zero split in portrait mode', () => {
    const spot = resolveBetSpot(
      PORTRAIT_BOARD_DEFINITION.spotMap.get('split-0,00').anchor,
      PORTRAIT_BOARD_DEFINITION,
    );

    expect(spot.betType).toBe('SPLIT');
    expect(spot.selection).toBe('0,00');
  });
});

describe('roulette labels and aggregation', () => {
  const placements = [
    {
      placementId: 'a',
      spotId: 'street-1,2,3',
      betType: 'STREET',
      selection: '1,2,3',
      amount: 10,
      label: '1-3 street',
    },
    {
      placementId: 'b',
      spotId: 'street-1,2,3',
      betType: 'STREET',
      selection: '1,2,3',
      amount: 25,
      label: '1-3 street',
    },
    {
      placementId: 'c',
      spotId: 'straight-17',
      betType: 'STRAIGHT_UP',
      selection: '17',
      amount: 10,
      label: 17,
    },
  ];

  test('summarizes repeated chip placements into a single rendered stack', () => {
    const summary = summarizeChipPlacements(placements, BOARD_DEFINITION);
    const streetBet = summary.find((entry) => entry.spotId === 'street-1,2,3');

    expect(summary).toHaveLength(2);
    expect(streetBet.totalAmount).toBe(35);
    expect(streetBet.count).toBe(2);
  });

  test('serializes aggregated payloads for the backend', () => {
    expect(toPayloadBets(placements, 'player-1')).toEqual([
      {
        player_id: 'player-1',
        bet_type: 'STREET',
        selection: '1,2,3',
        amount: 35,
      },
      {
        player_id: 'player-1',
        bet_type: 'STRAIGHT_UP',
        selection: '17',
        amount: 10,
      },
    ]);
  });

  test('maps the American double-zero winner into a display label', () => {
    expect(describeWinningNumber(37)).toEqual({
      label: '00',
      color: 'green',
    });
  });
});
