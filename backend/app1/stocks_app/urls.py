from django.urls import path
from .views import *

urlpatterns = [
    path("stock-data/", StockDataAPIView.as_view(), name="stock_view"),
]
