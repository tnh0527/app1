from django.db import migrations
from django.utils import timezone
from datetime import datetime, timedelta


def create_birthday_events(apps, schema_editor):
    Profile = apps.get_model("profile_app", "Profile")
    Calendar = apps.get_model("schedule_app", "Calendar")
    Event = apps.get_model("schedule_app", "Event")
    EventOccurrence = apps.get_model("schedule_app", "EventOccurrence")

    now = timezone.now()
    current_year = now.year

    User = apps.get_model("auth_app", "User")
    profiles = Profile.objects.filter(birthdate__isnull=False)
    for p in profiles:
        # Resolve user via id to avoid using model properties not available on historical models
        try:
            user = User.objects.get(pk=p.user_id)
            user_id = user.id
        except Exception:
            # Skip if user cannot be resolved
            continue

        # get or create default calendar
        cal, _ = Calendar.objects.get_or_create(owner_id=user_id, is_default=True, defaults={"name": "Default", "timezone": "UTC"})

        # Use generic title (emoji) to match runtime behavior
        title = "🎂 Your Birthday!"

        # Create or update event
        # Build aware datetimes for the event master using the birthdate year
        try:
            dt_naive = datetime(p.birthdate.year, p.birthdate.month, p.birthdate.day, 0, 0)
            start_at = timezone.make_aware(dt_naive)
            end_at = start_at
        except Exception:
            # Fallback: skip this profile if date invalid
            continue

        event, created = Event.objects.get_or_create(
            calendar=cal,
            title=title,
            defaults={
                "start_at": start_at,
                "end_at": end_at,
                "all_day": True,
                "rrule": "FREQ=YEARLY",
                "is_immutable": True,
            },
        )

        if not created:
            # update canonical fields
            event.all_day = True
            event.rrule = "FREQ=YEARLY"
            event.is_immutable = True
            event.save()

        # generate a single occurrence in the near future so calendar shows it
        # choose this year's birthday or next year's if already passed
        try:
            b_month = p.birthdate.month
            b_day = p.birthdate.day
            occurrence_year = current_year
            occ_dt_naive = datetime(occurrence_year, b_month, b_day, 0, 0)
            occ_dt = timezone.make_aware(occ_dt_naive)
            if occ_dt < now:
                occurrence_year = current_year + 1
                occ_dt = timezone.make_aware(datetime(occurrence_year, b_month, b_day, 0, 0))
        except Exception:
            continue

        # avoid duplicates
        exists = EventOccurrence.objects.filter(event=event, start_at=occ_dt).exists()
        if not exists:
            EventOccurrence.objects.create(event=event, start_at=occ_dt, end_at=occ_dt + timedelta(minutes=30))


class Migration(migrations.Migration):

    dependencies = [
        ("profile_app", "0004_rename_twitter_profile_instagram"),
        ("schedule_app", "0003_event_is_immutable"),
    ]

    operations = [
        migrations.RunPython(create_birthday_events, reverse_code=migrations.RunPython.noop),
    ]
