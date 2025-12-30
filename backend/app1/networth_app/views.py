"""
Net Worth Dashboard Views

REST API views for the net worth dashboard.
"""

from datetime import date, timedelta
from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404

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
from .serializers import (
    FinancialAccountSerializer,
    FinancialAccountCreateSerializer,
    AccountSnapshotSerializer,
    AccountSnapshotCreateSerializer,
    BulkSnapshotSerializer,
    NetWorthSnapshotSerializer,
    SubscriptionSerializer,
    CashFlowEntrySerializer,
    NetWorthMilestoneSerializer,
    ChangeLogSerializer,
    AccountGroupSerializer,
)
from .services import (
    NetWorthService,
    CashFlowService,
    SubscriptionService,
    InsightService,
    MilestoneService,
)


class FinancialAccountViewSet(viewsets.ModelViewSet):
    """ViewSet for managing financial accounts."""
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return FinancialAccountCreateSerializer
        return FinancialAccountSerializer
    
    def get_queryset(self):
        return FinancialAccount.objects.filter(
            owner=self.request.user
        ).order_by('display_order', 'account_type', 'name')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['post'])
    def update_value(self, request, pk=None):
        """Quick update for account value (creates new snapshot)."""
        account = self.get_object()
        value = request.data.get('value')
        recorded_at = request.data.get('recorded_at', date.today().isoformat())
        
        if value is None:
            return Response(
                {'error': 'Value is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            value = Decimal(str(value))
            recorded_at = date.fromisoformat(recorded_at)
        except (ValueError, TypeError) as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or update snapshot for this date
        snapshot, created = AccountSnapshot.objects.update_or_create(
            account=account,
            recorded_at=recorded_at,
            defaults={
                'value': value,
                'source': AccountSnapshot.SnapshotSource.MANUAL_ENTRY,
                'created_by': request.user,
            }
        )
        
        return Response(AccountSnapshotSerializer(snapshot).data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get snapshot history for an account."""
        account = self.get_object()
        limit = int(request.query_params.get('limit', 30))
        
        snapshots = AccountSnapshot.objects.filter(
            account=account
        ).order_by('-recorded_at')[:limit]
        
        return Response(AccountSnapshotSerializer(snapshots, many=True).data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get accounts grouped by type."""
        service = NetWorthService(request.user)
        breakdown = service.get_accounts_breakdown()
        return Response(breakdown)


class AccountSnapshotViewSet(viewsets.ModelViewSet):
    """ViewSet for account snapshots."""
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AccountSnapshotCreateSerializer
        return AccountSnapshotSerializer
    
    def get_queryset(self):
        return AccountSnapshot.objects.filter(
            account__owner=self.request.user
        ).select_related('account').order_by('-recorded_at')
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update multiple account snapshots at once."""
        serializer = BulkSnapshotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        recorded_at = serializer.validated_data['recorded_at']
        snapshots_data = serializer.validated_data['snapshots']
        
        created_snapshots = []
        
        with transaction.atomic():
            for item in snapshots_data:
                account = get_object_or_404(
                    FinancialAccount,
                    id=item['account_id'],
                    owner=request.user
                )
                
                snapshot, created = AccountSnapshot.objects.update_or_create(
                    account=account,
                    recorded_at=recorded_at,
                    defaults={
                        'value': item['value'],
                        'source': AccountSnapshot.SnapshotSource.MANUAL_ENTRY,
                        'created_by': request.user,
                        'notes': item.get('notes', ''),
                    }
                )
                created_snapshots.append(snapshot)
        
        return Response(
            AccountSnapshotSerializer(created_snapshots, many=True).data,
            status=status.HTTP_201_CREATED
        )


class NetWorthSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for net worth snapshots (read-only)."""
    
    serializer_class = NetWorthSnapshotSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return NetWorthSnapshot.objects.filter(
            owner=self.request.user
        ).order_by('-recorded_at')
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate a new net worth snapshot for today (or specified date)."""
        recorded_at = request.data.get('recorded_at', date.today().isoformat())
        
        try:
            recorded_at = date.fromisoformat(recorded_at)
        except ValueError:
            return Response(
                {'error': 'Invalid date format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        service = NetWorthService(request.user)
        snapshot = service.create_networth_snapshot(recorded_at)
        
        return Response(
            NetWorthSnapshotSerializer(snapshot).data,
            status=status.HTTP_201_CREATED
        )


class SubscriptionViewSet(viewsets.ModelViewSet):
    """ViewSet for subscriptions."""
    
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Subscription.objects.filter(
            owner=self.request.user
        ).order_by('-is_active', 'next_billing_date')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get subscription summary."""
        service = SubscriptionService(request.user)
        return Response(service.get_summary())
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle subscription active status."""
        subscription = self.get_object()
        subscription.is_active = not subscription.is_active
        subscription.save(update_fields=['is_active', 'updated_at'])
        return Response(SubscriptionSerializer(subscription).data)


class CashFlowEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for cash flow entries."""
    
    serializer_class = CashFlowEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return CashFlowEntry.objects.filter(
            owner=self.request.user
        ).order_by('-entry_date', '-created_at')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """Get monthly cash flow summary."""
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        year = int(year) if year else None
        month = int(month) if month else None
        
        service = CashFlowService(request.user)
        return Response(service.get_monthly_summary(year, month))


class NetWorthMilestoneViewSet(viewsets.ModelViewSet):
    """ViewSet for milestones."""
    
    serializer_class = NetWorthMilestoneSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return NetWorthMilestone.objects.filter(
            owner=self.request.user
        ).order_by('achieved_at', 'display_order', 'target_amount')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=False, methods=['get'])
    def with_progress(self, request):
        """Get all milestones with current progress."""
        service = MilestoneService(request.user)
        return Response(service.get_all_with_progress())
    
    @action(detail=True, methods=['post'])
    def celebrate(self, request, pk=None):
        """Mark a milestone as celebrated."""
        milestone = self.get_object()
        milestone.is_celebrated = True
        milestone.save(update_fields=['is_celebrated', 'updated_at'])
        return Response(NetWorthMilestoneSerializer(milestone).data)


class ChangeLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for change logs (read-only)."""
    
    serializer_class = ChangeLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ChangeLog.objects.filter(
            owner=self.request.user
        ).order_by('-created_at', '-importance')


class AccountGroupViewSet(viewsets.ModelViewSet):
    """ViewSet for account groups."""
    
    serializer_class = AccountGroupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AccountGroup.objects.filter(
            owner=self.request.user
        ).prefetch_related('accounts').order_by('display_order', 'name')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


# Dashboard aggregate views

class DashboardSummaryView(APIView):
    """Get dashboard summary data."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        service = NetWorthService(request.user)
        return Response(service.get_dashboard_summary())


class TimelineView(APIView):
    """Get net worth timeline data."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Parse query params
        range_param = request.query_params.get('range', '1y')
        
        end_date = date.today()
        
        ranges = {
            '1m': timedelta(days=30),
            '3m': timedelta(days=90),
            '6m': timedelta(days=180),
            '1y': timedelta(days=365),
            'all': timedelta(days=365 * 10),  # 10 years max
        }
        
        delta = ranges.get(range_param, timedelta(days=365))
        start_date = end_date - delta
        
        service = NetWorthService(request.user)
        data = service.get_timeline_data(start_date, end_date)
        
        return Response(data)


class ForecastView(APIView):
    """Get net worth forecast."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        months = int(request.query_params.get('months', 12))
        months = min(max(months, 1), 60)  # Clamp to 1-60 months
        
        service = NetWorthService(request.user)
        return Response(service.get_forecast(months))


class InsightsView(APIView):
    """Get insights and recent changes."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        
        insight_service = InsightService(request.user)
        
        return Response({
            'recent_changes': insight_service.get_recent_changes(limit),
            'monthly_insights': insight_service.get_monthly_insights(),
        })


class FullDashboardView(APIView):
    """Get all dashboard data in one request."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        range_param = request.query_params.get('range', '1y')
        
        nw_service = NetWorthService(user)
        cf_service = CashFlowService(user)
        sub_service = SubscriptionService(user)
        insight_service = InsightService(user)
        milestone_service = MilestoneService(user)
        
        # Calculate date range
        end_date = date.today()
        ranges = {
            '1m': timedelta(days=30),
            '3m': timedelta(days=90),
            '6m': timedelta(days=180),
            '1y': timedelta(days=365),
            'all': timedelta(days=365 * 10),
        }
        delta = ranges.get(range_param, timedelta(days=365))
        start_date = end_date - delta
        
        return Response({
            'summary': nw_service.get_dashboard_summary(),
            'timeline': nw_service.get_timeline_data(start_date, end_date),
            'forecast': nw_service.get_forecast(12),
            'accounts': nw_service.get_accounts_breakdown(),
            'cash_flow': cf_service.get_monthly_summary(),
            'subscriptions': sub_service.get_summary(),
            'insights': {
                'recent_changes': insight_service.get_recent_changes(10),
                'monthly_insights': insight_service.get_monthly_insights(),
            },
            'milestones': milestone_service.get_all_with_progress(),
        })

