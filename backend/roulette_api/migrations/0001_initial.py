# Generated migration file for initial schema
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Session',
            fields=[
                ('session_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('WAITING', 'Waiting for Players'), ('IN_PROGRESS', 'In Progress'), ('PAUSED', 'Paused'), ('FINISHED', 'Finished')], default='WAITING', max_length=50)),
                ('max_players', models.IntegerField(default=4)),
                ('current_round', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'sessions',
                'verbose_name': 'Game Session',
            },
        ),
        migrations.CreateModel(
            name='Player',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('player_unique_id', models.CharField(max_length=100, unique=True)),
                ('player_name', models.CharField(max_length=100)),
                ('initial_budget', models.IntegerField(default=1000)),
                ('current_chips', models.IntegerField(default=1000)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='players', to='roulette_api.session')),
            ],
            options={
                'db_table': 'players',
            },
        ),
        migrations.CreateModel(
            name='Bet',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bet_type', models.CharField(max_length=100)),
                ('amount', models.IntegerField()),
                ('selection', models.CharField(max_length=50)),
                ('player', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bets', to='roulette_api.player')),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='roulette_api.session')),
                ('round_number', models.IntegerField()),
            ],
            options={
                'db_table': 'bets',
                'unique_together': {('player', 'session', 'round_number')},
            },
        ),
        migrations.CreateModel(
            name='History',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('winning_number', models.IntegerField()),
                ('payout_multiplier', models.FloatField(default=0.0)),
                ('round_timestamp', models.DateTimeField(auto_now_add=True)),
                ('round_number', models.IntegerField()),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='history', to='roulette_api.session')),
            ],
            options={
                'db_table': 'history',
                'unique_together': {('session', 'round_number')},
            },
        ),
    ]