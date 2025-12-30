"""
Travel App Admin Configuration

Comprehensive admin interface for travel management models.
"""

from django.contrib import admin
from django.utils.html import format_html
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


class TripExpenseInline(admin.TabularInline):
    model = TripExpense
    extra = 0
    readonly_fields = ['id', 'created_at', 'converted_amount']
    fields = ['category', 'description', 'amount', 'currency', 'converted_amount', 'expense_date']


class TripDocumentInline(admin.TabularInline):
    model = TripDocument
    extra = 0
    readonly_fields = ['id', 'created_at']
    fields = ['document_type', 'name', 'confirmation_number', 'expiration_date']


class ItineraryInline(admin.TabularInline):
    model = Itinerary
    extra = 0
    readonly_fields = ['id', 'created_at']
    fields = ['day_number', 'date', 'title']


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'owner', 'destination_display', 'trip_type', 'status_badge',
        'date_range', 'budget_display', 'duration_display', 'created_at'
    ]
    list_filter = ['trip_type', 'status', 'is_archived', 'country']
    search_fields = ['name', 'city', 'country', 'owner__username', 'owner__email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'actual_spend']
    ordering = ['-start_date']
    date_hierarchy = 'start_date'
    inlines = [TripExpenseInline, TripDocumentInline, ItineraryInline]
    
    fieldsets = (
        (None, {
            'fields': ('id', 'owner', 'name', 'description')
        }),
        ('Destination', {
            'fields': ('city', 'country', 'country_code', 'timezone', 'latitude', 'longitude')
        }),
        ('Dates', {
            'fields': ('start_date', 'end_date')
        }),
        ('Trip Details', {
            'fields': ('trip_type', 'status', 'color', 'cover_image_url')
        }),
        ('Budget', {
            'fields': (
                'budget_amount', 'budget_currency', 'actual_spend',
                'budget_flights', 'budget_accommodation', 'budget_food',
                'budget_activities', 'budget_transport', 'budget_shopping', 'budget_other'
            )
        }),
        ('Integration', {
            'fields': ('calendar_event_id',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('notes', 'is_archived', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def destination_display(self, obj):
        flag = self._get_flag_emoji(obj.country_code)
        return f"{flag} {obj.city}, {obj.country}"
    destination_display.short_description = 'Destination'
    
    def status_badge(self, obj):
        colors = {
            'planning': '#ffc107',
            'booked': '#17a2b8',
            'in_progress': '#28a745',
            'completed': '#6c757d',
            'cancelled': '#dc3545',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: 500;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def date_range(self, obj):
        return f"{obj.start_date.strftime('%b %d')} - {obj.end_date.strftime('%b %d, %Y')}"
    date_range.short_description = 'Dates'
    
    def budget_display(self, obj):
        utilization = obj.budget_utilization_percentage
        color = '#28a745' if utilization < 80 else '#ffc107' if utilization < 100 else '#dc3545'
        return format_html(
            '<span style="color: {};">${:,.0f} / ${:,.0f}</span>',
            color, obj.actual_spend, obj.budget_amount
        )
    budget_display.short_description = 'Budget'
    
    def duration_display(self, obj):
        return f"{obj.duration_days} days"
    duration_display.short_description = 'Duration'
    
    def _get_flag_emoji(self, country_code):
        """Convert country code to flag emoji."""
        if not country_code or len(country_code) != 2:
            return ''
        return ''.join(chr(ord(c) + 127397) for c in country_code.upper())


@admin.register(TripExpense)
class TripExpenseAdmin(admin.ModelAdmin):
    list_display = [
        'description', 'trip', 'category', 'formatted_amount',
        'formatted_converted', 'expense_date', 'created_at'
    ]
    list_filter = ['category', 'currency', 'expense_date']
    search_fields = ['description', 'trip__name', 'location']
    readonly_fields = ['id', 'created_at']
    date_hierarchy = 'expense_date'
    ordering = ['-expense_date', '-created_at']
    
    def formatted_amount(self, obj):
        return f"{obj.currency} {obj.amount:,.2f}"
    formatted_amount.short_description = 'Amount'
    
    def formatted_converted(self, obj):
        return f"{obj.trip.budget_currency} {obj.converted_amount:,.2f}"
    formatted_converted.short_description = 'Converted'


@admin.register(TripDocument)
class TripDocumentAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'trip', 'document_type', 'confirmation_number',
        'expiration_status', 'created_at'
    ]
    list_filter = ['document_type', 'trip']
    search_fields = ['name', 'confirmation_number', 'trip__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['trip', 'document_type']
    
    def expiration_status(self, obj):
        if not obj.expiration_date:
            return '-'
        if obj.expiration_date < timezone.now().date():
            return format_html('<span style="color: #dc3545;">Expired</span>')
        if obj.is_expiring_soon:
            return format_html(
                '<span style="color: #ffc107;">Expires {}</span>',
                obj.expiration_date.strftime('%b %d, %Y')
            )
        return format_html(
            '<span style="color: #28a745;">Valid until {}</span>',
            obj.expiration_date.strftime('%b %d, %Y')
        )
    expiration_status.short_description = 'Status'


class PackingItemInline(admin.TabularInline):
    model = PackingItem
    extra = 0
    readonly_fields = ['id', 'created_at']
    fields = ['name', 'category', 'quantity', 'is_packed', 'notes']


@admin.register(PackingList)
class PackingListAdmin(admin.ModelAdmin):
    list_display = [
        'display_name', 'owner', 'trip', 'is_template',
        'packing_progress_display', 'created_at'
    ]
    list_filter = ['is_template', 'owner']
    search_fields = ['template_name', 'trip__name', 'owner__username']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [PackingItemInline]
    
    def display_name(self, obj):
        if obj.is_template:
            return f"📋 {obj.template_name}"
        return f"🧳 {obj.trip.name if obj.trip else 'Unassigned'}"
    display_name.short_description = 'Name'
    
    def packing_progress_display(self, obj):
        progress = obj.packing_progress
        packed = obj.packed_items
        total = obj.total_items
        color = '#28a745' if progress == 100 else '#ffc107' if progress > 50 else '#6c757d'
        return format_html(
            '<span style="color: {};">{}/{} ({:.0f}%)</span>',
            color, packed, total, progress
        )
    packing_progress_display.short_description = 'Progress'


@admin.register(PackingItem)
class PackingItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'packing_list', 'category', 'quantity', 'is_packed', 'created_at']
    list_filter = ['category', 'is_packed']
    search_fields = ['name', 'packing_list__trip__name']
    readonly_fields = ['id', 'created_at']


class ItineraryActivityInline(admin.TabularInline):
    model = ItineraryActivity
    extra = 0
    readonly_fields = ['id', 'created_at']
    fields = ['order', 'activity_type', 'name', 'start_time', 'end_time', 'location', 'estimated_cost']


@admin.register(Itinerary)
class ItineraryAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'trip', 'day_number', 'date', 'activity_count', 'created_at']
    list_filter = ['trip']
    search_fields = ['title', 'trip__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['trip', 'day_number']
    inlines = [ItineraryActivityInline]
    
    def display_name(self, obj):
        return obj.title or f"Day {obj.day_number}"
    display_name.short_description = 'Title'
    
    def activity_count(self, obj):
        count = obj.activities.count()
        return f"{count} activities"
    activity_count.short_description = 'Activities'


@admin.register(ItineraryActivity)
class ItineraryActivityAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'itinerary', 'activity_type', 'time_range',
        'location', 'estimated_cost', 'order'
    ]
    list_filter = ['activity_type', 'itinerary__trip']
    search_fields = ['name', 'location', 'itinerary__trip__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['itinerary', 'order', 'start_time']
    
    def time_range(self, obj):
        if not obj.start_time:
            return '-'
        if obj.end_time:
            return f"{obj.start_time.strftime('%H:%M')} - {obj.end_time.strftime('%H:%M')}"
        return obj.start_time.strftime('%H:%M')
    time_range.short_description = 'Time'


@admin.register(TravelGoal)
class TravelGoalAdmin(admin.ModelAdmin):
    list_display = [
        'destination_display', 'owner', 'priority_stars',
        'target_date', 'budget_display', 'achievement_status', 'created_at'
    ]
    list_filter = ['is_achieved', 'priority', 'country']
    search_fields = ['destination', 'country', 'owner__username']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-priority', 'target_date']
    
    def destination_display(self, obj):
        flag = self._get_flag_emoji(obj.country_code)
        return f"{flag} {obj.destination}, {obj.country}"
    destination_display.short_description = 'Destination'
    
    def priority_stars(self, obj):
        stars = '★' * obj.priority + '☆' * (10 - obj.priority)
        return stars
    priority_stars.short_description = 'Priority'
    
    def budget_display(self, obj):
        if obj.estimated_budget:
            return f"${obj.estimated_budget:,.0f}"
        return '-'
    budget_display.short_description = 'Budget'
    
    def achievement_status(self, obj):
        if obj.is_achieved:
            return format_html(
                '<span style="color: #28a745;">✓ Achieved {}</span>',
                obj.achieved_date.strftime('%b %Y') if obj.achieved_date else ''
            )
        return format_html('<span style="color: #6c757d;">Pending</span>')
    achievement_status.short_description = 'Status'
    
    def _get_flag_emoji(self, country_code):
        if not country_code or len(country_code) != 2:
            return ''
        return ''.join(chr(ord(c) + 127397) for c in country_code.upper())


@admin.register(ExchangeRateCache)
class ExchangeRateCacheAdmin(admin.ModelAdmin):
    list_display = ['currency_pair', 'rate', 'fetched_at', 'staleness_status']
    search_fields = ['base_currency', 'target_currency']
    readonly_fields = ['id', 'fetched_at']
    
    def currency_pair(self, obj):
        return f"{obj.base_currency}/{obj.target_currency}"
    currency_pair.short_description = 'Pair'
    
    def staleness_status(self, obj):
        if obj.is_stale:
            return format_html('<span style="color: #ffc107;">Stale</span>')
        return format_html('<span style="color: #28a745;">Fresh</span>')
    staleness_status.short_description = 'Status'

