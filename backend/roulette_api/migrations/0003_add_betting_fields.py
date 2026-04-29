from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('roulette_api', '0002_remove_bet_unique_constraint'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='betting_deadline',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='session',
            name='betting_phase_active',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='player',
            name='ready_to_spin',
            field=models.BooleanField(default=False),
        ),
    ]
