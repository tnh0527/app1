"""
Financials Dashboard Tests
"""

from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from .models import (
    FinancialAccount,
    AccountSnapshot,
    FinancialsSnapshot,
    CashFlowEntry,
    FinancialsMilestone,
)
from .services import FinancialsService, CashFlowService

User = get_user_model()


class FinancialAccountModelTests(TestCase):
    """Tests for FinancialAccount model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_cash_account(self):
        """Test creating a cash account."""
        account = FinancialAccount.objects.create(
            owner=self.user,
            name='Test Checking',
            account_type='cash',
            subtype='checking',
        )
        
        self.assertEqual(account.name, 'Test Checking')
        self.assertEqual(account.account_type, 'cash')
        self.assertFalse(account.is_liability)
    
    def test_create_debt_account(self):
        """Test creating a debt account."""
        account = FinancialAccount.objects.create(
            owner=self.user,
            name='Credit Card',
            account_type='debt',
            subtype='credit_card',
            apr=Decimal('24.99'),
        )
        
        self.assertTrue(account.is_liability)
        self.assertEqual(account.apr, Decimal('24.99'))
    
    def test_current_value_with_snapshot(self):
        """Test current_value property."""
        account = FinancialAccount.objects.create(
            owner=self.user,
            name='Savings',
            account_type='cash',
        )
        
        AccountSnapshot.objects.create(
            account=account,
            value=Decimal('1000.00'),
            recorded_at=date.today(),
        )
        
        self.assertEqual(account.current_value, Decimal('1000.00'))
    
    def test_current_value_without_snapshot(self):
        """Test current_value returns 0 when no snapshot."""
        account = FinancialAccount.objects.create(
            owner=self.user,
            name='Empty Account',
            account_type='cash',
        )
        
        self.assertEqual(account.current_value, Decimal('0'))


class AccountSnapshotModelTests(TestCase):
    """Tests for AccountSnapshot model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.account = FinancialAccount.objects.create(
            owner=self.user,
            name='Test Account',
            account_type='cash',
        )
    
    def test_create_snapshot(self):
        """Test creating a snapshot."""
        snapshot = AccountSnapshot.objects.create(
            account=self.account,
            value=Decimal('5000.00'),
            recorded_at=date.today(),
        )
        
        self.assertEqual(snapshot.value, Decimal('5000.00'))
    
    def test_change_from_previous(self):
        """Test change_from_previous property."""
        # Create first snapshot
        AccountSnapshot.objects.create(
            account=self.account,
            value=Decimal('1000.00'),
            recorded_at=date.today() - timedelta(days=1),
        )
        
        # Create second snapshot
        snapshot2 = AccountSnapshot.objects.create(
            account=self.account,
            value=Decimal('1500.00'),
            recorded_at=date.today(),
        )
        
        self.assertEqual(snapshot2.change_from_previous, Decimal('500.00'))


class FinancialsServiceTests(TestCase):
    """Tests for FinancialsService."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.service = FinancialsService(self.user)
        
        # Create accounts
        self.cash_account = FinancialAccount.objects.create(
            owner=self.user,
            name='Checking',
            account_type='cash',
        )
        self.debt_account = FinancialAccount.objects.create(
            owner=self.user,
            name='Credit Card',
            account_type='debt',
        )
        
        # Create snapshots
        AccountSnapshot.objects.create(
            account=self.cash_account,
            value=Decimal('10000.00'),
            recorded_at=date.today(),
        )
        AccountSnapshot.objects.create(
            account=self.debt_account,
            value=Decimal('2000.00'),
            recorded_at=date.today(),
        )
    
    def test_calculate_totals(self):
        """Test total calculations."""
        values = self.service.get_latest_account_values()
        totals = self.service.calculate_totals(values)
        
        self.assertEqual(totals['total_assets'], Decimal('10000.00'))
        self.assertEqual(totals['total_liabilities'], Decimal('2000.00'))
        self.assertEqual(totals['net_worth'], Decimal('8000.00'))
    
    def test_create_financials_snapshot(self):
        """Test creating net worth snapshot."""
        snapshot = self.service.create_financials_snapshot()
        
        self.assertEqual(snapshot.net_worth, Decimal('8000.00'))
        self.assertEqual(snapshot.owner, self.user)
    
    def test_snapshot_idempotency(self):
        """Test that creating snapshot for same date returns existing."""
        snapshot1 = self.service.create_financials_snapshot()
        snapshot2 = self.service.create_financials_snapshot()
        
        self.assertEqual(snapshot1.id, snapshot2.id)


class FinancialsAPITests(APITestCase):
    """Tests for Net Worth API endpoints."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_create_account(self):
        """Test creating account via API."""
        data = {
            'name': 'New Account',
            'account_type': 'cash',
            'subtype': 'checking',
            'initial_balance': '5000.00',
        }
        
        response = self.client.post('/api/financials/accounts/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Account')
    
    def test_list_accounts(self):
        """Test listing accounts."""
        FinancialAccount.objects.create(
            owner=self.user,
            name='Account 1',
            account_type='cash',
        )
        FinancialAccount.objects.create(
            owner=self.user,
            name='Account 2',
            account_type='investment',
        )
        
        response = self.client.get('/api/financials/accounts/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_dashboard_summary(self):
        """Test dashboard summary endpoint."""
        response = self.client.get('/api/financials/dashboard/summary/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('net_worth', response.data)
    
    def test_full_dashboard(self):
        """Test full dashboard data endpoint."""
        response = self.client.get('/api/financials/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('summary', response.data)
        self.assertIn('accounts', response.data)
        self.assertIn('milestones', response.data)


