"""
Subscription API Serializers
"""

from rest_framework import serializers
from .models import (
    Subscription,
    SubscriptionCharge,
    SubscriptionUsageSignal,
    SubscriptionAlert,
    SubscriptionAlertEvent,
    SubscriptionInsightSnapshot,
)


class SubscriptionSerializer(serializers.ModelSerializer):
    """Full subscription serializer."""
    
    monthly_cost = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    annual_cost = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    is_active = serializers.BooleanField(read_only=True)
    is_trial = serializers.BooleanField(read_only=True)
    days_until_billing = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'name', 'description', 'provider', 'website_url',
            'amount', 'currency', 'billing_cycle', 'custom_cycle_days',
            'normalized_monthly_amount', 'monthly_cost', 'annual_cost',
            'start_date', 'next_billing_date', 'trial_end_date', 'cancellation_date',
            'category', 'tags', 'status', 'is_essential', 'auto_renew',
            'color', 'icon', 'logo_url',
            'calendar_event_id', 'reminder_days_before',
            'payment_method', 'last_payment_date', 'last_payment_amount',
            'notes', 'external_id',
            'is_active', 'is_trial', 'days_until_billing',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'normalized_monthly_amount', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class SubscriptionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    
    monthly_cost = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    days_until_billing = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'name', 'amount', 'billing_cycle',
            'monthly_cost', 'category', 'status',
            'next_billing_date', 'days_until_billing',
            'color', 'icon', 'logo_url', 'is_essential',
        ]


class SubscriptionChargeSerializer(serializers.ModelSerializer):
    """Subscription charge serializer."""
    
    price_change = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    price_change_percentage = serializers.DecimalField(
        max_digits=6, decimal_places=2, read_only=True
    )
    
    class Meta:
        model = SubscriptionCharge
        fields = [
            'id', 'subscription', 'amount', 'currency',
            'charged_at', 'source', 'previous_amount',
            'price_change', 'price_change_percentage',
            'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SubscriptionUsageSignalSerializer(serializers.ModelSerializer):
    """Usage signal serializer."""
    
    class Meta:
        model = SubscriptionUsageSignal
        fields = [
            'id', 'subscription', 'signal_type',
            'last_used_at', 'confidence_score',
            'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SubscriptionAlertSerializer(serializers.ModelSerializer):
    """Alert rule serializer."""
    
    class Meta:
        model = SubscriptionAlert
        fields = [
            'id', 'subscription', 'alert_type',
            'threshold_value', 'threshold_days',
            'is_active', 'notify_email', 'notify_in_app',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class SubscriptionAlertEventSerializer(serializers.ModelSerializer):
    """Alert event serializer."""
    
    alert_type = serializers.CharField(source='alert.alert_type', read_only=True)
    
    class Meta:
        model = SubscriptionAlertEvent
        fields = [
            'id', 'alert', 'alert_type', 'triggered_at',
            'message', 'severity', 'subscription_name',
            'trigger_value', 'is_read', 'is_dismissed',
            'dismissed_at', 'resolved_at', 'resolution_notes',
            'created_at',
        ]
        read_only_fields = [
            'id', 'triggered_at', 'message', 'severity',
            'subscription_name', 'trigger_value', 'created_at',
        ]


class SubscriptionInsightSnapshotSerializer(serializers.ModelSerializer):
    """Insight snapshot serializer."""
    
    class Meta:
        model = SubscriptionInsightSnapshot
        fields = [
            'id', 'month', 'total_spend', 'active_count',
            'paused_count', 'trial_count', 'unused_count',
            'category_breakdown', 'new_subscriptions',
            'cancelled_subscriptions', 'price_increases',
            'spend_change', 'spend_change_percentage',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# Dashboard aggregation serializers
class DashboardSummarySerializer(serializers.Serializer):
    """Dashboard summary data."""
    monthly_spend = serializers.FloatField()
    annual_burn = serializers.FloatField()
    active_count = serializers.IntegerField()
    trial_count = serializers.IntegerField()
    paused_count = serializers.IntegerField()
    cancelled_count = serializers.IntegerField()
    unused_count = serializers.IntegerField()
    change_amount = serializers.FloatField()
    change_percentage = serializers.FloatField()
    trend = serializers.CharField()
    category_breakdown = serializers.DictField()


class UpcomingChargeSerializer(serializers.Serializer):
    """Upcoming charge data."""
    id = serializers.CharField()
    name = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    billing_cycle = serializers.CharField()
    next_billing_date = serializers.CharField()
    days_until = serializers.IntegerField()
    category = serializers.CharField()


class UnusedSubscriptionSerializer(serializers.Serializer):
    """Unused subscription data."""
    id = serializers.CharField()
    name = serializers.CharField()
    monthly_cost = serializers.DecimalField(max_digits=10, decimal_places=2)
    last_used = serializers.CharField(allow_null=True)
    days_unused = serializers.IntegerField(allow_null=True)
    category = serializers.CharField()
    annual_savings = serializers.DecimalField(max_digits=10, decimal_places=2)

