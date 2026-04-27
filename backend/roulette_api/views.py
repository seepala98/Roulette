# app/views.py (Updates - adding AgentView)

# ... (Existing imports and helper functions remain) ...
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.response import Response
# Import models
from .models import Session, Player, Bet, History
import random

DOUBLE_ZERO = 37
RED_NUMBERS = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}
COLUMN_NUMBERS = {
    'col1': {3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36},
    'col2': {2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35},
    'col3': {1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34},
}


def normalize_pocket_value(value):
    """Convert roulette pocket labels into a stable internal integer."""
    if value == '00':
        return DOUBLE_ZERO

    if value in [0, DOUBLE_ZERO]:
        return value

    if value is None:
        raise ValueError("Pocket value is required.")

    string_value = str(value).strip()
    if string_value == '00':
        return DOUBLE_ZERO

    normalized_value = int(string_value)
    if normalized_value < 0 or normalized_value > DOUBLE_ZERO:
        raise ValueError("Pocket value is out of range.")
    return normalized_value


def parse_selection_pockets(selection):
    if selection is None:
        raise ValueError("Selection is required.")

    return [normalize_pocket_value(token) for token in str(selection).split(',')]


def format_winning_label(winning_number):
    return '00' if winning_number == DOUBLE_ZERO else str(winning_number)


def get_winning_number():
    """
    Returns a random winning pocket for American roulette (0-36 plus 00=37).
    """
    return random.randint(0, DOUBLE_ZERO)

def calculate_payout(bet_type, selection, winning_number, bet_amount):
    """
    Calculate the payout multiplier and win/loss for a given bet.
    Returns (multiplier, won) where:
      multiplier: the payout multiplier (e.g., 35 for straight up, 2 for dozen, 1 for color)
      won: 1.0 if the bet wins, 0.0 if it loses
    """
    try:
        winning_number = normalize_pocket_value(winning_number)
    except (ValueError, TypeError):
        return 0.0, 0.0

    if bet_type == 'STRAIGHT_UP':
        try:
            selected_number = normalize_pocket_value(selection)
        except (ValueError, TypeError):
            return 0.0, 0.0
        return (35.0, 1.0) if selected_number == winning_number else (0.0, 0.0)

    if bet_type in ['RED', 'BLACK']:
        if winning_number in [0, DOUBLE_ZERO]:
            return 0.0, 0.0

        is_red = winning_number in RED_NUMBERS
        if bet_type == 'RED':
            return (1.0, 1.0) if is_red else (0.0, 0.0)

        return (1.0, 1.0) if not is_red else (0.0, 0.0)

    if bet_type == 'DOZEN':
        try:
            if selection == '1st12':
                low, high = 1, 12
            elif selection == '2nd12':
                low, high = 13, 24
            elif selection == '3rd12':
                low, high = 25, 36
            else:
                low, high = map(int, selection.split('-'))
        except (ValueError, AttributeError):
            return 0.0, 0.0
        if winning_number in [0, DOUBLE_ZERO]:
            return 0.0, 0.0

        return (2.0, 1.0) if low <= winning_number <= high else (0.0, 0.0)

    if bet_type == 'COLUMN':
        if winning_number in [0, DOUBLE_ZERO]:
            return 0.0, 0.0

        winning_numbers = COLUMN_NUMBERS.get(selection)
        if not winning_numbers:
            return 0.0, 0.0

        return (2.0, 1.0) if winning_number in winning_numbers else (0.0, 0.0)

    if bet_type == 'SPLIT':
        try:
            nums = parse_selection_pockets(selection)
        except (ValueError, TypeError):
            return 0.0, 0.0
        return (17.0, 1.0) if winning_number in nums else (0.0, 0.0)

    if bet_type == 'STREET':
        try:
            nums = parse_selection_pockets(selection)
        except (ValueError, TypeError):
            return 0.0, 0.0
        return (11.0, 1.0) if winning_number in nums else (0.0, 0.0)

    if bet_type == 'CORNER':
        try:
            nums = parse_selection_pockets(selection)
        except (ValueError, TypeError):
            return 0.0, 0.0
        return (8.0, 1.0) if winning_number in nums else (0.0, 0.0)

    if bet_type == 'LINE':
        try:
            nums = parse_selection_pockets(selection)
        except (ValueError, TypeError):
            return 0.0, 0.0
        return (5.0, 1.0) if winning_number in nums else (0.0, 0.0)

    if bet_type == 'LO':
        return (1.0, 1.0) if 1 <= winning_number <= 18 else (0.0, 0.0)

    if bet_type == 'HI':
        return (1.0, 1.0) if 19 <= winning_number <= 36 else (0.0, 0.0)

    if bet_type == 'EVEN':
        if winning_number in [0, DOUBLE_ZERO]:
            return 0.0, 0.0
        return (1.0, 1.0) if winning_number % 2 == 0 else (0.0, 0.0)

    if bet_type == 'ODD':
        if winning_number in [0, DOUBLE_ZERO]:
            return 0.0, 0.0
        return (1.0, 1.0) if winning_number % 2 == 1 else (0.0, 0.0)

    return 0.0, 0.0


class GameCycleViewSet(viewsets.ViewSet):
    """
    ViewSet for handling the complete game cycle: placing bets, spinning the wheel,
    and processing payouts in a single atomic transaction.
    """
    
    @transaction.atomic
    def run_round(self, request):
        """Process a complete round of betting and spinning."""
        session_id = request.data.get('session_id')
        bets_data = request.data.get('bets', [])
        
        if not session_id:
            return Response({"error": "Session ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            session = Session.objects.get(session_id=session_id)
            
            # Only process if session is waiting for bets
            if session.status != 'WAITING':
                return Response({"error": "Session is not in WAITING status."}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Process each bet
            processed_bets = []
            for bet_data in bets_data:
                player_id = bet_data.get('player_id')
                bet_type = bet_data.get('bet_type')
                amount = bet_data.get('amount')
                selection = bet_data.get('selection')
                
                if not all([player_id, bet_type, amount, selection]):
                    continue  # Skip invalid bets
                
                # Find or create player
                player, created = Player.objects.get_or_create(
                    session=session,
                    player_unique_id=player_id,
                    defaults={
                        'player_name': f"Player_{player_id}",
                        'current_chips': 1000
                    }
                )
                
                # Create bet record
                bet = Bet.objects.create(
                    player=player,
                    session=session,
                    round_number=session.current_round + 1,
                    bet_type=bet_type,
                    amount=amount,
                    selection=selection
                )
                
                # Deduct bet amount from player's chips
                player.current_chips -= amount
                player.save()
                
                processed_bets.append({
                    'bet_id': bet.id,
                    'player_id': player.player_unique_id,
                    'bet_type': bet_type,
                    'amount': amount,
                    'selection': selection
                })
            
            # Spin the wheel and get winning number
            winning_number = get_winning_number()
            
            # Create history record
            history = History.objects.create(
                session=session,
                round_number=session.current_round + 1,
                winning_number=winning_number,
                payout_multiplier=0.0  # Will be updated below
            )
            
            # Calculate and apply payouts
            total_payout = 0
            for bet_data in bets_data:
                player_id = bet_data.get('player_id')
                bet_type = bet_data.get('bet_type')
                amount = bet_data.get('amount')
                selection = bet_data.get('selection')
                
                if not all([player_id, bet_type, amount, selection]):
                    continue
                
                try:
                    player = Player.objects.get(
                        session=session,
                        player_unique_id=player_id
                    )
                    
                    multiplier, won = calculate_payout(bet_type, selection, winning_number, amount)
                    payout_amount = amount * multiplier if won else 0
                    
                    if won:
                        player.current_chips += (amount + payout_amount)  # Return stake + winnings
                        total_payout += payout_amount
                    
                    player.save()
                except Player.DoesNotExist:
                    continue  # Skip if player not found
            
            # Update history with actual payout multiplier (for simplicity, using average)
            if len(bets_data) > 0:
                history.payout_multiplier = total_payout / len(bets_data)
                history.save()
            
            # Advance session to next round
            session.current_round += 1
            session.status = 'WAITING'  # Reset for next round
            session.save()
            
            return Response({
                "success": True,
                "winning_number": winning_number,
                "winning_label": format_winning_label(winning_number),
                "processed_bets": len(processed_bets),
                "total_payout": total_payout,
                "session_id": str(session.session_id),
                "current_round": session.current_round
            }, status=status.HTTP_200_OK)
            
        except Session.DoesNotExist:
            return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SessionAPIViewSet(viewsets.ViewSet):
    """
    Public API for session management and game play.
    """
    
    def list(self, request):
        """List all sessions."""
        sessions = Session.objects.all().order_by('-created_at')[:10]
        from .serializers import SessionSerializer
        return Response(SessionSerializer(sessions, many=True).data)
    
    def create(self, request):
        """Create a new session."""
        session = Session.objects.create(
            status='WAITING',
            max_players=request.data.get('max_players', 4)
        )
        from .serializers import SessionSerializer
        return Response(SessionSerializer(session).data, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, pk=None):
        """Get a specific session."""
        try:
            session = Session.objects.get(session_id=pk)
            from .serializers import SessionSerializer
            return Response(SessionSerializer(session).data)
        except Session.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
    
    @transaction.atomic
    def place_bets(self, request, pk=None):
        """Place bets for a session."""
        try:
            session = Session.objects.get(session_id=pk)
            bets_data = request.data.get('bets', [])
            
            processed_bets = []
            for bet_data in bets_data:
                player_id = bet_data.get('player_id')
                bet_type = bet_data.get('bet_type')
                amount = bet_data.get('amount')
                selection = bet_data.get('selection')
                
                if not all([player_id, bet_type, amount, selection]):
                    continue
                
                player, created = Player.objects.get_or_create(
                    session=session,
                    player_unique_id=player_id,
                    defaults={'player_name': f"Player_{player_id}", 'current_chips': 1000}
                )
                
                bet = Bet.objects.create(
                    player=player,
                    session=session,
                    round_number=session.current_round + 1,
                    bet_type=bet_type,
                    amount=amount,
                    selection=selection
                )
                
                player.current_chips -= amount
                player.save()
                
                processed_bets.append({
                    'bet_id': bet.id,
                    'bet_type': bet_type,
                    'selection': selection,
                    'amount': amount
                })
            
            return Response({
                'success': True,
                'session_id': str(session.session_id),
                'bets_placed': len(processed_bets),
                'bets': processed_bets
            })
        except Session.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @transaction.atomic
    def run_round(self, request, pk=None):
        """Spin the wheel and calculate payouts."""
        try:
            session = Session.objects.get(session_id=pk)
            winning_number = get_winning_number()
            
            # Get all bets for current round
            bets = Bet.objects.filter(session=session, round_number=session.current_round + 1)
            
            bet_results = []
            total_payout = 0
            player_chips = {}
            
            for bet in bets:
                multiplier, won = calculate_payout(bet.bet_type, bet.selection, winning_number, bet.amount)
                payout = bet.amount * multiplier if won else 0
                
                if won:
                    bet.player.current_chips += (bet.amount + payout)
                    total_payout += payout
                
                bet.player.save()
                
                player_chips[bet.player.player_unique_id] = bet.player.current_chips
                
                bet_results.append({
                    'bet_type': bet.bet_type,
                    'selection': bet.selection,
                    'amount': bet.amount,
                    'payout': payout,
                    'won': won > 0
                })
            
            # Create history
            History.objects.create(
                session=session,
                round_number=session.current_round + 1,
                winning_number=winning_number,
                payout_multiplier=total_payout / len(bets) if len(bets) > 0 else 0
            )
            
            # Update session
            session.current_round += 1
            session.save()
            
            return Response({
                'success': True,
                'session_id': str(session.session_id),
                'round_number': session.current_round,
                'winning_number': winning_number,
                'winning_label': format_winning_label(winning_number),
                'total_payout': total_payout,
                'bet_results': bet_results,
                'player_chips': player_chips
            })
        except Session.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AgentActionViewSet(viewsets.ViewSet):
    """
    Endpoint used by AI agents to perform an action (a bet) in a live or simulated session.
    This acts as the single point of interaction for all autonomous entities.
    """
    # The permission classes should be highly restricted here (e.g., only for Agent accounts)
    permission_classes = []

    @transaction.atomic
    def perform_agent_bet(self, request):
        """Records a single bet placed by an external agent."""
        agent_id = request.data.get('agent_id') # Who is playing
        session_id = request.data.get('session_id')
        bet_type = request.data.get('bet_type')
        amount = request.data.get('amount')
        selection = request.data.get('selection')

        if not all([agent_id, session_id, bet_type, amount, selection]):
            return Response({"error": "Missing required agent bet parameters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = Session.objects.get(session_id=session_id)

            # 1. Find or create the player entry for the agent
            player, created = Player.objects.get_or_create(
                session=session,
                player_unique_id=agent_id, # Use agent_id as the unique player identifier
                defaults={'player_name': f"Agent_{agent_id}", 'current_chips': 1000} # Default starting funds
            )

            # 2. Create the bet record for the current round
            bet_obj = Bet.objects.create(
                player=player,
                session=session,
                round_number=session.current_round + 1,
                bet_type=bet_type,
                amount=amount,
                selection=selection
            )

            # 3. (Optional but recommended): Immediately update the agent's chip balance
            #    to reserve the bet amount, assuming the bet is successful.
            player.current_chips -= amount
            player.save()

            return Response({
                "success": True,
                "message": f"Agent {agent_id} successfully placed a {bet_type} bet of {amount} coins.",
                "new_player_balance": player.current_chips
            }, status=status.HTTP_201_CREATED)

        except Session.DoesNotExist:
            return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
