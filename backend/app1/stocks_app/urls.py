from django.urls import path
from .views import *

urlpatterns = [
    path("stock-data/", StockDataAPIView.as_view(), name="stock_view"),
    path("market-snapshot/", MarketSnapshotAPIView.as_view(), name="market_snapshot"),
    path("stock-candles/", StockCandlesAPIView.as_view(), name="stock_candles"),
    path("stock-news/", StockNewsAPIView.as_view(), name="stock_news"),
]
