"""
Net Worth Dashboard Models

Production-grade financial data models following these principles:
- Append-only snapshots for historical integrity
- Separation of accounts from valuations
- Time-series first design for all changing values
- PostgreSQL-optimized with proper indexes and constraints
"""

import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class FinancialAccount(models.Model):
    """
    Represents a logical financial account or asset.
    
    This is the master record for any source of value - bank accounts,
    investments, physical assets, or debts. No balance is stored here;
    balances are captured in AccountSnapshot for historical integrity.
    """
    
    class AccountType(models.TextChoices):
        CASH = 'cash', 'Cash'
        INVESTMENT = 'investment', 'Investment'
        DEBT = 'debt', 'Debt/Liability'
        ASSET = 'asset', 'Physical Asset'
    
    class AccountSubtype(models.TextChoices):
        # Cash subtypes
        CHECKING = 'checking', 'Checking Account'
        SAVINGS = 'savings', 'Savings Account'
        CASH_ON_HAND = 'cash_on_hand', 'Cash on Hand'
        EMERGENCY_FUND = 'emergency_fund', 'Emergency Fund'
        
        # Investment subtypes
        BROKERAGE = 'brokerage', 'Brokerage Account'
        RETIREMENT_401K = '401k', '401(k)'
        RETIREMENT_IRA = 'ira', 'IRA'
        ROTH_IRA = 'roth_ira', 'Roth IRA'
        HSA = 'hsa', 'HSA'
        CRYPTO = 'crypto', 'Cryptocurrency'
        OTHER_INVESTMENT = 'other_investment', 'Other Investment'
        
        # Debt subtypes
        CREDIT_CARD = 'credit_card', 'Credit Card'
        STUDENT_LOAN = 'student_loan', 'Student Loan'
        MORTGAGE = 'mortgage', 'Mortgage'
        AUTO_LOAN = 'auto_loan', 'Auto Loan'
        PERSONAL_LOAN = 'personal_loan', 'Personal Loan'
        MEDICAL_DEBT = 'medical_debt', 'Medical Debt'
        OTHER_DEBT = 'other_debt', 'Other Debt'
        
        # Asset subtypes
        REAL_ESTATE = 'real_estate', 'Real Estate'
        VEHICLE = 'vehicle', 'Vehicle'
        JEWELRY = 'jewelry', 'Jewelry/Valuables'
        COLLECTIBLES = 'collectibles', 'Collectibles'
        OTHER_ASSET = 'other_asset', 'Other Asset'
    
    class DataSource(models.TextChoices):
        MANUAL = 'manual', 'Manual Entry'
        API = 'api', 'API Connected'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='financial_accounts'
    )
    
    name = models.CharField(max_length=200)
    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        db_index=True
    )
    subtype = models.CharField(
        max_length=30,
        choices=AccountSubtype.choices,
        blank=True
    )
    
    # Source tracking
    data_source = models.CharField(
        max_length=20,
        choices=DataSource.choices,
        default=DataSource.MANUAL
    )
    institution_name = models.CharField(max_length=200, blank=True)
    
    # For debt accounts
    apr = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Annual Percentage Rate for debt accounts'
    )
    credit_limit = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Credit limit for credit cards'
    )
    minimum_payment = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Minimum monthly payment for debt'
    )
    
    # Currency support (future multi-currency)
    currency = models.CharField(max_length=3, default='USD')
    
    # Display customization
    color = models.CharField(max_length=7, default='#208585')  # Hex color
    icon = models.CharField(max_length=50, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_hidden = models.BooleanField(
        default=False,
        help_text='Hide from net worth calculations but preserve history'
    )
    
    # External API fields (for future integration)
    external_id = models.CharField(max_length=255, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'account_type', 'name']
        indexes = [
            models.Index(fields=['owner', 'account_type']),
            models.Index(fields=['owner', 'is_active']),
            models.Index(fields=['owner', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'name'],
                name='uniq_account_owner_name'
            )
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_account_type_display()})"
    
    @property
    def is_liability(self):
        """Check if this account represents a liability (reduces net worth)."""
        return self.account_type == self.AccountType.DEBT
    
    @property
    def latest_snapshot(self):
        """Get the most recent snapshot for this account."""
        return self.snapshots.order_by('-recorded_at').first()
    
    @property
    def current_value(self):
        """Get the current value from the latest snapshot."""
        snapshot = self.latest_snapshot
        return snapshot.value if snapshot else Decimal('0')


class AccountSnapshot(models.Model):
    """
    Point-in-time valuation of a financial account.
    
    This is an APPEND-ONLY table. Historical snapshots are never modified
    or deleted to preserve audit trail and enable time-series analysis.
    """
    
    class SnapshotSource(models.TextChoices):
        MANUAL_ENTRY = 'manual_entry', 'Manual Entry'
        API_SYNC = 'api_sync', 'API Sync'
        IMPORT = 'import', 'Data Import'
        ADJUSTMENT = 'adjustment', 'Adjustment'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.CASCADE,
        related_name='snapshots'
    )
    
    # The actual value at this point in time
    value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text='Account value/balance at this snapshot'
    )
    
    # For debt accounts, track additional metrics
    available_credit = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Available credit for credit cards'
    )
    
    # Temporal tracking
    recorded_at = models.DateField(
        db_index=True,
        help_text='The date this value represents'
    )
    
    # Source tracking
    source = models.CharField(
        max_length=20,
        choices=SnapshotSource.choices,
        default=SnapshotSource.MANUAL_ENTRY
    )
    
    # Audit trail
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_snapshots'
    )
    
    class Meta:
        ordering = ['-recorded_at', '-created_at']
        indexes = [
            models.Index(fields=['account', 'recorded_at']),
            models.Index(fields=['recorded_at']),
            models.Index(fields=['created_at']),
        ]
        # Allow only one snapshot per account per day
        constraints = [
            models.UniqueConstraint(
                fields=['account', 'recorded_at'],
                name='uniq_snapshot_account_date'
            )
        ]
    
    def __str__(self):
        return f"{self.account.name}: ${self.value:,.2f} on {self.recorded_at}"
    
    @property
    def previous_snapshot(self):
        """Get the previous snapshot for the same account."""
        return AccountSnapshot.objects.filter(
            account=self.account,
            recorded_at__lt=self.recorded_at
        ).order_by('-recorded_at').first()
    
    @property
    def change_from_previous(self):
        """Calculate change from previous snapshot."""
        prev = self.previous_snapshot
        if prev:
            return self.value - prev.value
        return None


class NetWorthSnapshot(models.Model):
    """
    Aggregated net worth at a specific point in time.
    
    This is computed from AccountSnapshots and represents the total
    financial position. APPEND-ONLY for historical integrity.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='networth_snapshots'
    )
    
    # Aggregated values
    total_assets = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    total_liabilities = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    net_worth = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text='Total Assets - Total Liabilities'
    )
    
    # Breakdown by type (denormalized for query performance)
    cash_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0')
    )
    investment_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0')
    )
    asset_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0')
    )
    debt_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0')
    )
    
    # Temporal
    recorded_at = models.DateField(db_index=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['owner', 'recorded_at']),
        ]
        # One snapshot per owner per day
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'recorded_at'],
                name='uniq_networth_owner_date'
            )
        ]
    
    def __str__(self):
        return f"Net Worth: ${self.net_worth:,.2f} on {self.recorded_at}"
    
    @property
    def previous_snapshot(self):
        """Get the previous net worth snapshot."""
        return NetWorthSnapshot.objects.filter(
            owner=self.owner,
            recorded_at__lt=self.recorded_at
        ).order_by('-recorded_at').first()
    
    @property
    def change_from_previous(self):
        """Calculate net worth change from previous snapshot."""
        prev = self.previous_snapshot
        if prev:
            return self.net_worth - prev.net_worth
        return None
    
    @property
    def change_percentage(self):
        """Calculate percentage change from previous snapshot."""
        prev = self.previous_snapshot
        if prev and prev.net_worth != 0:
            return ((self.net_worth - prev.net_worth) / abs(prev.net_worth)) * 100
        return None


class Subscription(models.Model):
    """
    Recurring subscription or expense tracking.
    
    Integrates with the Calendar for renewal reminders.
    """
    
    class BillingCycle(models.TextChoices):
        WEEKLY = 'weekly', 'Weekly'
        BIWEEKLY = 'biweekly', 'Bi-weekly'
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        SEMIANNUAL = 'semiannual', 'Semi-Annual'
        ANNUAL = 'annual', 'Annual'
    
    class Category(models.TextChoices):
        STREAMING = 'streaming', 'Streaming & Entertainment'
        SOFTWARE = 'software', 'Software & Apps'
        UTILITIES = 'utilities', 'Utilities'
        INSURANCE = 'insurance', 'Insurance'
        MEMBERSHIP = 'membership', 'Memberships'
        FINANCIAL = 'financial', 'Financial Services'
        HEALTH = 'health', 'Health & Fitness'
        EDUCATION = 'education', 'Education'
        OTHER = 'other', 'Other'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
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
    
    # Dates
    start_date = models.DateField()
    next_billing_date = models.DateField(db_index=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Categorization
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER
    )
    
    # Display
    color = models.CharField(max_length=7, default='#208585')
    icon = models.CharField(max_length=50, blank=True)
    logo_url = models.URLField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_essential = models.BooleanField(
        default=False,
        help_text='Mark as essential expense'
    )
    auto_renew = models.BooleanField(default=True)
    
    # Integration
    calendar_event_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Link to Calendar event for reminders'
    )
    
    # Payment method link
    payment_account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subscriptions_paid',
        help_text='Account used to pay this subscription'
    )
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['next_billing_date', 'name']
        indexes = [
            models.Index(fields=['owner', 'is_active']),
            models.Index(fields=['owner', 'next_billing_date']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return f"{self.name} - ${self.amount}/{self.billing_cycle}"
    
    @property
    def monthly_cost(self):
        """Calculate the monthly equivalent cost."""
        multipliers = {
            'weekly': Decimal('4.33'),
            'biweekly': Decimal('2.17'),
            'monthly': Decimal('1'),
            'quarterly': Decimal('0.33'),
            'semiannual': Decimal('0.17'),
            'annual': Decimal('0.083'),
        }
        return self.amount * multipliers.get(self.billing_cycle, 1)
    
    @property
    def annual_cost(self):
        """Calculate the annual cost."""
        return self.monthly_cost * 12


class CashFlowEntry(models.Model):
    """
    Income or expense entry for cash flow tracking.
    
    Used to calculate monthly cash flow and budget analysis.
    """
    
    class EntryType(models.TextChoices):
        INCOME = 'income', 'Income'
        EXPENSE = 'expense', 'Expense'
    
    class Category(models.TextChoices):
        # Income categories
        SALARY = 'salary', 'Salary'
        FREELANCE = 'freelance', 'Freelance'
        INVESTMENT_INCOME = 'investment_income', 'Investment Income'
        RENTAL_INCOME = 'rental_income', 'Rental Income'
        BONUS = 'bonus', 'Bonus'
        OTHER_INCOME = 'other_income', 'Other Income'
        
        # Expense categories
        HOUSING = 'housing', 'Housing'
        TRANSPORTATION = 'transportation', 'Transportation'
        FOOD = 'food', 'Food & Dining'
        UTILITIES = 'utilities', 'Utilities'
        HEALTHCARE = 'healthcare', 'Healthcare'
        INSURANCE = 'insurance', 'Insurance'
        DEBT_PAYMENT = 'debt_payment', 'Debt Payment'
        ENTERTAINMENT = 'entertainment', 'Entertainment'
        SHOPPING = 'shopping', 'Shopping'
        PERSONAL = 'personal', 'Personal Care'
        EDUCATION = 'education', 'Education'
        TRAVEL = 'travel', 'Travel'
        SAVINGS = 'savings', 'Savings Transfer'
        TAXES = 'taxes', 'Taxes'
        GIFTS = 'gifts', 'Gifts & Donations'
        OTHER_EXPENSE = 'other_expense', 'Other Expense'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cashflow_entries'
    )
    
    entry_type = models.CharField(
        max_length=10,
        choices=EntryType.choices,
        db_index=True
    )
    
    # Amount
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    currency = models.CharField(max_length=3, default='USD')
    
    # Details
    description = models.CharField(max_length=300)
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        db_index=True
    )
    
    # Date
    entry_date = models.DateField(db_index=True)
    
    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(
        max_length=100,
        blank=True,
        help_text='RRULE for recurring entries'
    )
    
    # Link to account
    account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cashflow_entries'
    )
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = 'Cash flow entries'
        ordering = ['-entry_date', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'entry_date']),
            models.Index(fields=['owner', 'entry_type', 'entry_date']),
            models.Index(fields=['owner', 'category']),
        ]
    
    def __str__(self):
        prefix = '+' if self.entry_type == 'income' else '-'
        return f"{prefix}${self.amount} - {self.description}"


class NetWorthMilestone(models.Model):
    """
    Financial goals and milestones.
    
    Track progress toward net worth goals with visual feedback.
    """
    
    class MilestoneType(models.TextChoices):
        NET_WORTH = 'net_worth', 'Net Worth Target'
        SAVINGS = 'savings', 'Savings Target'
        DEBT_PAYOFF = 'debt_payoff', 'Debt Payoff'
        INVESTMENT = 'investment', 'Investment Target'
        EMERGENCY_FUND = 'emergency_fund', 'Emergency Fund'
        CUSTOM = 'custom', 'Custom Goal'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='networth_milestones'
    )
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Target
    target_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    milestone_type = models.CharField(
        max_length=20,
        choices=MilestoneType.choices,
        default=MilestoneType.NET_WORTH
    )
    
    # For account-specific milestones
    linked_account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='milestones'
    )
    
    # Timeline
    target_date = models.DateField(null=True, blank=True)
    achieved_at = models.DateField(null=True, blank=True)
    
    # Display
    color = models.CharField(max_length=7, default='#00fe93')
    icon = models.CharField(max_length=50, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_celebrated = models.BooleanField(
        default=False,
        help_text='User has acknowledged milestone achievement'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'target_amount']
        indexes = [
            models.Index(fields=['owner', 'is_active']),
            models.Index(fields=['owner', 'achieved_at']),
        ]
    
    def __str__(self):
        status = '✓' if self.achieved_at else '○'
        return f"{status} {self.name}: ${self.target_amount:,.2f}"
    
    @property
    def is_achieved(self):
        """Check if milestone has been achieved."""
        return self.achieved_at is not None
    
    def calculate_progress(self, current_value):
        """Calculate progress percentage toward milestone."""
        if self.target_amount == 0:
            return 100
        return min(100, (current_value / self.target_amount) * 100)


class ChangeLog(models.Model):
    """
    Tracks detected changes between snapshots for the insight engine.
    
    Powers the "What changed since last month" narrative panel.
    """
    
    class ChangeType(models.TextChoices):
        ACCOUNT_ADDED = 'account_added', 'New Account Added'
        ACCOUNT_REMOVED = 'account_removed', 'Account Removed'
        VALUE_INCREASE = 'value_increase', 'Value Increased'
        VALUE_DECREASE = 'value_decrease', 'Value Decreased'
        MILESTONE_ACHIEVED = 'milestone_achieved', 'Milestone Achieved'
        DEBT_PAID_OFF = 'debt_paid_off', 'Debt Paid Off'
        SUBSCRIPTION_ADDED = 'subscription_added', 'Subscription Added'
        SUBSCRIPTION_CANCELLED = 'subscription_cancelled', 'Subscription Cancelled'
        NET_WORTH_INCREASE = 'net_worth_increase', 'Net Worth Increased'
        NET_WORTH_DECREASE = 'net_worth_decrease', 'Net Worth Decreased'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='networth_changes'
    )
    
    # Reference snapshots
    snapshot_from = models.ForeignKey(
        NetWorthSnapshot,
        on_delete=models.CASCADE,
        related_name='changes_from',
        null=True,
        blank=True,
        help_text='Previous snapshot'
    )
    snapshot_to = models.ForeignKey(
        NetWorthSnapshot,
        on_delete=models.CASCADE,
        related_name='changes_to',
        help_text='Current snapshot'
    )
    
    # Change details
    change_type = models.CharField(
        max_length=30,
        choices=ChangeType.choices,
        db_index=True
    )
    
    # Human-readable description
    description = models.TextField()
    
    # Quantitative change
    amount_change = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )
    percentage_change = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Related entities
    related_account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='changes'
    )
    related_milestone = models.ForeignKey(
        NetWorthMilestone,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='changes'
    )
    related_subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='changes'
    )
    
    # Importance for sorting
    importance = models.PositiveSmallIntegerField(
        default=5,
        help_text='1-10 scale, higher = more important'
    )
    
    # Display
    is_positive = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at', '-importance']
        indexes = [
            models.Index(fields=['owner', 'created_at']),
            models.Index(fields=['owner', 'change_type']),
            models.Index(fields=['snapshot_to']),
        ]
    
    def __str__(self):
        return f"{self.get_change_type_display()}: {self.description[:50]}"


class AccountGroup(models.Model):
    """
    Custom groupings for accounts beyond the built-in types.
    
    Allows users to create custom categories like "Emergency Savings",
    "Retirement", "Short-term Investments", etc.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='account_groups'
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#208585')
    icon = models.CharField(max_length=50, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    
    accounts = models.ManyToManyField(
        FinancialAccount,
        related_name='groups',
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'name'],
                name='uniq_group_owner_name'
            )
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def total_value(self):
        """Calculate total value of all accounts in this group."""
        total = Decimal('0')
        for account in self.accounts.filter(is_active=True):
            total += account.current_value
        return total

