from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Q


class Command(BaseCommand):
    help = "Create or repair the default owner and coordinator accounts for local development."

    def handle(self, *args, **options):
        User = get_user_model()

        default_users = [
            {
                "email": "admin@example.com",
                "phone": "9000000000",
                "first_name": "Admin",
                "last_name": "",
                "role": "owner",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "password": "Admin12345",
            },
            {
                "email": "coordinator@example.com",
                "phone": "9000000001",
                "first_name": "Demo",
                "last_name": "Coordinator",
                "role": "coordinator",
                "is_staff": True,
                "is_superuser": False,
                "is_active": True,
                "password": "Coordinator123!",
            },
        ]

        for data in default_users:
            password = data.pop("password")

            user = (
                User.objects.filter(Q(email=data["email"]) | Q(phone=data["phone"]))
                .order_by("created_at")
                .first()
            )

            created = user is None
            if created:
                user = User(**data)
            else:
                for field, value in data.items():
                    setattr(user, field, value)

            user.set_password(password)
            user.save()

            action = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action} {user.role}: {user.email} / {user.phone}"
                )
            )

