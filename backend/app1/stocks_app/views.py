from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
from datetime import datetime, timedelta
from urllib.parse import quote


class StockDataAPIView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            # Top-10 "popular" stocks: use FMP's most active list (no hardcoded symbols).
            # Fallback to a stable list if the provider is unavailable.
            fallback_symbols = [
                "AAPL",
                "AMZN",
                "GOOGL",
                "TSLA",
                "NVDA",
                "NFLX",
                "META",
                "V",
                "MSFT",
                "BRK.B",
            ]

            stock_symbols = self._get_top_active_symbols(limit=10) or fallback_symbols

            finnhub_key = getattr(settings, "FINNHUB_API_KEY", None)
            iex_key = getattr(settings, "IEX_CLOUD_API_KEY", None)
            iex_base = getattr(
                settings, "IEX_CLOUD_BASE_URL", "https://cloud.iexapis.com/stable"
            )

            def fetch_finnhub_quote(sym):
                if not finnhub_key:
                    return None
                try:
                    r = requests.get(
                        "https://finnhub.io/api/v1/quote",
                        params={"symbol": sym, "token": finnhub_key},
                        timeout=10,
                    )
                    payload = r.json()
                    data = payload if isinstance(payload, dict) else {}
                    # Finnhub returns 0s when invalid/no data; treat empty as None
                    if (not data) or (
                        data.get("c") in (None, 0) and data.get("t") in (None, 0)
                    ):
                        return None
                    return data
                except Exception:
                    return None

            def fetch_finnhub_profile(sym):
                if not finnhub_key:
                    return None
                try:
                    r = requests.get(
                        "https://finnhub.io/api/v1/stock/profile2",
                        params={"symbol": sym, "token": finnhub_key},
                        timeout=10,
                    )
                    payload = r.json()
                    data = payload if isinstance(payload, dict) else {}
                    if not data or (
                        isinstance(data, dict) and data.get("name") in (None, "")
                    ):
                        return None
                    return data
                except Exception:
                    return None

            def fetch_iex_quote(sym):
                if not iex_key:
                    return None
                try:
                    r = requests.get(
                        f"{iex_base}/stock/{quote(sym)}/quote",
                        params={"token": iex_key},
                        timeout=10,
                    )
                    payload = r.json()
                    data = payload if isinstance(payload, dict) else {}
                    if not data or data.get("latestPrice") is None:
                        return None
                    return data
                except Exception:
                    return None

            def fetch_iex_company(sym):
                if not iex_key:
                    return None
                try:
                    r = requests.get(
                        f"{iex_base}/stock/{quote(sym)}/company",
                        params={"token": iex_key},
                        timeout=10,
                    )
                    payload = r.json()
                    data = payload if isinstance(payload, dict) else {}
                    if not data:
                        return None
                    return data
                except Exception:
                    return None

            stock_data_responses = []
            company_profile_responses = []
            for symbol in stock_symbols:
                q_fh = fetch_finnhub_quote(symbol)
                p_fh = fetch_finnhub_profile(symbol)

                q_iex = None
                p_iex = None
                if q_fh is None:
                    q_iex = fetch_iex_quote(symbol)
                if p_fh is None:
                    p_iex = fetch_iex_company(symbol)

                stock_data_responses.append(
                    {"_provider": "finnhub", **q_fh}
                    if isinstance(q_fh, dict)
                    else (
                        {"_provider": "iex", **q_iex} if isinstance(q_iex, dict) else {}
                    )
                )
                company_profile_responses.append(
                    {"_provider": "finnhub", **p_fh}
                    if isinstance(p_fh, dict)
                    else (
                        {"_provider": "iex", **p_iex} if isinstance(p_iex, dict) else {}
                    )
                )
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
                provider = (data or {}).get("_provider")
                if provider == "iex":
                    current_price = data.get("latestPrice")
                    change = data.get("change")
                    change_percent = data.get("changePercent")
                    if isinstance(change_percent, (int, float)):
                        change_percent = change_percent * 100
                    open_price = data.get("open")
                else:
                    current_price = data.get("c")
                    change = data.get("d")
                    change_percent = data.get("dp")
                    open_price = data.get("o")

                try:
                    current_price = (
                        float(current_price) if current_price is not None else None
                    )
                except Exception:
                    current_price = None
                try:
                    change = float(change) if change is not None else None
                except Exception:
                    change = None
                try:
                    change_percent = (
                        float(change_percent) if change_percent is not None else None
                    )
                except Exception:
                    change_percent = None
                try:
                    open_price = float(open_price) if open_price is not None else None
                except Exception:
                    open_price = None

                company_profile = company_profile_responses[index]
                if (company_profile or {}).get("_provider") == "iex":
                    name = (
                        company_profile.get("companyName")
                        or data.get("companyName")
                        or "N/A"
                    )
                    currency = "USD"
                    market_cap = data.get("marketCap")
                else:
                    name = company_profile.get("name", "N/A")
                    currency = company_profile.get("currency", "N/A")
                    market_cap = company_profile.get("marketCapitalization")

                updated_stocks.append(
                    {
                        "symbol": stock_symbols[index],
                        "name": name,
                        "currency": currency,
                        "value": f"${current_price:.2f}" if current_price else "N/A",
                        "return": (
                            f"{'+' if (change or 0) > 0 else ''}{change_percent:.2f}%"
                            if change_percent is not None
                            else "N/A"
                        ),
                        "positive": (change or 0) > 0,
                        "change": change,
                        "openPrice": open_price,
                        "marketCap": market_cap,
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

    def _get_top_active_symbols(self, limit=10):
        api_key = getattr(settings, "FMP_API_KEY", None)
        if not api_key:
            return []

        try:
            resp = requests.get(
                "https://financialmodelingprep.com/api/v3/stock_market/actives",
                params={"apikey": api_key},
                timeout=10,
            )
            resp.raise_for_status()
            payload = resp.json()
            if not isinstance(payload, list):
                return []

            symbols = []
            for item in payload:
                symbol = (item or {}).get("symbol")
                if symbol and symbol not in symbols:
                    symbols.append(symbol)
                if len(symbols) >= limit:
                    break
            return symbols
        except Exception:
            return []


class MarketSnapshotAPIView(APIView):
    """Major indices + Bitcoin snapshot for the Insight page."""

    def get(self, request, *args, **kwargs):
        try:
            td_key = getattr(settings, "TWELVEDATA_API_KEY", None)
            iex_key = getattr(settings, "IEX_CLOUD_API_KEY", None)
            iex_base = getattr(
                settings, "IEX_CLOUD_BASE_URL", "https://cloud.iexapis.com/stable"
            )

            if not td_key and not iex_key:
                return Response(
                    {
                        "indices": [],
                        "crypto": [],
                        "error": "No API keys configured (TWELVEDATA or IEX)",
                    },
                    status=status.HTTP_200_OK,
                )

            # Use liquid ETF proxies for indices (reliable and supported broadly).
            # BTC uses a direct crypto pair.
            indices = [
                {"symbol": "SPY", "name": "S&P 500"},
                {"symbol": "DIA", "name": "Dow Jones"},
                {"symbol": "QQQ", "name": "Nasdaq"},
            ]
            crypto = [{"symbol": "BTC/USD", "name": "Bitcoin"}]

            def fetch_quote(symbol):
                # 1. Try TwelveData
                if td_key:
                    try:
                        r = requests.get(
                            "https://api.twelvedata.com/quote",
                            params={"symbol": symbol, "apikey": td_key},
                            timeout=5,
                        )
                        data = r.json() if isinstance(r.json(), dict) else {}
                        if data.get("status") != "error" and data.get("close"):
                            return {"_provider": "twelvedata", **data}
                    except Exception:
                        pass

                # 2. Try IEX Cloud
                if iex_key:
                    try:
                        # IEX symbols might differ slightly (e.g. BTCUSD instead of BTC/USD)
                        iex_sym = symbol.replace("/", "") if "BTC" in symbol else symbol
                        r = requests.get(
                            f"{iex_base}/stock/{quote(iex_sym)}/quote",
                            params={"token": iex_key},
                            timeout=5,
                        )
                        data = r.json() if isinstance(r.json(), dict) else {}
                        if data.get("latestPrice"):
                            return {"_provider": "iex", **data}
                    except Exception:
                        pass
                return None

            def fetch_series(symbol, interval="15min", outputsize=60):
                # 1. Try TwelveData
                if td_key:
                    try:
                        r = requests.get(
                            "https://api.twelvedata.com/time_series",
                            params={
                                "symbol": symbol,
                                "interval": interval,
                                "outputsize": outputsize,
                                "format": "JSON",
                                "apikey": td_key,
                            },
                            timeout=5,
                        )
                        data = r.json() if isinstance(r.json(), dict) else {}
                        values = data.get("values")
                        if isinstance(values, list) and values:
                            # TwelveData returns newest-first; reverse to chronological.
                            return {
                                "_provider": "twelvedata",
                                "values": list(reversed(values)),
                            }
                    except Exception:
                        pass

                # 2. Try IEX Cloud (intraday chart)
                if iex_key:
                    try:
                        iex_sym = symbol.replace("/", "") if "BTC" in symbol else symbol
                        # IEX 'intraday-prices' or 'chart/1d'
                        r = requests.get(
                            f"{iex_base}/stock/{quote(iex_sym)}/intraday-prices",
                            params={
                                "token": iex_key,
                                "chartInterval": 5,
                            },  # 5 min interval
                            timeout=5,
                        )
                        data = r.json()
                        if isinstance(data, list) and data:
                            # IEX returns chronological
                            return {"_provider": "iex", "values": data}
                    except Exception:
                        pass
                return None

            def map_quote(item):
                q = fetch_quote(item["symbol"]) or {}
                provider = q.get("_provider")

                if provider == "iex":
                    price = q.get("latestPrice")
                    change = q.get("change")
                    percent_change = q.get("changePercent")
                    if isinstance(percent_change, (int, float)):
                        percent_change = percent_change * 100
                    open_price = q.get("open")  # might be null for IEX quote sometimes
                else:
                    price = q.get("close")
                    change = q.get("change")
                    percent_change = q.get("percent_change")
                    open_price = q.get("open")

                try:
                    price = float(price) if price is not None else None
                except Exception:
                    price = None
                try:
                    change = float(change) if change is not None else None
                except Exception:
                    change = None
                try:
                    percent_change = (
                        float(percent_change) if percent_change is not None else None
                    )
                except Exception:
                    percent_change = None
                try:
                    open_price = float(open_price) if open_price is not None else None
                except Exception:
                    open_price = None

                series_data = fetch_series(item["symbol"]) or {}
                series_provider = series_data.get("_provider")
                series_values = series_data.get("values", [])

                labels = []
                values = []

                if series_provider == "iex":
                    # IEX intraday: [{date, minute, label, high, low, average, close...}, ...]
                    for row in series_values:
                        label = row.get("label") or row.get("minute")
                        close = row.get("close") or row.get("average")
                        if not label or close is None:
                            continue
                        labels.append(label)
                        values.append(close)
                else:
                    # TwelveData: [{datetime, open, high, low, close, volume}, ...]
                    for row in series_values:
                        dt = (row or {}).get("datetime")
                        close = (row or {}).get("close")
                        if not dt:
                            continue
                        try:
                            close_f = float(close)
                        except Exception:
                            continue

                        # dt formats vary: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"
                        if isinstance(dt, str) and " " in dt:
                            time_part = dt.split(" ", 1)[1]
                            labels.append(time_part[:5])
                        else:
                            labels.append(str(dt))
                        values.append(close_f)

                return {
                    "symbol": item["symbol"],
                    "name": item["name"],
                    "price": price,
                    "change": change,
                    "changePercent": percent_change,
                    "graph": {
                        "labels": labels,
                        "values": values,
                        "openPrice": open_price,
                    },
                }

            return Response(
                {
                    "indices": [map_quote(i) for i in indices],
                    "crypto": [map_quote(c) for c in crypto],
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"indices": [], "crypto": [], "error": str(e)},
                status=status.HTTP_200_OK,
            )


class StockNewsAPIView(APIView):
    """Company news for a given stock symbol (Finnhub or IEX)."""

    def get(self, request, *args, **kwargs):
        try:
            token = getattr(settings, "FINNHUB_API_KEY", None)
            iex_key = getattr(settings, "IEX_CLOUD_API_KEY", None)
            iex_base = getattr(
                settings, "IEX_CLOUD_BASE_URL", "https://cloud.iexapis.com/stable"
            )

            if not token and not iex_key:
                return Response(
                    {"news": [], "error": "No API keys configured (FINNHUB or IEX)"},
                    status=status.HTTP_200_OK,
                )

            symbol = request.query_params.get("symbol")
            try:
                limit = int(request.query_params.get("limit", 10))
            except Exception:
                limit = 10
            limit = max(1, min(limit, 30))

            to_date = datetime.utcnow().date()
            from_date = to_date - timedelta(days=7)

            normalized = []

            # 1. Try Finnhub
            if token:
                try:
                    if symbol:
                        resp = requests.get(
                            "https://finnhub.io/api/v1/company-news",
                            params={
                                "symbol": symbol,
                                "from": from_date.isoformat(),
                                "to": to_date.isoformat(),
                                "token": token,
                            },
                            timeout=5,
                        )
                    else:
                        resp = requests.get(
                            "https://finnhub.io/api/v1/news",
                            params={"category": "general", "token": token},
                            timeout=5,
                        )

                    if resp.status_code == 200:
                        payload = resp.json()
                        if isinstance(payload, list):
                            for item in payload[:limit]:
                                item = item or {}
                                normalized.append(
                                    {
                                        "id": item.get("id") or item.get("uuid"),
                                        "headline": item.get("headline") or "",
                                        "source": item.get("source") or "",
                                        "datetime": item.get("datetime"),
                                        "url": item.get("url") or "",
                                        "summary": item.get("summary") or "",
                                        "image": item.get("image") or "",
                                        "related": item.get("related") or symbol or "",
                                    }
                                )
                except Exception:
                    pass

            # 2. Try IEX Cloud if Finnhub failed or returned empty
            if not normalized and iex_key and symbol:
                try:
                    # IEX News: /stock/{symbol}/news/last/{last}
                    r = requests.get(
                        f"{iex_base}/stock/{quote(symbol)}/news/last/{limit}",
                        params={"token": iex_key},
                        timeout=5,
                    )
                    if r.status_code == 200:
                        payload = r.json()
                        if isinstance(payload, list):
                            for item in payload:
                                normalized.append(
                                    {
                                        "id": str(item.get("datetime", ""))
                                        + item.get("headline", ""),
                                        "headline": item.get("headline", ""),
                                        "source": item.get("source", ""),
                                        "datetime": int(
                                            item.get("datetime", 0) / 1000
                                        ),  # IEX is ms
                                        "url": item.get("url", ""),
                                        "summary": item.get("summary", ""),
                                        "image": item.get("image", ""),
                                        "related": item.get("related", "") or symbol,
                                    }
                                )
                except Exception:
                    pass

            return Response(
                {
                    "symbol": symbol,
                    "from": from_date.isoformat(),
                    "to": to_date.isoformat(),
                    "news": normalized,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "symbol": request.query_params.get("symbol"),
                    "news": [],
                    "error": str(e),
                },
                status=status.HTTP_200_OK,
            )


class StockCandlesAPIView(APIView):
    """OHLC candle data for the Insight main chart (TwelveData or IEX)."""

    def get(self, request, *args, **kwargs):
        try:
            symbol = request.query_params.get("symbol")
            time_range = request.query_params.get("range", "1D")

            if not symbol:
                return Response(
                    {"error": "Missing required query param: symbol"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            td_key = getattr(settings, "TWELVEDATA_API_KEY", None)
            iex_key = getattr(settings, "IEX_CLOUD_API_KEY", None)
            iex_base = getattr(
                settings, "IEX_CLOUD_BASE_URL", "https://cloud.iexapis.com/stable"
            )

            if not td_key and not iex_key:
                return Response(
                    {
                        "symbol": symbol,
                        "range": time_range,
                        "interval": None,
                        "candles": [],
                        "closes": [],
                        "timestamps": [],
                        "error": "No API keys configured (TWELVEDATA or IEX)",
                    },
                    status=status.HTTP_200_OK,
                )

            # TwelveData intervals: 1min,5min,15min,30min,45min,1h,2h,4h,1day,1week,1month
            if time_range == "1D":
                interval = "5min"
                outputsize = 250
                iex_range = "1d"
            elif time_range == "5D":
                interval = "15min"
                outputsize = 500
                iex_range = "5d"
            elif time_range == "1M":
                interval = "1h"
                outputsize = 720
                iex_range = "1m"
            elif time_range == "6M":
                interval = "1day"
                outputsize = 220
                iex_range = "6m"
            elif time_range == "1Y":
                interval = "1day"
                outputsize = 260
                iex_range = "1y"
            else:
                interval = "5min"
                outputsize = 250
                iex_range = "1d"

            candles = []
            closes = []
            timestamps = []

            # 1. Try TwelveData
            if td_key:
                try:
                    resp = requests.get(
                        "https://api.twelvedata.com/time_series",
                        params={
                            "apikey": td_key,
                            "interval": interval,
                            "symbol": symbol,
                            "format": "JSON",
                            "outputsize": outputsize,
                        },
                        timeout=5,
                    )
                    data = resp.json() if isinstance(resp.json(), dict) else {}
                    values = data.get("values")

                    if isinstance(values, list) and values:
                        # TwelveData returns newest-first; reverse to chronological.
                        values = list(reversed(values))
                        for row in values:
                            dt = row.get("datetime")
                            try:
                                o = float(row.get("open"))
                                h = float(row.get("high"))
                                l = float(row.get("low"))
                                c = float(row.get("close"))
                            except Exception:
                                continue

                            timestamps.append(dt)
                            closes.append(c)
                            candles.append({"t": dt, "o": o, "h": h, "l": l, "c": c})
                except Exception:
                    pass

            # 2. Try IEX Cloud if TwelveData failed
            if not candles and iex_key:
                try:
                    # IEX Chart: /stock/{symbol}/chart/{range}
                    r = requests.get(
                        f"{iex_base}/stock/{quote(symbol)}/chart/{iex_range}",
                        params={
                            "token": iex_key,
                            "chartInterval": 2,
                        },  # Try to get some granularity
                        timeout=5,
                    )
                    data = r.json()
                    if isinstance(data, list) and data:
                        for row in data:
                            # IEX fields: date, minute, label, high, low, open, close
                            # For 1d, we have minute. For others, just date.
                            date_str = row.get("date")
                            minute_str = row.get("minute")

                            dt = f"{date_str} {minute_str}" if minute_str else date_str

                            try:
                                o = float(row.get("open") or 0)
                                h = float(row.get("high") or 0)
                                l = float(row.get("low") or 0)
                                c = float(row.get("close") or 0)
                                if c == 0:
                                    continue  # Skip empty candles
                            except Exception:
                                continue

                            timestamps.append(dt)
                            closes.append(c)
                            candles.append({"t": dt, "o": o, "h": h, "l": l, "c": c})
                except Exception:
                    pass

            return Response(
                {
                    "symbol": symbol,
                    "range": time_range,
                    "interval": interval,
                    "candles": candles,
                    "closes": closes,
                    "timestamps": timestamps,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "symbol": request.query_params.get("symbol"),
                    "range": request.query_params.get("range", "1D"),
                    "interval": None,
                    "candles": [],
                    "closes": [],
                    "timestamps": [],
                    "error": str(e),
                },
                status=status.HTTP_200_OK,
            )
