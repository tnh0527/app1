"""
Subscription Analytics and Alerting Services

Provides:
- Monthly/annual spend calculations
- Unused subscription detection
- Alert rule evaluation
- Insight generation
- Calendar integration
"""

from datetime import date, timedelta, datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from django.db import transaction

from .models import (
    Subscription,
    SubscriptionCharge,
    SubscriptionUsageSignal,
    SubscriptionAlert,
    SubscriptionAlertEvent,
    SubscriptionInsightSnapshot,
)


class SubscriptionAnalyticsService:
    """
    Analytics engine for subscription data.
    
    All methods are deterministic and user-scoped.
    """
    
    def __init__(self, user):
        self.user = user
    
    def get_monthly_spend(self, month: date = None) -> Decimal:
        """
        Calculate total monthly subscription spend.
        
        Uses normalized_monthly_amount for active subscriptions.
        """
        if month is None:
            month = timezone.now().date().replace(day=1)
        
        return Subscription.objects.filter(
            user=self.user,
            status__in=['active', 'trial'],
            start_date__lte=month + timedelta(days=31),
        ).exclude(
            cancellation_date__lt=month
        ).aggregate(
            total=Sum('normalized_monthly_amount')
        )['total'] or Decimal('0')
    
    def get_annual_burn_rate(self) -> Decimal:
        """Calculate total annual subscription cost."""
        return self.get_monthly_spend() * 12
    
    def get_spend_by_category(self) -> Dict[str, Decimal]:
        """Get monthly spend broken down by category."""
        results = Subscription.objects.filter(
            user=self.user,
            status__in=['active', 'trial']
        ).values('category').annotate(
            total=Sum('normalized_monthly_amount')
        )
        
        return {
            item['category']: item['total'] or Decimal('0')
            for item in results
        }
    
    def get_month_over_month_change(self) -> Dict[str, Any]:
        """
        Calculate spending change from previous month.
        """
        current_month = timezone.now().date().replace(day=1)
        previous_month = (current_month - timedelta(days=1)).replace(day=1)
        
        current_spend = self.get_monthly_spend(current_month)
        previous_spend = self.get_monthly_spend(previous_month)
        
        change = current_spend - previous_spend
        percentage = Decimal('0')
        if previous_spend != 0:
            percentage = (change / previous_spend) * 100
        
        return {
            'current_spend': current_spend,
            'previous_spend': previous_spend,
            'change_amount': change,
            'change_percentage': percentage,
            'trend': 'up' if change > 0 else ('down' if change < 0 else 'flat')
        }
    
    def get_upcoming_charges(self, days: int = 30) -> List[Dict]:
        """
        Get subscriptions with charges due within specified days.
        """
        today = timezone.now().date()
        end_date = today + timedelta(days=days)
        
        subscriptions = Subscription.objects.filter(
            user=self.user,
            status__in=['active', 'trial'],
            next_billing_date__gte=today,
            next_billing_date__lte=end_date
        ).order_by('next_billing_date')
        
        return [
            {
                'id': str(sub.id),
                'name': sub.name,
                'amount': sub.amount,
                'billing_cycle': sub.billing_cycle,
                'next_billing_date': sub.next_billing_date.isoformat(),
                'days_until': (sub.next_billing_date - today).days,
                'category': sub.category,
            }
            for sub in subscriptions
        ]
    
    def get_unused_subscriptions(self, days_threshold: int = 60) -> List[Dict]:
        """
        Identify subscriptions without recent usage signals.
        
        A subscription is considered unused if:
        - No usage signal in the last N days
        - Low confidence score on recent signals
        - Not marked as essential
        """
        cutoff_date = timezone.now().date() - timedelta(days=days_threshold)
        
        # Get active subscriptions
        active_subs = Subscription.objects.filter(
            user=self.user,
            status__in=['active', 'trial'],
            is_essential=False
        )
        
        unused = []
        for sub in active_subs:
            # Check for recent usage signals
            recent_signal = sub.usage_signals.filter(
                last_used_at__gte=cutoff_date,
                confidence_score__gte=Decimal('0.5')
            ).first()
            
            if not recent_signal:
                # Get last known usage
                last_signal = sub.usage_signals.filter(
                    last_used_at__isnull=False
                ).order_by('-last_used_at').first()
                
                days_unused = None
                last_used = None
                if last_signal and last_signal.last_used_at:
                    days_unused = (timezone.now().date() - last_signal.last_used_at).days
                    last_used = last_signal.last_used_at.isoformat()
                
                unused.append({
                    'id': str(sub.id),
                    'name': sub.name,
                    'monthly_cost': sub.monthly_cost,
                    'last_used': last_used,
                    'days_unused': days_unused,
                    'category': sub.category,
                    'annual_savings': sub.annual_cost,
                })
        
        return sorted(unused, key=lambda x: x['monthly_cost'], reverse=True)
    
    def get_subscription_counts(self) -> Dict[str, int]:
        """Get counts by status."""
        counts = Subscription.objects.filter(
            user=self.user
        ).values('status').annotate(count=Count('id'))
        
        result = {status: 0 for status, _ in Subscription.Status.choices}
        for item in counts:
            result[item['status']] = item['count']
        
        return result
    
    def get_dashboard_summary(self) -> Dict[str, Any]:
        """
        Get complete dashboard summary data.
        """
        counts = self.get_subscription_counts()
        mom_change = self.get_month_over_month_change()
        
        return {
            'monthly_spend': float(mom_change['current_spend']),
            'annual_burn': float(self.get_annual_burn_rate()),
            'active_count': counts.get('active', 0) + counts.get('trial', 0),
            'trial_count': counts.get('trial', 0),
            'paused_count': counts.get('paused', 0),
            'cancelled_count': counts.get('cancelled', 0),
            'unused_count': len(self.get_unused_subscriptions()),
            'change_amount': float(mom_change['change_amount']),
            'change_percentage': float(mom_change['change_percentage']),
            'trend': mom_change['trend'],
            'category_breakdown': {
                k: float(v) for k, v in self.get_spend_by_category().items()
            },
        }
    
    def get_spending_history(self, months: int = 12) -> List[Dict]:
        """
        Get monthly spending history for trend charts.
        """
        today = timezone.now().date()
        history = []
        
        for i in range(months):
            month_start = (today - timedelta(days=30 * i)).replace(day=1)
            spend = self.get_monthly_spend(month_start)
            
            history.append({
                'month': month_start.isoformat(),
                'spend': float(spend),
            })
        
        return list(reversed(history))


class SubscriptionAlertingService:
    """
    Alert evaluation and notification service.
    """
    
    def __init__(self, user):
        self.user = user
        self.analytics = SubscriptionAnalyticsService(user)
    
    def evaluate_all_alerts(self) -> List[SubscriptionAlertEvent]:
        """
        Evaluate all active alerts for the user.
        
        Returns list of newly created alert events.
        """
        alerts = SubscriptionAlert.objects.filter(
            user=self.user,
            is_active=True
        )
        
        new_events = []
        for alert in alerts:
            event = self._evaluate_alert(alert)
            if event:
                new_events.append(event)
        
        return new_events
    
    def _evaluate_alert(self, alert: SubscriptionAlert) -> Optional[SubscriptionAlertEvent]:
        """Evaluate a single alert rule."""
        handlers = {
            'price_increase': self._check_price_increase,
            'unused': self._check_unused,
            'upcoming_charge': self._check_upcoming_charge,
            'annual_spike': self._check_annual_spike,
            'trial_ending': self._check_trial_ending,
            'spend_threshold': self._check_spend_threshold,
        }
        
        handler = handlers.get(alert.alert_type)
        if handler:
            return handler(alert)
        return None
    
    def _check_price_increase(self, alert: SubscriptionAlert) -> Optional[SubscriptionAlertEvent]:
        """Check for subscription price increases."""
        if not alert.subscription:
            return None
        
        # Get last two charges
        charges = SubscriptionCharge.objects.filter(
            subscription=alert.subscription
        ).order_by('-charged_at')[:2]
        
        if len(charges) < 2:
            return None
        
        current = charges[0]
        previous = charges[1]
        
        if current.amount <= previous.amount:
            return None
        
        increase_pct = ((current.amount - previous.amount) / previous.amount) * 100
        threshold = alert.threshold_value or Decimal('5')  # Default 5%
        
        if increase_pct >= threshold:
            # Check if we already created an event for this
            existing = SubscriptionAlertEvent.objects.filter(
                alert=alert,
                triggered_at__date=timezone.now().date()
            ).exists()
            
            if not existing:
                return SubscriptionAlertEvent.objects.create(
                    alert=alert,
                    message=f"{alert.subscription.name} price increased by {increase_pct:.1f}% (${previous.amount} → ${current.amount})",
                    severity='warning',
                    subscription_name=alert.subscription.name,
                    trigger_value=increase_pct,
                )
        
        return None
    
    def _check_unused(self, alert: SubscriptionAlert) -> Optional[SubscriptionAlertEvent]:
        """Check for unused subscriptions."""
        days_threshold = alert.threshold_days or 60
        
        if alert.subscription:
            # Check specific subscription
            subscriptions = [alert.subscription]
        else:
            # Check all active subscriptions
            subscriptions = Subscription.objects.filter(
                user=self.user,
                status__in=['active', 'trial'],
                is_essential=False
            )
        
        for sub in subscriptions:
            cutoff_date = timezone.now().date() - timedelta(days=days_threshold)
            
            recent_signal = sub.usage_signals.filter(
                last_used_at__gte=cutoff_date,
                confidence_score__gte=Decimal('0.5')
            ).exists()
            
            if not recent_signal:
                # Check for existing alert
                existing = SubscriptionAlertEvent.objects.filter(
                    alert=alert,
                    subscription_name=sub.name,
                    is_dismissed=False,
                    resolved_at__isnull=True,
                ).exists()
                
                if not existing:
                    return SubscriptionAlertEvent.objects.create(
                        alert=alert,
                        message=f"{sub.name} appears unused for {days_threshold}+ days. Monthly cost: ${sub.monthly_cost:.2f}",
                        severity='info',
                        subscription_name=sub.name,
                        trigger_value=sub.monthly_cost,
                    )
        
        return None
    
    def _check_upcoming_charge(self, alert: SubscriptionAlert) -> Optional[SubscriptionAlertEvent]:
        """Check for upcoming charges."""
        days_before = alert.threshold_days or 3
        target_date = timezone.now().date() + timedelta(days=days_before)
        
        if alert.subscription:
            subscriptions = Subscription.objects.filter(
                id=alert.subscription.id,
                next_billing_date=target_date
            )
        else:
            subscriptions = Subscription.objects.filter(
                user=self.user,
                status__in=['active', 'trial'],
                next_billing_date=target_date
            )
        
        for sub in subscriptions:
            existing = SubscriptionAlertEvent.objects.filter(
                alert=alert,
                subscription_name=sub.name,
                triggered_at__date=timezone.now().date()
            ).exists()
            
            if not existing:
                return SubscriptionAlertEvent.objects.create(
                    alert=alert,
                    message=f"{sub.name} charges ${sub.amount} in {days_before} days",
                    severity='info',
                    subscription_name=sub.name,
                    trigger_value=sub.amount,
                )
        
        return None
    
    def _check_trial_ending(self, alert: SubscriptionAlert) -> Optional[SubscriptionAlertEvent]:
        """Check for trials ending soon."""
        days_before = alert.threshold_days or 3
        target_date = timezone.now().date() + timedelta(days=days_before)
        
        subscriptions = Subscription.objects.filter(
            user=self.user,
            status='trial',
            trial_end_date=target_date
        )
        
        for sub in subscriptions:
            existing = SubscriptionAlertEvent.objects.filter(
                alert=alert,
                subscription_name=sub.name,
                triggered_at__date=timezone.now().date()
            ).exists()
            
            if not existing:
                return SubscriptionAlertEvent.objects.create(
                    alert=alert,
                    message=f"{sub.name} trial ends in {days_before} days. Will charge ${sub.amount}/{sub.billing_cycle}",
                    severity='warning',
                    subscription_name=sub.name,
                    trigger_value=sub.amount,
                )
        
        return None
    
    def _check_spend_threshold(self, alert: SubscriptionAlert) -> Optional[SubscriptionAlertEvent]:
        """Check if monthly spend exceeds threshold."""
        threshold = alert.threshold_value
        if not threshold:
            return None
        
        current_spend = self.analytics.get_monthly_spend()
        
        if current_spend >= threshold:
            existing = SubscriptionAlertEvent.objects.filter(
                alert=alert,
                triggered_at__month=timezone.now().month,
                triggered_at__year=timezone.now().year,
            ).exists()
            
            if not existing:
                return SubscriptionAlertEvent.objects.create(
                    alert=alert,
                    message=f"Monthly subscription spend (${current_spend:.2f}) exceeds threshold (${threshold:.2f})",
                    severity='warning',
                    subscription_name='All Subscriptions',
                    trigger_value=current_spend,
                )
        
        return None
    
    def _check_annual_spike(self, alert: SubscriptionAlert) -> Optional[SubscriptionAlertEvent]:
        """Check for annual spending spikes."""
        threshold_pct = alert.threshold_value or Decimal('20')  # Default 20%
        
        mom = self.analytics.get_month_over_month_change()
        
        if mom['change_percentage'] >= threshold_pct:
            existing = SubscriptionAlertEvent.objects.filter(
                alert=alert,
                triggered_at__month=timezone.now().month,
                triggered_at__year=timezone.now().year,
            ).exists()
            
            if not existing:
                return SubscriptionAlertEvent.objects.create(
                    alert=alert,
                    message=f"Monthly subscription spend increased by {mom['change_percentage']:.1f}%",
                    severity='warning',
                    subscription_name='All Subscriptions',
                    trigger_value=mom['change_percentage'],
                )
        
        return None
    
    def get_active_alerts(self) -> List[Dict]:
        """Get all unresolved alert events."""
        events = SubscriptionAlertEvent.objects.filter(
            alert__user=self.user,
            is_dismissed=False,
            resolved_at__isnull=True
        ).select_related('alert').order_by('-triggered_at')
        
        return [
            {
                'id': str(event.id),
                'alert_type': event.alert.alert_type,
                'subscription_name': event.subscription_name,
                'message': event.message,
                'severity': event.severity,
                'triggered_at': event.triggered_at.isoformat(),
                'is_read': event.is_read,
            }
            for event in events
        ]
    
    def dismiss_alert(self, event_id: str, notes: str = '') -> bool:
        """Dismiss an alert event."""
        try:
            event = SubscriptionAlertEvent.objects.get(
                id=event_id,
                alert__user=self.user
            )
            event.dismiss(notes)
            return True
        except SubscriptionAlertEvent.DoesNotExist:
            return False
    
    def mark_as_read(self, event_id: str) -> bool:
        """Mark an alert event as read."""
        try:
            SubscriptionAlertEvent.objects.filter(
                id=event_id,
                alert__user=self.user
            ).update(is_read=True)
            return True
        except Exception:
            return False


class SubscriptionUsageService:
    """
    Service for tracking subscription usage.
    """
    
    def __init__(self, user):
        self.user = user
    
    def record_usage(
        self,
        subscription_id: str,
        used_at: date = None,
        signal_type: str = 'manual_checkin',
        confidence: Decimal = Decimal('1.0'),
        notes: str = ''
    ) -> SubscriptionUsageSignal:
        """Record a usage signal for a subscription."""
        subscription = Subscription.objects.get(
            id=subscription_id,
            user=self.user
        )
        
        return SubscriptionUsageSignal.objects.create(
            subscription=subscription,
            signal_type=signal_type,
            last_used_at=used_at or timezone.now().date(),
            confidence_score=confidence,
            notes=notes
        )
    
    def get_usage_history(self, subscription_id: str, limit: int = 30) -> List[Dict]:
        """Get usage history for a subscription."""
        signals = SubscriptionUsageSignal.objects.filter(
            subscription_id=subscription_id,
            subscription__user=self.user
        ).order_by('-created_at')[:limit]
        
        return [
            {
                'id': str(sig.id),
                'signal_type': sig.signal_type,
                'last_used_at': sig.last_used_at.isoformat() if sig.last_used_at else None,
                'confidence_score': float(sig.confidence_score),
                'created_at': sig.created_at.isoformat(),
            }
            for sig in signals
        ]


class SubscriptionCalendarService:
    """
    Service for calendar integration.
    
    Creates calendar events for subscription renewals/reminders.
    """
    
    def __init__(self, user):
        self.user = user
    
    def _get_or_create_subscriptions_calendar(self):
        """Get or create a dedicated calendar for subscriptions."""
        from schedule_app.models import Calendar
        
        calendar, created = Calendar.objects.get_or_create(
            owner=self.user,
            name='Subscriptions',
            defaults={
                'color': 'purple',
                'timezone': 'UTC',
                'is_visible': True,
            }
        )
        return calendar
    
    def _get_rrule_for_billing_cycle(self, billing_cycle: str) -> str:
        """Generate RRULE for subscription billing cycle."""
        rrule_map = {
            'weekly': 'FREQ=WEEKLY;INTERVAL=1',
            'monthly': 'FREQ=MONTHLY;INTERVAL=1',
            'quarterly': 'FREQ=MONTHLY;INTERVAL=3',
            'yearly': 'FREQ=YEARLY;INTERVAL=1',
        }
        return rrule_map.get(billing_cycle, '')
    
    def create_renewal_event(self, subscription: Subscription) -> Optional[Any]:
        """
        Create a calendar event for subscription renewal.
        
        Returns the created Event or None if calendar integration is not available.
        """
        try:
            from schedule_app.models import Event, EventCategory
            
            calendar = self._get_or_create_subscriptions_calendar()
            
            # Get or create subscription category
            category, _ = EventCategory.objects.get_or_create(
                owner=self.user,
                name='Subscription Renewal',
                defaults={
                    'color': 'purple',
                    'icon': 'credit-card',
                }
            )
            
            # Calculate event times (all-day event on billing date)
            start_dt = datetime.combine(
                subscription.next_billing_date,
                datetime.min.time()
            )
            start_dt = timezone.make_aware(start_dt, timezone.utc)
            end_dt = start_dt + timedelta(days=1)
            
            # Create the recurring event
            event = Event.objects.create(
                calendar=calendar,
                category=category,
                title=f'💳 {subscription.name} Renewal - ${subscription.amount}',
                description=f'Subscription renewal for {subscription.name}.\n'
                           f'Amount: ${subscription.amount}\n'
                           f'Billing Cycle: {subscription.get_billing_cycle_display()}\n'
                           f'Category: {subscription.get_category_display()}',
                start_at=start_dt,
                end_at=end_dt,
                all_day=True,
                color='purple',
                priority='medium',
                rrule=self._get_rrule_for_billing_cycle(subscription.billing_cycle),
            )
            
            # Update subscription with calendar event reference
            subscription.calendar_event_id = str(event.id)
            subscription.save(update_fields=['calendar_event_id'])
            
            return event
            
        except ImportError:
            # Schedule app not available
            return None
        except Exception as e:
            # Log error but don't fail subscription operations
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to create calendar event: {e}")
            return None
    
    def update_renewal_event(self, subscription: Subscription) -> Optional[Any]:
        """
        Update existing calendar event for subscription.
        """
        if not subscription.calendar_event_id:
            return self.create_renewal_event(subscription)
        
        try:
            from schedule_app.models import Event
            
            event = Event.objects.get(id=subscription.calendar_event_id)
            
            # Update event details
            event.title = f'💳 {subscription.name} Renewal - ${subscription.amount}'
            event.description = (
                f'Subscription renewal for {subscription.name}.\n'
                f'Amount: ${subscription.amount}\n'
                f'Billing Cycle: {subscription.get_billing_cycle_display()}\n'
                f'Category: {subscription.get_category_display()}'
            )
            
            # Update start time if billing date changed
            start_dt = datetime.combine(
                subscription.next_billing_date,
                datetime.min.time()
            )
            start_dt = timezone.make_aware(start_dt, timezone.utc)
            event.start_at = start_dt
            event.end_at = start_dt + timedelta(days=1)
            
            # Update recurrence rule
            event.rrule = self._get_rrule_for_billing_cycle(subscription.billing_cycle)
            
            event.save()
            return event
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to update calendar event: {e}")
            return None
    
    def remove_renewal_event(self, subscription: Subscription) -> bool:
        """
        Remove calendar event when subscription is cancelled.
        
        Note: We don't delete the event (to preserve history), 
        we just mark future occurrences as cancelled.
        """
        if not subscription.calendar_event_id:
            return True
        
        try:
            from schedule_app.models import Event, EventOccurrence
            
            event = Event.objects.get(id=subscription.calendar_event_id)
            
            # Cancel future occurrences
            EventOccurrence.objects.filter(
                event=event,
                start_at__gte=timezone.now()
            ).update(is_cancelled=True)
            
            # Clear recurrence rule to stop generating new occurrences
            event.rrule = ''
            event.save(update_fields=['rrule'])
            
            return True
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to remove calendar event: {e}")
            return False
    
    def sync_all_subscriptions_to_calendar(self) -> Dict[str, int]:
        """
        Sync all active subscriptions to calendar.
        
        Returns count of created/updated events.
        """
        active_subs = Subscription.objects.filter(
            user=self.user,
            status__in=['active', 'trial']
        )
        
        created = 0
        updated = 0
        
        for sub in active_subs:
            if sub.calendar_event_id:
                if self.update_renewal_event(sub):
                    updated += 1
            else:
                if self.create_renewal_event(sub):
                    created += 1
        
        return {'created': created, 'updated': updated}

