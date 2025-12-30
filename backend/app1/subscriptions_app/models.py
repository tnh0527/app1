"""
Subscriptions App Models

Standalone subscription management with:
- Core subscription tracking
- Usage signals for unused detection  
- Alerting system
- Analytics snapshots

All data is user-scoped and historical records are append-only.
"""

import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta


class Subscription(models.Model):
    """
    Core subscription record.
    
    Tracks recurring payments with normalized monthly amounts,
    calendar integration, and usage tracking.
    """
    
    class BillingCycle(models.TextChoices):
        WEEKLY = 'weekly', 'Weekly'
        BIWEEKLY = 'biweekly', 'Bi-weekly'
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        SEMIANNUAL = 'semiannual', 'Semi-Annual'
        ANNUAL = 'annual', 'Annual'
        CUSTOM = 'custom', 'Custom'
    
    class Category(models.TextChoices):
        STREAMING = 'streaming', 'Streaming & Entertainment'
        SOFTWARE = 'software', 'Software & Apps'
        UTILITIES = 'utilities', 'Utilities'
        INSURANCE = 'insurance', 'Insurance'
        MEMBERSHIP = 'membership', 'Memberships'
        FINANCIAL = 'financial', 'Financial Services'
        HEALTH = 'health', 'Health & Fitness'
        EDUCATION = 'education', 'Education'
        CLOUD = 'cloud', 'Cloud Services'
        NEWS = 'news', 'News & Media'
        GAMING = 'gaming', 'Gaming'
        FOOD = 'food', 'Food & Delivery'
        PRODUCTIVITY = 'productivity', 'Productivity'
        SECURITY = 'security', 'Security'
        OTHER = 'other', 'Other'
    
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        CANCELLED = 'cancelled', 'Cancelled'
        TRIAL = 'trial', 'Trial'
        EXPIRED = 'expired', 'Expired'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions_v2'
    )
    
    # Basic info
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    provider = models.CharField(max_length=200, blank=True, help_text='Service provider name')
    website_url = models.URLField(blank=True)
    
    # Billing
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    currency = models.CharField(max_length=3, default='USD')
    billing_cycle = models.CharField(
        max_length=20,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY
    )
    custom_cycle_days = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text='Days between charges for custom cycle'
    )
    
    # Derived/cached for query efficiency
    normalized_monthly_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        help_text='Monthly equivalent amount (auto-calculated)'
    )
    
    # Dates
    start_date = models.DateField()
    next_billing_date = models.DateField(db_index=True)
    trial_end_date = models.DateField(null=True, blank=True)
    cancellation_date = models.DateField(null=True, blank=True)
    
    # Categorization
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER,
        db_index=True
    )
    tags = models.JSONField(default=list, blank=True, help_text='Custom tags')
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True
    )
    is_essential = models.BooleanField(
        default=False,
        help_text='Mark as essential (not candidate for cancellation)'
    )
    auto_renew = models.BooleanField(default=True)
    
    # Display
    color = models.CharField(max_length=7, default='#208585')
    icon = models.CharField(max_length=50, blank=True)
    logo_url = models.URLField(blank=True)
    
    # Calendar integration (references schedule_app)
    calendar_event_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        help_text='Link to Calendar event for reminders'
    )
    reminder_days_before = models.PositiveIntegerField(
        default=3,
        help_text='Days before billing to send reminder'
    )
    
    # Payment tracking
    payment_method = models.CharField(max_length=100, blank=True)
    last_payment_date = models.DateField(null=True, blank=True)
    last_payment_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Metadata
    notes = models.TextField(blank=True)
    external_id = models.CharField(max_length=255, blank=True, help_text='External service ID')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['next_billing_date', 'name']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'next_billing_date']),
            models.Index(fields=['user', 'category']),
            models.Index(fields=['user', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'name'],
                name='uniq_subscription_user_name'
            )
        ]
    
    def __str__(self):
        return f"{self.name} - ${self.amount}/{self.billing_cycle}"
    
    def save(self, *args, **kwargs):
        """Auto-calculate normalized monthly amount on save."""
        self.normalized_monthly_amount = self._calculate_monthly_amount()
        super().save(*args, **kwargs)
    
    def _calculate_monthly_amount(self):
        """Calculate monthly equivalent cost."""
        multipliers = {
            'weekly': Decimal('4.33'),
            'biweekly': Decimal('2.17'),
            'monthly': Decimal('1'),
            'quarterly': Decimal('0.33'),
            'semiannual': Decimal('0.17'),
            'annual': Decimal('0.083'),
        }
        
        if self.billing_cycle == 'custom' and self.custom_cycle_days:
            # Calculate based on custom cycle
            return (self.amount * Decimal('30.44')) / Decimal(self.custom_cycle_days)
        
        return self.amount * multipliers.get(self.billing_cycle, Decimal('1'))
    
    @property
    def monthly_cost(self):
        """Monthly equivalent cost (uses cached value)."""
        return self.normalized_monthly_amount
    
    @property
    def annual_cost(self):
        """Annual cost."""
        return self.normalized_monthly_amount * 12
    
    @property
    def is_active(self):
        """Check if subscription is currently active."""
        return self.status in [self.Status.ACTIVE, self.Status.TRIAL]
    
    @property
    def is_trial(self):
        """Check if in trial period."""
        if self.status != self.Status.TRIAL:
            return False
        if self.trial_end_date:
            return timezone.now().date() <= self.trial_end_date
        return False
    
    @property
    def days_until_billing(self):
        """Days until next billing."""
        if not self.next_billing_date:
            return None
        delta = self.next_billing_date - timezone.now().date()
        return delta.days


class SubscriptionCharge(models.Model):
    """
    Historical record of subscription charges.
    
    APPEND-ONLY table for tracking payment history.
    Enables price change detection and spending analysis.
    """
    
    class Source(models.TextChoices):
        MANUAL = 'manual', 'Manual Entry'
        API = 'api', 'API/Bank Sync'
        IMPORT = 'import', 'Data Import'
        AUTO = 'auto', 'Auto-Generated'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='charges'
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    currency = models.CharField(max_length=3, default='USD')
    
    charged_at = models.DateField(db_index=True)
    
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL
    )
    
    # Track price changes
    previous_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Previous charge amount for comparison'
    )
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-charged_at', '-created_at']
        indexes = [
            models.Index(fields=['subscription', 'charged_at']),
            models.Index(fields=['charged_at']),
        ]
    
    def __str__(self):
        return f"{self.subscription.name}: ${self.amount} on {self.charged_at}"
    
    @property
    def price_change(self):
        """Calculate price change from previous charge."""
        if self.previous_amount:
            return self.amount - self.previous_amount
        return None
    
    @property
    def price_change_percentage(self):
        """Calculate percentage price change."""
        if self.previous_amount and self.previous_amount != 0:
            return ((self.amount - self.previous_amount) / self.previous_amount) * 100
        return None


class SubscriptionUsageSignal(models.Model):
    """
    Tracks usage signals for unused subscription detection.
    
    Signals can be:
    - Manual check-ins (user confirms usage)
    - Auto-detected (from linked services)
    - Inferred (from calendar events, etc.)
    """
    
    class SignalType(models.TextChoices):
        MANUAL_CHECKIN = 'manual_checkin', 'Manual Check-in'
        AUTO_DETECTED = 'auto_detected', 'Auto-Detected'
        CALENDAR_EVENT = 'calendar_event', 'Calendar Event'
        INFERRED = 'inferred', 'Inferred'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='usage_signals'
    )
    
    signal_type = models.CharField(
        max_length=20,
        choices=SignalType.choices,
        default=SignalType.MANUAL_CHECKIN
    )
    
    last_used_at = models.DateField(
        null=True,
        blank=True,
        help_text='Date subscription was last used'
    )
    
    confidence_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('1.0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('1'))],
        help_text='Confidence in the usage signal (0-1)'
    )
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subscription', 'created_at']),
            models.Index(fields=['subscription', 'last_used_at']),
        ]
    
    def __str__(self):
        return f"{self.subscription.name}: {self.signal_type} at {self.last_used_at}"


class SubscriptionAlert(models.Model):
    """
    Alert rules for subscription monitoring.
    
    Can be subscription-specific or user-global.
    """
    
    class AlertType(models.TextChoices):
        PRICE_INCREASE = 'price_increase', 'Price Increase'
        UNUSED = 'unused', 'Unused Subscription'
        UPCOMING_CHARGE = 'upcoming_charge', 'Upcoming Charge'
        ANNUAL_SPIKE = 'annual_spike', 'Annual Spending Spike'
        TRIAL_ENDING = 'trial_ending', 'Trial Ending'
        SPEND_THRESHOLD = 'spend_threshold', 'Monthly Spend Threshold'
        DUPLICATE = 'duplicate', 'Potential Duplicate'
        RENEWAL = 'renewal', 'Renewal Reminder'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription_alerts'
    )
    
    # Nullable for global alerts
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='alerts'
    )
    
    alert_type = models.CharField(
        max_length=20,
        choices=AlertType.choices,
        db_index=True
    )
    
    # Thresholds
    threshold_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Threshold value (e.g., % increase, $ amount, days)'
    )
    threshold_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Days threshold (e.g., unused for X days)'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Notification settings
    notify_email = models.BooleanField(default=False)
    notify_in_app = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'alert_type']),
        ]
    
    def __str__(self):
        sub_name = self.subscription.name if self.subscription else 'Global'
        return f"{sub_name}: {self.get_alert_type_display()}"


class SubscriptionAlertEvent(models.Model):
    """
    Triggered alert instances.
    
    APPEND-ONLY for audit trail.
    """
    
    class Severity(models.TextChoices):
        INFO = 'info', 'Info'
        WARNING = 'warning', 'Warning'
        CRITICAL = 'critical', 'Critical'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alert = models.ForeignKey(
        SubscriptionAlert,
        on_delete=models.CASCADE,
        related_name='events'
    )
    
    triggered_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    message = models.TextField()
    
    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        default=Severity.INFO
    )
    
    # Related data at time of trigger
    subscription_name = models.CharField(max_length=200)
    trigger_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Resolution
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-triggered_at']
        indexes = [
            models.Index(fields=['alert', 'triggered_at']),
            models.Index(fields=['is_read', 'is_dismissed']),
        ]
    
    def __str__(self):
        return f"{self.subscription_name}: {self.message[:50]}"
    
    def dismiss(self, notes=''):
        """Dismiss the alert event."""
        self.is_dismissed = True
        self.dismissed_at = timezone.now()
        self.resolution_notes = notes
        self.save(update_fields=['is_dismissed', 'dismissed_at', 'resolution_notes'])
    
    def resolve(self, notes=''):
        """Mark alert as resolved."""
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save(update_fields=['resolved_at', 'resolution_notes'])


class SubscriptionInsightSnapshot(models.Model):
    """
    Cached analytics snapshot for performance.
    
    Optional caching layer - analytics can be computed on-demand
    but this speeds up dashboard loads.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription_insights'
    )
    
    # Time period
    month = models.DateField(help_text='First day of the month')
    
    # Aggregates
    total_spend = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0')
    )
    active_count = models.PositiveIntegerField(default=0)
    paused_count = models.PositiveIntegerField(default=0)
    trial_count = models.PositiveIntegerField(default=0)
    unused_count = models.PositiveIntegerField(default=0)
    
    # Category breakdown (stored as JSON for flexibility)
    category_breakdown = models.JSONField(default=dict)
    
    # Change tracking
    new_subscriptions = models.PositiveIntegerField(default=0)
    cancelled_subscriptions = models.PositiveIntegerField(default=0)
    price_increases = models.PositiveIntegerField(default=0)
    spend_change = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    spend_change_percentage = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-month']
        indexes = [
            models.Index(fields=['user', 'month']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'month'],
                name='uniq_insight_user_month'
            )
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.month.strftime('%Y-%m')}: ${self.total_spend}"
