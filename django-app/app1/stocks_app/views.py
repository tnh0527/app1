from django.shortcuts import render
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
from datetime import datetime, timedelta


class StockDataAPIView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            stock_symbols = ["AAPL", "AMZN", "GOOGL", "TSLA", "NVDA"]

            # Fetch stock data from Finnhub
            stock_data_responses = [
                requests.get(
                    f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={settings.FINNHUB_API_KEY}"
                ).json()
                for symbol in stock_symbols
            ]
            print("Stock data:", stock_data_responses)
            # Fetch graph data from Financial Modeling Prep
            stock_graph_responses = [
                requests.get(
                    f"https://financialmodelingprep.com/api/v3/historical-chart/5min/{symbol}?apikey={settings.FMP_API_KEY}"
                ).json()
                for symbol in stock_symbols
            ]
            # Process stock data
            updated_stocks = []
            for index, data in enumerate(stock_data_responses):
                current_price = data.get("c")
                change = data.get("d")
                change_percent = data.get("dp")
                open_price = data.get("o")

                updated_stocks.append(
                    {
                        "name": stock_symbols[index],
                        "value": f"${current_price:.2f}" if current_price else "N/A",
                        "return": (
                            f"{'+' if change > 0 else ''}{change_percent:.2f}%"
                            if change_percent
                            else "N/A"
                        ),
                        "positive": change > 0 if change else False,
                        "openPrice": open_price,
                    }
                )
            # Process graph data
            updated_graphs = []
            for data in stock_graph_responses:
                if isinstance(data, list) and data:
                    # Filter data for the latest day and market hours
                    latest_date = datetime.strptime(
                        data[0]["date"], "%Y-%m-%d %H:%M:%S"
                    ).date()
                    filtered_data = [
                        result
                        for result in data
                        if datetime.strptime(result["date"], "%Y-%m-%d %H:%M:%S").date()
                        == latest_date
                        and 14
                        <= datetime.strptime(result["date"], "%Y-%m-%d %H:%M:%S").hour
                        < 21
                    ]
                    # Reverse order to start with correct time
                    filtered_data = list(reversed(filtered_data))
                    labels = [
                        datetime.strptime(result["date"], "%Y-%m-%d %H:%M:%S").strftime(
                            "%H:%M"
                        )
                        for result in filtered_data
                    ]
                    values = [result["close"] for result in filtered_data]
                    updated_graphs.append({"label": labels, "values": values})
                else:
                    updated_graphs.append({"labels": [], "values": []})

            print("graph data:", updated_graphs)

            return Response(
                {
                    "stocks": updated_stocks,
                    "stockGraphs": updated_graphs,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
