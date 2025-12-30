"""
Seed data for Net Worth Dashboard

Creates realistic demo data for testing and demonstration.
"""

from datetime import date, timedelta
from decimal import Decimal
import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

from networth_app.models import (
    FinancialAccount,
    AccountSnapshot,
    NetWorthSnapshot,
    CashFlowEntry,
    NetWorthMilestone,
)
from networth_app.services import NetWorthService

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed net worth dashboard with demo data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Username to create seed data for',
            default='demo'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )
    
    def handle(self, *args, **options):
        username = options['username']
        
        # Get or create user
        try:
            user = User.objects.get(username=username)
            self.stdout.write(f'Using existing user: {username}')
        except User.DoesNotExist:
            self.stdout.write(self.style.WARNING(
                f'User {username} not found. Please create the user first or use --username flag.'
            ))
            return
        
        if options['clear']:
            self.clear_data(user)
        
        with transaction.atomic():
            accounts = self.create_accounts(user)
            self.create_snapshots(accounts)
            self.create_cashflow(user, accounts)
            self.create_milestones(user)
            self.generate_networth_snapshots(user)
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded net worth data!'))
    
    def clear_data(self, user):
        """Clear existing net worth data for user."""
        self.stdout.write('Clearing existing data...')
        
        FinancialAccount.objects.filter(owner=user).delete()
        CashFlowEntry.objects.filter(owner=user).delete()
        NetWorthMilestone.objects.filter(owner=user).delete()
        NetWorthSnapshot.objects.filter(owner=user).delete()
    
    def create_accounts(self, user):
        """Create sample financial accounts."""
        self.stdout.write('Creating accounts...')
        
        accounts = []
        
        # Cash accounts
        accounts.append(FinancialAccount.objects.create(
            owner=user,
            name='Primary Checking',
            account_type='cash',
            subtype='checking',
            institution_name='Chase Bank',
            color='#0ea5e9',
            display_order=1,
        ))
        
        accounts.append(FinancialAccount.objects.create(
            owner=user,
            name='High-Yield Savings',
            account_type='cash',
            subtype='savings',
            institution_name='Marcus by Goldman Sachs',
            color='#22c55e',
            display_order=2,
        ))
        
        accounts.append(FinancialAccount.objects.create(
            owner=user,
            name='Emergency Fund',
            account_type='cash',
            subtype='emergency_fund',
            institution_name='Ally Bank',
            color='#f59e0b',
            display_order=3,
        ))
        
        # Investment accounts
        accounts.append(FinancialAccount.objects.create(
            owner=user,
            name='Brokerage Account',
            account_type='investment',
            subtype='brokerage',
            institution_name='Fidelity',
            color='#8b5cf6',
            display_order=4,
        ))
        
        accounts.append(FinancialAccount.objects.create(
            owner=user,
            name='401(k)',
            account_type='investment',
            subtype='401k',
            institution_name='Vanguard',
            color='#6366f1',
            display_order=5,
        ))
        
        accounts.append(FinancialAccount.objects.create(
            owner=user,
            name='Roth IRA',
            account_type='investment',
            subtype='roth_ira',
            institution_name='Vanguard',
            color='#a855f7',
            display_order=6,
        ))
        
        accounts.append(FinancialAccount.objects.create(
            owner=user,
            name='Crypto Portfolio',
            account_type='investment',
            subtype='crypto',
            institution_name='Coinbase',
            color='#f97316',
            display_order=7,
        ))
        
        # Debt accounts
        accounts.append(FinancialAccount.objects.create(
            owner=user,
            name='Chase Sapphire',
            account_type='debt',
            subtype='credit_card',
            institution_name='Chase',
            apr=Decimal('24.99'),
            credit_limit=Decimal('15000'),
            color='#ef4444',
            display_order=8,
        ))
        
        accounts.append(FinancialAccount.objects.create(
            owner=user,
            name='Student Loans',
            account_type='debt',
            subtype='student_loan',
            institution_name='Nelnet',
            apr=Decimal('5.50'),
            minimum_payment=Decimal('350'),
            color='#dc2626',
            display_order=9,
        ))
        
        # Physical assets
        accounts.append(FinancialAccount.objects.create(
            owner=user,
            name='2021 Tesla Model 3',
            account_type='asset',
            subtype='vehicle',
            color='#14b8a6',
            display_order=10,
        ))
        
        return accounts
    
    def create_snapshots(self, accounts):
        """Create historical snapshots for accounts."""
        self.stdout.write('Creating snapshots...')
        
        today = date.today()
        
        # Define starting values and growth patterns
        account_data = {
            'Primary Checking': {
                'start': Decimal('5200'),
                'volatility': 0.15,
                'trend': 0.005,
            },
            'High-Yield Savings': {
                'start': Decimal('12500'),
                'volatility': 0.02,
                'trend': 0.008,
            },
            'Emergency Fund': {
                'start': Decimal('8000'),
                'volatility': 0.01,
                'trend': 0.01,
            },
            'Brokerage Account': {
                'start': Decimal('35000'),
                'volatility': 0.08,
                'trend': 0.012,
            },
            '401(k)': {
                'start': Decimal('45000'),
                'volatility': 0.06,
                'trend': 0.015,
            },
            'Roth IRA': {
                'start': Decimal('18000'),
                'volatility': 0.07,
                'trend': 0.013,
            },
            'Crypto Portfolio': {
                'start': Decimal('5000'),
                'volatility': 0.25,
                'trend': 0.02,
            },
            'Chase Sapphire': {
                'start': Decimal('2800'),
                'volatility': 0.20,
                'trend': -0.03,
            },
            'Student Loans': {
                'start': Decimal('28000'),
                'volatility': 0.001,
                'trend': -0.008,
            },
            '2021 Tesla Model 3': {
                'start': Decimal('38000'),
                'volatility': 0.005,
                'trend': -0.01,
            },
        }
        
        # Create 12 months of history (monthly snapshots)
        for account in accounts:
            data = account_data.get(account.name, {
                'start': Decimal('1000'),
                'volatility': 0.05,
                'trend': 0.01,
            })
            
            current_value = data['start']
            
            for months_ago in range(12, -1, -1):
                snapshot_date = today - timedelta(days=months_ago * 30)
                
                # Add some randomness
                random_factor = 1 + random.uniform(
                    -data['volatility'],
                    data['volatility']
                )
                trend_factor = 1 + data['trend']
                
                if months_ago < 12:  # Don't modify starting value
                    current_value = current_value * Decimal(str(trend_factor * random_factor))
                    current_value = max(Decimal('0'), current_value)
                
                AccountSnapshot.objects.create(
                    account=account,
                    value=current_value.quantize(Decimal('0.01')),
                    recorded_at=snapshot_date,
                    source='manual_entry',
                )
    
    def create_cashflow(self, user, accounts):
        """Create sample cash flow entries."""
        self.stdout.write('Creating cash flow entries...')
        
        today = date.today()
        checking = next((a for a in accounts if 'Checking' in a.name), None)
        
        # Monthly income (last 6 months)
        for months_ago in range(6):
            entry_date = today - timedelta(days=months_ago * 30)
            
            # Salary
            CashFlowEntry.objects.create(
                owner=user,
                entry_type='income',
                amount=Decimal('6500.00'),
                description='Monthly Salary',
                category='salary',
                entry_date=entry_date,
                is_recurring=True,
                account=checking,
            )
            
            # Random side income
            if random.random() > 0.5:
                CashFlowEntry.objects.create(
                    owner=user,
                    entry_type='income',
                    amount=Decimal(str(random.randint(200, 800))),
                    description='Freelance Project',
                    category='freelance',
                    entry_date=entry_date + timedelta(days=random.randint(1, 15)),
                    account=checking,
                )
        
        # Monthly expenses (last 3 months)
        expense_templates = [
            ('Rent Payment', 'housing', Decimal('1800.00'), True),
            ('Groceries', 'food', Decimal('400.00'), False),
            ('Utilities', 'utilities', Decimal('150.00'), True),
            ('Gas', 'transportation', Decimal('180.00'), False),
            ('Dining Out', 'food', Decimal('250.00'), False),
            ('Shopping', 'shopping', Decimal('200.00'), False),
        ]
        
        for months_ago in range(3):
            for desc, category, base_amount, is_recurring in expense_templates:
                # Add some variation
                variation = Decimal(str(1 + random.uniform(-0.15, 0.15)))
                amount = (base_amount * variation).quantize(Decimal('0.01'))
                
                entry_date = today - timedelta(days=months_ago * 30 + random.randint(1, 28))
                
                CashFlowEntry.objects.create(
                    owner=user,
                    entry_type='expense',
                    amount=amount,
                    description=desc,
                    category=category,
                    entry_date=entry_date,
                    is_recurring=is_recurring,
                    account=checking,
                )
    
    def create_milestones(self, user):
        """Create sample milestones."""
        self.stdout.write('Creating milestones...')
        
        milestones = [
            {
                'name': 'First $10,000',
                'target_amount': Decimal('10000'),
                'milestone_type': 'net_worth',
                'achieved_at': date.today() - timedelta(days=300),
                'is_celebrated': True,
            },
            {
                'name': '$50,000 Net Worth',
                'target_amount': Decimal('50000'),
                'milestone_type': 'net_worth',
                'achieved_at': date.today() - timedelta(days=90),
                'is_celebrated': True,
            },
            {
                'name': '$100,000 Net Worth',
                'target_amount': Decimal('100000'),
                'milestone_type': 'net_worth',
                'color': '#fbbf24',
            },
            {
                'name': 'Debt Free',
                'target_amount': Decimal('0'),
                'milestone_type': 'debt_payoff',
                'color': '#22c55e',
            },
            {
                'name': '6-Month Emergency Fund',
                'target_amount': Decimal('25000'),
                'milestone_type': 'emergency_fund',
                'color': '#f97316',
            },
            {
                'name': '$250,000 Net Worth',
                'target_amount': Decimal('250000'),
                'milestone_type': 'net_worth',
                'target_date': date.today() + timedelta(days=730),
                'color': '#8b5cf6',
            },
        ]
        
        for i, milestone_data in enumerate(milestones):
            NetWorthMilestone.objects.create(
                owner=user,
                display_order=i,
                **milestone_data
            )
    
    def generate_networth_snapshots(self, user):
        """Generate aggregated net worth snapshots."""
        self.stdout.write('Generating net worth snapshots...')
        
        service = NetWorthService(user)
        today = date.today()
        
        # Generate for each month
        for months_ago in range(12, -1, -1):
            snapshot_date = today - timedelta(days=months_ago * 30)
            service.create_networth_snapshot(snapshot_date)

