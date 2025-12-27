import React, { useEffect, useMemo, useState } from "react";
import MainCharts from "../../components/Insight/MainCharts";
import "./Insight.css";
import Ticker from "../../components/Insight/Tickers";
import SparklineGraph from "../../components/Insight/SparklineGraph";

import api from "../../api/axios";

const Insight = () => {
  const [timeRange, setTimeRange] = useState("1D");
  const [chartType, setChartType] = useState("line");
  const [stocks, setStocks] = useState([]);
  const [marketSnapshot, setMarketSnapshot] = useState({
    indices: [],
    crypto: [],
  });
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [news, setNews] = useState([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchInsightData = async () => {
      setIsLoading(true);

      // Cache check
      const cachedData = localStorage.getItem("insight_data");
      const cachedTimestamp = localStorage.getItem("insight_data_ts");
      const now = new Date().getTime();
      const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

      if (
        cachedData &&
        cachedTimestamp &&
        now - cachedTimestamp < CACHE_DURATION
      ) {
        try {
          const { stocks, snapshot } = JSON.parse(cachedData);
          if (!isCancelled) {
            setStocks(stocks);
            setMarketSnapshot(snapshot);
            if (stocks.length)
              setSelectedSymbol((prev) => prev || stocks[0].symbol);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }

      try {
        const [stocksResp, snapshotResp] = await Promise.all([
          api.get("/api/stock-data/"),
          api.get("/api/market-snapshot/"),
        ]);

        const stocksJson = stocksResp.data;
        const snapshotJson = snapshotResp.data;

        if (isCancelled) return;

        const loadedStocks = Array.isArray(stocksJson?.stocks)
          ? stocksJson.stocks
          : [];

        const loadedSnapshot = {
          indices: Array.isArray(snapshotJson?.indices)
            ? snapshotJson.indices
            : [],
          crypto: Array.isArray(snapshotJson?.crypto)
            ? snapshotJson.crypto
            : [],
        };

        setStocks(loadedStocks);
        setMarketSnapshot(loadedSnapshot);

        // Save to cache
        localStorage.setItem(
          "insight_data",
          JSON.stringify({ stocks: loadedStocks, snapshot: loadedSnapshot })
        );
        localStorage.setItem("insight_data_ts", now.toString());

        if (loadedStocks.length)
          setSelectedSymbol((prev) => prev || loadedStocks[0].symbol);
      } catch {
        if (!isCancelled) {
          setStocks([]);
          setMarketSnapshot({ indices: [], crypto: [] });
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };
    fetchInsightData();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const fetchNews = async () => {
      if (!selectedSymbol) {
        setNews([]);
        return;
      }
      setIsNewsLoading(true);

      // Cache check
      const cacheKey = `insight_news_${selectedSymbol}`;
      const cacheTsKey = `insight_news_ts_${selectedSymbol}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cachedTimestamp = localStorage.getItem(cacheTsKey);
      const now = new Date().getTime();
      const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

      if (
        cachedData &&
        cachedTimestamp &&
        now - cachedTimestamp < CACHE_DURATION
      ) {
        try {
          const items = JSON.parse(cachedData);
          if (!isCancelled) {
            setNews(items);
            setIsNewsLoading(false);
            return;
          }
        } catch (e) {
          console.error("News cache parse error", e);
        }
      }

      try {
        const resp = await api.get("/api/stock-news/", {
          params: { symbol: selectedSymbol, limit: 8 },
        });
        if (isCancelled) return;
        const items = Array.isArray(resp.data?.news) ? resp.data.news : [];
        setNews(items);

        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify(items));
        localStorage.setItem(cacheTsKey, now.toString());
      } catch {
        if (!isCancelled) setNews([]);
      } finally {
        if (!isCancelled) setIsNewsLoading(false);
      }
    };
    fetchNews();
    return () => {
      isCancelled = true;
    };
  }, [selectedSymbol]);

  const selectedStock = useMemo(
    () => stocks.find((s) => s.symbol === selectedSymbol) || null,
    [stocks, selectedSymbol]
  );

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === "N/A") return "N/A";
    if (typeof value !== "number") return String(value);
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatPrice = (value) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value !== "number") return String(value);
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatPct = (value) => {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    if (Number.isNaN(n)) return null;
    const sign = n >= 0 ? "+" : "";
    return `${sign}${n.toFixed(2)}%`;
  };

  const formatNewsTime = (unixSeconds) => {
    if (!unixSeconds) return "";
    const d = new Date(unixSeconds * 1000);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="insight-dashboard insight">
      <Ticker />
      <div className="insight-grid">
        <div className="insight-grid__row insight-grid__row--top">
          <div className="insight-grid__col insight-grid__col--main">
            <section className="insight-card insight-card--tall insight-card--chart">
              <div className="insight-card__header">
                <div>
                  <div className="insight-title">
                    {selectedSymbol || "Chart"}
                  </div>
                  <div className="insight-subtitle">
                    {selectedStock?.name
                      ? selectedStock.name
                      : "Select a stock"}
                  </div>
                </div>

                <div className="insight-metrics">
                  <div className="insight-metric">
                    <div className="insight-metric__label">Price</div>
                    <div className="insight-metric__value">
                      {selectedStock?.value || "—"}
                    </div>
                  </div>
                  <div className="insight-metric">
                    <div className="insight-metric__label">Change</div>
                    <div
                      className={
                        selectedStock?.positive
                          ? "insight-metric__value insight-change insight-change--up"
                          : "insight-metric__value insight-change insight-change--down"
                      }
                    >
                      {typeof selectedStock?.change === "number"
                        ? `${
                            selectedStock.change >= 0 ? "+" : ""
                          }${selectedStock.change.toFixed(2)}`
                        : "—"}
                    </div>
                  </div>
                  <div className="insight-metric">
                    <div className="insight-metric__label">Day</div>
                    <div
                      className={
                        selectedStock?.positive
                          ? "insight-metric__value insight-change insight-change--up"
                          : "insight-metric__value insight-change insight-change--down"
                      }
                    >
                      {selectedStock?.return || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="insight-controls">
                <div
                  className="insight-pills"
                  role="group"
                  aria-label="Time range"
                >
                  {["1D", "5D", "1M", "6M", "1Y"].map((range) => (
                    <button
                      key={range}
                      className={
                        timeRange === range
                          ? "insight-pill insight-pill--active"
                          : "insight-pill"
                      }
                      onClick={() => setTimeRange(range)}
                      type="button"
                    >
                      {range}
                    </button>
                  ))}
                </div>

                <div
                  className="insight-pills"
                  role="group"
                  aria-label="Chart type"
                >
                  <button
                    className={
                      chartType === "line"
                        ? "insight-pill insight-pill--active"
                        : "insight-pill"
                    }
                    onClick={() => setChartType("line")}
                    type="button"
                  >
                    Line
                  </button>
                  <button
                    className={
                      chartType === "candle"
                        ? "insight-pill insight-pill--active"
                        : "insight-pill"
                    }
                    onClick={() => setChartType("candle")}
                    type="button"
                  >
                    Candles
                  </button>
                </div>
              </div>
              <div className="insight-chart">
                <MainCharts
                  timeRange={timeRange}
                  chartType={chartType}
                  symbol={selectedSymbol}
                />
              </div>
            </section>
          </div>

          <div className="insight-grid__col insight-grid__col--side">
            <section className="insight-card insight-card--indices">
              <div className="insight-card__header">
                <div>
                  <div className="insight-title">Major Indices & Bitcoin</div>
                  <div className="insight-subtitle">Market snapshot</div>
                </div>
              </div>

              {isLoading ? (
                <div className="insight-empty">Loading…</div>
              ) : (
                <div className="snapshot-cards-container">
                  {[...marketSnapshot.indices, ...marketSnapshot.crypto].map(
                    (item) => {
                      const up =
                        typeof item.change === "number"
                          ? item.change >= 0
                          : null;
                      const pct = formatPct(item.changePercent);
                      const changeClass =
                        up === null
                          ? "snapshot-card__change"
                          : up
                          ? "snapshot-card__change insight-change insight-change--up"
                          : "snapshot-card__change insight-change insight-change--down";

                      return (
                        <div
                          key={item.symbol}
                          className="stock-card snapshot-card"
                        >
                          <div className="snapshot-card__top">
                            <div>
                              <div className="snapshot-card__name">
                                {item.name}
                              </div>
                              <div className="snapshot-card__symbol">
                                {item.symbol}
                              </div>
                            </div>
                            <div>
                              <div className="snapshot-card__price">
                                {formatPrice(item.price)}
                              </div>
                              <div className={changeClass}>
                                {typeof item.change === "number"
                                  ? `${
                                      item.change >= 0 ? "+" : ""
                                    }${formatNumber(item.change)}`
                                  : "—"}
                                {pct ? ` (${pct})` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="snapshot-card__spark">
                            {item.graph?.labels?.length &&
                            item.graph?.values?.length ? (
                              <SparklineGraph
                                data={item.graph}
                                isPositive={up === null ? true : up}
                              />
                            ) : (
                              <div className="insight-empty">
                                No chart data.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}

                  {!marketSnapshot.indices.length &&
                  !marketSnapshot.crypto.length ? (
                    <div className="insight-empty">No snapshot data.</div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="insight-card insight-card--details">
              <div className="insight-card__header">
                <div>
                  <div className="insight-title">Details</div>
                  <div className="insight-subtitle">Selected instrument</div>
                </div>
              </div>

              <div className="insight-kv">
                <div className="insight-kv__row">
                  <div className="insight-kv__k">Symbol</div>
                  <div className="insight-kv__v">
                    {selectedStock?.symbol || "—"}
                  </div>
                </div>
                <div className="insight-kv__row">
                  <div className="insight-kv__k">Name</div>
                  <div className="insight-kv__v">
                    {selectedStock?.name || "—"}
                  </div>
                </div>
                <div className="insight-kv__row">
                  <div className="insight-kv__k">Currency</div>
                  <div className="insight-kv__v">
                    {selectedStock?.currency || "—"}
                  </div>
                </div>
                <div className="insight-kv__row">
                  <div className="insight-kv__k">Open</div>
                  <div className="insight-kv__v">
                    {typeof selectedStock?.openPrice === "number"
                      ? `$${selectedStock.openPrice.toFixed(2)}`
                      : "—"}
                  </div>
                </div>
                <div className="insight-kv__row">
                  <div className="insight-kv__k">Market Cap</div>
                  <div className="insight-kv__v">
                    {typeof selectedStock?.marketCap === "number"
                      ? `$${formatNumber(selectedStock.marketCap)}`
                      : "—"}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="insight-grid__row insight-grid__row--bottom">
          <div className="insight-grid__col">
            <section className="insight-card insight-card--list">
              <div className="insight-card__header">
                <div>
                  <div className="insight-title">Top 10 Popular Stocks</div>
                  <div className="insight-subtitle">Click to load chart</div>
                </div>
              </div>

              {isLoading ? (
                <div className="insight-empty">Loading…</div>
              ) : stocks.length ? (
                <ul className="insight-list">
                  {stocks.slice(0, 10).map((stock) => (
                    <li
                      key={stock.symbol}
                      className={
                        stock.symbol === selectedSymbol
                          ? "insight-row insight-row--active"
                          : "insight-row"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSymbol(stock.symbol)}
                        className="insight-row__btn"
                        aria-label={`Select ${stock.symbol}`}
                      >
                        <div className="insight-row__left">
                          <div className="insight-row__title">
                            {stock.symbol}
                          </div>
                          <div className="insight-row__meta">{stock.name}</div>
                        </div>
                        <div className="insight-row__right">
                          <div className="insight-row__price">
                            {stock.value}
                          </div>
                          <div
                            className={
                              stock.positive
                                ? "insight-row__change insight-change insight-change--up"
                                : "insight-row__change insight-change insight-change--down"
                            }
                          >
                            {stock.return}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="insight-empty">No stocks available.</div>
              )}
            </section>
          </div>

          <div className="insight-grid__col">
            <section className="insight-card insight-card--news">
              <div className="insight-card__header">
                <div>
                  <div className="insight-title">Stock News</div>
                  <div className="insight-subtitle">
                    Latest headlines for {selectedSymbol || "…"}
                  </div>
                </div>
              </div>

              {isNewsLoading ? (
                <div className="insight-empty">Loading…</div>
              ) : news.length ? (
                <div className="insight-news">
                  {news.map((item) => (
                    <article
                      key={item.id || `${item.datetime}-${item.headline}`}
                      className="insight-news__item"
                    >
                      <div className="insight-news__title">{item.headline}</div>
                      <div className="insight-news__meta">
                        {item.source ? <span>{item.source}</span> : null}
                        {item.datetime ? (
                          <span>{formatNewsTime(item.datetime)}</span>
                        ) : null}
                      </div>
                      {item.summary ? (
                        <div className="insight-news__summary">
                          {item.summary}
                        </div>
                      ) : null}
                      {item.url ? (
                        <a
                          className="insight-news__link"
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Read full story
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="insight-empty">
                  {selectedSymbol
                    ? "No recent headlines found."
                    : "Select a stock to see headlines."}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insight;
