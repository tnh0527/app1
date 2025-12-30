"""
Subscription API URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    SubscriptionViewSet,
    SubscriptionChargeViewSet,
    SubscriptionAlertViewSet,
    SubscriptionAlertEventViewSet,
    SubscriptionDashboardView,
    SubscriptionSummaryView,
    UpcomingChargesView,
    UnusedSubscriptionsView,
    SpendingHistoryView,
    CategoryBreakdownView,
)

router = DefaultRouter()
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'charges', SubscriptionChargeViewSet, basename='subscription-charge')
router.register(r'alerts', SubscriptionAlertViewSet, basename='subscription-alert')
router.register(r'alert-events', SubscriptionAlertEventViewSet, basename='alert-event')

urlpatterns = [
    # ViewSet routes
    path('', include(router.urls)),
    
    # Dashboard endpoints
    path('dashboard/', SubscriptionDashboardView.as_view(), name='subscription-dashboard'),
    path('dashboard/summary/', SubscriptionSummaryView.as_view(), name='subscription-summary'),
    path('dashboard/upcoming/', UpcomingChargesView.as_view(), name='upcoming-charges'),
    path('dashboard/unused/', UnusedSubscriptionsView.as_view(), name='unused-subscriptions'),
    path('dashboard/history/', SpendingHistoryView.as_view(), name='spending-history'),
    path('dashboard/categories/', CategoryBreakdownView.as_view(), name='category-breakdown'),
]

