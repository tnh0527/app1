from django.db import migrations, models


def update_birthday_titles(apps, schema_editor):
    Event = apps.get_model("schedule_app", "Event")
    # Update system yearly events to use the generic emoji title
    Event.objects.filter(is_immutable=True, rrule__contains="FREQ=YEARLY").update(
        title="🎂 Your Birthday!",
        color="linear-gradient(90deg, #ff0000, #0000ff, #800080, #ff69b4)",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("schedule_app", "0003_event_is_immutable"),
    ]

    operations = [
        migrations.AlterField(
            model_name='event',
            name='title',
            field=models.CharField(max_length=200),
        ),
        migrations.RunPython(update_birthday_titles, reverse_code=migrations.RunPython.noop),
    ]
