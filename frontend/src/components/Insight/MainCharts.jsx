import React, { useEffect, useMemo, useState } from "react";
import { Line, Chart as ChartJS } from "react-chartjs-2";
import {
  Chart as ChartJSCore,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  registerables,
} from "chart.js";
import {
  CandlestickController,
  CandlestickElement,
} from "chartjs-chart-financial";
import "chartjs-chart-financial";

import api from "../../api/axios";

// Register the necessary components with Chart.js
ChartJSCore.register(
  ...registerables,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

const MainCharts = ({ timeRange, chartType, symbol }) => {
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const theme = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        text: "rgba(255,255,255,0.85)",
        muted: "rgba(255,255,255,0.65)",
        grid: "rgba(255,255,255,0.08)",
        accent: "rgba(255,255,255,0.75)",
        up: "rgba(0, 255, 0, 0.85)",
        down: "rgba(255, 0, 0, 0.85)",
      };
    }
    const styles = getComputedStyle(document.documentElement);
    const white = styles.getPropertyValue("--clr-white")?.trim() || "#fff";
    const silver =
      styles.getPropertyValue("--clr-silver-v1")?.trim() || "#bdbabb";
    const jet =
      styles.getPropertyValue("--clr-jet")?.trim() || "rgba(255,255,255,0.08)";
    const accent =
      styles.getPropertyValue("--clr-primary-light")?.trim() || silver;
    const up = styles.getPropertyValue("--clr-green")?.trim() || "#4caf50";
    const down = styles.getPropertyValue("--clr-scarlet")?.trim() || "#ff6347";
    return {
      text: white,
      muted: silver,
      grid: jet,
      accent,
      up,
      down,
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const fetchCandles = async () => {
      setIsLoading(true);
      try {
        if (!symbol) {
          if (!isCancelled) setPayload(null);
          return;
        }
        const resp = await api.get("/api/stock-candles/", {
          params: { symbol, range: timeRange },
        });
        const data = resp.data;
        if (!isCancelled) setPayload(data);
      } catch {
        if (!isCancelled) setPayload(null);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };
    fetchCandles();
    return () => {
      isCancelled = true;
    };
  }, [symbol, timeRange]);

  const labels = useMemo(() => {
    const ts = payload?.timestamps;
    if (!Array.isArray(ts)) return [];
    return ts.map((t) => {
      const d = typeof t === "number" ? new Date(t * 1000) : new Date(t);
      if (timeRange === "1D" || timeRange === "5D") {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString();
    });
  }, [payload, timeRange]);

  const lineChartData = useMemo(() => {
    const closes = Array.isArray(payload?.closes)
      ? payload.closes.map((v) => Number(v))
      : [];
    return {
      labels,
      datasets: [
        {
          label: symbol,
          data: closes,
          borderColor: theme.accent,
          fill: false,
          tension: 0.2,
          pointRadius: 0,
        },
      ],
    };
  }, [labels, payload, symbol, theme.accent]);

  const candleChartData = useMemo(() => {
    const candles = Array.isArray(payload?.candles) ? payload.candles : [];
    return {
      labels,
      datasets: [
        {
          label: symbol,
          // Use index-based candle points so the category x-axis stays aligned
          // with our formatted `labels` (otherwise Chart.js can misalign points).
          data: candles.map((p) => ({
            o: p.o,
            h: p.h,
            l: p.l,
            c: p.c,
          })),
          color: {
            up: theme.up,
            down: theme.down,
            unchanged: theme.muted,
          },
          borderColor: {
            up: theme.up,
            down: theme.down,
            unchanged: theme.muted,
          },
        },
      ],
    };
  }, [labels, payload, symbol, theme.down, theme.muted, theme.up]);

  const lineChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: theme.muted } },
    },
    scales: {
      x: {
        type: "category",
        title: {
          display: true,
          text: "Time Points",
          color: theme.muted,
        },
        ticks: {
          color: theme.muted,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
        },
        grid: { color: theme.grid },
      },
      y: {
        title: {
          display: true,
          text: "Value",
          color: theme.muted,
        },
        ticks: { color: theme.muted },
        grid: { color: theme.grid },
      },
    },
  };

  const candleChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: theme.muted } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const p = ctx?.raw;
            if (!p) return "";
            return `O ${p.o}  H ${p.h}  L ${p.l}  C ${p.c}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "category",
        title: {
          display: true,
          text: "Time Points",
          color: theme.muted,
        },
        ticks: {
          color: theme.muted,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
        },
        grid: { color: theme.grid },
      },
      y: {
        type: "linear",
        title: {
          display: true,
          text: "Value",
          color: theme.muted,
        },
        ticks: { color: theme.muted },
        grid: { color: theme.grid },
      },
    },
  };

  return (
    <div className="chart-wrapper">
      {isLoading ? (
        <div className="insight-chart__loading">Loading chart…</div>
      ) : null}
      {!isLoading && (!payload?.closes?.length || payload?.error) ? (
        <div className="insight-chart__empty">
          {payload?.error ? payload.error : "No chart data available"}
        </div>
      ) : null}
      {chartType === "line" ? (
        <Line data={lineChartData} options={lineChartOptions} />
      ) : (
        <ChartJS
          type="candlestick"
          data={candleChartData}
          options={candleChartOptions}
        />
      )}
    </div>
  );
};

export default MainCharts;
