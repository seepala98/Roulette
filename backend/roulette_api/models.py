# app/models.py

from django.db import models
from django.contrib.auth.models import User
import uuid

# --- 1. Session Model ---
class Session(models.Model):
    """Manages the unique game instances (boards)."""
    STATUS_CHOICES = [
        ('WAITING', 'Waiting for Players'),
        ('IN_PROGRESS', 'In Progress'),
        ('PAUSED', 'Paused'),
        ('FINISHED', 'Finished'),
    ]
    session_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='WAITING')
    max_players = models.IntegerField(default=4)
    current_round = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sessions'
        verbose_name = "Game Session"

    def __str__(self):
        return f"Session {str(self.session_id)[:8]} ({self.status})"

# --- 2. Player Model ---
class Player(models.Model):
    """Tracks connected players and their chip balances within a session."""
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='players')
    # Using a unique identifier for a player within a session, replacing UUID for simplicity
    player_unique_id = models.CharField(max_length=100, unique=True)
    player_name = models.CharField(max_length=100)
    initial_budget = models.IntegerField(default=1000)
    current_chips = models.IntegerField(default=1000)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'players'

    def __str__(self):
        return f"{self.player_name} in {self.session.session_id}"

# --- 3. Bet Model ---
class Bet(models.Model):
    """Logs every single bet placed by a player in a given round."""
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='bets')
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    round_number = models.IntegerField()
    bet_type = models.CharField(max_length=100) # e.g., 'STRAIGHT_UP', 'RED', 'DOZEN'
    amount = models.IntegerField()
    selection = models.CharField(max_length=50) # e.g., '17', 'RED', '1-6'

    class Meta:
        db_table = 'bets'
        # Enforce unique constraint per player per round
        unique_together = ('player', 'session', 'round_number')
        # Indexing for fast querying of bets for a round
        indexes = [
            models.Index(fields=['session', 'round_number']),
        ]

    def __str__(self):
        return f"{self.player.player_name} bet {self.amount} on {self.selection} (Round {self.round_number})"

# --- 4. History Model ---
class History(models.Model):
    """Records the outcome of each round."""
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='history')
    round_number = models.IntegerField()
    winning_number = models.IntegerField() # 0 through 36
    payout_multiplier = models.FloatField(default=0.0) # e.g., 2.0 for 2:1, 1.0 for 1:1
    round_timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'history'
        # Ensure only one history record per round per session
        unique_together = ('session', 'round_number')
        indexes = [
            models.Index(fields=['session', 'round_number']),
        ]
        verbose_name = "Round History"

    def __str__(self):
        return f"Round {self.round_number} Winner: {self.winning_number}"
