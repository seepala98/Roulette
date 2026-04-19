# app/services/strategyService.py (Updated)

from django.db import transaction
from .models import Session, Bet, History, Player
from django.conf import settings # Use Django settings for constants

# --- Strategy Implementations ---

class MartingaleStrategy:
    """A simple Martingale betting strategy: double down after every loss."""
    def __init__(self, initial_chips):
        self.initial_chips = initial_chips
        self.current_bet_unit = 10 # Starting unit bet

    def determine_bet(self, round_number, current_chips):
        """Calculates the next bet amount and type."""
        # Check if we can afford the unit bet
        if current_chips < self.current_bet_unit:
            return None, None, "DEFEATED_NO_FUNDS"

        bet_type = 'RED' # Example always betting on RED
        return bet_type, self.current_bet_unit, "READY"

    def adjust_bet_on_win(self, round_number):
        """Resets the bet unit after a win."""
        self.current_bet_unit = 10 # Reset to initial unit
        print(f"Strategy reset on win. Next bet unit: 10.")

    def adjust_bet_on_loss(self, round_number):
        """Increases the bet unit after a loss."""
        self.current_bet_unit *= 2
        print(f"Strategy lost. Doubling bet unit to: {self.current_bet_unit}.")


def run_simulation_for_strategy(session_id, strategy_name, initial_budget, num_rounds):
    """
    Manages the entire simulation lifecycle for one strategy.
    Returns a detailed record of performance.
    """
    print(f"\n--- Starting Strategy Simulation: {strategy_name} (Budget: {initial_budget}) ---")

    # 1. Setup Initial State
    try:
        session = Session.objects.get(id=session_id)
        # NOTE: In a real system, we would create a temporary 'Agent' player record for this run.
    except Session.DoesNotExist:
        return {"error": "Session not found."}

    current_chips = initial_budget
    strategy_instance = None

    if strategy_name == 'MARTINGALE':
        strategy_instance = MartingaleStrategy(initial_budget)

    simulation_history = []

    for r in range(1, num_rounds + 1):
        print(f"\n[Round {r}]: Starting simulation...")

        # 2. Determine Bet
        bet_type, bet_amount, status = strategy_instance.determine_bet(r, current_chips)
        if status != "READY":
            print(f"Strategy halted due to status: {status}")
            break

        # 3. Simulate Bet Placement (This would call the AgentActionView endpoint)
        # For now, we assume a successful bet placement and deduction of chips.
        current_chips -= bet_amount

        # 4. Simulate Outcome (The critical part: must be deterministic for testing)
        winning_number = random.randint(0, 36) # Simulate random outcome

        # 5. Calculate Payout (using the core math logic)
        # multiplier, won = calculate_payout(bet_type, selection, winning_number, bet_amount)

        # Mocking a loss/win for the sake of completion
        is_win = (winning_number % 2 == 0 and bet_type == 'RED') # Simple mock win condition
        multiplier = 0 if not is_win else 2.0

        if is_win:
            current_chips += int(bet_amount * multiplier)
            if strategy_instance:
                strategy_instance.adjust_bet_on_win(r)
        else:
            if strategy_instance:
                strategy_instance.adjust_bet_on_loss(r)

        # Record outcome
        simulation_history.append({
            'round': r,
            'bet': {'type': bet_type, 'amount': bet_amount, 'selection': 'Random_Number'},
            'outcome': 'Win' if is_win else 'Loss',
            'chip_change': int(bet_amount * multiplier - bet_amount),
            'chips_after': current_chips
        })

    # Final Report
    return {
        "status": "completed",
        "final_chips": current_chips,
        "history": simulation_history
    }
