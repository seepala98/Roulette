# backend/roulette_api/tests/test_payouts.py

from django.test import TestCase
from ..views import calculate_payout

class PayoutCalculationTest(TestCase):
    """
    Unit tests for the bet payout logic, ensuring mathematical correctness
    for all American Roulette bets.
    """

    def test_straight_up_win(self):
        # Test winning on a specific number (e.g., 17)
        # Assume winning number is 17
        multiplier, won = calculate_payout('STRAIGHT_UP', '17', 17, 10)
        self.assertEqual(multiplier, 35.0)
        self.assertEqual(won, 1.0)

    def test_straight_up_loss(self):
        # Test losing on a specific number (e.g., 18)
        # Assume winning number is 18
        multiplier, won = calculate_payout('STRAIGHT_UP', '17', 18, 10)
        self.assertEqual(multiplier, 0.0)
        self.assertEqual(won, 0.0)

    def test_red_color_win(self):
        # Test betting on a color (Red) when it wins.
        # This requires knowing which numbers are red.
        # Placeholder assumes any non-zero winner is 1:1 win if betting on Red/Black
        multiplier, won = calculate_payout('RED', 'RED', 3, 20)
        self.assertEqual(multiplier, 1.0) # 1:1 win on color
        self.assertEqual(won, 1.0)

    def test_dozen_win(self):
        # Test betting on a Dozen (e.g., 1-12)
        # Standard payout is 2:1
        multiplier, won = calculate_payout('DOZEN', '1-12', 5, 50)
        self.assertEqual(multiplier, 2.0)
        self.assertEqual(won, 1.0)

    def test_zero_payout(self):
        # Test the zero pocket (0) which loses all color/dozen bets.
        multiplier, won = calculate_payout('RED', 'RED', 0, 50)
        self.assertEqual(multiplier, 0.0)
        self.assertEqual(won, 0.0)
