from django.test import TestCase

from ..views import DOUBLE_ZERO, calculate_payout


class PayoutCalculationTest(TestCase):
    """Unit tests for American roulette payouts."""

    def test_straight_up_win(self):
        multiplier, won = calculate_payout('STRAIGHT_UP', '17', 17, 10)
        self.assertEqual(multiplier, 35.0)
        self.assertEqual(won, 1.0)

    def test_double_zero_straight_up_win(self):
        multiplier, won = calculate_payout('STRAIGHT_UP', '00', DOUBLE_ZERO, 10)
        self.assertEqual(multiplier, 35.0)
        self.assertEqual(won, 1.0)

    def test_zero_split_win(self):
        multiplier, won = calculate_payout('SPLIT', '0,00', DOUBLE_ZERO, 10)
        self.assertEqual(multiplier, 17.0)
        self.assertEqual(won, 1.0)

    def test_red_color_win(self):
        multiplier, won = calculate_payout('RED', 'RED', 3, 20)
        self.assertEqual(multiplier, 1.0)
        self.assertEqual(won, 1.0)

    def test_double_zero_loses_color_bets(self):
        multiplier, won = calculate_payout('RED', 'RED', DOUBLE_ZERO, 50)
        self.assertEqual(multiplier, 0.0)
        self.assertEqual(won, 0.0)

    def test_dozen_win(self):
        multiplier, won = calculate_payout('DOZEN', '1st12', 5, 50)
        self.assertEqual(multiplier, 2.0)
        self.assertEqual(won, 1.0)
