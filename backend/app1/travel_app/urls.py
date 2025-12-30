"""
Travel App URLs

URL configuration for the travel management API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TripViewSet,
    TripExpenseViewSet,
    TripDocumentViewSet,
    PackingListViewSet,
    PackingItemViewSet,
    ItineraryViewSet,
    ItineraryActivityViewSet,
    TravelGoalViewSet,
    TravelDashboardView,
    TravelAnalyticsView,
    TravelMapView,
    BudgetSuggestionView,
    ExchangeRateView,
)

router = DefaultRouter()
router.register(r'trips', TripViewSet, basename='trip')
router.register(r'expenses', TripExpenseViewSet, basename='expense')
router.register(r'documents', TripDocumentViewSet, basename='document')
router.register(r'packing-lists', PackingListViewSet, basename='packing-list')
router.register(r'packing-items', PackingItemViewSet, basename='packing-item')
router.register(r'itinerary', ItineraryViewSet, basename='itinerary')
router.register(r'activities', ItineraryActivityViewSet, basename='activity')
router.register(r'goals', TravelGoalViewSet, basename='goal')

urlpatterns = [
    # ViewSet routes
    path('', include(router.urls)),
    
    # Dashboard and analytics endpoints
    path('dashboard/', TravelDashboardView.as_view(), name='travel-dashboard'),
    path('analytics/', TravelAnalyticsView.as_view(), name='travel-analytics'),
    path('map/', TravelMapView.as_view(), name='travel-map'),
    
    # Utility endpoints
    path('budget/suggest/', BudgetSuggestionView.as_view(), name='budget-suggest'),
    path('exchange/', ExchangeRateView.as_view(), name='exchange-rate'),
]

