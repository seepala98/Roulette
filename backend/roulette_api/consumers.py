import json
import uuid
import asyncio
from datetime import datetime, timedelta
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.db import transaction

from .models import Session, Player, Bet, History
from .views import (
    get_winning_number,
    calculate_payout,
    format_winning_label,
    DOUBLE_ZERO,
)

BETTING_TIMER_SECONDS = 50
RESULT_PAUSE_SECONDS = 5


def _get_or_create_player(session, player_unique_id, player_name, initial_budget):
    player, created = Player.objects.get_or_create(
        session=session,
        player_unique_id=player_unique_id,
        defaults={
            "player_name": player_name,
            "initial_budget": initial_budget,
            "current_chips": initial_budget,
        },
    )
    if not created:
        player.player_name = player_name
        player.save()
    return player


def _get_players_data(session):
    return [
        {
            "player_unique_id": p.player_unique_id,
            "player_name": p.player_name,
            "current_chips": p.current_chips,
            "initial_budget": p.initial_budget,
            "ready_to_spin": p.ready_to_spin,
        }
        for p in Player.objects.filter(session=session)
    ]


def _check_all_ready(session):
    players = list(Player.objects.filter(session=session))
    if not players:
        return False
    return all(p.ready_to_spin for p in players)


def _place_bet_db(session, player_unique_id, bet_type, amount, selection):
    with transaction.atomic():
        session.refresh_from_db()
        player = Player.objects.select_for_update().get(
            session=session, player_unique_id=player_unique_id
        )
        if player.current_chips < amount:
            return None, player, False

        round_number = session.current_round + 1
        bet = Bet.objects.create(
            player=player,
            session=session,
            round_number=round_number,
            bet_type=bet_type,
            amount=amount,
            selection=selection,
        )
        player.current_chips -= amount
        player.save()

        started_phase = False
        if not session.betting_phase_active:
            session.betting_phase_active = True
            session.status = "BETTING"
            session.betting_deadline = timezone.now() + timedelta(
                seconds=BETTING_TIMER_SECONDS
            )
            session.save()
            started_phase = True

    return bet, player, started_phase


def _undo_bet_db(session, player_unique_id, bet_id):
    with transaction.atomic():
        try:
            bet = Bet.objects.select_related("player").get(
                id=bet_id,
                player__session=session,
                player__player_unique_id=player_unique_id,
                round_number=session.current_round + 1,
            )
        except Bet.DoesNotExist:
            return None, None
        player = bet.player
        player.current_chips += bet.amount
        player.save()
        bet.delete()
    return bet_id, player


def _clear_bets_db(session, player_unique_id):
    with transaction.atomic():
        round_number = session.current_round + 1
        bets = list(
            Bet.objects.select_related("player").filter(
                player__session=session,
                player__player_unique_id=player_unique_id,
                round_number=round_number,
            )
        )
        total_refund = sum(b.amount for b in bets)
        if bets:
            player = bets[0].player
            player.current_chips += total_refund
            player.save()
            bet_ids = [b.id for b in bets]
            Bet.objects.filter(id__in=bet_ids).delete()
            return bet_ids, player
    return [], None


def _mark_ready_db(session, player_unique_id):
    try:
        player = Player.objects.get(
            session=session, player_unique_id=player_unique_id
        )
    except Player.DoesNotExist:
        return None, False
    player.ready_to_spin = True
    player.save()
    all_ready = _check_all_ready(session)
    return player, all_ready


def _execute_spin_db(session_id):
    with transaction.atomic():
        session = Session.objects.select_for_update().get(session_id=session_id)
        if not session.betting_phase_active:
            return None

        session.betting_phase_active = False
        session.status = "SPINNING"
        session.save()

        round_number = session.current_round + 1
        winning_number = get_winning_number()

        bets = list(
            Bet.objects.select_related("player").filter(
                session=session, round_number=round_number
            )
        )

        player_winnings = {}
        bet_results = []
        total_payout = 0

        for bet in bets:
            multiplier, won = calculate_payout(
                bet.bet_type, bet.selection, winning_number, bet.amount
            )
            payout = int(bet.amount * multiplier) if won else 0

            pid = bet.player.player_unique_id
            if pid not in player_winnings:
                player_winnings[pid] = 0

            if won:
                player_winnings[pid] += bet.amount + payout
                total_payout += payout

            bet_results.append({
                "bet_id": bet.id,
                "player_unique_id": pid,
                "bet_type": bet.bet_type,
                "selection": bet.selection,
                "amount": bet.amount,
                "payout": payout,
                "won": bool(won),
            })

        player_chips = {}
        for pid, winnings in player_winnings.items():
            player = Player.objects.select_for_update().get(
                session=session, player_unique_id=pid
            )
            player.current_chips += winnings
            player.save()
            player_chips[pid] = player.current_chips

        History.objects.create(
            session=session,
            round_number=round_number,
            winning_number=winning_number,
            payout_multiplier=total_payout / len(bets) if bets else 0,
        )

        session.current_round += 1
        session.status = "WAITING"
        session.save()

        for player in Player.objects.filter(session=session):
            player.ready_to_spin = False
            player.save()

        players_data = _get_players_data(session)

        return {
            "winning_number": winning_number,
            "winning_label": format_winning_label(winning_number),
            "round_number": round_number,
            "total_payout": total_payout,
            "bet_results": bet_results,
            "player_chips": player_chips,
            "players": players_data,
            "current_round": session.current_round,
        }


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.group_name = f"session_{self.session_id}"

        exists = await database_sync_to_async(
            Session.objects.filter(session_id=self.session_id).exists
        )()
        if not exists:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")
        handler = getattr(self, f"handle_{msg_type}", None)
        if handler:
            await handler(data)

    async def handle_join_session(self, data):
        player_name = data.get("player_name", "Anonymous")
        initial_budget = int(data.get("initial_budget", 1000))
        player_unique_id = data.get("player_unique_id")

        if not player_unique_id:
            player_unique_id = str(uuid.uuid4())

        session = await database_sync_to_async(Session.objects.get)(
            session_id=self.session_id
        )
        player = await database_sync_to_async(_get_or_create_player)(
            session, player_unique_id, player_name, initial_budget
        )
        players_data = await database_sync_to_async(_get_players_data)(session)

        await self.send(json.dumps({
            "type": "joined_session",
            "player_unique_id": player.player_unique_id,
            "player_name": player.player_name,
            "current_chips": player.current_chips,
            "players": players_data,
            "session_status": session.status,
            "current_round": session.current_round,
            "betting_phase_active": session.betting_phase_active,
        }))

        await self.channel_layer.group_send(self.group_name, {
            "type": "player_joined",
            "player_unique_id": player.player_unique_id,
            "player_name": player.player_name,
            "players": players_data,
        })

    async def handle_place_bet(self, data):
        player_unique_id = data.get("player_unique_id")
        bet_type = data.get("bet_type")
        amount = int(data.get("amount", 0))
        selection = data.get("selection")

        if not all([player_unique_id, bet_type, amount, selection]):
            await self.send(json.dumps({"type": "error", "message": "Missing bet fields"}))
            return

        session = await database_sync_to_async(Session.objects.get)(
            session_id=self.session_id
        )

        result = await database_sync_to_async(_place_bet_db)(
            session, player_unique_id, bet_type, amount, selection
        )

        if result[0] is None:
            await self.send(json.dumps({"type": "error", "message": "Insufficient chips"}))
            return

        bet, player, started_phase = result

        await self.send(json.dumps({
            "type": "bet_placed",
            "bet_id": bet.id,
            "bet_type": bet_type,
            "selection": selection,
            "amount": amount,
            "current_chips": player.current_chips,
        }))

        await self.channel_layer.group_send(self.group_name, {
            "type": "broadcast_bet",
            "player_unique_id": player_unique_id,
            "player_name": player.player_name,
            "bet_type": bet_type,
            "selection": selection,
            "amount": amount,
        })

        if started_phase:
            asyncio.ensure_future(self._run_betting_timer())

    async def handle_undo_bet(self, data):
        player_unique_id = data.get("player_unique_id")
        bet_id = data.get("bet_id")

        if not bet_id or not player_unique_id:
            return

        session = await database_sync_to_async(Session.objects.get)(
            session_id=self.session_id
        )
        removed_id, player = await database_sync_to_async(_undo_bet_db)(
            session, player_unique_id, bet_id
        )

        if removed_id:
            await self.send(json.dumps({
                "type": "bet_undone",
                "bet_id": removed_id,
                "current_chips": player.current_chips,
            }))

            await self.channel_layer.group_send(self.group_name, {
                "type": "broadcast_bet_removed",
                "player_unique_id": player_unique_id,
                "bet_id": removed_id,
            })

    async def handle_clear_bets(self, data):
        player_unique_id = data.get("player_unique_id")

        session = await database_sync_to_async(Session.objects.get)(
            session_id=self.session_id
        )
        bet_ids, player = await database_sync_to_async(_clear_bets_db)(
            session, player_unique_id
        )

        if player:
            await self.send(json.dumps({
                "type": "bets_cleared",
                "bet_ids": bet_ids,
                "current_chips": player.current_chips,
            }))

            for bid in bet_ids:
                await self.channel_layer.group_send(self.group_name, {
                    "type": "broadcast_bet_removed",
                    "player_unique_id": player_unique_id,
                    "bet_id": bid,
                })

    async def handle_player_ready(self, data):
        player_unique_id = data.get("player_unique_id")

        session = await database_sync_to_async(Session.objects.get)(
            session_id=self.session_id
        )
        player, all_ready = await database_sync_to_async(_mark_ready_db)(
            session, player_unique_id
        )

        if player is None:
            return

        await self.channel_layer.group_send(self.group_name, {
            "type": "player_ready_broadcast",
            "player_unique_id": player.player_unique_id,
            "all_ready": all_ready,
        })

        if all_ready:
            await self._execute_spin()

    async def _run_betting_timer(self):
        for _ in range(BETTING_TIMER_SECONDS + 5):
            session = await database_sync_to_async(Session.objects.get)(
                session_id=self.session_id
            )
            if not session.betting_phase_active:
                return

            deadline = session.betting_deadline
            if not deadline:
                return

            now = timezone.now()
            remaining = int((deadline - now).total_seconds())

            if remaining <= 0:
                await self._execute_spin()
                return

            await self.channel_layer.group_send(self.group_name, {
                "type": "timer_tick",
                "seconds_remaining": remaining,
            })
            await asyncio.sleep(1)

    async def _execute_spin(self):
        try:
            result = await database_sync_to_async(_execute_spin_db)(self.session_id)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return

        if result is None:
            return

        await self.channel_layer.group_send(self.group_name, {
            "type": "spin_result",
            "winning_number": result["winning_number"],
            "winning_label": result["winning_label"],
            "round_number": result["round_number"],
            "total_payout": result["total_payout"],
            "bet_results": result["bet_results"],
            "player_chips": result["player_chips"],
            "players": result["players"],
        })

        await asyncio.sleep(RESULT_PAUSE_SECONDS)

        await self.channel_layer.group_send(self.group_name, {
            "type": "new_round",
            "current_round": result["current_round"],
        })

    async def player_joined(self, event):
        await self.send(json.dumps({
            "type": "player_joined",
            "player_unique_id": event["player_unique_id"],
            "player_name": event["player_name"],
            "players": event["players"],
        }))

    async def broadcast_bet(self, event):
        await self.send(json.dumps({
            "type": "bet_broadcast",
            "player_unique_id": event["player_unique_id"],
            "player_name": event["player_name"],
            "bet_type": event["bet_type"],
            "selection": event["selection"],
            "amount": event["amount"],
        }))

    async def broadcast_bet_removed(self, event):
        await self.send(json.dumps({
            "type": "bet_removed",
            "player_unique_id": event["player_unique_id"],
            "bet_id": event["bet_id"],
        }))

    async def player_ready_broadcast(self, event):
        await self.send(json.dumps({
            "type": "player_ready",
            "player_unique_id": event["player_unique_id"],
            "all_ready": event["all_ready"],
        }))

    async def timer_tick(self, event):
        await self.send(json.dumps({
            "type": "timer_tick",
            "seconds_remaining": event["seconds_remaining"],
        }))

    async def spin_result(self, event):
        await self.send(json.dumps({
            "type": "spin_result",
            "winning_number": event["winning_number"],
            "winning_label": event["winning_label"],
            "round_number": event["round_number"],
            "total_payout": event["total_payout"],
            "bet_results": event["bet_results"],
            "player_chips": event["player_chips"],
            "players": event["players"],
        }))

    async def new_round(self, event):
        await self.send(json.dumps({
            "type": "new_round",
            "current_round": event["current_round"],
        }))
