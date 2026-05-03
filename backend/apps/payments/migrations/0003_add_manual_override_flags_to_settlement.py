from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_replace_payment_with_vehicle_settlement'),
    ]

    operations = [
        migrations.AddField(
            model_name='vehiclesettlement',
            name='working_days_manual',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='vehiclesettlement',
            name='total_km_manual',
            field=models.BooleanField(default=False),
        ),
    ]
