from django.core.management.base import BaseCommand
from weather_app.models import WeatherCode
from weather_app.weather_codes import weather_code_descriptions

class Command(BaseCommand):
    help = 'Populates WeatherCode table from hardcoded dictionary'

    def handle(self, *args, **kwargs):
        for code, description in weather_code_descriptions.items():
            obj, created = WeatherCode.objects.get_or_create(code=code, defaults={'description': description})
            if created:
                self.stdout.write(f'Created code {code}')
            else:
                self.stdout.write(f'Code {code} already exists')
        self.stdout.write(self.style.SUCCESS('Successfully populated weather codes'))
