# app/serializers.py

from rest_framework import serializers
from .models import Session, Player, Bet, History

class SessionSerializer(serializers.ModelSerializer):
    # Expose the session UUID and status for client-side identification
    session_uuid = serializers.CharField(source='session_id', read_only=True)

    class Meta:
        model = Session
        fields = ['session_uuid', 'status', 'max_players', 'current_round']

class PlayerSerializer(serializers.ModelSerializer):
    """Serializes player data, useful for updating client-side state."""
    session_uuid = serializers.CharField(source='session.session_id', read_only=True)
    session_status = serializers.CharField(source='session.status', read_only=True)

    class Meta:
        model = Player
        fields = ['player_unique_id', 'player_name', 'initial_budget', 'current_chips', 'session_uuid', 'session_status']

class BetSerializer(serializers.ModelSerializer):
    """Serializes the data required to place a bet."""
    # We accept all necessary bet parameters at the time of the call
    class Meta:
        model = Bet
        fields = ['bet_type', 'amount', 'selection']
        read_only_fields = ['bet_id'] # The ID will be assigned by the server

class RoundResultSerializer(serializers.Serializer):
    """A composite serializer for returning a full round result to the client."""
    winning_number = serializers.IntegerField()
    payout_multiplier = serializers.FloatField()
    round_history = serializers.ListField(child=BetSerializer())
    # Player balances after the round
    updated_players = serializers.ListField(child=PlayerSerializer())
    new_session_status = serializers.CharField()

# Note: We will use action/view methods to handle the complex transaction logic
# rather than relying solely on standard ModelSerializer save() methods.