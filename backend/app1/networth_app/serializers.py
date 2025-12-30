"""
Net Worth Dashboard Serializers

DRF serializers for API data validation and transformation.
"""

from decimal import Decimal
from rest_framework import serializers
from .models import (
    FinancialAccount,
    AccountSnapshot,
    NetWorthSnapshot,
    CashFlowEntry,
    NetWorthMilestone,
    ChangeLog,
    AccountGroup,
)


class FinancialAccountSerializer(serializers.ModelSerializer):
    """Serializer for FinancialAccount model."""
    
    current_value = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    is_liability = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = FinancialAccount
        fields = [
            'id', 'name', 'account_type', 'subtype', 'data_source',
            'institution_name', 'apr', 'credit_limit', 'minimum_payment',
            'currency', 'color', 'icon', 'display_order', 'is_active',
            'is_hidden', 'notes', 'current_value', 'is_liability',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FinancialAccountCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating accounts with initial balance."""
    
    initial_balance = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False, default=Decimal('0')
    )
    
    class Meta:
        model = FinancialAccount
        fields = [
            'name', 'account_type', 'subtype', 'institution_name',
            'apr', 'credit_limit', 'minimum_payment', 'currency',
            'color', 'icon', 'notes', 'initial_balance',
        ]
    
    def create(self, validated_data):
        initial_balance = validated_data.pop('initial_balance', Decimal('0'))
        account = FinancialAccount.objects.create(**validated_data)
        
        # Create initial snapshot if balance provided
        if initial_balance != 0:
            from datetime import date
            AccountSnapshot.objects.create(
                account=account,
                value=initial_balance,
                recorded_at=date.today(),
                source=AccountSnapshot.SnapshotSource.MANUAL_ENTRY,
                created_by=self.context['request'].user,
            )
        
        return account


class AccountSnapshotSerializer(serializers.ModelSerializer):
    """Serializer for AccountSnapshot model."""
    
    account_name = serializers.CharField(source='account.name', read_only=True)
    change_from_previous = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    
    class Meta:
        model = AccountSnapshot
        fields = [
            'id', 'account', 'account_name', 'value', 'available_credit',
            'recorded_at', 'source', 'notes', 'change_from_previous',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class AccountSnapshotCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating snapshots."""
    
    class Meta:
        model = AccountSnapshot
        fields = ['account', 'value', 'recorded_at', 'notes']
    
    def create(self, validated_data):
        validated_data['source'] = AccountSnapshot.SnapshotSource.MANUAL_ENTRY
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class BulkSnapshotSerializer(serializers.Serializer):
    """Serializer for bulk snapshot updates."""
    
    snapshots = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    recorded_at = serializers.DateField()
    
    def validate_snapshots(self, value):
        for item in value:
            if 'account_id' not in item or 'value' not in item:
                raise serializers.ValidationError(
                    "Each snapshot must have 'account_id' and 'value'"
                )
            try:
                item['value'] = Decimal(str(item['value']))
            except:
                raise serializers.ValidationError(
                    f"Invalid value for account {item.get('account_id')}"
                )
        return value


class NetWorthSnapshotSerializer(serializers.ModelSerializer):
    """Serializer for NetWorthSnapshot model."""
    
    change_from_previous = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    change_percentage = serializers.DecimalField(
        max_digits=8, decimal_places=2, read_only=True
    )
    
    class Meta:
        model = NetWorthSnapshot
        fields = [
            'id', 'total_assets', 'total_liabilities', 'net_worth',
            'cash_total', 'investment_total', 'asset_total', 'debt_total',
            'recorded_at', 'change_from_previous', 'change_percentage',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class CashFlowEntrySerializer(serializers.ModelSerializer):
    """Serializer for CashFlowEntry model."""
    
    class Meta:
        model = CashFlowEntry
        fields = [
            'id', 'entry_type', 'amount', 'currency', 'description',
            'category', 'entry_date', 'is_recurring', 'recurrence_rule',
            'account', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NetWorthMilestoneSerializer(serializers.ModelSerializer):
    """Serializer for NetWorthMilestone model."""
    
    is_achieved = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = NetWorthMilestone
        fields = [
            'id', 'name', 'description', 'target_amount', 'milestone_type',
            'linked_account', 'target_date', 'achieved_at', 'color', 'icon',
            'display_order', 'is_active', 'is_celebrated', 'is_achieved',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'achieved_at', 'created_at', 'updated_at']


class ChangeLogSerializer(serializers.ModelSerializer):
    """Serializer for ChangeLog model."""
    
    class Meta:
        model = ChangeLog
        fields = [
            'id', 'change_type', 'description', 'amount_change',
            'percentage_change', 'related_account', 'related_milestone',
            'importance', 'is_positive', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class AccountGroupSerializer(serializers.ModelSerializer):
    """Serializer for AccountGroup model."""
    
    total_value = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    account_ids = serializers.PrimaryKeyRelatedField(
        source='accounts',
        queryset=FinancialAccount.objects.all(),
        many=True,
        required=False
    )
    
    class Meta:
        model = AccountGroup
        fields = [
            'id', 'name', 'description', 'color', 'icon',
            'display_order', 'accounts', 'account_ids', 'total_value',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# Dashboard aggregate serializers

class DashboardSummarySerializer(serializers.Serializer):
    """Serializer for dashboard summary data."""
    
    net_worth = serializers.FloatField()
    total_assets = serializers.FloatField()
    total_liabilities = serializers.FloatField()
    cash_total = serializers.FloatField()
    investment_total = serializers.FloatField()
    asset_total = serializers.FloatField()
    debt_total = serializers.FloatField()
    change_amount = serializers.FloatField()
    change_percentage = serializers.FloatField()
    trend = serializers.CharField()
    last_updated = serializers.CharField(allow_null=True)


class TimelinePointSerializer(serializers.Serializer):
    """Serializer for timeline data points."""
    
    date = serializers.CharField()
    net_worth = serializers.FloatField()
    total_assets = serializers.FloatField()
    total_liabilities = serializers.FloatField()
    cash = serializers.FloatField()
    investments = serializers.FloatField()
    assets = serializers.FloatField()
    debt = serializers.FloatField()


class ForecastPointSerializer(serializers.Serializer):
    """Serializer for forecast data points."""
    
    date = serializers.CharField()
    projected_net_worth = serializers.FloatField()
    is_forecast = serializers.BooleanField()


class AccountBreakdownSerializer(serializers.Serializer):
    """Serializer for account breakdown data."""
    
    id = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField()
    subtype = serializers.CharField()
    value = serializers.FloatField()
    institution = serializers.CharField(allow_blank=True)
    color = serializers.CharField()
    last_updated = serializers.CharField(allow_null=True)
    apr = serializers.FloatField(allow_null=True, required=False)
    credit_limit = serializers.FloatField(allow_null=True, required=False)
    minimum_payment = serializers.FloatField(allow_null=True, required=False)


class CashFlowSummarySerializer(serializers.Serializer):
    """Serializer for cash flow summary."""
    
    period = serializers.CharField()
    income = serializers.FloatField()
    expenses = serializers.FloatField()
    net_flow = serializers.FloatField()
    savings_rate = serializers.FloatField()


class InsightSerializer(serializers.Serializer):
    """Serializer for insights."""
    
    id = serializers.CharField()
    type = serializers.CharField()
    description = serializers.CharField()
    amount_change = serializers.FloatField(allow_null=True)
    percentage_change = serializers.FloatField(allow_null=True)
    is_positive = serializers.BooleanField()
    importance = serializers.IntegerField()
    created_at = serializers.CharField()


class MilestoneWithProgressSerializer(serializers.Serializer):
    """Serializer for milestones with progress."""
    
    id = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    target_amount = serializers.FloatField()
    current_value = serializers.FloatField()
    progress = serializers.FloatField()
    milestone_type = serializers.CharField()
    target_date = serializers.CharField(allow_null=True)
    achieved_at = serializers.CharField(allow_null=True)
    is_achieved = serializers.BooleanField()
    is_celebrated = serializers.BooleanField()
    color = serializers.CharField()

