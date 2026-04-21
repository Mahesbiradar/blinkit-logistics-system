"""
Unit Tests for Trip Management Module
Covers: models, serializers, views, permissions
"""
import io
from datetime import timedelta
from decimal import Decimal

import jwt
from django.conf import settings
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.drivers.models import Driver, DriverVehicleMapping
from apps.vehicles.models import Vehicle
from .models import Store, Trip


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_image_file(name="test.jpg", fmt="JPEG"):
    """Return an in-memory JPEG suitable for upload."""
    buf = io.BytesIO()
    img = Image.new("RGB", (10, 10), color=(100, 100, 100))
    img.save(buf, format=fmt)
    buf.seek(0)
    buf.name = name
    return buf


def today():
    return timezone.now().date()


def yesterday():
    return today() - timedelta(days=1)


def _make_jwt(user):
    """Generate a valid access token using the project's custom JWT settings."""
    payload = {
        "user_id": str(user.id),
        "type": "access",
        "exp": timezone.now() + settings.JWT_SETTINGS["ACCESS_TOKEN_LIFETIME"],
    }
    return jwt.encode(
        payload,
        settings.JWT_SETTINGS["SIGNING_KEY"],
        algorithm=settings.JWT_SETTINGS["ALGORITHM"],
    )


class BaseSetup(APITestCase):
    """
    Creates the common fixtures used by most test cases:
      - owner user + coordinator user + driver user
      - vehicle + vendor
      - driver profile + vehicle mapping
      - store
    """

    @classmethod
    def setUpTestData(cls):
        # Owner
        cls.owner_user = User.objects.create_user(
            phone="9000000001",
            password="pass123",
            first_name="Owner",
            role="owner",
        )
        # Coordinator
        cls.coord_user = User.objects.create_user(
            phone="9000000002",
            password="pass123",
            first_name="Coord",
            role="coordinator",
        )
        # Driver user
        cls.driver_user = User.objects.create_user(
            phone="9000000003",
            password="pass123",
            first_name="Driver",
            role="driver",
        )
        # Second driver user (no vehicle)
        cls.driver_user2 = User.objects.create_user(
            phone="9000000004",
            password="pass123",
            first_name="Driver2",
            role="driver",
        )

        # Vehicle
        cls.vehicle = Vehicle.objects.create(
            vehicle_number="MH12AB1234",
            vehicle_type="pickup",
            owner_type="owner",
            base_salary=Decimal("15000.00"),
        )

        # Driver profile
        cls.driver = Driver.objects.create(
            user=cls.driver_user,
            license_number="DL1234",
            is_active=True,
        )
        # Driver2 profile (no vehicle mapping)
        cls.driver2 = Driver.objects.create(
            user=cls.driver_user2,
            license_number="DL5678",
            is_active=True,
        )

        # Primary mapping
        cls.mapping = DriverVehicleMapping.objects.create(
            driver=cls.driver,
            vehicle=cls.vehicle,
            is_primary=True,
        )

        # Store
        cls.store = Store.objects.create(name="Store Alpha", code="SA", area="North")

    def _auth(self, user):
        """Set JWT auth header for given user."""
        token = _make_jwt(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _make_trip(self, driver=None, vehicle=None, trip_date=None, status="pending",
                   store_name_1="Store Alpha", one_way_km_1=Decimal("10.00"),
                   created_by=None, **kwargs):
        driver = driver or self.driver
        vehicle = vehicle or self.vehicle
        trip_date = trip_date or yesterday()
        return Trip.objects.create(
            driver=driver,
            vehicle=vehicle,
            trip_date=trip_date,
            store_name_1=store_name_1,
            one_way_km_1=one_way_km_1,
            status=status,
            created_by=created_by,
            **kwargs,
        )


# ---------------------------------------------------------------------------
# Model Tests
# ---------------------------------------------------------------------------

class TripModelTest(BaseSetup):

    def test_total_km_calculated_on_save_single_store(self):
        trip = self._make_trip()
        # one_way_km_1=10 → total = 10*2 = 20
        self.assertEqual(trip.total_km, Decimal("20.00"))

    def test_total_km_calculated_on_save_two_stores(self):
        trip = self._make_trip(
            one_way_km_1=Decimal("10.00"),
            store_name_2="Store Beta",
            one_way_km_2=Decimal("5.00"),
        )
        # 10*2 + 5*2 = 30
        self.assertEqual(trip.total_km, Decimal("30.00"))

    def test_total_km_zero_when_no_km(self):
        trip = Trip.objects.create(
            driver=self.driver,
            vehicle=self.vehicle,
            trip_date=yesterday(),
            store_name_1="Store Alpha",
            one_way_km_1=None,
        )
        self.assertEqual(trip.total_km, Decimal("0"))

    def test_approve_sets_status_and_approved_by(self):
        trip = self._make_trip()
        trip.approve(self.owner_user)
        trip.refresh_from_db()
        self.assertEqual(trip.status, "approved")
        self.assertEqual(trip.approved_by, self.owner_user)
        self.assertIsNotNone(trip.approved_at)

    def test_reject_sets_status_and_reason(self):
        trip = self._make_trip()
        trip.reject(self.owner_user, reason="Wrong KM")
        trip.refresh_from_db()
        self.assertEqual(trip.status, "rejected")
        self.assertEqual(trip.rejection_reason, "Wrong KM")

    def test_has_trip1_true(self):
        trip = self._make_trip()
        self.assertTrue(trip.has_trip1())

    def test_has_trip1_false_when_missing_km(self):
        trip = Trip.objects.create(
            driver=self.driver,
            vehicle=self.vehicle,
            trip_date=yesterday(),
            store_name_1="Store Alpha",
            one_way_km_1=None,
        )
        self.assertFalse(trip.has_trip1())

    def test_has_trip2_false_when_no_second_store(self):
        trip = self._make_trip()
        self.assertFalse(trip.has_trip2())

    def test_has_trip2_true(self):
        trip = self._make_trip(
            store_name_2="Store Beta",
            one_way_km_2=Decimal("8.00"),
        )
        self.assertTrue(trip.has_trip2())

    def test_get_trip1_km_returns_round_trip(self):
        trip = self._make_trip(one_way_km_1=Decimal("15.00"))
        self.assertEqual(float(trip.get_trip1_km()), 30.0)

    def test_get_pending_trips_classmethod(self):
        trip = self._make_trip(status="pending")
        pending = Trip.get_pending_trips()
        self.assertIn(trip, pending)

    def test_get_driver_trips_for_date(self):
        trip = self._make_trip(trip_date=yesterday())
        trips = Trip.get_driver_trips_for_date(self.driver, yesterday())
        self.assertIn(trip, trips)

    def test_str_representation(self):
        trip = self._make_trip()
        self.assertIn(str(self.driver), str(trip))

    def test_default_status_is_pending(self):
        trip = self._make_trip()
        self.assertEqual(trip.status, "pending")

    def test_default_category_is_regular(self):
        trip = self._make_trip()
        self.assertEqual(trip.trip_category, "regular")


class StoreModelTest(TestCase):

    def test_store_creation(self):
        store = Store.objects.create(name="Test Store", code="TS", area="South")
        self.assertEqual(str(store), "Test Store")
        self.assertTrue(store.is_active)

    def test_store_ordering_by_name(self):
        Store.objects.create(name="Zeta Store")
        Store.objects.create(name="Alpha Store")
        names = list(Store.objects.values_list("name", flat=True))
        self.assertEqual(names, sorted(names))


# ---------------------------------------------------------------------------
# Trip API Tests — List / Create (Admin)
# ---------------------------------------------------------------------------

class TripListCreateViewTest(BaseSetup):

    def test_admin_can_list_trips(self):
        self._make_trip()
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("trips", response.data["data"])

    def test_coordinator_can_list_trips(self):
        self._make_trip()
        self._auth(self.coord_user)
        url = reverse("trip-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_driver_cannot_list_all_trips(self):
        self._auth(self.driver_user)
        url = reverse("trip-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_list_trips(self):
        url = reverse("trip-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_filter_by_status(self):
        self._make_trip(status="pending")
        self._make_trip(status="approved")
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        response = self.client.get(url, {"status": "pending"})
        trips = response.data["data"]["trips"]
        self.assertTrue(all(t["status"] == "pending" for t in trips))

    def test_filter_by_start_date(self):
        self._make_trip(trip_date=yesterday())
        self._make_trip(trip_date=yesterday() - timedelta(days=5))
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        response = self.client.get(url, {"start_date": str(yesterday())})
        trips = response.data["data"]["trips"]
        self.assertTrue(all(t["trip_date"] >= str(yesterday()) for t in trips))

    def test_filter_by_end_date(self):
        self._make_trip(trip_date=yesterday())
        two_days_ago = yesterday() - timedelta(days=1)
        self._make_trip(trip_date=two_days_ago)
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        response = self.client.get(url, {"end_date": str(two_days_ago)})
        trips = response.data["data"]["trips"]
        self.assertTrue(all(t["trip_date"] <= str(two_days_ago) for t in trips))

    def test_admin_can_create_trip_with_vehicle(self):
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "12.50",
            "trip_category": "regular",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])

    def test_admin_created_trip_is_auto_approved(self):
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "12.50",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        trip_id = response.data["data"]["id"]
        trip = Trip.objects.get(id=trip_id)
        self.assertEqual(trip.status, "approved")
        self.assertEqual(trip.approved_by, self.owner_user)

    def test_coordinator_created_trip_is_auto_approved(self):
        self._auth(self.coord_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "12.50",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        trip = Trip.objects.get(id=response.data["data"]["id"])
        self.assertEqual(trip.status, "approved")

    def test_driver_created_trip_remains_pending(self):
        self._auth(self.driver_user)
        url = reverse("trip-list-create")
        data = {
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "12.50",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        trip = Trip.objects.get(id=response.data["data"]["id"])
        self.assertEqual(trip.status, "pending")

    def test_create_trip_requires_at_least_one_store(self):
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(yesterday()),
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_trip_future_date_rejected(self):
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(today() + timedelta(days=1)),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "12.50",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_trip_km_must_be_positive(self):
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "-5",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_trip_store_without_km_rejected(self):
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_vehicle_without_driver_raises_error(self):
        vehicle_no_driver = Vehicle.objects.create(
            vehicle_number="MH12ZZ9999",
            vehicle_type="pickup",
            owner_type="owner",
        )
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(vehicle_no_driver.id),
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "10.00",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_trip_with_two_stores(self):
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "10.00",
            "store_name_2": "Store Beta",
            "one_way_km_2": "8.00",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        trip = Trip.objects.get(id=response.data["data"]["id"])
        self.assertEqual(trip.total_km, Decimal("36.00"))

    def test_driver_no_vehicle_assignment_rejected(self):
        self._auth(self.driver_user2)
        url = reverse("trip-list-create")
        data = {
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "10.00",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Trip Detail / Update / Delete
# ---------------------------------------------------------------------------

class TripDetailViewTest(BaseSetup):

    def test_owner_can_retrieve_any_trip(self):
        trip = self._make_trip()
        self._auth(self.owner_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data["data"]["id"]), str(trip.id))

    def test_driver_can_retrieve_own_trip(self):
        trip = self._make_trip()
        self._auth(self.driver_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_driver_cannot_retrieve_other_driver_trip(self):
        other_driver_user = User.objects.create_user(
            phone="9000000010", password="pass", first_name="Other", role="driver"
        )
        other_driver = Driver.objects.create(user=other_driver_user, is_active=True)
        other_vehicle = Vehicle.objects.create(
            vehicle_number="MH12XY0001", vehicle_type="pickup", owner_type="owner"
        )
        DriverVehicleMapping.objects.create(driver=other_driver, vehicle=other_vehicle, is_primary=True)
        trip = Trip.objects.create(
            driver=other_driver, vehicle=other_vehicle,
            trip_date=yesterday(), store_name_1="X", one_way_km_1=Decimal("5"),
        )
        self._auth(self.driver_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_update_any_trip(self):
        trip = self._make_trip(status="pending")
        self._auth(self.owner_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.patch(url, {"remarks": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_driver_can_update_own_pending_trip(self):
        trip = self._make_trip(status="pending")
        self._auth(self.driver_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.patch(url, {"remarks": "Driver update"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_driver_cannot_update_approved_trip(self):
        trip = self._make_trip(status="approved")
        self._auth(self.driver_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.patch(url, {"remarks": "Trying to update"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_driver_cannot_update_rejected_trip(self):
        trip = self._make_trip(status="rejected")
        self._auth(self.driver_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.patch(url, {"remarks": "Trying"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_driver_cannot_update_other_driver_pending_trip(self):
        other_driver_user = User.objects.create_user(
            phone="9000000011", password="pass", first_name="OtherD", role="driver"
        )
        other_driver = Driver.objects.create(user=other_driver_user, is_active=True)
        other_vehicle = Vehicle.objects.create(
            vehicle_number="MH12XY0002", vehicle_type="pickup", owner_type="owner"
        )
        DriverVehicleMapping.objects.create(driver=other_driver, vehicle=other_vehicle, is_primary=True)
        trip = Trip.objects.create(
            driver=other_driver, vehicle=other_vehicle,
            trip_date=yesterday(), store_name_1="X", one_way_km_1=Decimal("5"),
            status="pending",
        )
        self._auth(self.driver_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.patch(url, {"remarks": "Hacking"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_trip_category_is_persisted(self):
        trip = self._make_trip(status="pending", trip_category="regular")
        self._auth(self.owner_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.patch(url, {"trip_category": "adhoc"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        trip.refresh_from_db()
        self.assertEqual(trip.trip_category, "adhoc")

    def test_update_store_km_recalculates_total_km(self):
        trip = self._make_trip(one_way_km_1=Decimal("10.00"))
        self._auth(self.owner_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.patch(url, {"one_way_km_1": "20.00"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        trip.refresh_from_db()
        self.assertEqual(trip.total_km, Decimal("40.00"))

    def test_owner_can_delete_any_trip(self):
        trip = self._make_trip()
        self._auth(self.owner_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Trip.objects.filter(id=trip.id).exists())

    def test_driver_can_delete_own_pending_trip(self):
        trip = self._make_trip(status="pending")
        self._auth(self.driver_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Trip.objects.filter(id=trip.id).exists())

    def test_driver_cannot_delete_approved_trip(self):
        trip = self._make_trip(status="approved")
        self._auth(self.driver_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Trip.objects.filter(id=trip.id).exists())

    def test_driver_cannot_delete_other_driver_trip(self):
        other_driver_user = User.objects.create_user(
            phone="9000000012", password="pass", first_name="OD2", role="driver"
        )
        other_driver = Driver.objects.create(user=other_driver_user, is_active=True)
        other_vehicle = Vehicle.objects.create(
            vehicle_number="MH12XY0003", vehicle_type="pickup", owner_type="owner"
        )
        DriverVehicleMapping.objects.create(driver=other_driver, vehicle=other_vehicle, is_primary=True)
        trip = Trip.objects.create(
            driver=other_driver, vehicle=other_vehicle,
            trip_date=yesterday(), store_name_1="X", one_way_km_1=Decimal("5"),
            status="pending",
        )
        self._auth(self.driver_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_trip_not_found_returns_404(self):
        import uuid
        self._auth(self.owner_user)
        url = reverse("trip-detail", kwargs={"pk": uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# Approve / Reject
# ---------------------------------------------------------------------------

class TripApproveRejectTest(BaseSetup):

    def test_owner_can_approve_pending_trip(self):
        trip = self._make_trip(status="pending")
        self._auth(self.owner_user)
        url = reverse("trip-approve", kwargs={"pk": trip.id})
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        trip.refresh_from_db()
        self.assertEqual(trip.status, "approved")

    def test_coordinator_can_approve_pending_trip(self):
        trip = self._make_trip(status="pending")
        self._auth(self.coord_user)
        url = reverse("trip-approve", kwargs={"pk": trip.id})
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_driver_cannot_approve_trip(self):
        trip = self._make_trip(status="pending")
        self._auth(self.driver_user)
        url = reverse("trip-approve", kwargs={"pk": trip.id})
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_approve_already_approved_trip_returns_400(self):
        trip = self._make_trip(status="approved")
        self._auth(self.owner_user)
        url = reverse("trip-approve", kwargs={"pk": trip.id})
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approve_with_remarks(self):
        trip = self._make_trip(status="pending")
        self._auth(self.owner_user)
        url = reverse("trip-approve", kwargs={"pk": trip.id})
        response = self.client.post(url, {"remarks": "Looks good"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        trip.refresh_from_db()
        self.assertEqual(trip.remarks, "Looks good")

    def test_owner_can_reject_pending_trip(self):
        trip = self._make_trip(status="pending")
        self._auth(self.owner_user)
        url = reverse("trip-reject", kwargs={"pk": trip.id})
        response = self.client.post(url, {"rejection_reason": "Invalid KM"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        trip.refresh_from_db()
        self.assertEqual(trip.status, "rejected")
        self.assertEqual(trip.rejection_reason, "Invalid KM")

    def test_reject_requires_reason(self):
        trip = self._make_trip(status="pending")
        self._auth(self.owner_user)
        url = reverse("trip-reject", kwargs={"pk": trip.id})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_already_rejected_trip_returns_400(self):
        trip = self._make_trip(status="rejected")
        self._auth(self.owner_user)
        url = reverse("trip-reject", kwargs={"pk": trip.id})
        response = self.client.post(url, {"rejection_reason": "reason"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approve_nonexistent_trip_returns_404(self):
        import uuid
        self._auth(self.owner_user)
        url = reverse("trip-approve", kwargs={"pk": uuid.uuid4()})
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# My Trips (Driver-specific)
# ---------------------------------------------------------------------------

class MyTripsViewTest(BaseSetup):

    def test_driver_can_get_own_trips(self):
        self._make_trip(status="approved")
        self._make_trip(status="pending")
        self._auth(self.driver_user)
        url = reverse("my-trips")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("trips", response.data["data"])
        self.assertIn("summary", response.data["data"])

    def test_non_driver_cannot_access_my_trips(self):
        self._auth(self.owner_user)
        url = reverse("my-trips")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_driver_only_sees_own_trips(self):
        own_trip = self._make_trip()
        # Create another driver's trip
        other_user = User.objects.create_user(
            phone="9000000020", password="pass", first_name="OD", role="driver"
        )
        other_driver = Driver.objects.create(user=other_user, is_active=True)
        other_vehicle = Vehicle.objects.create(
            vehicle_number="MH12YY0001", vehicle_type="pickup", owner_type="owner"
        )
        DriverVehicleMapping.objects.create(driver=other_driver, vehicle=other_vehicle, is_primary=True)
        Trip.objects.create(
            driver=other_driver, vehicle=other_vehicle,
            trip_date=yesterday(), store_name_1="Other", one_way_km_1=Decimal("5"),
        )
        self._auth(self.driver_user)
        url = reverse("my-trips")
        response = self.client.get(url)
        trips = response.data["data"]["trips"]
        trip_ids = [t["id"] for t in trips]
        self.assertIn(str(own_trip.id), trip_ids)
        for t in trips:
            self.assertEqual(t["driver"]["id"], str(self.driver.id))

    def test_my_trips_summary_fields(self):
        self._make_trip(status="approved")
        self._make_trip(status="pending")
        self._auth(self.driver_user)
        url = reverse("my-trips")
        response = self.client.get(url)
        summary = response.data["data"]["summary"]
        self.assertIn("total_trips", summary)
        self.assertIn("total_km", summary)
        self.assertIn("pending_trips", summary)
        self.assertIn("approved_trips", summary)

    def test_my_trips_filter_by_status(self):
        self._make_trip(status="approved")
        self._make_trip(status="pending")
        self._auth(self.driver_user)
        url = reverse("my-trips")
        response = self.client.get(url, {"status": "pending"})
        trips = response.data["data"]["trips"]
        self.assertTrue(all(t["status"] == "pending" for t in trips))

    def test_unauthenticated_cannot_access_my_trips(self):
        url = reverse("my-trips")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Pending Trips
# ---------------------------------------------------------------------------

class PendingTripsViewTest(BaseSetup):

    def test_owner_can_get_pending_trips(self):
        self._make_trip(status="pending")
        self._auth(self.owner_user)
        url = reverse("pending-trips")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("trips", response.data["data"])

    def test_coordinator_can_get_pending_trips(self):
        self._make_trip(status="pending")
        self._auth(self.coord_user)
        url = reverse("pending-trips")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_driver_cannot_access_pending_trips(self):
        self._auth(self.driver_user)
        url = reverse("pending-trips")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pending_trips_only_shows_pending_status(self):
        self._make_trip(status="pending")
        self._make_trip(status="approved")
        self._auth(self.owner_user)
        url = reverse("pending-trips")
        response = self.client.get(url)
        trips = response.data["data"]["trips"]
        self.assertTrue(all(t["status"] == "pending" for t in trips))


# ---------------------------------------------------------------------------
# Trip Stats
# ---------------------------------------------------------------------------

class TripStatsViewTest(BaseSetup):

    def test_owner_can_get_stats(self):
        self._make_trip(status="approved")
        self._auth(self.owner_user)
        url = reverse("trip-stats")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        for key in ["total_trips", "total_km", "pending_trips", "approved_trips", "rejected_trips"]:
            self.assertIn(key, data)

    def test_driver_cannot_access_stats(self):
        self._auth(self.driver_user)
        url = reverse("trip-stats")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stats_count_is_accurate(self):
        self._make_trip(status="approved", trip_date=today())
        self._make_trip(status="pending", trip_date=today())
        self._auth(self.owner_user)
        url = reverse("trip-stats")
        response = self.client.get(url, {"start_date": str(today()), "end_date": str(today())})
        data = response.data["data"]
        self.assertGreaterEqual(data["approved_trips"], 1)
        self.assertGreaterEqual(data["pending_trips"], 1)


# ---------------------------------------------------------------------------
# Store API
# ---------------------------------------------------------------------------

class StoreAPITest(BaseSetup):

    def test_any_authenticated_user_can_list_stores(self):
        self._auth(self.driver_user)
        url = reverse("store-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_store_search_by_name(self):
        Store.objects.create(name="Unique Store XYZ", is_active=True)
        self._auth(self.driver_user)
        url = reverse("store-list-create")
        response = self.client.get(url, {"q": "Unique"})
        names = [s["name"] for s in response.data["data"]]
        self.assertTrue(any("Unique" in n for n in names))

    def test_owner_can_create_store(self):
        self._auth(self.owner_user)
        url = reverse("store-list-create")
        response = self.client.post(url, {"name": "New Store", "code": "NS", "area": "East"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_driver_cannot_create_store(self):
        self._auth(self.driver_user)
        url = reverse("store-list-create")
        response = self.client.post(url, {"name": "Hack Store"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_store_by_id(self):
        self._auth(self.driver_user)
        url = reverse("store-detail", kwargs={"pk": self.store.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["name"], self.store.name)

    def test_owner_can_update_store(self):
        self._auth(self.owner_user)
        url = reverse("store-detail", kwargs={"pk": self.store.id})
        response = self.client.patch(url, {"area": "Updated Area"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_store_not_found_returns_404(self):
        import uuid
        self._auth(self.owner_user)
        url = reverse("store-detail", kwargs={"pk": uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_inactive_stores_not_in_list(self):
        Store.objects.create(name="Inactive Store", is_active=False)
        self._auth(self.driver_user)
        url = reverse("store-list-create")
        response = self.client.get(url, {"q": "Inactive"})
        names = [s["name"] for s in response.data["data"]]
        self.assertNotIn("Inactive Store", names)


# ---------------------------------------------------------------------------
# Image Upload Tests
# ---------------------------------------------------------------------------

class TripImageUploadTest(BaseSetup):

    def test_driver_can_create_trip_with_store1_images(self):
        self._auth(self.driver_user)
        url = reverse("trip-list-create")
        gate_pass = make_image_file("gate.jpg")
        map_img = make_image_file("map.jpg")
        data = {
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "10.00",
            "gate_pass_image": gate_pass,
            "map_screenshot": map_img,
        }
        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_create_trip_with_both_store_images(self):
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "10.00",
            "gate_pass_image": make_image_file("gp1.jpg"),
            "map_screenshot": make_image_file("map1.jpg"),
            "store_name_2": "Store Beta",
            "one_way_km_2": "8.00",
            "gate_pass_image_2": make_image_file("gp2.jpg"),
            "map_screenshot_2": make_image_file("map2.jpg"),
        }
        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        trip = Trip.objects.get(id=response.data["data"]["id"])
        self.assertTrue(bool(trip.gate_pass_image))
        self.assertTrue(bool(trip.gate_pass_image_2))

    def test_image_url_returned_in_serializer(self):
        trip = self._make_trip()
        self._auth(self.owner_user)
        url = reverse("trip-detail", kwargs={"pk": trip.id})
        response = self.client.get(url)
        data = response.data["data"]
        self.assertIn("gate_pass_image_url", data)
        self.assertIn("map_screenshot_url", data)
        self.assertIn("gate_pass_image_2_url", data)
        self.assertIn("map_screenshot_2_url", data)

    def test_image_fields_optional_on_create(self):
        self._auth(self.owner_user)
        url = reverse("trip-list-create")
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(yesterday()),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "10.00",
        }
        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Serializer Unit Tests
# ---------------------------------------------------------------------------

class TripSerializerTest(BaseSetup):

    def _get_request_context(self, user):
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user
        return {"request": request}

    def test_trip_1_field_populated(self):
        from .serializers import TripSerializer
        trip = self._make_trip(
            dispatch_time_1=None,
            store_name_1="Store Alpha",
            one_way_km_1=Decimal("10.00"),
        )
        ctx = self._get_request_context(self.owner_user)
        serializer = TripSerializer(trip, context=ctx)
        self.assertIsNotNone(serializer.data["trip_1"])
        self.assertEqual(serializer.data["trip_1"]["store_name"], "Store Alpha")
        self.assertEqual(serializer.data["trip_1"]["one_way_km"], 10.0)
        self.assertEqual(serializer.data["trip_1"]["round_trip_km"], 20.0)

    def test_trip_2_field_is_none_when_absent(self):
        from .serializers import TripSerializer
        trip = self._make_trip()
        ctx = self._get_request_context(self.owner_user)
        serializer = TripSerializer(trip, context=ctx)
        self.assertIsNone(serializer.data["trip_2"])

    def test_trip_2_field_populated(self):
        from .serializers import TripSerializer
        trip = self._make_trip(
            store_name_2="Store Beta",
            one_way_km_2=Decimal("7.00"),
        )
        ctx = self._get_request_context(self.owner_user)
        serializer = TripSerializer(trip, context=ctx)
        self.assertIsNotNone(serializer.data["trip_2"])
        self.assertEqual(serializer.data["trip_2"]["round_trip_km"], 14.0)

    def test_trip_update_serializer_persists_all_editable_fields(self):
        from .serializers import TripUpdateSerializer
        trip = self._make_trip(status="pending", trip_category="regular")
        data = {
            "trip_date": str(yesterday()),
            "trip_category": "adhoc",
            "store_name_1": "Updated Store",
            "one_way_km_1": "25.00",
            "remarks": "Updated remark",
        }
        serializer = TripUpdateSerializer(trip, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_trip = serializer.save()
        self.assertEqual(updated_trip.trip_category, "adhoc")
        self.assertEqual(updated_trip.remarks, "Updated remark")
        self.assertEqual(updated_trip.store_name_1, "Updated Store")

    def test_create_serializer_validates_future_date(self):
        from rest_framework.test import APIRequestFactory
        from .serializers import TripCreateSerializer
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = self.owner_user
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(today() + timedelta(days=1)),
            "store_name_1": "Store Alpha",
            "one_way_km_1": "10.00",
        }
        serializer = TripCreateSerializer(data=data, context={"request": request})
        self.assertFalse(serializer.is_valid())
        self.assertIn("trip_date", serializer.errors)

    def test_create_serializer_rejects_km_without_store(self):
        from rest_framework.test import APIRequestFactory
        from .serializers import TripCreateSerializer
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = self.owner_user
        data = {
            "vehicle_id": str(self.vehicle.id),
            "trip_date": str(yesterday()),
            "one_way_km_1": "10.00",
        }
        serializer = TripCreateSerializer(data=data, context={"request": request})
        self.assertFalse(serializer.is_valid())


# ---------------------------------------------------------------------------
# Permission / Auth Edge Cases
# ---------------------------------------------------------------------------

class AuthPermissionTest(BaseSetup):

    def test_all_trip_endpoints_require_authentication(self):
        trip = self._make_trip()
        endpoints = [
            ("GET", reverse("trip-list-create")),
            ("POST", reverse("trip-list-create")),
            ("GET", reverse("trip-detail", kwargs={"pk": trip.id})),
            ("PATCH", reverse("trip-detail", kwargs={"pk": trip.id})),
            ("DELETE", reverse("trip-detail", kwargs={"pk": trip.id})),
            ("GET", reverse("my-trips")),
            ("GET", reverse("pending-trips")),
            ("GET", reverse("trip-stats")),
        ]
        for method, url in endpoints:
            response = getattr(self.client, method.lower())(url)
            self.assertIn(
                response.status_code,
                [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
                msg=f"{method} {url} should require auth",
            )
