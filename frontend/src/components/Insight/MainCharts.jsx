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
  Filler,
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
  Filler,
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
        tooltipBg: "rgba(20, 20, 20, 0.9)",
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
      tooltipBg: "rgba(20, 20, 20, 0.9)",
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const fetchCandles = async () => {
      setIsLoading(true);

      // Cache check
      const cacheKey = `insight_candles_${symbol}_${timeRange}`;
      const cacheTsKey = `insight_candles_ts_${symbol}_${timeRange}`;
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
          const data = JSON.parse(cachedData);
          if (!isCancelled) {
            setPayload(data);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error("Candles cache parse error", e);
        }
      }

      try {
        if (!symbol) {
          if (!isCancelled) setPayload(null);
          return;
        }
        const resp = await api.get("/api/stock-candles/", {
          params: { symbol, range: timeRange },
        });
        const data = resp.data;
        if (!isCancelled) {
          setPayload(data);
          // Save to cache
          localStorage.setItem(cacheKey, JSON.stringify(data));
          localStorage.setItem(cacheTsKey, now.toString());
        }
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
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            // Use a semi-transparent version of accent color
            // We can't easily parse the CSS var here without a helper,
            // so we'll assume theme.accent is a hex or rgb string, or fallback to a fixed color if needed.
            // For simplicity, let's use a fixed opacity trick or just a solid color if parsing is hard.
            // But wait, theme.accent comes from getComputedStyle, so it's likely a hex or rgb.
            // Let's just use a hardcoded blue-ish gradient if theme.accent is not easily manipulatable,
            // OR better: use the theme.accent and let the browser handle it if it's a color.
            // But to add opacity, we need to manipulate it.
            // Let's try to use a simple gradient for now.
            gradient.addColorStop(0, "rgba(94, 106, 210, 0.5)");
            gradient.addColorStop(1, "rgba(94, 106, 210, 0.0)");
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
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
          borderWidth: 1,
        },
      ],
    };
  }, [labels, payload, symbol, theme.down, theme.muted, theme.up]);

  const commonOptions = {
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        titleColor: "#fff",
        bodyColor: "#ccc",
        borderColor: theme.grid,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        type: "category",
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: theme.muted,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          font: { size: 10 },
        },
      },
      y: {
        position: "right",
        grid: {
          color: theme.grid,
          borderDash: [4, 4],
        },
        ticks: {
          color: theme.muted,
          font: { size: 10 },
        },
      },
    },
  };

  const lineChartOptions = {
    ...commonOptions,
  };

  const candleChartOptions = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      tooltip: {
        ...commonOptions.plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const p = ctx?.raw;
            if (!p) return "";
            return `O: ${p.o}  H: ${p.h}  L: ${p.l}  C: ${p.c}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "category",
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: theme.muted,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          font: { size: 10 },
        },
      },
      y: {
        type: "linear",
        position: "right",
        grid: {
          color: theme.grid,
          borderDash: [4, 4],
        },
        ticks: {
          color: theme.muted,
          font: { size: 10 },
        },
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
