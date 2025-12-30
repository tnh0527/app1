from django.contrib import admin
from django.utils.html import format_html
from .models import (
    FinancialAccount,
    AccountSnapshot,
    NetWorthSnapshot,
    Subscription,
    CashFlowEntry,
    NetWorthMilestone,
    ChangeLog,
    AccountGroup,
)


@admin.register(FinancialAccount)
class FinancialAccountAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'owner', 'account_type', 'subtype',
        'formatted_value', 'institution_name', 'is_active', 'created_at'
    ]
    list_filter = ['account_type', 'subtype', 'data_source', 'is_active', 'currency']
    search_fields = ['name', 'institution_name', 'owner__username', 'owner__email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['owner', 'display_order', 'name']
    
    fieldsets = (
        (None, {
            'fields': ('id', 'owner', 'name', 'account_type', 'subtype')
        }),
        ('Source', {
            'fields': ('data_source', 'institution_name', 'external_id', 'last_synced_at')
        }),
        ('Debt Details', {
            'fields': ('apr', 'credit_limit', 'minimum_payment'),
            'classes': ('collapse',)
        }),
        ('Display', {
            'fields': ('color', 'icon', 'display_order', 'currency')
        }),
        ('Status', {
            'fields': ('is_active', 'is_hidden', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def formatted_value(self, obj):
        value = obj.current_value
        color = '#00fe93' if not obj.is_liability else '#fe1e00'
        return format_html(
            '<span style="color: {};">${:,.2f}</span>',
            color, value
        )
    formatted_value.short_description = 'Current Value'


@admin.register(AccountSnapshot)
class AccountSnapshotAdmin(admin.ModelAdmin):
    list_display = [
        'account', 'formatted_value', 'recorded_at', 'source', 'created_at'
    ]
    list_filter = ['source', 'recorded_at', 'account__account_type']
    search_fields = ['account__name', 'account__owner__username', 'notes']
    readonly_fields = ['id', 'created_at', 'created_by']
    date_hierarchy = 'recorded_at'
    ordering = ['-recorded_at', '-created_at']
    
    def formatted_value(self, obj):
        return f"${obj.value:,.2f}"
    formatted_value.short_description = 'Value'


@admin.register(NetWorthSnapshot)
class NetWorthSnapshotAdmin(admin.ModelAdmin):
    list_display = [
        'owner', 'formatted_net_worth', 'formatted_assets',
        'formatted_liabilities', 'recorded_at', 'created_at'
    ]
    list_filter = ['recorded_at']
    search_fields = ['owner__username', 'owner__email']
    readonly_fields = ['id', 'created_at']
    date_hierarchy = 'recorded_at'
    ordering = ['-recorded_at']
    
    def formatted_net_worth(self, obj):
        color = '#00fe93' if obj.net_worth >= 0 else '#fe1e00'
        return format_html(
            '<strong style="color: {};">${:,.2f}</strong>',
            color, obj.net_worth
        )
    formatted_net_worth.short_description = 'Net Worth'
    
    def formatted_assets(self, obj):
        return format_html(
            '<span style="color: #00fe93;">${:,.2f}</span>',
            obj.total_assets
        )
    formatted_assets.short_description = 'Assets'
    
    def formatted_liabilities(self, obj):
        return format_html(
            '<span style="color: #fe1e00;">${:,.2f}</span>',
            obj.total_liabilities
        )
    formatted_liabilities.short_description = 'Liabilities'


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'owner', 'formatted_amount', 'billing_cycle',
        'category', 'next_billing_date', 'is_active'
    ]
    list_filter = ['billing_cycle', 'category', 'is_active', 'is_essential']
    search_fields = ['name', 'owner__username', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['next_billing_date', 'name']
    
    def formatted_amount(self, obj):
        return f"${obj.amount:,.2f}/{obj.billing_cycle}"
    formatted_amount.short_description = 'Amount'


@admin.register(CashFlowEntry)
class CashFlowEntryAdmin(admin.ModelAdmin):
    list_display = [
        'description', 'owner', 'entry_type', 'formatted_amount',
        'category', 'entry_date', 'is_recurring'
    ]
    list_filter = ['entry_type', 'category', 'is_recurring', 'entry_date']
    search_fields = ['description', 'owner__username', 'notes']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'entry_date'
    ordering = ['-entry_date', '-created_at']
    
    def formatted_amount(self, obj):
        color = '#00fe93' if obj.entry_type == 'income' else '#fe1e00'
        prefix = '+' if obj.entry_type == 'income' else '-'
        return format_html(
            '<span style="color: {};">{} ${:,.2f}</span>',
            color, prefix, obj.amount
        )
    formatted_amount.short_description = 'Amount'


@admin.register(NetWorthMilestone)
class NetWorthMilestoneAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'owner', 'formatted_target', 'milestone_type',
        'target_date', 'achieved_at', 'is_active'
    ]
    list_filter = ['milestone_type', 'is_active', 'achieved_at']
    search_fields = ['name', 'owner__username', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['display_order', 'target_amount']
    
    def formatted_target(self, obj):
        return f"${obj.target_amount:,.2f}"
    formatted_target.short_description = 'Target'


@admin.register(ChangeLog)
class ChangeLogAdmin(admin.ModelAdmin):
    list_display = [
        'owner', 'change_type', 'truncated_description',
        'formatted_change', 'importance', 'created_at'
    ]
    list_filter = ['change_type', 'is_positive', 'importance']
    search_fields = ['description', 'owner__username']
    readonly_fields = ['id', 'created_at']
    ordering = ['-created_at']
    
    def truncated_description(self, obj):
        if len(obj.description) > 50:
            return f"{obj.description[:50]}..."
        return obj.description
    truncated_description.short_description = 'Description'
    
    def formatted_change(self, obj):
        if obj.amount_change is not None:
            color = '#00fe93' if obj.is_positive else '#fe1e00'
            prefix = '+' if obj.is_positive else ''
            return format_html(
                '<span style="color: {};">{} ${:,.2f}</span>',
                color, prefix, obj.amount_change
            )
        return '-'
    formatted_change.short_description = 'Change'


@admin.register(AccountGroup)
class AccountGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'account_count', 'display_order', 'created_at']
    list_filter = ['owner']
    search_fields = ['name', 'owner__username', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    filter_horizontal = ['accounts']
    ordering = ['owner', 'display_order', 'name']
    
    def account_count(self, obj):
        return obj.accounts.count()
    account_count.short_description = '# Accounts'

