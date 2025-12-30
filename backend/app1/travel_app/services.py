"""
Travel App Services

Business logic for travel analytics, budget management, and packing suggestions.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, Dict, List, Tuple
from django.db import transaction
from django.db.models import Sum, Count, Avg, Q, F
from django.utils import timezone

from .models import (
    Trip,
    TripExpense,
    TripDocument,
    PackingList,
    PackingItem,
    Itinerary,
    ItineraryActivity,
    TravelGoal,
    ExchangeRateCache,
)


class TravelAnalyticsService:
    """
    Service for travel analytics and statistics.
    """
    
    def __init__(self, user):
        self.user = user
    
    def get_dashboard_summary(self) -> Dict:
        """Get summary data for dashboard."""
        today = date.today()
        year_start = date(today.year, 1, 1)
        
        # Get all trips for the user
        all_trips = Trip.objects.filter(owner=self.user, is_archived=False)
        completed_trips = all_trips.filter(status='completed')
        
        # Calculate statistics
        trips_this_year = all_trips.filter(start_date__gte=year_start).count()
        
        # Countries visited (from completed trips)
        countries_visited = completed_trips.values('country_code').distinct().count()
        
        # Total days traveled
        total_days = sum(
            trip.duration_days for trip in completed_trips
        )
        
        # Total spend this year
        year_trips = all_trips.filter(start_date__gte=year_start)
        total_spend = sum(
            float(trip.actual_spend) for trip in year_trips
        )
        
        # Upcoming trips
        upcoming_trips = all_trips.filter(
            start_date__gt=today,
            status__in=['planning', 'booked']
        ).count()
        
        # Active trip (currently in progress)
        active_trip = all_trips.filter(
            start_date__lte=today,
            end_date__gte=today,
            status='in_progress'
        ).first()
        
        # Next upcoming trip
        next_trip = all_trips.filter(
            start_date__gt=today,
            status__in=['planning', 'booked']
        ).order_by('start_date').first()
        
        return {
            'total_trips': all_trips.count(),
            'trips_this_year': trips_this_year,
            'countries_visited': countries_visited,
            'total_days_traveled': total_days,
            'total_spend_this_year': total_spend,
            'upcoming_trips': upcoming_trips,
            'active_trip': active_trip,
            'next_trip': next_trip,
        }
    
    def get_full_analytics(self) -> Dict:
        """Get comprehensive analytics data."""
        completed_trips = Trip.objects.filter(
            owner=self.user,
            status='completed',
            is_archived=False
        )
        
        # Basic counts
        total_countries = completed_trips.values('country_code').distinct().count()
        total_trips = completed_trips.count()
        total_days = sum(trip.duration_days for trip in completed_trips)
        
        # Averages
        avg_duration = total_days / total_trips if total_trips > 0 else 0
        
        total_cost = sum(float(trip.actual_spend) for trip in completed_trips)
        avg_cost = total_cost / total_trips if total_trips > 0 else 0
        cost_per_day = total_cost / total_days if total_days > 0 else 0
        
        # Trips by type
        trips_by_type = {}
        type_counts = completed_trips.values('trip_type').annotate(
            count=Count('id')
        )
        for item in type_counts:
            trips_by_type[item['trip_type']] = item['count']
        
        # Spending by category
        spending_by_category = self._get_spending_by_category(completed_trips)
        
        # Trips by year
        trips_by_year = self._get_trips_by_year()
        
        # Top destinations
        top_destinations = self._get_top_destinations()
        
        return {
            'total_countries': total_countries,
            'total_trips': total_trips,
            'total_days': total_days,
            'average_trip_duration': round(avg_duration, 1),
            'average_trip_cost': round(avg_cost, 2),
            'cost_per_day': round(cost_per_day, 2),
            'trips_by_type': trips_by_type,
            'spending_by_category': spending_by_category,
            'trips_by_year': trips_by_year,
            'top_destinations': top_destinations,
        }
    
    def _get_spending_by_category(self, trips) -> Dict:
        """Aggregate spending by category across trips."""
        expenses = TripExpense.objects.filter(trip__in=trips)
        breakdown = expenses.values('category').annotate(
            total=Sum('converted_amount')
        )
        
        return {
            item['category']: float(item['total'])
            for item in breakdown
        }
    
    def _get_trips_by_year(self) -> List[Dict]:
        """Get trip counts and spend by year."""
        all_trips = Trip.objects.filter(
            owner=self.user,
            is_archived=False
        )
        
        years = all_trips.dates('start_date', 'year')
        result = []
        
        for year_date in years:
            year = year_date.year
            year_trips = all_trips.filter(start_date__year=year)
            
            result.append({
                'year': year,
                'trip_count': year_trips.count(),
                'total_spend': float(
                    year_trips.aggregate(total=Sum('actual_spend'))['total'] or 0
                ),
                'countries': year_trips.values('country_code').distinct().count(),
            })
        
        return sorted(result, key=lambda x: x['year'], reverse=True)
    
    def _get_top_destinations(self, limit: int = 5) -> List[Dict]:
        """Get most visited destinations."""
        completed_trips = Trip.objects.filter(
            owner=self.user,
            status='completed',
            is_archived=False
        )
        
        destinations = completed_trips.values(
            'city', 'country', 'country_code'
        ).annotate(
            visit_count=Count('id')
        ).order_by('-visit_count')[:limit]
        
        return list(destinations)
    
    def get_map_data(self) -> List[Dict]:
        """Get data for world map visualization."""
        completed_trips = Trip.objects.filter(
            owner=self.user,
            status='completed',
            is_archived=False
        )
        
        countries = completed_trips.values(
            'country_code', 'country'
        ).annotate(
            visit_count=Count('id')
        ).order_by('-visit_count')
        
        result = []
        for country in countries:
            trips = completed_trips.filter(
                country_code=country['country_code']
            ).values('id', 'name', 'city', 'start_date', 'end_date')
            
            result.append({
                'country_code': country['country_code'],
                'country': country['country'],
                'visit_count': country['visit_count'],
                'trips': list(trips),
            })
        
        return result


class BudgetService:
    """
    Service for budget management and analysis.
    """
    
    def __init__(self, user):
        self.user = user
    
    def get_trip_budget_breakdown(self, trip: Trip) -> List[Dict]:
        """Get detailed budget breakdown for a trip."""
        categories = [
            ('flights', 'Flights', trip.budget_flights),
            ('accommodation', 'Accommodation', trip.budget_accommodation),
            ('food', 'Food & Dining', trip.budget_food),
            ('activities', 'Activities', trip.budget_activities),
            ('transport', 'Local Transport', trip.budget_transport),
            ('shopping', 'Shopping', trip.budget_shopping),
            ('other', 'Other', trip.budget_other),
        ]
        
        # Get actual spending per category
        expenses_by_category = trip.expenses.values('category').annotate(
            total=Sum('converted_amount')
        )
        expense_map = {
            item['category']: float(item['total'])
            for item in expenses_by_category
        }
        
        result = []
        for category_key, category_name, budgeted in categories:
            budgeted_float = float(budgeted)
            actual = expense_map.get(category_key, 0)
            remaining = budgeted_float - actual
            utilization = (actual / budgeted_float * 100) if budgeted_float > 0 else 0
            
            result.append({
                'category': category_key,
                'name': category_name,
                'budgeted': budgeted_float,
                'actual': actual,
                'remaining': remaining,
                'utilization': round(utilization, 1),
            })
        
        return result
    
    def get_daily_spending(self, trip: Trip) -> List[Dict]:
        """Get daily spending breakdown for a trip."""
        expenses = trip.expenses.values('expense_date').annotate(
            total=Sum('converted_amount')
        ).order_by('expense_date')
        
        return [
            {
                'date': item['expense_date'].isoformat(),
                'amount': float(item['total']),
            }
            for item in expenses
        ]
    
    def suggest_budget(
        self, 
        destination: str, 
        duration_days: int, 
        trip_type: str
    ) -> Dict:
        """Suggest budget based on historical data and destination."""
        # Get user's historical averages
        completed_trips = Trip.objects.filter(
            owner=self.user,
            status='completed',
            is_archived=False
        )
        
        # Calculate average daily spend from past trips
        total_spend = sum(float(t.actual_spend) for t in completed_trips)
        total_days = sum(t.duration_days for t in completed_trips)
        
        avg_daily_spend = total_spend / total_days if total_days > 0 else 150  # Default
        
        # Adjust based on trip type
        type_multipliers = {
            'vacation': 1.0,
            'business': 1.5,
            'adventure': 1.2,
            'city_break': 1.1,
            'beach': 0.9,
            'road_trip': 0.8,
            'backpacking': 0.5,
        }
        multiplier = type_multipliers.get(trip_type, 1.0)
        
        suggested_daily = avg_daily_spend * multiplier
        suggested_total = suggested_daily * duration_days
        
        # Suggest category breakdown (typical percentages)
        return {
            'total': round(suggested_total, 2),
            'daily_average': round(suggested_daily, 2),
            'breakdown': {
                'flights': round(suggested_total * 0.25, 2),
                'accommodation': round(suggested_total * 0.30, 2),
                'food': round(suggested_total * 0.20, 2),
                'activities': round(suggested_total * 0.10, 2),
                'transport': round(suggested_total * 0.08, 2),
                'shopping': round(suggested_total * 0.05, 2),
                'other': round(suggested_total * 0.02, 2),
            }
        }
    
    def get_budget_accuracy(self) -> Dict:
        """Calculate budget accuracy metrics from past trips."""
        completed_trips = Trip.objects.filter(
            owner=self.user,
            status='completed',
            is_archived=False
        ).exclude(budget_amount=0)
        
        if not completed_trips.exists():
            return {
                'average_accuracy': 0,
                'trips_under_budget': 0,
                'trips_over_budget': 0,
                'average_variance': 0,
            }
        
        under_budget = 0
        over_budget = 0
        variances = []
        
        for trip in completed_trips:
            variance = float(trip.actual_spend - trip.budget_amount)
            variance_pct = variance / float(trip.budget_amount) * 100
            variances.append(variance_pct)
            
            if variance < 0:
                under_budget += 1
            else:
                over_budget += 1
        
        avg_variance = sum(variances) / len(variances)
        
        return {
            'average_accuracy': round(100 - abs(avg_variance), 1),
            'trips_under_budget': under_budget,
            'trips_over_budget': over_budget,
            'average_variance': round(avg_variance, 1),
        }


class PackingService:
    """
    Service for packing list generation and management.
    """
    
    # Base items for all trips
    BASE_ITEMS = {
        'documents': [
            ('Passport', 1),
            ('ID Card', 1),
            ('Travel Insurance', 1),
            ('Credit/Debit Cards', 2),
            ('Cash', 1),
            ('Flight Tickets', 1),
            ('Hotel Confirmations', 1),
        ],
        'electronics': [
            ('Phone', 1),
            ('Phone Charger', 1),
            ('Power Bank', 1),
            ('Headphones', 1),
            ('Camera', 1),
        ],
        'toiletries': [
            ('Toothbrush', 1),
            ('Toothpaste', 1),
            ('Deodorant', 1),
            ('Shampoo', 1),
            ('Sunscreen', 1),
        ],
        'medications': [
            ('Personal Medications', 1),
            ('First Aid Kit', 1),
            ('Pain Relievers', 1),
        ],
    }
    
    # Trip type specific additions
    TYPE_ITEMS = {
        'beach': {
            'clothing': [
                ('Swimsuit', 2),
                ('Beach Cover-up', 1),
                ('Flip Flops', 1),
                ('Sun Hat', 1),
            ],
            'accessories': [
                ('Sunglasses', 1),
                ('Beach Towel', 1),
                ('Beach Bag', 1),
            ],
        },
        'business': {
            'clothing': [
                ('Business Suits', 2),
                ('Dress Shirts', 3),
                ('Dress Shoes', 1),
                ('Ties', 2),
            ],
            'electronics': [
                ('Laptop', 1),
                ('Laptop Charger', 1),
            ],
        },
        'adventure': {
            'clothing': [
                ('Hiking Boots', 1),
                ('Quick-dry Pants', 2),
                ('Rain Jacket', 1),
                ('Fleece', 1),
            ],
            'accessories': [
                ('Backpack', 1),
                ('Water Bottle', 1),
                ('Flashlight', 1),
            ],
        },
        'city_break': {
            'clothing': [
                ('Comfortable Walking Shoes', 1),
                ('Casual Outfits', 3),
            ],
            'accessories': [
                ('Day Bag', 1),
                ('Umbrella', 1),
            ],
        },
    }
    
    def __init__(self, user):
        self.user = user
    
    def generate_packing_list(self, trip: Trip) -> PackingList:
        """Generate a packing list based on trip details."""
        # Create the packing list
        packing_list, created = PackingList.objects.get_or_create(
            trip=trip,
            defaults={'owner': trip.owner}
        )
        
        if not created:
            # List already exists, return it
            return packing_list
        
        # Add base items
        for category, items in self.BASE_ITEMS.items():
            for item_name, quantity in items:
                PackingItem.objects.create(
                    packing_list=packing_list,
                    name=item_name,
                    category=category,
                    quantity=quantity
                )
        
        # Add clothing based on duration
        clothing_items = self._get_clothing_items(trip.duration_days)
        for item_name, quantity in clothing_items:
            PackingItem.objects.create(
                packing_list=packing_list,
                name=item_name,
                category='clothing',
                quantity=quantity
            )
        
        # Add trip type specific items
        type_items = self.TYPE_ITEMS.get(trip.trip_type, {})
        for category, items in type_items.items():
            for item_name, quantity in items:
                # Check if item already exists
                if not packing_list.items.filter(name=item_name).exists():
                    PackingItem.objects.create(
                        packing_list=packing_list,
                        name=item_name,
                        category=category,
                        quantity=quantity
                    )
        
        return packing_list
    
    def _get_clothing_items(self, duration_days: int) -> List[Tuple[str, int]]:
        """Get clothing items based on trip duration."""
        # Calculate quantities based on duration
        # Assume laundry every 5 days for longer trips
        if duration_days <= 5:
            days_factor = duration_days
        else:
            days_factor = min(7, (duration_days // 5) * 5 + min(duration_days % 5, 3))
        
        return [
            ('T-shirts', min(days_factor, 7)),
            ('Underwear', min(days_factor + 1, 8)),
            ('Socks', min(days_factor + 1, 8)),
            ('Pants/Shorts', min(max(2, days_factor // 2), 4)),
            ('Pajamas', 1),
            ('Jacket/Sweater', 1),
        ]
    
    def get_templates(self) -> List[PackingList]:
        """Get user's packing list templates."""
        return PackingList.objects.filter(
            owner=self.user,
            is_template=True
        ).order_by('template_name')
    
    def save_as_template(
        self, 
        packing_list: PackingList, 
        template_name: str
    ) -> PackingList:
        """Save a packing list as a template."""
        template = PackingList.objects.create(
            owner=self.user,
            template_name=template_name,
            is_template=True
        )
        
        # Copy all items
        for item in packing_list.items.all():
            PackingItem.objects.create(
                packing_list=template,
                name=item.name,
                category=item.category,
                quantity=item.quantity,
                notes=item.notes
            )
        
        return template


class ItineraryService:
    """
    Service for itinerary management.
    """
    
    def __init__(self, user):
        self.user = user
    
    def generate_itinerary_days(self, trip: Trip) -> List[Itinerary]:
        """Auto-generate itinerary days from trip dates."""
        # Delete existing itinerary days
        Itinerary.objects.filter(trip=trip).delete()
        
        days = []
        current_date = trip.start_date
        day_number = 1
        
        while current_date <= trip.end_date:
            day = Itinerary.objects.create(
                trip=trip,
                day_number=day_number,
                date=current_date,
                title=f"Day {day_number}"
            )
            days.append(day)
            current_date += timedelta(days=1)
            day_number += 1
        
        return days
    
    def reorder_activities(
        self, 
        itinerary: Itinerary, 
        activity_orders: List[Dict]
    ) -> None:
        """Reorder activities within an itinerary day."""
        for item in activity_orders:
            ItineraryActivity.objects.filter(
                id=item['id'],
                itinerary=itinerary
            ).update(order=item['order'])
    
    def copy_day(
        self, 
        source_day: Itinerary, 
        target_day: Itinerary
    ) -> None:
        """Copy activities from one day to another."""
        for activity in source_day.activities.all():
            ItineraryActivity.objects.create(
                itinerary=target_day,
                activity_type=activity.activity_type,
                name=activity.name,
                description=activity.description,
                start_time=activity.start_time,
                end_time=activity.end_time,
                location=activity.location,
                latitude=activity.latitude,
                longitude=activity.longitude,
                estimated_cost=activity.estimated_cost,
                booking_reference='',  # Don't copy booking reference
                order=activity.order,
                notes=activity.notes,
            )


class TravelGoalService:
    """
    Service for travel goals management.
    """
    
    def __init__(self, user):
        self.user = user
    
    def get_goals_with_progress(self) -> List[Dict]:
        """Get all goals with progress indicators."""
        goals = TravelGoal.objects.filter(owner=self.user)
        
        result = []
        for goal in goals:
            data = {
                'id': str(goal.id),
                'destination': goal.destination,
                'country': goal.country,
                'country_code': goal.country_code,
                'description': goal.description,
                'target_date': goal.target_date.isoformat() if goal.target_date else None,
                'estimated_budget': float(goal.estimated_budget) if goal.estimated_budget else None,
                'priority': goal.priority,
                'is_achieved': goal.is_achieved,
                'achieved_date': goal.achieved_date.isoformat() if goal.achieved_date else None,
                'linked_trip_id': str(goal.linked_trip.id) if goal.linked_trip else None,
            }
            result.append(data)
        
        return result
    
    def mark_as_achieved(
        self, 
        goal: TravelGoal, 
        trip: Trip = None
    ) -> TravelGoal:
        """Mark a goal as achieved."""
        goal.is_achieved = True
        goal.achieved_date = date.today()
        if trip:
            goal.linked_trip = trip
        goal.save()
        return goal
    
    def get_achievement_stats(self) -> Dict:
        """Get goal achievement statistics."""
        all_goals = TravelGoal.objects.filter(owner=self.user)
        achieved = all_goals.filter(is_achieved=True)
        pending = all_goals.filter(is_achieved=False)
        
        return {
            'total_goals': all_goals.count(),
            'achieved': achieved.count(),
            'pending': pending.count(),
            'achievement_rate': (
                achieved.count() / all_goals.count() * 100
                if all_goals.count() > 0 else 0
            ),
            'countries_in_bucket_list': pending.values('country_code').distinct().count(),
        }


class ExchangeRateService:
    """
    Service for exchange rate management.
    """
    
    def get_rate(self, base: str, target: str) -> Decimal:
        """Get exchange rate, from cache or default."""
        if base == target:
            return Decimal('1')
        
        cache = ExchangeRateCache.objects.filter(
            base_currency=base,
            target_currency=target
        ).first()
        
        if cache and not cache.is_stale:
            return cache.rate
        
        # In production, would fetch from API here
        # For now, return 1 as default
        return Decimal('1')
    
    def update_rate(self, base: str, target: str, rate: Decimal) -> ExchangeRateCache:
        """Update exchange rate in cache."""
        cache, created = ExchangeRateCache.objects.update_or_create(
            base_currency=base,
            target_currency=target,
            defaults={'rate': rate}
        )
        return cache
    
    def convert_amount(
        self, 
        amount: Decimal, 
        from_currency: str, 
        to_currency: str
    ) -> Tuple[Decimal, Decimal]:
        """Convert amount between currencies. Returns (converted_amount, rate)."""
        rate = self.get_rate(from_currency, to_currency)
        converted = amount * rate
        return (converted, rate)

