"""
Travel App Views

REST API views for the travel management dashboard.
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
    Trip,
    TripExpense,
    TripDocument,
    PackingList,
    PackingItem,
    Itinerary,
    ItineraryActivity,
    TravelGoal,
    ExchangeRateCache,
)
from .serializers import (
    TripSerializer,
    TripCreateSerializer,
    TripListSerializer,
    TripDetailSerializer,
    TripExpenseSerializer,
    TripExpenseCreateSerializer,
    TripDocumentSerializer,
    PackingListSerializer,
    PackingListCreateSerializer,
    PackingItemSerializer,
    ItinerarySerializer,
    ItineraryActivitySerializer,
    TravelGoalSerializer,
    ExchangeRateSerializer,
)
from .services import (
    TravelAnalyticsService,
    BudgetService,
    PackingService,
    ItineraryService,
    TravelGoalService,
    ExchangeRateService,
)


class TripViewSet(viewsets.ModelViewSet):
    """ViewSet for managing trips."""
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TripCreateSerializer
        if self.action == 'list':
            return TripListSerializer
        if self.action == 'retrieve':
            return TripDetailSerializer
        return TripSerializer
    
    def get_queryset(self):
        queryset = Trip.objects.filter(owner=self.request.user)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by archived
        show_archived = self.request.query_params.get('archived', 'false')
        if show_archived.lower() != 'true':
            queryset = queryset.filter(is_archived=False)
        
        # Filter by type
        trip_type = self.request.query_params.get('type')
        if trip_type:
            queryset = queryset.filter(trip_type=trip_type)
        
        return queryset.order_by('-start_date')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming trips."""
        today = date.today()
        trips = Trip.objects.filter(
            owner=request.user,
            start_date__gt=today,
            is_archived=False,
            status__in=['planning', 'booked']
        ).order_by('start_date')[:5]
        
        serializer = TripListSerializer(trips, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get currently active trip."""
        today = date.today()
        trip = Trip.objects.filter(
            owner=request.user,
            start_date__lte=today,
            end_date__gte=today,
            is_archived=False
        ).first()
        
        if trip:
            serializer = TripDetailSerializer(trip)
            return Response(serializer.data)
        return Response(None)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recently completed trips."""
        trips = Trip.objects.filter(
            owner=request.user,
            status='completed',
            is_archived=False
        ).order_by('-end_date')[:5]
        
        serializer = TripListSerializer(trips, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a trip."""
        trip = self.get_object()
        trip.is_archived = True
        trip.save(update_fields=['is_archived', 'updated_at'])
        return Response({'status': 'archived'})
    
    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """Unarchive a trip."""
        trip = self.get_object()
        trip.is_archived = False
        trip.save(update_fields=['is_archived', 'updated_at'])
        return Response({'status': 'unarchived'})
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a trip for similar future trips."""
        original = self.get_object()
        
        # Calculate new dates (default to 1 year from original)
        date_offset = timedelta(days=365)
        new_start = original.start_date + date_offset
        new_end = original.end_date + date_offset
        
        # Override dates if provided
        if 'start_date' in request.data:
            new_start = date.fromisoformat(request.data['start_date'])
        if 'end_date' in request.data:
            new_end = date.fromisoformat(request.data['end_date'])
        
        # Create new trip
        new_trip = Trip.objects.create(
            owner=request.user,
            name=request.data.get('name', f"{original.name} (Copy)"),
            description=original.description,
            city=original.city,
            country=original.country,
            country_code=original.country_code,
            timezone=original.timezone,
            latitude=original.latitude,
            longitude=original.longitude,
            start_date=new_start,
            end_date=new_end,
            trip_type=original.trip_type,
            status='planning',
            budget_amount=original.budget_amount,
            budget_currency=original.budget_currency,
            budget_flights=original.budget_flights,
            budget_accommodation=original.budget_accommodation,
            budget_food=original.budget_food,
            budget_activities=original.budget_activities,
            budget_transport=original.budget_transport,
            budget_shopping=original.budget_shopping,
            budget_other=original.budget_other,
            color=original.color,
        )
        
        # Generate itinerary days
        itinerary_service = ItineraryService(request.user)
        itinerary_service.generate_itinerary_days(new_trip)
        
        # Create packing list
        packing_service = PackingService(request.user)
        packing_service.generate_packing_list(new_trip)
        
        serializer = TripSerializer(new_trip)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update trip status."""
        trip = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Trip.TripStatus.choices):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        trip.status = new_status
        trip.save(update_fields=['status', 'updated_at'])
        
        return Response(TripSerializer(trip).data)
    
    @action(detail=True, methods=['get'])
    def budget_breakdown(self, request, pk=None):
        """Get detailed budget breakdown for a trip."""
        trip = self.get_object()
        budget_service = BudgetService(request.user)
        breakdown = budget_service.get_trip_budget_breakdown(trip)
        return Response(breakdown)
    
    @action(detail=True, methods=['get'])
    def daily_spending(self, request, pk=None):
        """Get daily spending breakdown for a trip."""
        trip = self.get_object()
        budget_service = BudgetService(request.user)
        daily = budget_service.get_daily_spending(trip)
        return Response(daily)
    
    @action(detail=True, methods=['post'])
    def generate_itinerary(self, request, pk=None):
        """Generate/regenerate itinerary days for a trip."""
        trip = self.get_object()
        itinerary_service = ItineraryService(request.user)
        days = itinerary_service.generate_itinerary_days(trip)
        
        serializer = ItinerarySerializer(days, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def generate_packing_list(self, request, pk=None):
        """Generate packing list for a trip."""
        trip = self.get_object()
        packing_service = PackingService(request.user)
        packing_list = packing_service.generate_packing_list(trip)
        
        serializer = PackingListSerializer(packing_list)
        return Response(serializer.data)


class TripExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing trip expenses."""
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TripExpenseCreateSerializer
        return TripExpenseSerializer
    
    def get_queryset(self):
        queryset = TripExpense.objects.filter(trip__owner=self.request.user)
        
        # Filter by trip
        trip_id = self.request.query_params.get('trip')
        if trip_id:
            queryset = queryset.filter(trip_id=trip_id)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset.order_by('-expense_date', '-created_at')
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get expense breakdown by category."""
        trip_id = request.query_params.get('trip')
        if not trip_id:
            return Response(
                {'error': 'trip parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        expenses = TripExpense.objects.filter(
            trip__owner=request.user,
            trip_id=trip_id
        ).values('category').annotate(
            total=__import__('django.db.models', fromlist=['Sum']).Sum('converted_amount')
        )
        
        return Response({
            item['category']: float(item['total'])
            for item in expenses
        })
    
    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """Get daily expense summary."""
        trip_id = request.query_params.get('trip')
        if not trip_id:
            return Response(
                {'error': 'trip parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.db.models import Sum
        
        expenses = TripExpense.objects.filter(
            trip__owner=request.user,
            trip_id=trip_id
        ).values('expense_date').annotate(
            total=Sum('converted_amount')
        ).order_by('expense_date')
        
        return Response([
            {
                'date': item['expense_date'].isoformat(),
                'total': float(item['total'])
            }
            for item in expenses
        ])


class TripDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing trip documents."""
    
    serializer_class = TripDocumentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = TripDocument.objects.filter(trip__owner=self.request.user)
        
        # Filter by trip
        trip_id = self.request.query_params.get('trip')
        if trip_id:
            queryset = queryset.filter(trip_id=trip_id)
        
        # Filter by type
        doc_type = self.request.query_params.get('type')
        if doc_type:
            queryset = queryset.filter(document_type=doc_type)
        
        return queryset.order_by('document_type', 'name')
    
    @action(detail=False, methods=['get'])
    def expiring(self, request):
        """Get documents expiring soon."""
        threshold = date.today() + timedelta(days=180)
        
        documents = TripDocument.objects.filter(
            trip__owner=request.user,
            expiration_date__isnull=False,
            expiration_date__lte=threshold
        ).order_by('expiration_date')
        
        serializer = TripDocumentSerializer(documents, many=True)
        return Response(serializer.data)


class PackingListViewSet(viewsets.ModelViewSet):
    """ViewSet for managing packing lists."""
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PackingListCreateSerializer
        return PackingListSerializer
    
    def get_queryset(self):
        queryset = PackingList.objects.filter(owner=self.request.user)
        
        # Filter templates only
        templates_only = self.request.query_params.get('templates')
        if templates_only == 'true':
            queryset = queryset.filter(is_template=True)
        
        return queryset.prefetch_related('items')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['post'])
    def save_as_template(self, request, pk=None):
        """Save packing list as a template."""
        packing_list = self.get_object()
        template_name = request.data.get('template_name', 'My Template')
        
        packing_service = PackingService(request.user)
        template = packing_service.save_as_template(packing_list, template_name)
        
        serializer = PackingListSerializer(template)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Get all packing list templates."""
        packing_service = PackingService(request.user)
        templates = packing_service.get_templates()
        
        serializer = PackingListSerializer(templates, many=True)
        return Response(serializer.data)


class PackingItemViewSet(viewsets.ModelViewSet):
    """ViewSet for managing packing items."""
    
    serializer_class = PackingItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = PackingItem.objects.filter(
            packing_list__owner=self.request.user
        )
        
        # Filter by packing list
        list_id = self.request.query_params.get('list')
        if list_id:
            queryset = queryset.filter(packing_list_id=list_id)
        
        return queryset.order_by('category', 'name')
    
    @action(detail=True, methods=['post'])
    def toggle_packed(self, request, pk=None):
        """Toggle packed status of an item."""
        item = self.get_object()
        item.is_packed = not item.is_packed
        item.save(update_fields=['is_packed'])
        
        serializer = PackingItemSerializer(item)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_toggle(self, request):
        """Bulk toggle packed status."""
        item_ids = request.data.get('item_ids', [])
        is_packed = request.data.get('is_packed', True)
        
        updated = PackingItem.objects.filter(
            id__in=item_ids,
            packing_list__owner=request.user
        ).update(is_packed=is_packed)
        
        return Response({'updated': updated})


class ItineraryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing itineraries."""
    
    serializer_class = ItinerarySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Itinerary.objects.filter(trip__owner=self.request.user)
        
        # Filter by trip
        trip_id = self.request.query_params.get('trip')
        if trip_id:
            queryset = queryset.filter(trip_id=trip_id)
        
        return queryset.prefetch_related('activities').order_by('date')
    
    @action(detail=True, methods=['post'])
    def copy_activities(self, request, pk=None):
        """Copy activities from another day."""
        target_day = self.get_object()
        source_day_id = request.data.get('source_day_id')
        
        if not source_day_id:
            return Response(
                {'error': 'source_day_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        source_day = get_object_or_404(
            Itinerary,
            id=source_day_id,
            trip__owner=request.user
        )
        
        itinerary_service = ItineraryService(request.user)
        itinerary_service.copy_day(source_day, target_day)
        
        serializer = ItinerarySerializer(target_day)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reorder_activities(self, request, pk=None):
        """Reorder activities within a day."""
        itinerary = self.get_object()
        activity_orders = request.data.get('orders', [])
        
        itinerary_service = ItineraryService(request.user)
        itinerary_service.reorder_activities(itinerary, activity_orders)
        
        serializer = ItinerarySerializer(itinerary)
        return Response(serializer.data)


class ItineraryActivityViewSet(viewsets.ModelViewSet):
    """ViewSet for managing itinerary activities."""
    
    serializer_class = ItineraryActivitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ItineraryActivity.objects.filter(
            itinerary__trip__owner=self.request.user
        )
        
        # Filter by itinerary day
        itinerary_id = self.request.query_params.get('itinerary')
        if itinerary_id:
            queryset = queryset.filter(itinerary_id=itinerary_id)
        
        return queryset.order_by('order', 'start_time')


class TravelGoalViewSet(viewsets.ModelViewSet):
    """ViewSet for managing travel goals."""
    
    serializer_class = TravelGoalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = TravelGoal.objects.filter(owner=self.request.user)
        
        # Filter by achieved status
        achieved = self.request.query_params.get('achieved')
        if achieved == 'true':
            queryset = queryset.filter(is_achieved=True)
        elif achieved == 'false':
            queryset = queryset.filter(is_achieved=False)
        
        return queryset.order_by('-priority', 'target_date')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_achieved(self, request, pk=None):
        """Mark a goal as achieved."""
        goal = self.get_object()
        trip_id = request.data.get('trip_id')
        
        trip = None
        if trip_id:
            trip = get_object_or_404(Trip, id=trip_id, owner=request.user)
        
        goal_service = TravelGoalService(request.user)
        goal = goal_service.mark_as_achieved(goal, trip)
        
        serializer = TravelGoalSerializer(goal)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get goal achievement statistics."""
        goal_service = TravelGoalService(request.user)
        stats = goal_service.get_achievement_stats()
        return Response(stats)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder goals by priority."""
        priorities = request.data.get('priorities', [])
        
        for item in priorities:
            TravelGoal.objects.filter(
                id=item['id'],
                owner=request.user
            ).update(priority=item['priority'])
        
        return Response({'status': 'updated'})


# Dashboard Views

class TravelDashboardView(APIView):
    """Get full travel dashboard data."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        analytics_service = TravelAnalyticsService(request.user)
        budget_service = BudgetService(request.user)
        goal_service = TravelGoalService(request.user)
        
        summary = analytics_service.get_dashboard_summary()
        
        # Serialize trips if they exist
        active_trip_data = None
        next_trip_data = None
        
        if summary['active_trip']:
            active_trip_data = TripDetailSerializer(summary['active_trip']).data
        if summary['next_trip']:
            next_trip_data = TripListSerializer(summary['next_trip']).data
        
        return Response({
            'summary': {
                'total_trips': summary['total_trips'],
                'trips_this_year': summary['trips_this_year'],
                'countries_visited': summary['countries_visited'],
                'total_days_traveled': summary['total_days_traveled'],
                'total_spend_this_year': summary['total_spend_this_year'],
                'upcoming_trips': summary['upcoming_trips'],
            },
            'active_trip': active_trip_data,
            'next_trip': next_trip_data,
            'goal_stats': goal_service.get_achievement_stats(),
            'budget_accuracy': budget_service.get_budget_accuracy(),
        })


class TravelAnalyticsView(APIView):
    """Get comprehensive travel analytics."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        analytics_service = TravelAnalyticsService(request.user)
        analytics = analytics_service.get_full_analytics()
        return Response(analytics)


class TravelMapView(APIView):
    """Get data for world map visualization."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        analytics_service = TravelAnalyticsService(request.user)
        map_data = analytics_service.get_map_data()
        return Response(map_data)


class BudgetSuggestionView(APIView):
    """Get budget suggestions based on trip details."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        destination = request.data.get('destination', '')
        duration_days = int(request.data.get('duration_days', 7))
        trip_type = request.data.get('trip_type', 'vacation')
        
        budget_service = BudgetService(request.user)
        suggestion = budget_service.suggest_budget(
            destination, duration_days, trip_type
        )
        
        return Response(suggestion)


class ExchangeRateView(APIView):
    """Get and manage exchange rates."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        base = request.query_params.get('base', 'USD')
        target = request.query_params.get('target', 'EUR')
        
        exchange_service = ExchangeRateService()
        rate = exchange_service.get_rate(base, target)
        
        return Response({
            'base': base,
            'target': target,
            'rate': float(rate),
        })
    
    def post(self, request):
        """Convert an amount between currencies."""
        amount = Decimal(str(request.data.get('amount', 0)))
        from_currency = request.data.get('from', 'USD')
        to_currency = request.data.get('to', 'EUR')
        
        exchange_service = ExchangeRateService()
        converted, rate = exchange_service.convert_amount(
            amount, from_currency, to_currency
        )
        
        return Response({
            'original_amount': float(amount),
            'from_currency': from_currency,
            'converted_amount': float(converted),
            'to_currency': to_currency,
            'rate': float(rate),
        })

