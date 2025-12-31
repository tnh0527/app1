"""
Financials Dashboard URLs

URL configuration for the financials API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    FinancialAccountViewSet,
    AccountSnapshotViewSet,
    FinancialsSnapshotViewSet,
    CashFlowEntryViewSet,
    FinancialsMilestoneViewSet,
    ChangeLogViewSet,
    AccountGroupViewSet,
    DashboardSummaryView,
    TimelineView,
    ForecastView,
    InsightsView,
    FullDashboardView,
)

router = DefaultRouter()
router.register(r"accounts", FinancialAccountViewSet, basename="financial-account")
router.register(r"snapshots", AccountSnapshotViewSet, basename="account-snapshot")
router.register(
    r"financials-snapshots", FinancialsSnapshotViewSet, basename="financials-snapshot"
)
router.register(r"cashflow", CashFlowEntryViewSet, basename="cashflow-entry")
router.register(r"milestones", FinancialsMilestoneViewSet, basename="milestone")
router.register(r"changelog", ChangeLogViewSet, basename="changelog")
router.register(r"groups", AccountGroupViewSet, basename="account-group")

urlpatterns = [
    # ViewSet routes
    path("", include(router.urls)),
    # Aggregate dashboard endpoints
    path("dashboard/", FullDashboardView.as_view(), name="full-dashboard"),
    path(
        "dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"
    ),
    path("dashboard/timeline/", TimelineView.as_view(), name="dashboard-timeline"),
    path("dashboard/forecast/", ForecastView.as_view(), name="dashboard-forecast"),
    path("dashboard/insights/", InsightsView.as_view(), name="dashboard-insights"),
]
