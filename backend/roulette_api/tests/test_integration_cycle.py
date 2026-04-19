# backend/roulette_api/tests/test_game_cycle.py

from django.test import TestCase
from django.db import transaction
from ..models import Session, Player, Bet, History
from unittest.mock import patch
import uuid
import random

class GameCycleIntegrationTest(TestCase):
    """
    Tests the entire round-processing transactional flow,
    ensuring state integrity across multiple models.
    """

    @transaction.atomic
    def setUp(self):
        # Setup a dedicated session for testing
        self.session = Session.objects.create(status='WAITING', max_players=4)
        self.player1 = Player.objects.create(session=self.session, player_unique_id="P1", player_name="Alice", initial_budget=1000, current_chips=1000)
        self.player2 = Player.objects.create(session=self.session, player_unique_id="P2", player_name="Bob", initial_budget=1000, current_chips=1000)

    def test_full_round_cycle_success(self):
        # --- ARRANGE (Bets) ---
        bet_alice = Bet.objects.create(
            player=self.player1, session=self.session, round_number=1, bet_type='STRAIGHT_UP', amount=10, selection='17'
        )
        bet_bob = Bet.objects.create(
            player=self.player2, session=self.session, round_number=1, bet_type='RED', amount=50, selection='RED'
        )

        # --- ACT (Simulated Round Run) ---
        # Mock the random winning number for a predictable test outcome
        # We are testing the payout calculation, so we fix the winner.
        winning_number = 17 # Alice's bet number

        # Mock the payout calculation function call for predictability
        # In a real test, we would mock the internal payout function itself.
        with patch('roulette_api.views.get_winning_number', return_value=17):
            # Manually call the core logic from views.py (simulating the POST request)
            from roulette_api.views import GameCycleViewSet
            viewset = GameCycleViewSet()

            # Mock the request object to pass the bets
            mock_request = type('MockRequest', (object,), {
                'data': {'bets': [
                    {'player_id': self.player1.player_id, 'bet_type': 'STRAIGHT_UP', 'amount': 10, 'selection': '17'},
                    {'player_id': self.player2.player_id, 'bet_type': 'RED', 'amount': 50, 'selection': 'RED'}
                ]}
            })()

            # We bypass the full DRF request cycle for simplicity in the test file
            # We will call the method directly on the viewset instance
            response = viewset.run_round(mock_request) # Adjust call based on actual Django view structure

        # --- ASSERT (Verification) ---
        # 1. Check for History creation
        self.assertTrue(History.objects.filter(session=self.session, round_number=1).exists())

        # 2. Check Player 1 (Alice): Bet 17, won 35:1 payout.
        # Initial: 1000. Bet: -10. Win: +350. Final: 1340.
        self.assertEqual(self.player1.current_chips, 1340)

        # 3. Check Player 2 (Bob): Bet 50, won 0 (since 17 is neither R nor B in simple mock).
        # Initial: 1000. Bet: -50. Loss: 0. Final: 950.
        self.assertEqual(self.player2.current_chips, 950)

        # 4. Check Session State Advancement
        self.assertEqual(self.session.current_round, 1)

# Note: Actual Django test execution requires properly setting up fixtures and mocking dependencies.
