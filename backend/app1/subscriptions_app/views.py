"""
Subscription API Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum
from django.conf import settings

from app1.cache_utils import CacheableMixin, cached_api_view

from .models import (
    Subscription,
    SubscriptionCharge,
    SubscriptionUsageSignal,
    SubscriptionAlert,
    SubscriptionAlertEvent,
    SubscriptionInsightSnapshot,
)
from .serializers import (
    SubscriptionSerializer,
    SubscriptionListSerializer,
    SubscriptionChargeSerializer,
    SubscriptionUsageSignalSerializer,
    SubscriptionAlertSerializer,
    SubscriptionAlertEventSerializer,
    SubscriptionInsightSnapshotSerializer,
    DashboardSummarySerializer,
)
from .services import (
    SubscriptionAnalyticsService,
    SubscriptionAlertingService,
    SubscriptionUsageService,
    SubscriptionCalendarService,
)


class SubscriptionViewSet(CacheableMixin, viewsets.ModelViewSet):
    """
    ViewSet for Subscription CRUD operations.
    """
    permission_classes = [IsAuthenticated]
    cache_ttl = settings.CACHE_TTL.get("subscriptions_list", 300)
    cache_prefix = "subscriptions"
    cache_per_user = True
    
    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SubscriptionListSerializer
        return SubscriptionSerializer
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get subscriptions grouped by category."""
        subscriptions = self.get_queryset().filter(
            status__in=['active', 'trial']
        )
        
        categories = {}
        for sub in subscriptions:
            if sub.category not in categories:
                categories[sub.category] = {
                    'category': sub.category,
                    'category_display': sub.get_category_display(),
                    'subscriptions': [],
                    'total_monthly': 0,
                }
            
            categories[sub.category]['subscriptions'].append(
                SubscriptionListSerializer(sub).data
            )
            categories[sub.category]['total_monthly'] += float(sub.monthly_cost)
        
        return Response(list(categories.values()))
    
    @action(detail=True, methods=['post'])
    def record_usage(self, request, pk=None):
        """Record a usage signal for this subscription."""
        subscription = self.get_object()
        service = SubscriptionUsageService(request.user)
        
        signal = service.record_usage(
            subscription_id=str(subscription.id),
            used_at=request.data.get('used_at'),
            signal_type=request.data.get('signal_type', 'manual_checkin'),
            notes=request.data.get('notes', '')
        )
        
        return Response(
            SubscriptionUsageSignalSerializer(signal).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause a subscription."""
        subscription = self.get_object()
        subscription.status = 'paused'
        subscription.save()
        return Response(SubscriptionSerializer(subscription).data)
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume a paused subscription."""
        subscription = self.get_object()
        subscription.status = 'active'
        subscription.save()
        return Response(SubscriptionSerializer(subscription).data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a subscription."""
        subscription = self.get_object()
        subscription.status = 'cancelled'
        subscription.cancellation_date = timezone.now().date()
        subscription.save()
        return Response(SubscriptionSerializer(subscription).data)
    
    @action(detail=True, methods=['get'])
    def charges(self, request, pk=None):
        """Get charge history for a subscription."""
        subscription = self.get_object()
        charges = subscription.charges.all()[:50]
        return Response(SubscriptionChargeSerializer(charges, many=True).data)
    
    @action(detail=True, methods=['get'])
    def usage_history(self, request, pk=None):
        """Get usage history for a subscription."""
        subscription = self.get_object()
        service = SubscriptionUsageService(request.user)
        history = service.get_usage_history(str(subscription.id))
        return Response(history)
    
    @action(detail=True, methods=['post'])
    def sync_to_calendar(self, request, pk=None):
        """Create or update calendar event for this subscription."""
        subscription = self.get_object()
        service = SubscriptionCalendarService(request.user)
        
        if subscription.calendar_event_id:
            event = service.update_renewal_event(subscription)
            action_taken = 'updated'
        else:
            event = service.create_renewal_event(subscription)
            action_taken = 'created'
        
        return Response({
            'success': event is not None,
            'action': action_taken,
            'calendar_event_id': subscription.calendar_event_id,
        })
    
    @action(detail=False, methods=['post'])
    def sync_all_to_calendar(self, request):
        """Sync all active subscriptions to calendar."""
        service = SubscriptionCalendarService(request.user)
        result = service.sync_all_subscriptions_to_calendar()
        return Response({
            'success': True,
            'created': result['created'],
            'updated': result['updated'],
        })


class SubscriptionChargeViewSet(viewsets.ModelViewSet):
    """ViewSet for subscription charges."""
    serializer_class = SubscriptionChargeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SubscriptionCharge.objects.filter(
            subscription__user=self.request.user
        )
    
    def perform_create(self, serializer):
        # Auto-set previous amount
        charge = serializer.save()
        previous = SubscriptionCharge.objects.filter(
            subscription=charge.subscription,
            charged_at__lt=charge.charged_at
        ).order_by('-charged_at').first()
        
        if previous:
            charge.previous_amount = previous.amount
            charge.save()
        
        # Update subscription last payment info
        subscription = charge.subscription
        subscription.last_payment_date = charge.charged_at
        subscription.last_payment_amount = charge.amount
        subscription.save()


class SubscriptionAlertViewSet(viewsets.ModelViewSet):
    """ViewSet for subscription alerts."""
    serializer_class = SubscriptionAlertSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SubscriptionAlert.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def evaluate_all(self, request):
        """Manually trigger alert evaluation."""
        service = SubscriptionAlertingService(request.user)
        new_events = service.evaluate_all_alerts()
        return Response({
            'evaluated': True,
            'new_alerts': len(new_events),
            'events': SubscriptionAlertEventSerializer(new_events, many=True).data
        })


class SubscriptionAlertEventViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for alert events (read-only)."""
    serializer_class = SubscriptionAlertEventSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SubscriptionAlertEvent.objects.filter(
            alert__user=self.request.user
        )
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get unresolved alerts."""
        events = self.get_queryset().filter(
            is_dismissed=False,
            resolved_at__isnull=True
        )
        return Response(SubscriptionAlertEventSerializer(events, many=True).data)
    
    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """Dismiss an alert event."""
        event = self.get_object()
        event.dismiss(notes=request.data.get('notes', ''))
        return Response(SubscriptionAlertEventSerializer(event).data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark an alert as read."""
        event = self.get_object()
        event.is_read = True
        event.save()
        return Response(SubscriptionAlertEventSerializer(event).data)


# Analytics Views
class SubscriptionDashboardView(APIView):
    """Full subscription dashboard data."""
    permission_classes = [IsAuthenticated]
    
    @cached_api_view(
        ttl=settings.CACHE_TTL.get("subscriptions_summary", 600),
        key_prefix="subscriptions_dashboard",
        include_user=True
    )
    def get(self, request):
        analytics = SubscriptionAnalyticsService(request.user)
        alerting = SubscriptionAlertingService(request.user)
        
        # Get all subscriptions for the list
        subscriptions = Subscription.objects.filter(
            user=request.user
        ).order_by('next_billing_date')
        
        return Response({
            'summary': analytics.get_dashboard_summary(),
            'subscriptions': SubscriptionListSerializer(subscriptions, many=True).data,
            'upcoming_charges': analytics.get_upcoming_charges(30),
            'unused_subscriptions': analytics.get_unused_subscriptions(),
            'spending_history': analytics.get_spending_history(12),
            'active_alerts': alerting.get_active_alerts(),
        })


class SubscriptionSummaryView(APIView):
    """Dashboard summary endpoint."""
    permission_classes = [IsAuthenticated]
    
    @cached_api_view(
        ttl=settings.CACHE_TTL.get("subscriptions_summary", 600),
        key_prefix="subscriptions_summary",
        include_user=True
    )
    def get(self, request):
        analytics = SubscriptionAnalyticsService(request.user)
        return Response(analytics.get_dashboard_summary())


class UpcomingChargesView(APIView):
    """Upcoming charges endpoint."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        analytics = SubscriptionAnalyticsService(request.user)
        return Response(analytics.get_upcoming_charges(days))


class UnusedSubscriptionsView(APIView):
    """Unused subscriptions endpoint."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        days = int(request.query_params.get('days', 60))
        analytics = SubscriptionAnalyticsService(request.user)
        return Response(analytics.get_unused_subscriptions(days))


class SpendingHistoryView(APIView):
    """Spending history endpoint."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        months = int(request.query_params.get('months', 12))
        analytics = SubscriptionAnalyticsService(request.user)
        return Response(analytics.get_spending_history(months))


class CategoryBreakdownView(APIView):
    """Category breakdown endpoint."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        analytics = SubscriptionAnalyticsService(request.user)
        breakdown = analytics.get_spend_by_category()
        return Response({
            k: float(v) for k, v in breakdown.items()
        })
