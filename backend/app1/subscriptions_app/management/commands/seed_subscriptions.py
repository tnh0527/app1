"""
Seed command for subscription demo data.

Creates realistic subscription data for testing and demonstration.
"""

from datetime import date, timedelta
from decimal import Decimal
import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from subscriptions_app.models import (
    Subscription,
    SubscriptionCharge,
    SubscriptionUsageSignal,
    SubscriptionAlert,
    SubscriptionAlertEvent,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed subscriptions with demo data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Username to create subscriptions for',
            default='demo'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing subscription data before seeding'
        )
    
    def handle(self, *args, **options):
        username = options['user']
        
        try:
            user = User.objects.get(username=username)
            self.stdout.write(f'Using existing user: {username}')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User {username} does not exist'))
            return
        
        if options['clear']:
            self.stdout.write('Clearing existing subscription data...')
            Subscription.objects.filter(user=user).delete()
        
        self.create_subscriptions(user)
        self.create_usage_signals(user)
        self.create_charges(user)
        self.create_alerts(user)
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded subscription data!'))
    
    def create_subscriptions(self, user):
        """Create demo subscriptions."""
        self.stdout.write('Creating subscriptions...')
        
        today = date.today()
        
        subscriptions_data = [
            # Streaming
            {
                'name': 'Netflix',
                'provider': 'Netflix Inc.',
                'amount': Decimal('15.99'),
                'billing_cycle': 'monthly',
                'category': 'streaming',
                'status': 'active',
                'color': '#E50914',
                'icon': 'bi-tv',
                'is_essential': False,
            },
            {
                'name': 'Spotify Premium',
                'provider': 'Spotify',
                'amount': Decimal('10.99'),
                'billing_cycle': 'monthly',
                'category': 'streaming',
                'status': 'active',
                'color': '#1DB954',
                'icon': 'bi-music-note-beamed',
                'is_essential': True,
            },
            {
                'name': 'Disney+',
                'provider': 'Disney',
                'amount': Decimal('7.99'),
                'billing_cycle': 'monthly',
                'category': 'streaming',
                'status': 'active',
                'color': '#113CCF',
                'icon': 'bi-film',
                'is_essential': False,
            },
            # Software
            {
                'name': 'Adobe Creative Cloud',
                'provider': 'Adobe Inc.',
                'amount': Decimal('54.99'),
                'billing_cycle': 'monthly',
                'category': 'software',
                'status': 'active',
                'color': '#FF0000',
                'icon': 'bi-palette',
                'is_essential': True,
            },
            {
                'name': 'Microsoft 365',
                'provider': 'Microsoft',
                'amount': Decimal('99.99'),
                'billing_cycle': 'annual',
                'category': 'software',
                'status': 'active',
                'color': '#0078D4',
                'icon': 'bi-microsoft',
                'is_essential': True,
            },
            {
                'name': 'GitHub Pro',
                'provider': 'GitHub',
                'amount': Decimal('4.00'),
                'billing_cycle': 'monthly',
                'category': 'software',
                'status': 'active',
                'color': '#333333',
                'icon': 'bi-github',
                'is_essential': True,
            },
            # Cloud
            {
                'name': 'iCloud Storage',
                'provider': 'Apple',
                'amount': Decimal('2.99'),
                'billing_cycle': 'monthly',
                'category': 'cloud',
                'status': 'active',
                'color': '#007AFF',
                'icon': 'bi-cloud',
                'is_essential': True,
            },
            {
                'name': 'Google One',
                'provider': 'Google',
                'amount': Decimal('2.99'),
                'billing_cycle': 'monthly',
                'category': 'cloud',
                'status': 'active',
                'color': '#4285F4',
                'icon': 'bi-google',
                'is_essential': False,
            },
            # Insurance
            {
                'name': 'Health Insurance',
                'provider': 'Blue Cross',
                'amount': Decimal('350.00'),
                'billing_cycle': 'monthly',
                'category': 'insurance',
                'status': 'active',
                'color': '#0066CC',
                'icon': 'bi-heart-pulse',
                'is_essential': True,
            },
            # Health & Fitness
            {
                'name': 'Gym Membership',
                'provider': 'Planet Fitness',
                'amount': Decimal('24.99'),
                'billing_cycle': 'monthly',
                'category': 'health',
                'status': 'active',
                'color': '#7B00FF',
                'icon': 'bi-activity',
                'is_essential': False,
            },
            # Gaming
            {
                'name': 'PlayStation Plus',
                'provider': 'Sony',
                'amount': Decimal('59.99'),
                'billing_cycle': 'annual',
                'category': 'gaming',
                'status': 'paused',
                'color': '#003087',
                'icon': 'bi-controller',
                'is_essential': False,
            },
            # Productivity
            {
                'name': 'Notion',
                'provider': 'Notion Labs',
                'amount': Decimal('8.00'),
                'billing_cycle': 'monthly',
                'category': 'productivity',
                'status': 'active',
                'color': '#000000',
                'icon': 'bi-journal-text',
                'is_essential': True,
            },
            # Trial subscription
            {
                'name': 'Audible',
                'provider': 'Amazon',
                'amount': Decimal('14.95'),
                'billing_cycle': 'monthly',
                'category': 'streaming',
                'status': 'trial',
                'trial_end_date': today + timedelta(days=7),
                'color': '#FF9900',
                'icon': 'bi-headphones',
                'is_essential': False,
            },
            # Cancelled
            {
                'name': 'HBO Max',
                'provider': 'Warner Bros',
                'amount': Decimal('15.99'),
                'billing_cycle': 'monthly',
                'category': 'streaming',
                'status': 'cancelled',
                'cancellation_date': today - timedelta(days=30),
                'color': '#8000FF',
                'icon': 'bi-tv',
                'is_essential': False,
            },
        ]
        
        for data in subscriptions_data:
            start_date = today - timedelta(days=random.randint(30, 365))
            
            # Calculate next billing date
            if data['billing_cycle'] == 'annual':
                next_billing = start_date + timedelta(days=365)
                while next_billing < today:
                    next_billing += timedelta(days=365)
            else:
                next_billing = start_date + timedelta(days=30)
                while next_billing < today:
                    next_billing += timedelta(days=30)
            
            Subscription.objects.update_or_create(
                user=user,
                name=data['name'],
                defaults={
                    'provider': data.get('provider', ''),
                    'amount': data['amount'],
                    'billing_cycle': data['billing_cycle'],
                    'category': data['category'],
                    'status': data['status'],
                    'start_date': start_date,
                    'next_billing_date': next_billing,
                    'trial_end_date': data.get('trial_end_date'),
                    'cancellation_date': data.get('cancellation_date'),
                    'color': data.get('color', '#208585'),
                    'icon': data.get('icon', ''),
                    'is_essential': data.get('is_essential', False),
                }
            )
        
        self.stdout.write(f'  Created {len(subscriptions_data)} subscriptions')
    
    def create_usage_signals(self, user):
        """Create usage signals for subscriptions."""
        self.stdout.write('Creating usage signals...')
        
        today = date.today()
        subscriptions = Subscription.objects.filter(user=user, status='active')
        
        signals_created = 0
        for sub in subscriptions:
            # Some subscriptions are used frequently, others rarely
            if sub.is_essential:
                # Essential ones are used frequently
                for i in range(5):
                    used_at = today - timedelta(days=random.randint(1, 14))
                    SubscriptionUsageSignal.objects.create(
                        subscription=sub,
                        signal_type='manual_checkin',
                        last_used_at=used_at,
                        confidence_score=Decimal('1.0')
                    )
                    signals_created += 1
            elif random.random() > 0.5:
                # Some non-essential ones are used occasionally
                used_at = today - timedelta(days=random.randint(15, 45))
                SubscriptionUsageSignal.objects.create(
                    subscription=sub,
                    signal_type='manual_checkin',
                    last_used_at=used_at,
                    confidence_score=Decimal('0.8')
                )
                signals_created += 1
            # Some subscriptions have no usage signals (unused)
        
        self.stdout.write(f'  Created {signals_created} usage signals')
    
    def create_charges(self, user):
        """Create historical charges for subscriptions."""
        self.stdout.write('Creating charge history...')
        
        today = date.today()
        subscriptions = Subscription.objects.filter(user=user)
        
        charges_created = 0
        for sub in subscriptions:
            # Create charge history for the past few months
            charge_date = sub.start_date
            prev_amount = None
            
            while charge_date < today:
                amount = sub.amount
                
                # Simulate occasional price increases
                if prev_amount and random.random() > 0.9:
                    amount = prev_amount * Decimal('1.05')  # 5% increase
                
                SubscriptionCharge.objects.create(
                    subscription=sub,
                    amount=amount,
                    charged_at=charge_date,
                    source='auto',
                    previous_amount=prev_amount
                )
                charges_created += 1
                prev_amount = amount
                
                if sub.billing_cycle == 'annual':
                    charge_date += timedelta(days=365)
                elif sub.billing_cycle == 'quarterly':
                    charge_date += timedelta(days=90)
                else:
                    charge_date += timedelta(days=30)
        
        self.stdout.write(f'  Created {charges_created} charges')
    
    def create_alerts(self, user):
        """Create default alert rules."""
        self.stdout.write('Creating alert rules...')
        
        default_alerts = [
            {
                'alert_type': 'unused',
                'threshold_days': 60,
                'is_active': True,
            },
            {
                'alert_type': 'price_increase',
                'threshold_value': Decimal('10'),
                'is_active': True,
            },
            {
                'alert_type': 'upcoming_charge',
                'threshold_days': 3,
                'is_active': True,
            },
            {
                'alert_type': 'spend_threshold',
                'threshold_value': Decimal('500'),
                'is_active': True,
            },
            {
                'alert_type': 'trial_ending',
                'threshold_days': 3,
                'is_active': True,
            },
        ]
        
        for data in default_alerts:
            SubscriptionAlert.objects.update_or_create(
                user=user,
                alert_type=data['alert_type'],
                subscription=None,  # Global alerts
                defaults={
                    'threshold_value': data.get('threshold_value'),
                    'threshold_days': data.get('threshold_days'),
                    'is_active': data['is_active'],
                }
            )
        
        self.stdout.write(f'  Created {len(default_alerts)} alert rules')

