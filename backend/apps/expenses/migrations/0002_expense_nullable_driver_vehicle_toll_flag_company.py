import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0001_initial'),
        ('drivers', '0001_initial'),
        ('vehicles', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='expense',
            name='driver',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='expenses',
                to='drivers.driver',
            ),
        ),
        migrations.AlterField(
            model_name='expense',
            name='vehicle',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='expenses',
                to='vehicles.vehicle',
            ),
        ),
        migrations.AlterField(
            model_name='expense',
            name='expense_type',
            field=models.CharField(
                choices=[
                    ('fuel', 'Fuel'),
                    ('toll', 'Toll'),
                    ('advance', 'Advance'),
                    ('allowance', 'Allowance'),
                    ('maintenance', 'Maintenance'),
                    ('other', 'Other'),
                    ('company_management', 'Company / Management'),
                ],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='expense',
            name='is_blinkit_reimbursable',
            field=models.BooleanField(default=False),
        ),
    ]
