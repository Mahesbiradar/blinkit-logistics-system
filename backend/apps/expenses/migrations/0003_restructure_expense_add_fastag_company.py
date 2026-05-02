"""
Migration 0003 — Restructure Expense, add FastagRecord and CompanyExpense.

Changes to Expense:
  REMOVE: driver, trip, is_deducted, deducted_at, is_blinkit_reimbursable
  ADD:    expense_time, paid_to_name, paid_to_number, month_year
  CHANGE: expense_type choices (12 new), expense_type max_length 20→30
  CHANGE: payment_mode choices (6 new)
  CHANGE: vehicle non-nullable
  CHANGE: created_by related_name → 'expenses_created'

ADD:   FastagRecord (standalone Fastag ledger)
ADD:   CompanyExpense (company overhead, no vehicle FK)
"""
import uuid
from datetime import date

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def derive_month_year(apps, schema_editor):
    """Set month_year = first day of expense_date's month for existing rows."""
    Expense = apps.get_model('expenses', 'Expense')
    for expense in Expense.objects.all():
        expense.month_year = date(expense.expense_date.year, expense.expense_date.month, 1)
        expense.save(update_fields=['month_year'])


def set_default_payment_mode(apps, schema_editor):
    """Set payment_mode='other' on any rows where it is blank (old model allowed blank)."""
    Expense = apps.get_model('expenses', 'Expense')
    Expense.objects.filter(payment_mode='').update(payment_mode='other')


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0002_expense_nullable_driver_vehicle_toll_flag_company'),
        ('vehicles', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── Remove dropped fields ──────────────────────────────────────────────
        migrations.RemoveField(model_name='expense', name='driver'),
        migrations.RemoveField(model_name='expense', name='trip'),
        migrations.RemoveField(model_name='expense', name='is_deducted'),
        migrations.RemoveField(model_name='expense', name='deducted_at'),
        migrations.RemoveField(model_name='expense', name='is_blinkit_reimbursable'),

        # ── Delete old company_management rows (vehicle IS NULL) ───────────────
        migrations.RunSQL(
            "DELETE FROM expenses WHERE vehicle_id IS NULL",
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ── Fix blank payment_mode before making it required ───────────────────
        migrations.RunPython(set_default_payment_mode, reverse_code=migrations.RunPython.noop),

        # ── Make vehicle non-nullable ──────────────────────────────────────────
        migrations.AlterField(
            model_name='expense',
            name='vehicle',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='expenses',
                to='vehicles.vehicle',
            ),
        ),

        # ── Update expense_type (new choices, max_length 20→30) ───────────────
        migrations.AlterField(
            model_name='expense',
            name='expense_type',
            field=models.CharField(
                choices=[
                    ('diesel', 'Diesel'),
                    ('driver_advance', 'Driver Advance'),
                    ('driver_payment', 'Driver Payment'),
                    ('emi', 'EMI'),
                    ('fastag_recharge', 'Fastag Recharge'),
                    ('adhoc_driver', 'Adhoc Driver'),
                    ('repair', 'Repair'),
                    ('accident', 'Accident'),
                    ('fine', 'Fine'),
                    ('food', 'Food'),
                    ('penalty', 'Penalty'),
                    ('other', 'Other'),
                ],
                max_length=30,
            ),
        ),

        # ── Update payment_mode choices ────────────────────────────────────────
        migrations.AlterField(
            model_name='expense',
            name='payment_mode',
            field=models.CharField(
                choices=[
                    ('phonepay', 'PhonePe'),
                    ('kiwi', 'Kiwi'),
                    ('amazon_pay', 'Amazon Pay'),
                    ('whatsapp', 'WhatsApp Pay'),
                    ('cash', 'Cash'),
                    ('other', 'Other'),
                ],
                max_length=20,
            ),
        ),

        # ── Update created_by related_name ────────────────────────────────────
        migrations.AlterField(
            model_name='expense',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='expenses_created',
                to=settings.AUTH_USER_MODEL,
            ),
        ),

        # ── Add new fields ─────────────────────────────────────────────────────
        migrations.AddField(
            model_name='expense',
            name='expense_time',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='expense',
            name='paid_to_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='expense',
            name='paid_to_number',
            field=models.CharField(blank=True, max_length=50),
        ),
        # month_year: add as nullable first, populate, then make non-nullable
        migrations.AddField(
            model_name='expense',
            name='month_year',
            field=models.DateField(null=True),
        ),
        migrations.RunPython(derive_month_year, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='expense',
            name='month_year',
            field=models.DateField(),
        ),

        # ── Update Expense indexes ─────────────────────────────────────────────
        migrations.AddIndex(
            model_name='expense',
            index=models.Index(fields=['vehicle', 'month_year'], name='expense_vehicle_month_idx'),
        ),

        # ── Create FastagRecord ────────────────────────────────────────────────
        migrations.CreateModel(
            name='FastagRecord',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('month_year', models.DateField()),
                ('opening_balance', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('fastag_recharged_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('fastag_debited_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('closing_balance', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('statement_submitted_at', models.DateTimeField(blank=True, null=True)),
                ('statement_image', models.ImageField(blank=True, null=True, upload_to='fastag/statements/%Y/%m/')),
                ('status', models.CharField(
                    choices=[('open', 'Open'), ('submitted', 'Submitted'), ('closed', 'Closed')],
                    default='open',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('vehicle', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='fastag_records',
                    to='vehicles.vehicle',
                )),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='fastag_records_created',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('updated_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='fastag_records_updated',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Fastag Record',
                'verbose_name_plural': 'Fastag Records',
                'db_table': 'fastag_records',
                'ordering': ['-month_year'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='fastagrecord',
            unique_together={('vehicle', 'month_year')},
        ),
        migrations.AddIndex(
            model_name='fastagrecord',
            index=models.Index(fields=['month_year'], name='fastag_month_year_idx'),
        ),
        migrations.AddIndex(
            model_name='fastagrecord',
            index=models.Index(fields=['status'], name='fastag_status_idx'),
        ),

        # ── Create CompanyExpense ──────────────────────────────────────────────
        migrations.CreateModel(
            name='CompanyExpense',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('expense_date', models.DateField()),
                ('expense_time', models.TimeField(blank=True, null=True)),
                ('expense_type', models.CharField(
                    choices=[
                        ('coordinator_salary', 'Coordinator Salary'),
                        ('room_rent', 'Room Rent'),
                        ('spare_driver', 'Spare Driver'),
                        ('food', 'Food'),
                        ('advance', 'Advance'),
                        ('flipkart', 'Flipkart'),
                        ('other', 'Other'),
                    ],
                    max_length=30,
                )),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('payment_mode', models.CharField(
                    choices=[
                        ('phonepay', 'PhonePe'),
                        ('kiwi', 'Kiwi'),
                        ('amazon_pay', 'Amazon Pay'),
                        ('whatsapp', 'WhatsApp Pay'),
                        ('cash', 'Cash'),
                        ('other', 'Other'),
                    ],
                    max_length=20,
                )),
                ('paid_to_name', models.CharField(blank=True, max_length=200)),
                ('paid_to_number', models.CharField(blank=True, max_length=50)),
                ('month_year', models.DateField()),
                ('remarks', models.TextField(blank=True)),
                ('receipt_image', models.ImageField(blank=True, null=True, upload_to='company_expenses/%Y/%m/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='company_expenses_created',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Company Expense',
                'verbose_name_plural': 'Company Expenses',
                'db_table': 'company_expenses',
                'ordering': ['-expense_date', '-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='companyexpense',
            index=models.Index(fields=['expense_type', 'month_year'], name='co_exp_type_month_idx'),
        ),
        migrations.AddIndex(
            model_name='companyexpense',
            index=models.Index(fields=['month_year'], name='co_exp_month_year_idx'),
        ),
        migrations.AddIndex(
            model_name='companyexpense',
            index=models.Index(fields=['expense_date'], name='co_exp_date_idx'),
        ),
    ]
