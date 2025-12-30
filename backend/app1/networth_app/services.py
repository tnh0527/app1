"""
Net Worth Dashboard Services

Business logic for snapshot generation, aggregation, and insight generation.
All calculations are deterministic and idempotent.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, Dict, List, Tuple
from django.db import transaction
from django.db.models import Sum, Q, F
from django.utils import timezone

from .models import (
    FinancialAccount,
    AccountSnapshot,
    NetWorthSnapshot,
    CashFlowEntry,
    NetWorthMilestone,
    ChangeLog,
)


class NetWorthService:
    """
    Core service for net worth calculations and snapshot management.
    """
    
    def __init__(self, user):
        self.user = user
    
    def get_latest_account_values(self, as_of_date: date = None) -> Dict:
        """
        Get the latest value for each account as of a specific date.
        
        Returns dict of account_id -> snapshot
        """
        if as_of_date is None:
            as_of_date = date.today()
        
        accounts = FinancialAccount.objects.filter(
            owner=self.user,
            is_active=True,
            is_hidden=False
        )
        
        result = {}
        for account in accounts:
            snapshot = AccountSnapshot.objects.filter(
                account=account,
                recorded_at__lte=as_of_date
            ).order_by('-recorded_at').first()
            
            if snapshot:
                result[str(account.id)] = {
                    'account': account,
                    'snapshot': snapshot,
                    'value': snapshot.value
                }
            else:
                result[str(account.id)] = {
                    'account': account,
                    'snapshot': None,
                    'value': Decimal('0')
                }
        
        return result
    
    def calculate_totals(self, account_values: Dict) -> Dict:
        """
        Calculate aggregate totals from account values.
        """
        totals = {
            'total_assets': Decimal('0'),
            'total_liabilities': Decimal('0'),
            'cash_total': Decimal('0'),
            'investment_total': Decimal('0'),
            'asset_total': Decimal('0'),
            'debt_total': Decimal('0'),
        }
        
        for account_id, data in account_values.items():
            account = data['account']
            value = data['value']
            
            if account.account_type == FinancialAccount.AccountType.DEBT:
                totals['total_liabilities'] += abs(value)
                totals['debt_total'] += abs(value)
            else:
                totals['total_assets'] += value
                
                if account.account_type == FinancialAccount.AccountType.CASH:
                    totals['cash_total'] += value
                elif account.account_type == FinancialAccount.AccountType.INVESTMENT:
                    totals['investment_total'] += value
                elif account.account_type == FinancialAccount.AccountType.ASSET:
                    totals['asset_total'] += value
        
        totals['net_worth'] = totals['total_assets'] - totals['total_liabilities']
        return totals
    
    @transaction.atomic
    def create_networth_snapshot(self, recorded_at: date = None) -> NetWorthSnapshot:
        """
        Create a net worth snapshot for the given date.
        
        This operation is idempotent - if a snapshot already exists for the date,
        it will be returned (not updated, since snapshots are append-only).
        """
        if recorded_at is None:
            recorded_at = date.today()
        
        # Check for existing snapshot
        existing = NetWorthSnapshot.objects.filter(
            owner=self.user,
            recorded_at=recorded_at
        ).first()
        
        if existing:
            return existing
        
        # Calculate current values
        account_values = self.get_latest_account_values(recorded_at)
        totals = self.calculate_totals(account_values)
        
        # Create snapshot
        snapshot = NetWorthSnapshot.objects.create(
            owner=self.user,
            recorded_at=recorded_at,
            total_assets=totals['total_assets'],
            total_liabilities=totals['total_liabilities'],
            net_worth=totals['net_worth'],
            cash_total=totals['cash_total'],
            investment_total=totals['investment_total'],
            asset_total=totals['asset_total'],
            debt_total=totals['debt_total'],
        )
        
        # Generate change log entries
        self._generate_changelog(snapshot)
        
        # Check milestones
        self._check_milestones(snapshot)
        
        return snapshot
    
    def _generate_changelog(self, snapshot: NetWorthSnapshot):
        """
        Generate changelog entries comparing this snapshot to the previous one.
        """
        previous = snapshot.previous_snapshot
        
        if previous is None:
            # First snapshot - create initial entry
            ChangeLog.objects.create(
                owner=self.user,
                snapshot_from=None,
                snapshot_to=snapshot,
                change_type=ChangeLog.ChangeType.NET_WORTH_INCREASE,
                description=f"Initial net worth recorded: ${snapshot.net_worth:,.2f}",
                amount_change=snapshot.net_worth,
                importance=10,
                is_positive=snapshot.net_worth >= 0
            )
            return
        
        # Calculate net worth change
        net_change = snapshot.net_worth - previous.net_worth
        pct_change = None
        if previous.net_worth != 0:
            pct_change = (net_change / abs(previous.net_worth)) * 100
        
        if net_change != 0:
            change_type = (
                ChangeLog.ChangeType.NET_WORTH_INCREASE 
                if net_change > 0 
                else ChangeLog.ChangeType.NET_WORTH_DECREASE
            )
            
            direction = "increased" if net_change > 0 else "decreased"
            pct_str = f" ({pct_change:+.1f}%)" if pct_change else ""
            
            ChangeLog.objects.create(
                owner=self.user,
                snapshot_from=previous,
                snapshot_to=snapshot,
                change_type=change_type,
                description=f"Net worth {direction} by ${abs(net_change):,.2f}{pct_str}",
                amount_change=abs(net_change),
                percentage_change=pct_change,
                importance=8,
                is_positive=net_change > 0
            )
        
        # Check for significant account changes
        self._log_account_changes(snapshot, previous)
    
    def _log_account_changes(self, current: NetWorthSnapshot, previous: NetWorthSnapshot):
        """
        Log significant changes in individual accounts.
        """
        current_values = self.get_latest_account_values(current.recorded_at)
        previous_values = self.get_latest_account_values(previous.recorded_at)
        
        for account_id, current_data in current_values.items():
            previous_data = previous_values.get(account_id)
            
            if previous_data is None:
                # New account
                ChangeLog.objects.create(
                    owner=self.user,
                    snapshot_from=previous,
                    snapshot_to=current,
                    change_type=ChangeLog.ChangeType.ACCOUNT_ADDED,
                    description=f"New account added: {current_data['account'].name}",
                    amount_change=current_data['value'],
                    related_account=current_data['account'],
                    importance=7,
                    is_positive=True
                )
                continue
            
            # Check for significant value changes (>5% or >$100)
            change = current_data['value'] - previous_data['value']
            if abs(change) >= 100 or (
                previous_data['value'] != 0 and 
                abs(change / previous_data['value']) >= 0.05
            ):
                change_type = (
                    ChangeLog.ChangeType.VALUE_INCREASE 
                    if change > 0 
                    else ChangeLog.ChangeType.VALUE_DECREASE
                )
                
                direction = "increased" if change > 0 else "decreased"
                account = current_data['account']
                
                ChangeLog.objects.create(
                    owner=self.user,
                    snapshot_from=previous,
                    snapshot_to=current,
                    change_type=change_type,
                    description=f"{account.name} {direction} by ${abs(change):,.2f}",
                    amount_change=abs(change),
                    related_account=account,
                    importance=5,
                    is_positive=change > 0
                )
    
    def _check_milestones(self, snapshot: NetWorthSnapshot):
        """
        Check if any milestones have been achieved.
        """
        milestones = NetWorthMilestone.objects.filter(
            owner=self.user,
            is_active=True,
            achieved_at__isnull=True
        )
        
        for milestone in milestones:
            achieved = False
            
            if milestone.milestone_type == NetWorthMilestone.MilestoneType.NET_WORTH:
                achieved = snapshot.net_worth >= milestone.target_amount
            elif milestone.linked_account:
                account_value = milestone.linked_account.current_value
                achieved = account_value >= milestone.target_amount
            
            if achieved:
                milestone.achieved_at = snapshot.recorded_at
                milestone.save(update_fields=['achieved_at'])
                
                ChangeLog.objects.create(
                    owner=self.user,
                    snapshot_from=snapshot.previous_snapshot,
                    snapshot_to=snapshot,
                    change_type=ChangeLog.ChangeType.MILESTONE_ACHIEVED,
                    description=f"🎉 Milestone achieved: {milestone.name}!",
                    amount_change=milestone.target_amount,
                    related_milestone=milestone,
                    importance=10,
                    is_positive=True
                )
    
    def get_timeline_data(
        self, 
        start_date: date = None, 
        end_date: date = None,
        interval: str = 'daily'
    ) -> List[Dict]:
        """
        Get net worth timeline data for charting.
        """
        if end_date is None:
            end_date = date.today()
        if start_date is None:
            start_date = end_date - timedelta(days=365)
        
        snapshots = NetWorthSnapshot.objects.filter(
            owner=self.user,
            recorded_at__gte=start_date,
            recorded_at__lte=end_date
        ).order_by('recorded_at')
        
        return [
            {
                'date': s.recorded_at.isoformat(),
                'net_worth': float(s.net_worth),
                'total_assets': float(s.total_assets),
                'total_liabilities': float(s.total_liabilities),
                'cash': float(s.cash_total),
                'investments': float(s.investment_total),
                'assets': float(s.asset_total),
                'debt': float(s.debt_total),
            }
            for s in snapshots
        ]
    
    def get_dashboard_summary(self) -> Dict:
        """
        Get summary data for the dashboard hero section.
        """
        latest = NetWorthSnapshot.objects.filter(
            owner=self.user
        ).order_by('-recorded_at').first()
        
        if not latest:
            return {
                'net_worth': 0,
                'total_assets': 0,
                'total_liabilities': 0,
                'change_amount': 0,
                'change_percentage': 0,
                'trend': 'neutral',
                'last_updated': None,
            }
        
        # Get change from previous month
        month_ago = latest.recorded_at - timedelta(days=30)
        month_snapshot = NetWorthSnapshot.objects.filter(
            owner=self.user,
            recorded_at__lte=month_ago
        ).order_by('-recorded_at').first()
        
        change_amount = Decimal('0')
        change_percentage = Decimal('0')
        trend = 'neutral'
        
        if month_snapshot:
            change_amount = latest.net_worth - month_snapshot.net_worth
            if month_snapshot.net_worth != 0:
                change_percentage = (change_amount / abs(month_snapshot.net_worth)) * 100
            
            if change_amount > 0:
                trend = 'up'
            elif change_amount < 0:
                trend = 'down'
        
        return {
            'net_worth': float(latest.net_worth),
            'total_assets': float(latest.total_assets),
            'total_liabilities': float(latest.total_liabilities),
            'cash_total': float(latest.cash_total),
            'investment_total': float(latest.investment_total),
            'asset_total': float(latest.asset_total),
            'debt_total': float(latest.debt_total),
            'change_amount': float(change_amount),
            'change_percentage': float(change_percentage),
            'trend': trend,
            'last_updated': latest.recorded_at.isoformat(),
        }
    
    def get_accounts_breakdown(self) -> Dict:
        """
        Get detailed breakdown of all accounts by type.
        """
        accounts = FinancialAccount.objects.filter(
            owner=self.user,
            is_active=True,
            is_hidden=False
        ).order_by('account_type', 'display_order', 'name')
        
        breakdown = {
            'cash': [],
            'investment': [],
            'asset': [],
            'debt': [],
        }
        
        for account in accounts:
            latest = account.latest_snapshot
            value = float(latest.value) if latest else 0
            
            data = {
                'id': str(account.id),
                'name': account.name,
                'type': account.account_type,
                'subtype': account.subtype,
                'value': value,
                'institution': account.institution_name,
                'color': account.color,
                'last_updated': latest.recorded_at.isoformat() if latest else None,
            }
            
            # Add debt-specific fields
            if account.account_type == FinancialAccount.AccountType.DEBT:
                data['apr'] = float(account.apr) if account.apr else None
                data['credit_limit'] = float(account.credit_limit) if account.credit_limit else None
                data['minimum_payment'] = float(account.minimum_payment) if account.minimum_payment else None
            
            breakdown[account.account_type].append(data)
        
        return breakdown
    
    def get_forecast(self, months: int = 12) -> List[Dict]:
        """
        Generate a simple linear forecast based on historical trend.
        """
        # Get last 6 months of data for trend calculation
        end_date = date.today()
        start_date = end_date - timedelta(days=180)
        
        snapshots = NetWorthSnapshot.objects.filter(
            owner=self.user,
            recorded_at__gte=start_date
        ).order_by('recorded_at')
        
        if snapshots.count() < 2:
            return []
        
        # Calculate linear trend
        first = snapshots.first()
        last = snapshots.last()
        
        days_diff = (last.recorded_at - first.recorded_at).days
        if days_diff == 0:
            return []
        
        daily_change = (last.net_worth - first.net_worth) / days_diff
        monthly_change = daily_change * 30
        
        # Generate forecast
        forecast = []
        current_value = float(last.net_worth)
        current_date = end_date
        
        for i in range(1, months + 1):
            current_date = current_date + timedelta(days=30)
            current_value += float(monthly_change)
            
            forecast.append({
                'date': current_date.isoformat(),
                'projected_net_worth': current_value,
                'is_forecast': True,
            })
        
        return forecast


class CashFlowService:
    """
    Service for cash flow analysis and calculations.
    """
    
    def __init__(self, user):
        self.user = user
    
    def get_monthly_summary(self, year: int = None, month: int = None) -> Dict:
        """
        Get cash flow summary for a specific month.
        """
        today = date.today()
        if year is None:
            year = today.year
        if month is None:
            month = today.month
        
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        entries = CashFlowEntry.objects.filter(
            owner=self.user,
            entry_date__gte=start_date,
            entry_date__lte=end_date
        )
        
        income = entries.filter(
            entry_type=CashFlowEntry.EntryType.INCOME
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        expenses = entries.filter(
            entry_type=CashFlowEntry.EntryType.EXPENSE
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Get expense breakdown by category
        expense_breakdown = entries.filter(
            entry_type=CashFlowEntry.EntryType.EXPENSE
        ).values('category').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        return {
            'period': f"{year}-{month:02d}",
            'income': float(income),
            'expenses': float(expenses),
            'net_flow': float(income - expenses),
            'expense_breakdown': [
                {
                    'category': item['category'],
                    'amount': float(item['total'])
                }
                for item in expense_breakdown
            ],
            'savings_rate': float(
                ((income - expenses) / income * 100) if income > 0 else 0
            ),
        }
    
    def get_recent_entries(self, limit: int = 20) -> List[Dict]:
        """
        Get recent cash flow entries.
        """
        entries = CashFlowEntry.objects.filter(
            owner=self.user
        ).order_by('-entry_date', '-created_at')[:limit]
        
        return [
            {
                'id': str(e.id),
                'type': e.entry_type,
                'amount': float(e.amount),
                'description': e.description,
                'category': e.category,
                'date': e.entry_date.isoformat(),
                'is_recurring': e.is_recurring,
            }
            for e in entries
        ]


class InsightService:
    """
    Service for generating insights and changelog narratives.
    """
    
    def __init__(self, user):
        self.user = user
    
    def get_recent_changes(self, limit: int = 10) -> List[Dict]:
        """
        Get recent changes for the insight panel.
        """
        changes = ChangeLog.objects.filter(
            owner=self.user
        ).order_by('-created_at', '-importance')[:limit]
        
        return [
            {
                'id': str(c.id),
                'type': c.change_type,
                'description': c.description,
                'amount_change': float(c.amount_change) if c.amount_change else None,
                'percentage_change': float(c.percentage_change) if c.percentage_change else None,
                'is_positive': c.is_positive,
                'importance': c.importance,
                'created_at': c.created_at.isoformat(),
            }
            for c in changes
        ]
    
    def get_monthly_insights(self) -> Dict:
        """
        Generate monthly comparison insights.
        """
        today = date.today()
        current_month_start = date(today.year, today.month, 1)
        
        # Get this month's and last month's snapshots
        current = NetWorthSnapshot.objects.filter(
            owner=self.user,
            recorded_at__gte=current_month_start
        ).order_by('-recorded_at').first()
        
        if today.month == 1:
            last_month_start = date(today.year - 1, 12, 1)
        else:
            last_month_start = date(today.year, today.month - 1, 1)
        
        previous = NetWorthSnapshot.objects.filter(
            owner=self.user,
            recorded_at__gte=last_month_start,
            recorded_at__lt=current_month_start
        ).order_by('-recorded_at').first()
        
        insights = {
            'summary': None,
            'highlights': [],
            'alerts': [],
        }
        
        if not current:
            return insights
        
        if previous:
            change = current.net_worth - previous.net_worth
            direction = "up" if change > 0 else "down"
            insights['summary'] = f"Your net worth is {direction} ${abs(change):,.2f} from last month"
            
            # Asset vs liability changes
            asset_change = current.total_assets - previous.total_assets
            liability_change = current.total_liabilities - previous.total_liabilities
            
            if asset_change > 0:
                insights['highlights'].append(
                    f"Assets increased by ${asset_change:,.2f}"
                )
            
            if liability_change < 0:
                insights['highlights'].append(
                    f"Debt decreased by ${abs(liability_change):,.2f}"
                )
            elif liability_change > 0:
                insights['alerts'].append(
                    f"Debt increased by ${liability_change:,.2f}"
                )
        
        return insights


class MilestoneService:
    """
    Service for milestone management and progress tracking.
    """
    
    def __init__(self, user):
        self.user = user
    
    def get_all_with_progress(self) -> List[Dict]:
        """
        Get all milestones with current progress.
        """
        milestones = NetWorthMilestone.objects.filter(
            owner=self.user,
            is_active=True
        ).order_by('achieved_at', 'target_amount')
        
        # Get current net worth
        latest = NetWorthSnapshot.objects.filter(
            owner=self.user
        ).order_by('-recorded_at').first()
        
        current_net_worth = float(latest.net_worth) if latest else 0
        
        result = []
        for m in milestones:
            if m.linked_account:
                current_value = float(m.linked_account.current_value)
            else:
                current_value = current_net_worth
            
            progress = m.calculate_progress(Decimal(str(current_value)))
            
            result.append({
                'id': str(m.id),
                'name': m.name,
                'description': m.description,
                'target_amount': float(m.target_amount),
                'current_value': current_value,
                'progress': float(progress),
                'milestone_type': m.milestone_type,
                'target_date': m.target_date.isoformat() if m.target_date else None,
                'achieved_at': m.achieved_at.isoformat() if m.achieved_at else None,
                'is_achieved': m.is_achieved,
                'is_celebrated': m.is_celebrated,
                'color': m.color,
            })
        
        return result

