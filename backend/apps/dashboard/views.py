"""
Dashboard Views - Analytics and Reporting
"""
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.common.permissions import IsOwnerOrCoordinator, IsDriver
from apps.trips.models import Trip
from apps.expenses.models import Expense
from apps.drivers.models import Driver
from apps.vehicles.models import Vehicle


class OwnerDashboardView(APIView):
    """Owner Dashboard - Comprehensive analytics"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def get(self, request):
        # Get date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Default to current month
        today = timezone.now().date()
        if not start_date:
            start_date = today.replace(day=1)
        if not end_date:
            end_date = today
        
        # Trip statistics
        trip_stats = self._get_trip_stats(start_date, end_date)
        
        # Expense breakdown
        expense_stats = self._get_expense_stats(start_date, end_date)
        
        # Payment summary
        payment_stats = self._get_payment_stats(start_date, end_date)
        
        # Top performers
        top_performers = self._get_top_performers(start_date, end_date)
        
        # Vehicle utilization
        vehicle_utilization = self._get_vehicle_utilization(start_date, end_date)
        
        return Response({
            'success': True,
            'data': {
                'period': {
                    'start_date': str(start_date),
                    'end_date': str(end_date)
                },
                'trips': trip_stats,
                'expenses': expense_stats,
                'payments': payment_stats,
                'top_performers': top_performers,
                'vehicle_utilization': vehicle_utilization
            }
        })
    
    def _get_trip_stats(self, start_date, end_date):
        """Get trip statistics"""
        trips = Trip.objects.filter(
            trip_date__gte=start_date,
            trip_date__lte=end_date
        )
        
        return {
            'total': trips.count(),
            'approved': trips.filter(status='approved').count(),
            'pending': trips.filter(status='pending').count(),
            'rejected': trips.filter(status='rejected').count(),
            'total_km': float(trips.aggregate(total=Sum('total_km'))['total'] or 0)
        }
    
    def _get_expense_stats(self, start_date, end_date):
        """Get expense breakdown"""
        expenses = Expense.objects.filter(
            expense_date__gte=start_date,
            expense_date__lte=end_date
        )
        
        by_type = {}
        for expense_type, _ in Expense.EXPENSE_TYPE_CHOICES:
            total = expenses.filter(expense_type=expense_type).aggregate(
                total=Sum('amount')
            )['total'] or 0
            by_type[expense_type] = float(total)
        
        return {
            'total': float(expenses.aggregate(total=Sum('amount'))['total'] or 0),
            'by_type': by_type
        }
    
    def _get_payment_stats(self, start_date, end_date):
        """Get payment summary"""
        from apps.payments.models import Payment
        
        payments = Payment.objects.filter(
            month_year__gte=start_date,
            month_year__lte=end_date
        )
        
        return {
            'total_salary_paid': float(payments.filter(
                payment_type='salary',
                status='paid'
            ).aggregate(total=Sum('final_amount'))['total'] or 0),
            'total_vendor_paid': float(payments.filter(
                payment_type='vendor_payment',
                status='paid'
            ).aggregate(total=Sum('final_amount'))['total'] or 0),
            'pending_payments': float(payments.filter(
                status='pending'
            ).aggregate(total=Sum('final_amount'))['total'] or 0)
        }
    
    def _get_top_performers(self, start_date, end_date):
        """Get top performing drivers"""
        drivers = Driver.objects.filter(
            trips__trip_date__gte=start_date,
            trips__trip_date__lte=end_date,
            trips__status='approved'
        ).annotate(
            total_trips=Count('trips'),
            total_km=Sum('trips__total_km')
        ).order_by('-total_km')[:5]
        
        return [
            {
                'driver_id': str(d.id),
                'driver_name': d.user.get_full_name(),
                'total_trips': d.total_trips,
                'total_km': float(d.total_km or 0)
            }
            for d in drivers
        ]
    
    def _get_vehicle_utilization(self, start_date, end_date):
        """Get vehicle utilization stats"""
        vehicles = Vehicle.objects.filter(
            trips__trip_date__gte=start_date,
            trips__trip_date__lte=end_date,
            trips__status='approved'
        ).annotate(
            total_trips=Count('trips'),
            total_km=Sum('trips__total_km')
        ).order_by('-total_km')
        
        return [
            {
                'vehicle_id': str(v.id),
                'vehicle_number': v.vehicle_number,
                'owner_type': v.owner_type,
                'total_trips': v.total_trips,
                'total_km': float(v.total_km or 0)
            }
            for v in vehicles
        ]


class DriverDashboardView(APIView):
    """Driver Dashboard - Personal analytics"""
    permission_classes = [IsDriver]
    
    def get(self, request):
        driver = request.user.driver_profile
        
        # Get date range (default to current month)
        today = timezone.now().date()
        start_date = request.query_params.get('start_date', today.replace(day=1))
        end_date = request.query_params.get('end_date', today)
        
        # Trip statistics
        trips = Trip.objects.filter(
            driver=driver,
            trip_date__gte=start_date,
            trip_date__lte=end_date
        )
        
        trip_stats = {
            'total': trips.count(),
            'approved': trips.filter(status='approved').count(),
            'pending': trips.filter(status='pending').count(),
            'total_km': float(trips.aggregate(total=Sum('total_km'))['total'] or 0)
        }
        
        # Expense summary
        expenses = Expense.objects.filter(
            driver=driver,
            expense_date__gte=start_date,
            expense_date__lte=end_date
        )
        
        advance_taken = float(expenses.filter(
            expense_type='advance'
        ).aggregate(total=Sum('amount'))['total'] or 0)
        
        advance_deducted = float(expenses.filter(
            expense_type='advance',
            is_deducted=True
        ).aggregate(total=Sum('amount'))['total'] or 0)
        
        # Salary info
        from apps.payments.models import Payment
        
        try:
            payment = Payment.objects.get(
                driver=driver,
                month_year=today.replace(day=1)
            )
            salary = {
                'base_salary': float(payment.base_salary),
                'deductions': float(payment.total_deductions),
                'final_amount': float(payment.final_amount),
                'status': payment.status
            }
        except Payment.DoesNotExist:
            # Calculate expected salary
            base_salary = driver.get_effective_base_salary()
            total_advance = driver.get_total_advance_this_month()
            salary = {
                'base_salary': float(base_salary),
                'deductions': float(total_advance),
                'final_amount': float(base_salary - total_advance),
                'status': 'pending'
            }
        
        # Recent trips
        recent_trips = trips.order_by('-trip_date')[:5]
        recent_trips_data = [
            {
                'id': str(t.id),
                'trip_date': str(t.trip_date),
                'store_name_1': t.store_name_1,
                'store_name_2': t.store_name_2,
                'total_km': float(t.total_km),
                'status': t.status
            }
            for t in recent_trips
        ]
        
        return Response({
            'success': True,
            'data': {
                'period': {
                    'start_date': str(start_date),
                    'end_date': str(end_date)
                },
                'trips': trip_stats,
                'expenses': {
                    'advance_taken': advance_taken,
                    'advance_deducted': advance_deducted,
                    'remaining_advance': advance_taken - advance_deducted
                },
                'salary': salary,
                'recent_trips': recent_trips_data
            }
        })


class DailySummaryView(APIView):
    """Daily summary for coordinators"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def get(self, request):
        date = request.query_params.get('date')
        if not date:
            date = timezone.now().date()
        
        # Trip summary
        trips = Trip.objects.filter(trip_date=date)
        
        trip_summary = {
            'total': trips.count(),
            'pending': trips.filter(status='pending').count(),
            'approved': trips.filter(status='approved').count(),
            'total_km': float(trips.aggregate(total=Sum('total_km'))['total'] or 0)
        }
        
        # Driver attendance
        drivers = Driver.objects.filter(is_active=True)
        attendance = []
        
        for driver in drivers:
            driver_trips = trips.filter(driver=driver)
            trip1 = driver_trips.filter(one_way_km_1__isnull=False).exists()
            trip2 = driver_trips.filter(one_way_km_2__isnull=False).exists()
            total_km = driver_trips.aggregate(total=Sum('total_km'))['total'] or 0
            
            attendance.append({
                'driver_id': str(driver.id),
                'driver_name': driver.user.get_full_name(),
                'trip_1': trip1,
                'trip_2': trip2,
                'total_km': float(total_km)
            })
        
        return Response({
            'success': True,
            'data': {
                'date': str(date),
                'trips': trip_summary,
                'driver_attendance': attendance
            }
        })


class MonthlyReportView(APIView):
    """Monthly report"""
    permission_classes = [IsOwnerOrCoordinator]
    
    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        
        # Trip data
        trips = Trip.objects.filter(
            trip_date__year=year,
            trip_date__month=month,
            status='approved'
        )
        
        # Driver-wise data
        driver_data = []
        for driver in Driver.objects.filter(is_active=True):
            driver_trips = trips.filter(driver=driver)
            driver_expenses = Expense.objects.filter(
                driver=driver,
                expense_date__year=year,
                expense_date__month=month
            )
            
            driver_data.append({
                'driver_id': str(driver.id),
                'driver_name': driver.user.get_full_name(),
                'total_trips': driver_trips.count(),
                'total_km': float(driver_trips.aggregate(total=Sum('total_km'))['total'] or 0),
                'total_advance': float(driver_expenses.filter(
                    expense_type='advance'
                ).aggregate(total=Sum('amount'))['total'] or 0),
                'total_fuel': float(driver_expenses.filter(
                    expense_type='fuel'
                ).aggregate(total=Sum('amount'))['total'] or 0)
            })
        
        # Vehicle-wise data
        vehicle_data = []
        for vehicle in Vehicle.objects.filter(is_active=True):
            vehicle_trips = trips.filter(vehicle=vehicle)
            vehicle_expenses = Expense.objects.filter(
                vehicle=vehicle,
                expense_date__year=year,
                expense_date__month=month
            )
            
            vehicle_data.append({
                'vehicle_id': str(vehicle.id),
                'vehicle_number': vehicle.vehicle_number,
                'owner_type': vehicle.owner_type,
                'total_trips': vehicle_trips.count(),
                'total_km': float(vehicle_trips.aggregate(total=Sum('total_km'))['total'] or 0),
                'total_expenses': float(vehicle_expenses.aggregate(
                    total=Sum('amount')
                )['total'] or 0)
            })
        
        return Response({
            'success': True,
            'data': {
                'month': month,
                'year': year,
                'total_trips': trips.count(),
                'total_km': float(trips.aggregate(total=Sum('total_km'))['total'] or 0),
                'driver_data': driver_data,
                'vehicle_data': vehicle_data
            }
        })
