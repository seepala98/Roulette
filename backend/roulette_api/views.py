# app/views.py (Updates - adding AgentView)

# ... (Existing imports and helper functions remain) ...

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
            session = Session.objects.get(id=session_id)

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
