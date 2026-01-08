"""
Financials Dashboard Views

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
from django.conf import settings

from app1.cache_utils import CacheableMixin, cached_api_view, generate_cache_key

from .models import (
    FinancialAccount,
    AccountSnapshot,
    FinancialsSnapshot,
    CashFlowEntry,
    FinancialsMilestone,
    ChangeLog,
    AccountGroup,
)
from .serializers import (
    FinancialAccountSerializer,
    FinancialAccountCreateSerializer,
    AccountSnapshotSerializer,
    AccountSnapshotCreateSerializer,
    BulkSnapshotSerializer,
    FinancialsSnapshotSerializer,
    CashFlowEntrySerializer,
    FinancialsMilestoneSerializer,
    ChangeLogSerializer,
    AccountGroupSerializer,
)
from .services import (
    FinancialsService,
    CashFlowService,
    InsightService,
    MilestoneService,
)


class FinancialAccountViewSet(CacheableMixin, viewsets.ModelViewSet):
    """ViewSet for managing financial accounts."""
    
    permission_classes = [IsAuthenticated]
    cache_ttl = settings.CACHE_TTL.get("financials_accounts", 300)
    cache_prefix = "financials_accounts"
    cache_per_user = True
    
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
        service = FinancialsService(request.user)
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


class FinancialsSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for net worth snapshots (read-only)."""
    
    serializer_class = FinancialsSnapshotSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return FinancialsSnapshot.objects.filter(
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
        
        service = FinancialsService(request.user)
        snapshot = service.create_financials_snapshot(recorded_at)
        
        return Response(
            FinancialsSnapshotSerializer(snapshot).data,
            status=status.HTTP_201_CREATED
        )


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


class FinancialsMilestoneViewSet(viewsets.ModelViewSet):
    """ViewSet for milestones."""
    
    serializer_class = FinancialsMilestoneSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return FinancialsMilestone.objects.filter(
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
        return Response(FinancialsMilestoneSerializer(milestone).data)


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
    
    @cached_api_view(
        ttl=settings.CACHE_TTL.get("financials_summary", 600),
        key_prefix="financials_summary",
        include_user=True
    )
    def get(self, request):
        service = FinancialsService(request.user)
        return Response(service.get_dashboard_summary())


class TimelineView(APIView):
    """Get net worth timeline data."""
    
    permission_classes = [IsAuthenticated]
    
    @cached_api_view(
        ttl=settings.CACHE_TTL.get("financials_snapshots", 600),
        key_prefix="financials_timeline",
        include_user=True
    )
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
        
        service = FinancialsService(request.user)
        data = service.get_timeline_data(start_date, end_date)
        
        return Response(data)


class ForecastView(APIView):
    """Get net worth forecast."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        months = int(request.query_params.get('months', 12))
        months = min(max(months, 1), 60)  # Clamp to 1-60 months
        
        service = FinancialsService(request.user)
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
    
    @cached_api_view(
        ttl=settings.CACHE_TTL.get("financials_summary", 600),
        key_prefix="financials_full_dashboard",
        include_user=True
    )
    def get(self, request):
        user = request.user
        range_param = request.query_params.get('range', '1y')
        
        nw_service = FinancialsService(user)
        cf_service = CashFlowService(user)
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
            'insights': {
                'recent_changes': insight_service.get_recent_changes(10),
                'monthly_insights': insight_service.get_monthly_insights(),
            },
            'milestones': milestone_service.get_all_with_progress(),
        })


