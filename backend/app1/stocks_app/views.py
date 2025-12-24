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
            stock_symbols = [
                "AAPL",
                "AMZN",
                "GOOGL",
                "TSLA",
                "NVDA",
                "NFLX",
                "META",
                "V",
            ]

            # Fetch stock data from Finnhub
            stock_data_responses = [
                requests.get(
                    f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={settings.FINNHUB_API_KEY}"
                ).json()
                for symbol in stock_symbols
            ]
            # print("Stock data:", stock_data_responses)
            # Fetch company profiles from Finnhub
            company_profile_responses = [
                requests.get(
                    f"https://finnhub.io/api/v1/stock/profile2?symbol={symbol}&token={settings.FINNHUB_API_KEY}"
                ).json()
                for symbol in stock_symbols
            ]
            # print("Symbol info:", company_profile_responses)
            # Fetch graph data from Financial Modeling Prep
            stock_graph_responses = [
                requests.get(
                    f"https://api.twelvedata.com/time_series?apikey={settings.TWELVEDATA_API_KEY}&interval=1min&symbol={symbol}&format=JSON&outputsize=500"
                ).json()
                for symbol in stock_symbols
            ]
            # print("Graph", stock_graph_responses)
            # Process stock data
            updated_stocks = []
            for index, data in enumerate(stock_data_responses):
                current_price = data.get("c")
                change = data.get("d")
                change_percent = data.get("dp")
                open_price = data.get("o")
                company_profile = company_profile_responses[index]
                name = company_profile.get("name", "N/A")
                currency = company_profile.get("currency", "N/A")

                updated_stocks.append(
                    {
                        "symbol": stock_symbols[index],
                        "name": name,
                        "currency": currency,
                        "value": f"${current_price:.2f}" if current_price else "N/A",
                        "return": (
                            f"{'+' if change > 0 else ''}{change_percent:.2f}%"
                            if change_percent
                            else "N/A"
                        ),
                        "positive": change > 0 if change else False,
                        "change": change,
                        "openPrice": open_price,
                    }
                )
            # Process graph data
            updated_graphs = []

            for data in stock_graph_responses:
                if (
                    "values" in data
                    and isinstance(data["values"], list)
                    and data["values"]
                ):
                    values_data = data["values"]
                    # Filter data for the latest day and market hours
                    latest_date = datetime.strptime(
                        values_data[0]["datetime"], "%Y-%m-%d %H:%M:%S"
                    ).date()

                    filtered_data = [
                        result
                        for result in values_data
                        if datetime.strptime(
                            result["datetime"], "%Y-%m-%d %H:%M:%S"
                        ).date()
                        == latest_date
                        and 8
                        <= datetime.strptime(
                            result["datetime"], "%Y-%m-%d %H:%M:%S"
                        ).hour
                        < 16
                    ]
                    # Filter to 2-minute intervals
                    filtered_data_2min = [
                        filtered_data[i] for i in range(0, len(filtered_data), 2)
                    ]
                    # Reverse order to start with correct time
                    filtered_data_2min = list(reversed(filtered_data_2min))
                    labels = [
                        datetime.strptime(
                            result["datetime"], "%Y-%m-%d %H:%M:%S"
                        ).strftime("%H:%M")
                        for result in filtered_data_2min
                    ]
                    values = [result["close"] for result in filtered_data_2min]
                    updated_graphs.append({"labels": labels, "values": values})
                else:
                    updated_graphs.append({"labels": [], "values": []})

            # print("graph data:", updated_graphs)

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
