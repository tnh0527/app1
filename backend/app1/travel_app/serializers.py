"""
Travel App Serializers

DRF serializers for API data validation and transformation.
"""

from decimal import Decimal
from datetime import date
from rest_framework import serializers
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


class TripSerializer(serializers.ModelSerializer):
    """Full serializer for Trip model with computed properties."""
    
    duration_days = serializers.IntegerField(read_only=True)
    days_until_trip = serializers.IntegerField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    budget_remaining = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    budget_utilization_percentage = serializers.FloatField(read_only=True)
    expense_count = serializers.SerializerMethodField()
    packing_progress = serializers.SerializerMethodField()
    country_flag = serializers.SerializerMethodField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'name', 'description',
            'city', 'country', 'country_code', 'timezone', 'latitude', 'longitude',
            'start_date', 'end_date', 'trip_type', 'status',
            'budget_amount', 'budget_currency', 'actual_spend',
            'budget_flights', 'budget_accommodation', 'budget_food',
            'budget_activities', 'budget_transport', 'budget_shopping', 'budget_other',
            'color', 'cover_image_url', 'calendar_event_id',
            'notes', 'is_archived',
            'duration_days', 'days_until_trip', 'is_upcoming', 'is_ongoing',
            'budget_remaining', 'budget_utilization_percentage',
            'expense_count', 'packing_progress', 'country_flag',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'actual_spend', 'created_at', 'updated_at']
    
    def get_expense_count(self, obj):
        return obj.expenses.count()
    
    def get_packing_progress(self, obj):
        try:
            return obj.packing_list.packing_progress
        except:
            return 0
    
    def get_country_flag(self, obj):
        """Convert country code to flag emoji."""
        if not obj.country_code or len(obj.country_code) != 2:
            return ''
        return ''.join(chr(ord(c) + 127397) for c in obj.country_code.upper())
    
    def validate(self, data):
        """Validate date range."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        
        return data


class TripCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating trips with auto-generation options."""
    
    auto_generate_itinerary = serializers.BooleanField(default=True, write_only=True)
    auto_create_packing_list = serializers.BooleanField(default=True, write_only=True)
    
    class Meta:
        model = Trip
        fields = [
            'name', 'description',
            'city', 'country', 'country_code', 'timezone', 'latitude', 'longitude',
            'start_date', 'end_date', 'trip_type', 'status',
            'budget_amount', 'budget_currency',
            'budget_flights', 'budget_accommodation', 'budget_food',
            'budget_activities', 'budget_transport', 'budget_shopping', 'budget_other',
            'color', 'cover_image_url', 'calendar_event_id', 'notes',
            'auto_generate_itinerary', 'auto_create_packing_list',
        ]
    
    def validate(self, data):
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        
        return data
    
    def create(self, validated_data):
        auto_generate_itinerary = validated_data.pop('auto_generate_itinerary', True)
        auto_create_packing_list = validated_data.pop('auto_create_packing_list', True)
        
        trip = Trip.objects.create(**validated_data)
        
        # Auto-generate itinerary days
        if auto_generate_itinerary:
            current_date = trip.start_date
            day_number = 1
            while current_date <= trip.end_date:
                Itinerary.objects.create(
                    trip=trip,
                    day_number=day_number,
                    date=current_date,
                    title=f"Day {day_number}"
                )
                current_date += __import__('datetime').timedelta(days=1)
                day_number += 1
        
        # Auto-create packing list
        if auto_create_packing_list:
            PackingList.objects.create(
                trip=trip,
                owner=trip.owner
            )
        
        return trip


class TripListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for trip listings."""
    
    duration_days = serializers.IntegerField(read_only=True)
    days_until_trip = serializers.IntegerField(read_only=True)
    budget_utilization_percentage = serializers.FloatField(read_only=True)
    country_flag = serializers.SerializerMethodField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'name', 'city', 'country', 'country_code', 'country_flag',
            'start_date', 'end_date', 'trip_type', 'status',
            'budget_amount', 'budget_currency', 'actual_spend',
            'color', 'cover_image_url', 'is_archived',
            'duration_days', 'days_until_trip', 'budget_utilization_percentage',
        ]
    
    def get_country_flag(self, obj):
        if not obj.country_code or len(obj.country_code) != 2:
            return ''
        return ''.join(chr(ord(c) + 127397) for c in obj.country_code.upper())


class TripExpenseSerializer(serializers.ModelSerializer):
    """Serializer for TripExpense model."""
    
    trip_name = serializers.CharField(source='trip.name', read_only=True)
    
    class Meta:
        model = TripExpense
        fields = [
            'id', 'trip', 'trip_name',
            'amount', 'currency', 'converted_amount', 'exchange_rate',
            'category', 'description', 'expense_date', 'location',
            'receipt_url', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        expense = super().create(validated_data)
        
        # Update trip's actual_spend
        trip = expense.trip
        trip.actual_spend = trip.expenses.aggregate(
            total=__import__('django.db.models', fromlist=['Sum']).Sum('converted_amount')
        )['total'] or Decimal('0')
        trip.save(update_fields=['actual_spend'])
        
        return expense


class TripExpenseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating expenses with auto currency conversion."""
    
    class Meta:
        model = TripExpense
        fields = [
            'trip', 'amount', 'currency', 'category',
            'description', 'expense_date', 'location',
            'receipt_url', 'notes',
        ]
    
    def create(self, validated_data):
        trip = validated_data['trip']
        amount = validated_data['amount']
        currency = validated_data.get('currency', 'USD')
        
        # Get exchange rate (from cache or API)
        exchange_rate = Decimal('1')
        if currency != trip.budget_currency:
            # Try to get from cache
            from .models import ExchangeRateCache
            cache = ExchangeRateCache.objects.filter(
                base_currency=currency,
                target_currency=trip.budget_currency
            ).first()
            
            if cache and not cache.is_stale:
                exchange_rate = cache.rate
            # In production, fetch from API if not cached
        
        validated_data['exchange_rate'] = exchange_rate
        validated_data['converted_amount'] = amount * exchange_rate
        
        expense = TripExpense.objects.create(**validated_data)
        
        # Update trip's actual_spend
        from django.db.models import Sum
        trip.actual_spend = trip.expenses.aggregate(
            total=Sum('converted_amount')
        )['total'] or Decimal('0')
        trip.save(update_fields=['actual_spend'])
        
        return expense


class TripDocumentSerializer(serializers.ModelSerializer):
    """Serializer for TripDocument model."""
    
    is_expiring_soon = serializers.BooleanField(read_only=True)
    trip_name = serializers.CharField(source='trip.name', read_only=True)
    
    class Meta:
        model = TripDocument
        fields = [
            'id', 'trip', 'trip_name', 'document_type', 'name', 'description',
            'file_url', 'confirmation_number', 'expiration_date',
            'is_expiring_soon', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PackingItemSerializer(serializers.ModelSerializer):
    """Serializer for PackingItem model."""
    
    class Meta:
        model = PackingItem
        fields = [
            'id', 'packing_list', 'name', 'category',
            'quantity', 'is_packed', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PackingListSerializer(serializers.ModelSerializer):
    """Serializer for PackingList model with items."""
    
    items = PackingItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    packed_items = serializers.IntegerField(read_only=True)
    packing_progress = serializers.FloatField(read_only=True)
    trip_name = serializers.CharField(source='trip.name', read_only=True)
    
    class Meta:
        model = PackingList
        fields = [
            'id', 'trip', 'trip_name', 'template_name', 'is_template',
            'items', 'total_items', 'packed_items', 'packing_progress',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PackingListCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating packing lists."""
    
    from_template_id = serializers.UUIDField(required=False, write_only=True)
    
    class Meta:
        model = PackingList
        fields = ['trip', 'template_name', 'is_template', 'from_template_id']
    
    def create(self, validated_data):
        from_template_id = validated_data.pop('from_template_id', None)
        packing_list = PackingList.objects.create(**validated_data)
        
        # Copy items from template if specified
        if from_template_id:
            try:
                template = PackingList.objects.get(
                    id=from_template_id,
                    is_template=True
                )
                for item in template.items.all():
                    PackingItem.objects.create(
                        packing_list=packing_list,
                        name=item.name,
                        category=item.category,
                        quantity=item.quantity,
                        notes=item.notes
                    )
            except PackingList.DoesNotExist:
                pass
        
        return packing_list


class ItineraryActivitySerializer(serializers.ModelSerializer):
    """Serializer for ItineraryActivity model."""
    
    class Meta:
        model = ItineraryActivity
        fields = [
            'id', 'itinerary', 'activity_type', 'name', 'description',
            'start_time', 'end_time', 'location', 'latitude', 'longitude',
            'estimated_cost', 'booking_reference', 'order', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ItinerarySerializer(serializers.ModelSerializer):
    """Serializer for Itinerary model with activities."""
    
    activities = ItineraryActivitySerializer(many=True, read_only=True)
    activity_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Itinerary
        fields = [
            'id', 'trip', 'day_number', 'date', 'title', 'notes',
            'activities', 'activity_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_activity_count(self, obj):
        return obj.activities.count()


class TravelGoalSerializer(serializers.ModelSerializer):
    """Serializer for TravelGoal model."""
    
    country_flag = serializers.SerializerMethodField()
    linked_trip_name = serializers.CharField(
        source='linked_trip.name', read_only=True, allow_null=True
    )
    
    class Meta:
        model = TravelGoal
        fields = [
            'id', 'destination', 'country', 'country_code', 'country_flag',
            'description', 'target_date', 'estimated_budget',
            'priority', 'is_achieved', 'achieved_date', 'linked_trip',
            'linked_trip_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'achieved_date', 'created_at', 'updated_at']
    
    def get_country_flag(self, obj):
        if not obj.country_code or len(obj.country_code) != 2:
            return ''
        return ''.join(chr(ord(c) + 127397) for c in obj.country_code.upper())


# Dashboard/Aggregate Serializers

class TripDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer for a single trip with all related data."""
    
    expenses = TripExpenseSerializer(many=True, read_only=True)
    documents = TripDocumentSerializer(many=True, read_only=True)
    itinerary_days = ItinerarySerializer(many=True, read_only=True)
    packing_list = PackingListSerializer(read_only=True)
    
    duration_days = serializers.IntegerField(read_only=True)
    days_until_trip = serializers.IntegerField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    budget_remaining = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    budget_utilization_percentage = serializers.FloatField(read_only=True)
    country_flag = serializers.SerializerMethodField()
    expense_by_category = serializers.SerializerMethodField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'name', 'description',
            'city', 'country', 'country_code', 'country_flag', 'timezone',
            'latitude', 'longitude',
            'start_date', 'end_date', 'trip_type', 'status',
            'budget_amount', 'budget_currency', 'actual_spend',
            'budget_flights', 'budget_accommodation', 'budget_food',
            'budget_activities', 'budget_transport', 'budget_shopping', 'budget_other',
            'color', 'cover_image_url', 'calendar_event_id',
            'notes', 'is_archived',
            'duration_days', 'days_until_trip', 'is_upcoming', 'is_ongoing',
            'budget_remaining', 'budget_utilization_percentage',
            'expense_by_category',
            'expenses', 'documents', 'itinerary_days', 'packing_list',
            'created_at', 'updated_at',
        ]
    
    def get_country_flag(self, obj):
        if not obj.country_code or len(obj.country_code) != 2:
            return ''
        return ''.join(chr(ord(c) + 127397) for c in obj.country_code.upper())
    
    def get_expense_by_category(self, obj):
        """Get expense breakdown by category."""
        from django.db.models import Sum
        
        breakdown = obj.expenses.values('category').annotate(
            total=Sum('converted_amount')
        ).order_by('-total')
        
        return {
            item['category']: float(item['total'])
            for item in breakdown
        }


class DashboardSummarySerializer(serializers.Serializer):
    """Serializer for dashboard summary data."""
    
    total_trips = serializers.IntegerField()
    trips_this_year = serializers.IntegerField()
    countries_visited = serializers.IntegerField()
    total_days_traveled = serializers.IntegerField()
    total_spend_this_year = serializers.FloatField()
    upcoming_trips = serializers.IntegerField()
    active_trip = TripListSerializer(allow_null=True)
    next_trip = TripListSerializer(allow_null=True)


class TravelAnalyticsSerializer(serializers.Serializer):
    """Serializer for travel analytics data."""
    
    total_countries = serializers.IntegerField()
    total_trips = serializers.IntegerField()
    total_days = serializers.IntegerField()
    average_trip_duration = serializers.FloatField()
    average_trip_cost = serializers.FloatField()
    cost_per_day = serializers.FloatField()
    trips_by_type = serializers.DictField()
    spending_by_category = serializers.DictField()
    trips_by_year = serializers.ListField()
    top_destinations = serializers.ListField()


class BudgetBreakdownSerializer(serializers.Serializer):
    """Serializer for budget breakdown data."""
    
    category = serializers.CharField()
    budgeted = serializers.FloatField()
    actual = serializers.FloatField()
    remaining = serializers.FloatField()
    utilization = serializers.FloatField()


class MapDataSerializer(serializers.Serializer):
    """Serializer for world map visualization data."""
    
    country_code = serializers.CharField()
    country = serializers.CharField()
    visit_count = serializers.IntegerField()
    trips = serializers.ListField()


class ExchangeRateSerializer(serializers.ModelSerializer):
    """Serializer for exchange rate cache."""
    
    is_stale = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ExchangeRateCache
        fields = ['base_currency', 'target_currency', 'rate', 'fetched_at', 'is_stale']
        read_only_fields = ['fetched_at', 'is_stale']

