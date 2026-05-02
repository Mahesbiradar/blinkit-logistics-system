"""
Migration 0002 — Drop old Payment table; create VehicleSettlement.
"""
import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
        ('vehicles', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.DeleteModel(name='Payment'),

        migrations.CreateModel(
            name='VehicleSettlement',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('month_year', models.DateField()),
                ('total_days', models.IntegerField(default=0)),
                ('working_days', models.IntegerField(default=0)),
                ('total_km', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('base_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('absent_penalty_days', models.IntegerField(default=0)),
                ('absent_penalty_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('extra_km_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('total_expenses', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('gross_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('carry_forward_from_previous', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('balance_payable', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('status', models.CharField(
                    choices=[('draft', 'Draft'), ('finalized', 'Finalized'), ('paid', 'Paid')],
                    default='draft',
                    max_length=20,
                )),
                ('paid_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('payment_mode', models.CharField(blank=True, max_length=20)),
                ('transaction_reference', models.CharField(blank=True, max_length=100)),
                ('remarks', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('vehicle', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='settlements',
                    to='vehicles.vehicle',
                )),
                ('paid_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='settlements_paid',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='settlements_created',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Vehicle Settlement',
                'verbose_name_plural': 'Vehicle Settlements',
                'db_table': 'vehicle_settlements',
                'ordering': ['-month_year', '-created_at'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='vehiclesettlement',
            unique_together={('vehicle', 'month_year')},
        ),
        migrations.AddIndex(
            model_name='vehiclesettlement',
            index=models.Index(fields=['status'], name='settlement_status_idx'),
        ),
        migrations.AddIndex(
            model_name='vehiclesettlement',
            index=models.Index(fields=['month_year'], name='settlement_month_year_idx'),
        ),
    ]
