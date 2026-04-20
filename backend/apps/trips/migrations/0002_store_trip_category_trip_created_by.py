import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trips', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Store',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200, unique=True)),
                ('code', models.CharField(blank=True, max_length=20)),
                ('area', models.CharField(blank=True, max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Store',
                'verbose_name_plural': 'Stores',
                'db_table': 'stores',
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='trip',
            name='trip_category',
            field=models.CharField(
                choices=[('regular', 'Regular'), ('adhoc', 'Adhoc')],
                default='regular',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='trip',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_trips',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
