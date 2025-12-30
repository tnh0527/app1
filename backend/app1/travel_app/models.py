"""
Travel Management Models

Production-grade travel planning and tracking models following these principles:
- UUID primary keys for all models
- Append-only expense tracking for financial integrity
- Time-series design for itineraries and activities
- PostgreSQL-optimized with proper indexes and constraints
"""

import uuid
from decimal import Decimal
from datetime import date, timedelta
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Trip(models.Model):
    """
    Core trip model representing a travel trip.
    
    Contains all essential information about a trip including destination,
    dates, budget, and status tracking.
    """
    
    class TripType(models.TextChoices):
        VACATION = 'vacation', 'Vacation'
        BUSINESS = 'business', 'Business'
        ADVENTURE = 'adventure', 'Adventure'
        CITY_BREAK = 'city_break', 'City Break'
        BEACH = 'beach', 'Beach'
        ROAD_TRIP = 'road_trip', 'Road Trip'
        BACKPACKING = 'backpacking', 'Backpacking'
    
    class TripStatus(models.TextChoices):
        PLANNING = 'planning', 'Planning'
        BOOKED = 'booked', 'Booked'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trips'
    )
    
    # Basic info
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Destination
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    country_code = models.CharField(max_length=2, help_text='2-letter ISO country code')
    timezone = models.CharField(max_length=64, default='UTC')
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    
    # Dates
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    
    # Trip type and status
    trip_type = models.CharField(
        max_length=20,
        choices=TripType.choices,
        default=TripType.VACATION
    )
    status = models.CharField(
        max_length=20,
        choices=TripStatus.choices,
        default=TripStatus.PLANNING,
        db_index=True
    )
    
    # Budget fields
    budget_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))]
    )
    budget_currency = models.CharField(max_length=3, default='USD')
    actual_spend = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))]
    )
    
    # Budget category breakdowns
    budget_flights = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0')
    )
    budget_accommodation = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0')
    )
    budget_food = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0')
    )
    budget_activities = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0')
    )
    budget_transport = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0')
    )
    budget_shopping = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0')
    )
    budget_other = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0')
    )
    
    # Display customization
    color = models.CharField(max_length=7, default='#208585')  # Hex color
    cover_image_url = models.URLField(max_length=500, blank=True)
    
    # Integration with calendar app
    calendar_event_id = models.CharField(max_length=100, blank=True)
    
    # Metadata
    notes = models.TextField(blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['owner', 'start_date']),
            models.Index(fields=['owner', 'is_archived']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.city}, {self.country}"
    
    @property
    def duration_days(self):
        """Calculate trip duration in days."""
        return (self.end_date - self.start_date).days + 1
    
    @property
    def days_until_trip(self):
        """Calculate days until trip starts."""
        today = date.today()
        if today >= self.start_date:
            return 0
        return (self.start_date - today).days
    
    @property
    def is_upcoming(self):
        """Check if trip is upcoming (within next 30 days)."""
        today = date.today()
        return today < self.start_date and self.days_until_trip <= 30
    
    @property
    def is_ongoing(self):
        """Check if trip is currently in progress."""
        today = date.today()
        return self.start_date <= today <= self.end_date
    
    @property
    def budget_remaining(self):
        """Calculate remaining budget."""
        return self.budget_amount - self.actual_spend
    
    @property
    def budget_utilization_percentage(self):
        """Calculate budget utilization percentage."""
        if self.budget_amount == 0:
            return 0
        return (self.actual_spend / self.budget_amount) * 100


class TripExpense(models.Model):
    """
    Append-only expense tracking for trips.
    
    Supports multi-currency expenses with automatic conversion to trip budget currency.
    """
    
    class ExpenseCategory(models.TextChoices):
        FLIGHTS = 'flights', 'Flights'
        ACCOMMODATION = 'accommodation', 'Accommodation'
        FOOD = 'food', 'Food & Dining'
        ACTIVITIES = 'activities', 'Activities'
        TRANSPORT = 'transport', 'Local Transport'
        SHOPPING = 'shopping', 'Shopping'
        OTHER = 'other', 'Other'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='expenses'
    )
    
    # Amount in original currency
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    currency = models.CharField(max_length=3, default='USD')
    
    # Converted amount in trip budget currency
    converted_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    exchange_rate = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        default=Decimal('1')
    )
    
    # Details
    category = models.CharField(
        max_length=20,
        choices=ExpenseCategory.choices,
        db_index=True
    )
    description = models.CharField(max_length=300)
    expense_date = models.DateField(db_index=True)
    location = models.CharField(max_length=200, blank=True)
    
    # Receipt
    receipt_url = models.URLField(max_length=500, blank=True)
    
    # Metadata
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-expense_date', '-created_at']
        indexes = [
            models.Index(fields=['trip', 'category']),
            models.Index(fields=['trip', 'expense_date']),
        ]
    
    def __str__(self):
        return f"{self.description} - {self.currency} {self.amount}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate converted amount if not set
        if self.converted_amount == 0:
            self.converted_amount = self.amount * self.exchange_rate
        super().save(*args, **kwargs)


class TripDocument(models.Model):
    """
    Document storage for trips.
    
    Supports various document types including travel documents, bookings, and insurance.
    """
    
    class DocumentType(models.TextChoices):
        PASSPORT = 'passport', 'Passport'
        VISA = 'visa', 'Visa'
        FLIGHT = 'flight', 'Flight Booking'
        HOTEL = 'hotel', 'Hotel Booking'
        RENTAL = 'rental', 'Car Rental'
        ACTIVITY = 'activity', 'Activity Booking'
        INSURANCE = 'insurance', 'Travel Insurance'
        OTHER = 'other', 'Other'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
        db_index=True
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    file_url = models.URLField(max_length=500, blank=True)
    confirmation_number = models.CharField(max_length=100, blank=True)
    
    # For passports/visas
    expiration_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['document_type', 'name']
        indexes = [
            models.Index(fields=['trip', 'document_type']),
        ]
    
    def __str__(self):
        return f"{self.get_document_type_display()}: {self.name}"
    
    @property
    def is_expiring_soon(self):
        """Check if document expires within 6 months."""
        if not self.expiration_date:
            return False
        return self.expiration_date <= date.today() + timedelta(days=180)


class PackingList(models.Model):
    """
    Packing list for a trip.
    
    One-to-one relationship with Trip, with template support.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.OneToOneField(
        Trip,
        on_delete=models.CASCADE,
        related_name='packing_list',
        null=True,
        blank=True
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='packing_lists'
    )
    
    template_name = models.CharField(max_length=100, blank=True)
    is_template = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        if self.is_template:
            return f"Template: {self.template_name}"
        return f"Packing list for {self.trip.name if self.trip else 'Unknown'}"
    
    @property
    def total_items(self):
        return self.items.count()
    
    @property
    def packed_items(self):
        return self.items.filter(is_packed=True).count()
    
    @property
    def packing_progress(self):
        total = self.total_items
        if total == 0:
            return 0
        return (self.packed_items / total) * 100


class PackingItem(models.Model):
    """
    Individual item in a packing list.
    """
    
    class ItemCategory(models.TextChoices):
        CLOTHING = 'clothing', 'Clothing'
        TOILETRIES = 'toiletries', 'Toiletries'
        ELECTRONICS = 'electronics', 'Electronics'
        DOCUMENTS = 'documents', 'Documents'
        MEDICATIONS = 'medications', 'Medications'
        ACCESSORIES = 'accessories', 'Accessories'
        OTHER = 'other', 'Other'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    packing_list = models.ForeignKey(
        PackingList,
        on_delete=models.CASCADE,
        related_name='items'
    )
    
    name = models.CharField(max_length=100)
    category = models.CharField(
        max_length=20,
        choices=ItemCategory.choices,
        default=ItemCategory.OTHER
    )
    quantity = models.PositiveIntegerField(default=1)
    is_packed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        packed_status = '✓' if self.is_packed else '○'
        return f"{packed_status} {self.name} (x{self.quantity})"


class Itinerary(models.Model):
    """
    Day-by-day itinerary for a trip.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name='itinerary_days'
    )
    
    day_number = models.PositiveIntegerField()
    date = models.DateField()
    title = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['date']
        constraints = [
            models.UniqueConstraint(
                fields=['trip', 'day_number'],
                name='uniq_itinerary_trip_day'
            )
        ]
    
    def __str__(self):
        return f"Day {self.day_number}: {self.title or self.date}"


class ItineraryActivity(models.Model):
    """
    Individual activity within an itinerary day.
    """
    
    class ActivityType(models.TextChoices):
        ATTRACTION = 'attraction', 'Attraction'
        RESTAURANT = 'restaurant', 'Restaurant'
        TRANSPORT = 'transport', 'Transport'
        ACTIVITY = 'activity', 'Activity'
        FREE_TIME = 'free_time', 'Free Time'
        OTHER = 'other', 'Other'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    itinerary = models.ForeignKey(
        Itinerary,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    
    activity_type = models.CharField(
        max_length=20,
        choices=ActivityType.choices,
        default=ActivityType.ACTIVITY
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    
    location = models.CharField(max_length=300, blank=True)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    
    estimated_cost = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    booking_reference = models.CharField(max_length=100, blank=True)
    
    order = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'start_time']
    
    def __str__(self):
        time_str = f" at {self.start_time}" if self.start_time else ""
        return f"{self.name}{time_str}"


class TravelGoal(models.Model):
    """
    Bucket list destinations and travel goals.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='travel_goals'
    )
    
    destination = models.CharField(max_length=200)
    country = models.CharField(max_length=100)
    country_code = models.CharField(max_length=2, help_text='2-letter ISO country code')
    
    description = models.TextField(blank=True)
    target_date = models.DateField(null=True, blank=True)
    estimated_budget = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    
    priority = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    
    is_achieved = models.BooleanField(default=False)
    achieved_date = models.DateField(null=True, blank=True)
    linked_trip = models.ForeignKey(
        Trip,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='achieved_goals'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority', 'target_date']
    
    def __str__(self):
        achieved = '✓' if self.is_achieved else '○'
        return f"{achieved} {self.destination}, {self.country}"


class ExchangeRateCache(models.Model):
    """
    Cache for exchange rates to minimize API calls.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    base_currency = models.CharField(max_length=3)
    target_currency = models.CharField(max_length=3)
    rate = models.DecimalField(max_digits=12, decimal_places=6)
    
    fetched_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['base_currency', 'target_currency']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['base_currency', 'target_currency'],
                name='uniq_exchange_rate_pair'
            )
        ]
    
    def __str__(self):
        return f"{self.base_currency}/{self.target_currency}: {self.rate}"
    
    @property
    def is_stale(self):
        """Check if rate is older than 1 hour."""
        return timezone.now() - self.fetched_at > timedelta(hours=1)

