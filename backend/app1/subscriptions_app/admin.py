"""
Subscription Admin Configuration
"""

from django.contrib import admin
from .models import (
    Subscription,
    SubscriptionCharge,
    SubscriptionUsageSignal,
    SubscriptionAlert,
    SubscriptionAlertEvent,
    SubscriptionInsightSnapshot,
)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'user', 'amount', 'billing_cycle',
        'normalized_monthly_amount', 'category', 'status',
        'next_billing_date', 'is_essential'
    ]
    list_filter = ['status', 'category', 'billing_cycle', 'is_essential']
    search_fields = ['name', 'provider', 'user__username']
    date_hierarchy = 'next_billing_date'
    readonly_fields = ['id', 'normalized_monthly_amount', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'user', 'name', 'description', 'provider', 'website_url')
        }),
        ('Billing', {
            'fields': (
                'amount', 'currency', 'billing_cycle', 'custom_cycle_days',
                'normalized_monthly_amount'
            )
        }),
        ('Dates', {
            'fields': (
                'start_date', 'next_billing_date', 'trial_end_date', 'cancellation_date'
            )
        }),
        ('Categorization', {
            'fields': ('category', 'tags', 'status', 'is_essential', 'auto_renew')
        }),
        ('Display', {
            'fields': ('color', 'icon', 'logo_url')
        }),
        ('Integration', {
            'fields': ('calendar_event_id', 'reminder_days_before', 'external_id')
        }),
        ('Payment', {
            'fields': ('payment_method', 'last_payment_date', 'last_payment_amount')
        }),
        ('Metadata', {
            'fields': ('notes', 'created_at', 'updated_at')
        }),
    )


@admin.register(SubscriptionCharge)
class SubscriptionChargeAdmin(admin.ModelAdmin):
    list_display = [
        'subscription', 'amount', 'charged_at', 'source', 'previous_amount'
    ]
    list_filter = ['source', 'charged_at']
    search_fields = ['subscription__name']
    date_hierarchy = 'charged_at'
    readonly_fields = ['id', 'created_at']


@admin.register(SubscriptionUsageSignal)
class SubscriptionUsageSignalAdmin(admin.ModelAdmin):
    list_display = [
        'subscription', 'signal_type', 'last_used_at', 'confidence_score'
    ]
    list_filter = ['signal_type']
    search_fields = ['subscription__name']
    readonly_fields = ['id', 'created_at']


@admin.register(SubscriptionAlert)
class SubscriptionAlertAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'subscription', 'alert_type', 'threshold_value',
        'threshold_days', 'is_active'
    ]
    list_filter = ['alert_type', 'is_active']
    search_fields = ['user__username', 'subscription__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(SubscriptionAlertEvent)
class SubscriptionAlertEventAdmin(admin.ModelAdmin):
    list_display = [
        'subscription_name', 'severity', 'triggered_at',
        'is_read', 'is_dismissed', 'resolved_at'
    ]
    list_filter = ['severity', 'is_read', 'is_dismissed']
    search_fields = ['subscription_name', 'message']
    date_hierarchy = 'triggered_at'
    readonly_fields = ['id', 'triggered_at', 'created_at']


@admin.register(SubscriptionInsightSnapshot)
class SubscriptionInsightSnapshotAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'month', 'total_spend', 'active_count', 'unused_count'
    ]
    list_filter = ['month']
    search_fields = ['user__username']
    date_hierarchy = 'month'
    readonly_fields = ['id', 'created_at']
